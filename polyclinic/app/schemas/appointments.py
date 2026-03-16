from datetime import datetime
from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    doctor_id: int
    start_time: datetime
    complaints: str | None = None


class AppointmentUpdate(BaseModel):
    status: str


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    status_id: int
    complaints: str | None

    model_config = {"from_attributes": True}
