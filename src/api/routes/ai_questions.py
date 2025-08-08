from fastapi import APIRouter, HTTPException
from api.db.task import (
    get_task as get_task_from_db,
    get_task_metadata,
    get_learning_materials_for_milestone,
    update_draft_quiz,
    create_draft_task_for_course,
)
from api.models import TaskType, TaskStatus, TaskAIResponseType
from api.db.utils import convert_blocks_to_right_format
from api.settings import settings
import openai
import json
import asyncio

router = APIRouter()


@router.post("/generate/task/{task_id}/questions")
async def generate_questions_for_task(task_id: int):
    task = await get_task_from_db(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    original_task_id = task_id

    meta = await get_task_metadata(task_id)
    if not meta:
        raise HTTPException(status_code=400, detail="Task metadata not found")

    course_id = meta["course"]["id"]
    milestone_id = meta["milestone"]["id"]

    materials = await get_learning_materials_for_milestone(course_id, milestone_id)

    # Normalize type checks
    def _is_quiz(t):
        return t == TaskType.QUIZ or str(t).lower() == "quiz"

    def _is_learning(t):
        return t == TaskType.LEARNING_MATERIAL or str(t).lower() == "learning_material"

    # If target task is learning material, auto-create a paired quiz task and generate for it
    if _is_learning(task["type"]):
        quiz_title = f"Quiz: {task.get('title') or 'Generated'}"
        new_quiz_task_id, _ = await create_draft_task_for_course(
            title=quiz_title,
            type=str(TaskType.QUIZ),
            course_id=course_id,
            milestone_id=milestone_id,
        )
        task_id = new_quiz_task_id
        # Update task reference for subsequent logic
        task = await get_task_from_db(task_id)

    if not _is_quiz(task["type"]):
        raise HTTPException(status_code=400, detail="Task is not a quiz")

    system_prompt = (
        "You are an assessment author. Generate a small, high-quality set of questions for the given topic. "
        "Return ONLY JSON conforming to the schema. Provide a mix of objective (MCQ) and short questions. "
        "For MCQs include 3-5 options and an explanation."
    )

    OutputSchema = {
        "type": "object",
        "properties": {
            "title": {"type": ["string", "null"]},
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_type": {"type": "string", "enum": ["objective", "subjective"]},
                        "title": {"type": "string"},
                        "blocks": {"type": "array"},
                        "correct_answer": {"type": ["string", "null"]},
                        "answer_type": {"type": "string", "enum": ["text"]},
                        "context": {"type": ["object", "null"]},
                        "coding_languages": {"type": ["array", "null"]},
                    },
                    "required": ["question_type", "title", "blocks", "answer_type"]
                }
            }
        },
        "required": ["questions"]
    }

    course_name = meta["course"]["name"]
    milestone_name = meta["milestone"]["name"]
    topic_title = task.get("title")

    content_snippets = []
    for m in materials:
        content_snippets.append({"title": m["title"], "blocks": m["blocks"]})

    client = openai.AsyncOpenAI(
        api_key=settings.openai_api_key,
        base_url="https://agent.dev.hyperverge.org",
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Course: {course_name}\n"
                f"Module: {milestone_name}\n"
                f"Quiz Topic: {topic_title}\n"
                f"Reference Learning Materials (JSON): {content_snippets}\n"
                f"Return JSON matching this JSON Schema strictly: {OutputSchema}"
            ),
        },
    ]

    # Call the model with enforced JSON output and simple retries/timeouts
    last_err = None
    content_json = {}
    for attempt in range(3):
        try:
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model="openai/gpt-4o-mini",
                    messages=messages,
                    max_completion_tokens=4096,
                    response_format={"type": "json_object"},
                ),
                timeout=90,
            )
            raw = (resp.choices[0].message.content or "{}").strip()
            content_json = json.loads(raw)
            break
        except Exception as e:
            last_err = e
            if attempt == 2:
                raise HTTPException(status_code=502, detail=f"LLM error: {e}")
            await asyncio.sleep(1.5 * (attempt + 1))

    title = content_json.get("title") or topic_title
    raw_questions = content_json.get("questions") or []

    # Adapt LLM output schema to DB schema expected by update_draft_quiz
    db_questions = []
    for index, q in enumerate(raw_questions):
        # Ensure required fields
        q_type = q.get("question_type") or "objective"
        q_title = q.get("title") or f"Question {index + 1}"
        q_blocks = convert_blocks_to_right_format(q.get("blocks") or [])

        # Correct answer: convert string to simple paragraph block if provided
        q_answer_text = q.get("correct_answer")
        if q_answer_text:
            q_answer_blocks = [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": str(q_answer_text), "styles": {}}
                    ],
                }
            ]
        else:
            q_answer_blocks = None
        if q_answer_blocks:
            q_answer_blocks = convert_blocks_to_right_format(q_answer_blocks)

        # Build question in DB format
        db_questions.append(
            {
                "type": q_type,
                "title": q_title,
                "blocks": q_blocks,
                "answer": q_answer_blocks,
                "input_type": q.get("answer_type") or "text",
                "response_type": str(TaskAIResponseType.CHAT),
                "coding_languages": q.get("coding_languages") or None,
                "context": (q.get("context") or None),
                "max_attempts": None,
                "is_feedback_shown": True,
                "scorecard_id": None,
            }
        )

    # Persist as draft (overwrite)
    await update_draft_quiz(
        task_id=task_id,
        title=title,
        questions=db_questions,
        scheduled_publish_at=None,
        status=TaskStatus.DRAFT,
    )

    return {"status": "ok"}


