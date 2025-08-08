from fastapi import APIRouter
from api.models import Schedule
from api.db.schedule import get_schedule as get_schedule_from_db

router = APIRouter()


@router.get("/{course_id}")
async def get_schedule(course_id: int):
    schedule = await get_schedule_from_db(course_id)
    return {"schedule": schedule}


