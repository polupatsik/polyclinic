from datetime import datetime
from pydantic import BaseModel, EmailStr


class RoleShort(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_email_verified: bool
    role_id: int
    role: RoleShort | None = None
    created_at: datetime

    model_config = {"from_attributes": True}