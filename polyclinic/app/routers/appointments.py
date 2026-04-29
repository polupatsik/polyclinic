from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import Appointment, Doctor, Patient, Status, User
from app.core.dependencies import get_current_user, require_role, write_audit
from app.schemas.appointments import AppointmentCreate, AppointmentResponse, AppointmentUpdate

router = APIRouter()


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("PATIENT")),
):
    patient = await db.get(Patient, current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Профиль пациента не найден")

    doctor = await db.get(Doctor, data.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")

    status_result = await db.execute(select(Status).where(Status.name == "CREATED"))
    appt_status = status_result.scalar_one_or_none()
    if not appt_status:
        raise HTTPException(status_code=500, detail="Статус CREATED не найден")

    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=data.doctor_id,
        start_time=data.start_time,
        status_id=appt_status.id,
        complaints=data.complaints,
    )
    db.add(appointment)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Это время уже занято у данного врача",
        )

    await write_audit(db, current_user.id, "CREATE_APPOINTMENT", "appointment", str(appointment.id), "success")
    await db.commit()
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.status))
        .where(Appointment.id == appointment.id)
    )
    return result.scalar_one()


@router.get("/my", response_model=list[AppointmentResponse])
async def get_my_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("PATIENT")),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.status))
        .where(Appointment.patient_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/doctor", response_model=list[AppointmentResponse])
async def get_doctor_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("DOCTOR")),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.status))
        .where(Appointment.doctor_id == current_user.id)
    )
    return result.scalars().all()


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: int,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("DOCTOR", "ADMIN")),
):
    appointment = await db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    new_status = await db.execute(select(Status).where(Status.name == data.status))
    appt_status = new_status.scalar_one_or_none()
    if not appt_status:
        raise HTTPException(status_code=400, detail="Неверный статус")

    appointment.status_id = appt_status.id
    await db.flush()
    await db.refresh(appointment)
    # подгружаем статус вручную чтобы вернуть status_name
    await db.refresh(appt_status)
    appointment.status = appt_status

    await write_audit(db, current_user.id, "UPDATE_APPOINTMENT_STATUS", "appointment", str(appointment_id), "success")
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("PATIENT", "ADMIN")),
):
    appointment = await db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    if current_user.role.name == "PATIENT" and appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой записи")

    cancelled = await db.execute(select(Status).where(Status.name == "CANCELLED"))
    appt_status = cancelled.scalar_one_or_none()
    appointment.status_id = appt_status.id

    await write_audit(db, current_user.id, "CANCEL_APPOINTMENT", "appointment", str(appointment_id), "success")