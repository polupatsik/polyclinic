from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import User, Role
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import write_audit
from app.schemas.auth import RegisterRequest, TokenResponse

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

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role.id,
    )
    db.add(user)
    await db.flush()

    await write_audit(db, user.id, "REGISTER", "user", str(user.id), "success")
    return {"message": "Пользователь зарегистрирован", "user_id": user.id}


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
