from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import AiModel, AiQuestionnaire, QuestionnaireAnswer, Question, Patient
from app.core.dependencies import require_role, write_audit
from app.schemas.ai import DiagnoseRequest, DiagnoseResponse, QuestionOut

router = APIRouter()


@router.get("/questions", response_model=list[QuestionOut])
async def get_questions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question))
    return result.scalars().all()


@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(
    data: DiagnoseRequest,
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
        duration_days=data.duration_days,
    )
    db.add(questionnaire)
    await db.flush()

    for answer in data.answers:
        qa = QuestionnaireAnswer(
            questionnaire_id=questionnaire.id,
            question_id=answer.question_id,
            answer=answer.answer,
        )
        db.add(qa)

    positive_question_ids = [a.question_id for a in data.answers if a.answer]
    prediction = await _run_classifier(positive_question_ids, data.duration_days, db)

    questionnaire.ai_result = prediction
    await write_audit(db, current_user.id, "AI_DIAGNOSE", "ai_questionnaire", str(questionnaire.id), "success")

    return DiagnoseResponse(
        questionnaire_id=questionnaire.id,
        recommended_specialization=prediction,
        duration_days=data.duration_days,
    )


async def _run_classifier(positive_question_ids: list[int], duration_days: int, db: AsyncSession) -> str:
    from sqlalchemy.orm import selectinload
    from app.models.models import Symptom

    if not positive_question_ids:
        return "Терапевт"

    result = await db.execute(
        select(Question)
        .options(selectinload(Question.symptom))
        .where(Question.id.in_(positive_question_ids))
    )
    questions = result.scalars().all()

    symptom_names = {q.symptom.name for q in questions if q.symptom}

    rules = {
        frozenset(["Кашель", "Температура"]): "ЛОР",
        frozenset(["Головная боль"]): "Невролог",
        frozenset(["Кашель"]): "ЛОР",
        frozenset(["Температура"]): "Терапевт",
    }

    for symptom_set, specialization in rules.items():
        if symptom_set.issubset(symptom_names):
            return specialization

    return "Терапевт"
