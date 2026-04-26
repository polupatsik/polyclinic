from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import Doctor, Specialization
from app.core.dependencies import get_current_user
from app.schemas.doctors import DoctorResponse

router = APIRouter()


@router.get("/", response_model=list[DoctorResponse])
async def get_doctors(
    specialization_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Doctor).options(
        selectinload(Doctor.specialization),
        selectinload(Doctor.user),
    )
    if specialization_id:
        query = query.where(Doctor.specialization_id == specialization_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/specializations")
async def get_specializations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Specialization))
    return result.scalars().all()


@router.get("/{doctor_id}/slots")
async def get_available_slots(
    doctor_id: int,
    date: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Возвращает занятые слоты врача на указанную дату."""
    from datetime import datetime
    from app.models.models import Appointment

    day_start = datetime.strptime(date, "%Y-%m-%d")
    day_end = day_start.replace(hour=23, minute=59, second=59)

    result = await db.execute(
        select(Appointment.start_time).where(
            Appointment.doctor_id == doctor_id,
            Appointment.start_time >= day_start,
            Appointment.start_time <= day_end,
        )
    )
    busy_slots = [row[0].strftime("%H:%M") for row in result.all()]
    return {"date": date, "busy_slots": busy_slots}
