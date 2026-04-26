from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import User, AuditLog
from app.core.dependencies import require_role, write_audit
from app.schemas.users import UserResponse
from app.schemas.auth import CreateDoctorRequest
from app.models.models import User, AuditLog, Role, Doctor
router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    result = await db.execute(select(User).options(selectinload(User.role)))
    return result.scalars().all()


@router.get("/audit-log")
async def get_audit_log(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
    limit: int = 100,
    offset: int = 0,
):
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.action_time.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    await db.delete(user)
    await write_audit(db, current_user.id, "DELETE_USER", "user", str(user_id), "success")


@router.post("/doctors", status_code=status.HTTP_201_CREATED)
async def create_doctor(
    data: CreateDoctorRequest,  # ← вот здесь
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    role_result = await db.execute(select(Role).where(Role.name == "DOCTOR"))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=500, detail="Роль DOCTOR не найдена")

    from app.core.security import hash_password
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role.id,
        is_email_verified=True,
    )
    db.add(user)
    await db.flush()

    doctor = Doctor(
        user_id=user.id,
        specialization_id=data.specialization_id,
        cabinet_number=data.cabinet_number,
    )
    db.add(doctor)
    await write_audit(db, current_user.id, "CREATE_DOCTOR", "user", str(user.id), "success")
    return {"message": "Врач создан", "user_id": user.id} 