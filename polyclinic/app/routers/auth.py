import secrets
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import User, Role, Patient
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import write_audit
from app.core.email import send_verification_email, send_reset_email
from app.schemas.auth import RegisterRequest, TokenResponse, ResetPasswordRequest, ForgotPasswordRequest

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    role_result = await db.execute(select(Role).where(Role.name == "PATIENT"))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=500, detail="Роль PATIENT не найдена")

    verification_token = secrets.token_urlsafe(32)

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role.id,
        email_verification_token=verification_token,
        email_verification_expires=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(user)
    await db.flush()

    patient = Patient(
        user_id=user.id,
        birth_date=data.birth_date or date(2000, 1, 1),
    )
    db.add(patient)

    send_verification_email(data.email, verification_token)

    await write_audit(db, user.id, "REGISTER", "user", str(user.id), "success")
    return {"message": "Пользователь зарегистрирован. Проверьте email для подтверждения.", "user_id": user.id}


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email_verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Неверный токен")
    if user.email_verification_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Токен истёк")

    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None

    await write_audit(db, user.id, "VERIFY_EMAIL", "user", str(user.id), "success")
    return {"message": "Email успешно подтверждён"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь с таким email не найден")

    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)

    send_reset_email(data.email, reset_token)

    await write_audit(db, user.id, "FORGOT_PASSWORD", "user", str(user.id), "success")
    return {"message": "Инструкции по восстановлению пароля отправлены на email"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.reset_token == data.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Неверный токен")
    if user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Токен истёк")

    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None

    await write_audit(db, user.id, "RESET_PASSWORD", "user", str(user.id), "success")
    return {"message": "Пароль успешно изменён"}


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        await write_audit(db, None, "LOGIN_FAILED", "user", form_data.username, "error")
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = create_access_token({"sub": str(user.id), "role": user.role.name})
    await write_audit(db, user.id, "LOGIN", "user", str(user.id), "success")
    return {"access_token": token, "token_type": "bearer"}