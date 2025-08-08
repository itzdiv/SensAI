from fastapi import APIRouter, HTTPException, Body, Query
from datetime import datetime, timezone, date, timedelta
from typing import List, Dict
import instructor
import openai

from api.models import (
    GenerateScheduleRequest,
    GenerateScheduleResponse,
    Schedule,
    ScheduleDay,
    ScheduleItem,
)
from api.settings import settings
from api.db.course import get_course
from api.db.schedule import save_schedule

router = APIRouter()


def normalize_weekday_indices(exclude_weekdays: List[int] | None) -> List[int]:
    # Frontend sends JS indices (0=Sun..6=Sat). We keep them as-is for simplicity.
    return exclude_weekdays or []


@router.post("/generate/course/{course_id}/schedule", response_model=GenerateScheduleResponse)
async def generate_course_schedule(
    course_id: int,
    request: GenerateScheduleRequest | None = Body(default=None),
    mock: bool = Query(False),
    persist: bool = Query(False),
) -> GenerateScheduleResponse:
    course = await get_course(course_id, only_published=False)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if request is None:
        request = GenerateScheduleRequest()

    # Prepare inputs for LLM
    exclude_weekdays = normalize_weekday_indices(request.exclude_weekdays)
    exclude_dates = [d.isoformat() for d in (request.exclude_dates or [])]

    # If mock requested, construct a simple schedule locally for testing
    if mock:
        # Flatten tasks with milestone ids
        tasks_flat: List[Dict] = []
        for m in course.get("milestones", []):
            for t in m.get("tasks", []):
                tasks_flat.append({
                    "task_id": t["id"],
                    "milestone_id": m["id"],
                    "title": t["title"],
                    "raw_type": str(t["type"]).lower(),
                })

        start: date = request.start_date or date.today()
        include_weekends = bool(request.include_weekends) if request.include_weekends is not None else False
        tz = request.timezone or "UTC"

        days: List[ScheduleDay] = []
        scheduled_by_date: Dict[str, List[ScheduleItem]] = {}

        current = start
        exclude_set = set(exclude_weekdays)
        exclude_dates_set = set(exclude_dates)

        for task in tasks_flat:
            # advance to next allowed day
            while True:
                js_day = (current.weekday() + 1) % 7  # convert Python Mon=0..Sun=6 -> JS Sun=0..Sat=6
                if current.isoformat() in exclude_dates_set:
                    current += timedelta(days=1)
                    continue
                if js_day in exclude_set:
                    current += timedelta(days=1)
                    continue
                if not include_weekends and js_day in (0, 6):
                    current += timedelta(days=1)
                    continue
                break

            sched_date = current.isoformat()
            if sched_date not in scheduled_by_date:
                scheduled_by_date[sched_date] = []

            item_type = "quiz" if task["raw_type"] == "quiz" else "learning"
            scheduled_by_date[sched_date].append(
                ScheduleItem(
                    type=item_type,
                    task_id=task["task_id"],
                    milestone_id=task["milestone_id"],
                    title=task["title"],
                    duration_minutes=90 if item_type == "learning" else 30,
                )
            )

            # Move to next day for next task
            current += timedelta(days=1)

        for d, items in scheduled_by_date.items():
            days.append(ScheduleDay(date=date.fromisoformat(d), items=items))

        schedule = Schedule(
            course_id=course_id,
            generated_at=datetime.now(timezone.utc),
            timezone=tz,
            days=days,
        )
        if persist:
            await save_schedule(course_id, schedule)
        return GenerateScheduleResponse(schedule=schedule)

    # Flatten course structure for prompt
    milestones_for_prompt: List[Dict] = []
    for m in course.get("milestones", []):
        milestones_for_prompt.append(
            {
                "id": m["id"],
                "name": m["name"],
                "tasks": [
                    {
                        "id": t["id"],
                        "title": t["title"],
                        "type": str(t["type"]),
                        "ordering": t["ordering"],
                    }
                    for t in m.get("tasks", [])
                ],
            }
        )

    # Build system prompt and messages
    system_prompt = """You are a course scheduling planner. Use the provided course structure (milestones and tasks) and user preferences
to produce a detailed day-by-day plan. Return JSON that matches the provided schema exactly. Do not add extra fields.

Rules:
- Maintain pedagogy: schedule learning material before quizzes of the same concept.
- Respect excluded weekdays and specific dates. If include_weekends is false, avoid weekends unless not in excluded list and explicitly allowed.
- Balance to approximately hours_per_day across working days; avoid gaps when possible.
- Always include task_id and milestone_id when known; include short titles.
"""

    Output = Schedule

    client = instructor.from_openai(
        openai.AsyncOpenAI(api_key=settings.openai_api_key, base_url="https://agent.dev.hyperverge.org")
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Course ID: {course['id']}\n"
                f"Course name: {course['name']}\n"
                f"Milestones and tasks (JSON):\n{milestones_for_prompt}\n\n"
                f"Preferences: start_date={request.start_date}, include_weekends={request.include_weekends},\n"
                f"exclude_weekdays(JS 0=Sun..6=Sat)={exclude_weekdays}, exclude_dates={exclude_dates},\n"
                f"hours_per_day={request.hours_per_day}, days_per_week={request.days_per_week}, timezone={request.timezone}\n\n"
                f"Schema to follow strictly (no extra keys):\n{Output.model_json_schema()}"
            ),
        },
    ]

    # Call LLM to generate schedule matching the Schedule schema
    pred: Schedule = await client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=messages,
        response_model=Output,
        max_completion_tokens=8192,
        store=False,
    )

    # Fill server-side fields
    schedule = pred.model_copy(update={
        "course_id": course_id,
        "generated_at": datetime.now(timezone.utc),
        "timezone": request.timezone or "UTC",
    })
    if persist:
        await save_schedule(course_id, schedule)
    return GenerateScheduleResponse(schedule=schedule)


