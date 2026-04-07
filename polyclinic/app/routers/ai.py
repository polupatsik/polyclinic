from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import AiModel, AiQuestionnaire, QuestionnaireAnswer, Question, Patient
from app.core.dependencies import require_role, write_audit
from app.core.ml_model import get_initial_question_id, get_next_question_id, should_finish, predict_specialization
from app.schemas.ai import AnswerRequest, StartResponse, AnswerResponse, QuestionOut

router = APIRouter()


@router.get("/questions", response_model=list[QuestionOut])
async def get_questions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question))
    return result.scalars().all()


@router.post("/start", response_model=StartResponse)
async def start_questionnaire(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("PATIENT")),
):
    patient = await db.get(Patient, current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Профиль пациента не найден")

    model_result = await db.execute(
        select(AiModel).where(AiModel.status == "active").limit(1)
    )
    model = model_result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=503, detail="Активная AI-модель не найдена")

    questionnaire = AiQuestionnaire(
        patient_id=current_user.id,
        model_id=model.id,
        duration_days=0,
    )
    db.add(questionnaire)
    await db.flush()

    first_question_id = get_initial_question_id()
    question = await db.get(Question, first_question_id)

    await write_audit(db, current_user.id, "START_QUESTIONNAIRE", "ai_questionnaire", str(questionnaire.id), "success")

    return StartResponse(
        questionnaire_id=questionnaire.id,
        question_id=question.id,
        question_text=question.text,
    )


@router.post("/answer", response_model=AnswerResponse)
async def answer_question(
    data: AnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("PATIENT")),
):
    questionnaire = await db.get(AiQuestionnaire, data.questionnaire_id)
    if not questionnaire or questionnaire.patient_id != current_user.id:
        raise HTTPException(status_code=404, detail="Опросник не найден")

    if questionnaire.ai_result:
        raise HTTPException(status_code=400, detail="Опросник уже завершён")

    qa = QuestionnaireAnswer(
        questionnaire_id=data.questionnaire_id,
        question_id=data.question_id,
        answer=data.answer,
    )
    db.add(qa)
    await db.flush()

    result = await db.execute(
        select(QuestionnaireAnswer).where(
            QuestionnaireAnswer.questionnaire_id == data.questionnaire_id
        )
    )
    all_answers = result.scalars().all()
    answers_dict = {qa.question_id: qa.answer for qa in all_answers}

    if should_finish(answers_dict):
        specialization, confidence = predict_specialization(answers_dict)
        questionnaire.ai_result = specialization
        await write_audit(db, current_user.id, "FINISH_QUESTIONNAIRE", "ai_questionnaire", str(data.questionnaire_id), "success")

        return AnswerResponse(
            questionnaire_id=data.questionnaire_id,
            finished=True,
            next_question_id=None,
            next_question_text=None,
            recommended_specialization=specialization,
            confidence=round(confidence * 100, 1),
        )

    next_question_id = get_next_question_id(data.question_id, data.answer)

    if next_question_id is None or next_question_id in answers_dict:
        specialization, confidence = predict_specialization(answers_dict)
        questionnaire.ai_result = specialization
        await write_audit(db, current_user.id, "FINISH_QUESTIONNAIRE", "ai_questionnaire", str(data.questionnaire_id), "success")

        return AnswerResponse(
            questionnaire_id=data.questionnaire_id,
            finished=True,
            next_question_id=None,
            next_question_text=None,recommended_specialization=specialization,
            confidence=round(confidence * 100, 1),
        )

    next_question = await db.get(Question, next_question_id)

    return AnswerResponse(
        questionnaire_id=data.questionnaire_id,
        finished=False,
        next_question_id=next_question.id,
        next_question_text=next_question.text,
        recommended_specialization=None,
        confidence=None,
    )