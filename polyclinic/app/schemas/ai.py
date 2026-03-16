from pydantic import BaseModel


class AnswerItem(BaseModel):
    question_id: int
    answer: bool


class DiagnoseRequest(BaseModel):
    duration_days: int
    answers: list[AnswerItem]


class DiagnoseResponse(BaseModel):
    questionnaire_id: int
    recommended_specialization: str
    duration_days: int


class QuestionOut(BaseModel):
    id: int
    text: str
    is_initial: bool

    model_config = {"from_attributes": True}
