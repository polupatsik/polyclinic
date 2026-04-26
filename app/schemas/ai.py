from pydantic import BaseModel


class AnswerRequest(BaseModel):
    questionnaire_id: int
    question_id: int
    answer: bool


class StartResponse(BaseModel):
    questionnaire_id: int
    question_id: int
    question_text: str


class AnswerResponse(BaseModel):
    questionnaire_id: int
    finished: bool
    next_question_id: int | None
    next_question_text: str | None
    recommended_specialization: str | None
    confidence: float | None


class QuestionOut(BaseModel):
    id: int
    text: str
    is_initial: bool

    model_config = {"from_attributes": True}