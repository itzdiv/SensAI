import json
from datetime import datetime
from typing import Optional

from api.config import schedules_table_name
from api.models import Schedule
from api.utils.db import execute_db_operation


async def save_schedule(course_id: int, schedule: Schedule) -> Schedule:
    # Ensure table exists (idempotent)
    await execute_db_operation(
        f"""
        CREATE TABLE IF NOT EXISTS {schedules_table_name} (
            course_id INTEGER PRIMARY KEY,
            generated_at DATETIME NOT NULL,
            timezone TEXT,
            days TEXT NOT NULL
        )
        """
    )

    # Overwrite semantics using INSERT OR REPLACE on PRIMARY KEY (course_id)
    await execute_db_operation(
        f"""
        INSERT OR REPLACE INTO {schedules_table_name} (course_id, generated_at, timezone, days)
        VALUES (?, ?, ?, ?)
        """,
        (
            course_id,
            schedule.generated_at,
            schedule.timezone,
            json.dumps([{
                "date": d.date.isoformat(),
                "items": [i.model_dump() for i in d.items],
                "summary": d.summary,
            } for d in schedule.days]),
        ),
    )

    return schedule


async def get_schedule(course_id: int) -> Optional[Schedule]:
    row = await execute_db_operation(
        f"SELECT course_id, generated_at, timezone, days FROM {schedules_table_name} WHERE course_id = ?",
        (course_id,),
        fetch_one=True,
    )

    if not row:
        return None

    course_id, generated_at, timezone, days_json = row
    days = json.loads(days_json) if days_json else []
    # Convert dates back to Schedule model
    from api.models import ScheduleDay, ScheduleItem
    parsed_days = []
    for d in days:
        parsed_days.append(
            ScheduleDay(
                date=d["date"],
                items=[ScheduleItem(**i) for i in d.get("items", [])],
                summary=d.get("summary"),
            )
        )

    return Schedule(
        course_id=course_id,
        generated_at=generated_at if isinstance(generated_at, datetime) else datetime.fromisoformat(str(generated_at)) if generated_at else None,
        timezone=timezone,
        days=parsed_days,
    )


async def delete_schedule(course_id: int):
    await execute_db_operation(
        f"DELETE FROM {schedules_table_name} WHERE course_id = ?",
        (course_id,),
    )


