from pydantic import BaseModel


class DoctorResponse(BaseModel):
    user_id: int
    specialization_id: int
    cabinet_number: str

    model_config = {"from_attributes": True}
