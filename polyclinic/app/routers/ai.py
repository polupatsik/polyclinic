from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import AiModel, AiQuestionnaire, QuestionnaireAnswer, Question, Symptom, Patient
from app.core.dependencies import require_role, write_audit
from app.core.ml_model import get_initial_symptom, get_next_symptom, predict_specialization
from app.schemas.ai import AnswerRequest, StartResponse, AnswerResponse, QuestionOut

router = APIRouter()


async def get_question_by_symptom_name(symptom_name: str, db: AsyncSession) -> Question | None:
    result = await db.execute(
        select(Question)
        .join(Symptom, Question.symptom_id == Symptom.id)
        .where(Symptom.name == symptom_name)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_symptom_name_by_question_id(question_id: int, db: AsyncSession) -> str | None:
    result = await db.execute(
        select(Symptom.name)
        .join(Question, Question.symptom_id == Symptom.id)
        .where(Question.id == question_id)
    )
    return result.scalar_one_or_none()


async def get_all_symptom_answers(questionnaire_id: int, db: AsyncSession) -> dict:
    result = await db.execute(
        select(QuestionnaireAnswer)
        .options(selectinload(QuestionnaireAnswer.question).selectinload(Question.symptom))
        .where(QuestionnaireAnswer.questionnaire_id == questionnaire_id)
    )
    answers = {}
    for qa in result.scalars().all():
        if qa.question and qa.question.symptom:
            answers[qa.question.symptom.name] = qa.answer
    return answers


@router.get("/questions", response_model=list[QuestionOut])
async def get_questions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).order_by(Question.id))
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

    initial_symptom = get_initial_symptom()
    first_question = await get_question_by_symptom_name(initial_symptom, db)
    if not first_question:
        raise HTTPException(status_code=500, detail=f"Вопрос для симптома '{initial_symptom}' не найден в БД")

    await write_audit(db, current_user.id, "START_QUESTIONNAIRE", "ai_questionnaire", str(questionnaire.id), "success")

    return StartResponse(
        questionnaire_id=questionnaire.id,
        question_id=first_question.id,
        question_text=first_question.text,
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

    current_symptom = await get_symptom_name_by_question_id(data.question_id, db)
    if not current_symptom:
        raise HTTPException(status_code=400, detail="Вопрос не привязан к симптому")

    qa = QuestionnaireAnswer(
        questionnaire_id=data.questionnaire_id,
        question_id=data.question_id,
        answer=data.answer,
    )
    db.add(qa)
    await db.flush()

    symptom_answers = await get_all_symptom_answers(data.questionnaire_id, db)
    answered_symptoms = set(symptom_answers.keys())

    next_symptom = get_next_symptom(current_symptom, data.answer, answered_symptoms)

    if next_symptom is None:
        specialization, confidence = predict_specialization(symptom_answers)
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

    next_question = await get_question_by_symptom_name(next_symptom, db)
    if not next_question:
        specialization, confidence = predict_specialization(symptom_answers)
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

    return AnswerResponse(
        questionnaire_id=data.questionnaire_id,
        finished=False,
        next_question_id=next_question.id,
        next_question_text=next_question.text,
        recommended_specialization=None,
        confidence=None,
    )
