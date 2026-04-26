from datetime import date
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    birth_date: date | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class CreateDoctorRequest(BaseModel):
    email: EmailStr
    password: str
    specialization_id: int
    cabinet_number: str