from datetime import datetime
from pydantic import BaseModel, model_validator


class AppointmentCreate(BaseModel):
    doctor_id: int
    start_time: datetime
    complaints: str | None = None


class AppointmentUpdate(BaseModel):
    status: str


class StatusShort(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    status_id: int
    status_name: str | None = None
    complaints: str | None = None
    status: StatusShort | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def fill_status_name(self):
        if self.status and not self.status_name:
            self.status_name = self.status.name
        return self