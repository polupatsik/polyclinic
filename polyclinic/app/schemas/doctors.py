from pydantic import BaseModel


class UserShort(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}


class SpecializationShort(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class DoctorResponse(BaseModel):
    user_id: int
    specialization_id: int
    cabinet_number: str
    user: UserShort | None = None
    specialization: SpecializationShort | None = None

    model_config = {"from_attributes": True}