from datetime import datetime, date
from sqlalchemy import (
    Integer, String, Boolean, Text, Date, DateTime,
    Float, ForeignKey, UniqueConstraint, CheckConstraint,
    func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


# =====================
# РОЛИ И ПРАВА ДОСТУПА
# =====================

class Role(Base):
    __tablename__ = "role"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="role")
    permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (UniqueConstraint("name", "entity"),)

    roles: Mapped[list["RolePermission"]] = relationship(back_populates="permission")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(ForeignKey("role.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)

    role: Mapped["Role"] = relationship(back_populates="permissions")
    permission: Mapped["Permission"] = relationship(back_populates="roles")


# =====================
# ПОЛЬЗОВАТЕЛИ
# =====================

class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verification_token: Mapped[str | None] = mapped_column(String(255))
    email_verification_expires: Mapped[datetime | None] = mapped_column(DateTime)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    reset_token: Mapped[str | None] = mapped_column(String(255))
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime)
    role_id: Mapped[int] = mapped_column(ForeignKey("role.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    role: Mapped["Role"] = relationship(back_populates="users")
    patient: Mapped["Patient | None"] = relationship(back_populates="user")
    doctor: Mapped["Doctor | None"] = relationship(back_populates="user")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")


# =====================
# СПРАВОЧНИКИ
# =====================

class Specialization(Base):
    __tablename__ = "specialization"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    doctors: Mapped[list["Doctor"]] = relationship(back_populates="specialization")


class Status(Base):
    __tablename__ = "status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="status")


# =====================
# ПАЦИЕНТЫ И ВРАЧИ
# =====================

class Patient(Base):
    __tablename__ = "patient"

    user_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped["User"] = relationship(back_populates="patient")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="patient")
    questionnaires: Mapped[list["AiQuestionnaire"]] = relationship(back_populates="patient")


class Doctor(Base):
    __tablename__ = "doctor"

    user_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    specialization_id: Mapped[int] = mapped_column(ForeignKey("specialization.id"), nullable=False)
    cabinet_number: Mapped[str] = mapped_column(String(20), nullable=False)

    user: Mapped["User"] = relationship(back_populates="doctor")
    specialization: Mapped["Specialization"] = relationship(back_populates="doctors")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="doctor")


# =====================
# ЗАПИСИ НА ПРИЁМ
# =====================

class Appointment(Base):
    __tablename__ = "appointment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.user_id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.user_id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    complaints: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (UniqueConstraint("doctor_id", "start_time", name="unique_doctor_time"),)

    patient: Mapped["Patient"] = relationship(back_populates="appointments")
    doctor: Mapped["Doctor"] = relationship(back_populates="appointments")
    status: Mapped["Status"] = relationship(back_populates="appointments")


# =====================
# ИИ-МОДУЛЬ
# =====================

class AiModel(Base):
    __tablename__ = "ai_model"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str | None] = mapped_column(String(50))
    trained_at: Mapped[datetime | None] = mapped_column(DateTime)
    accuracy: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (CheckConstraint("status IN ('active', 'inactive')", name="check_ai_model_status"),)

    questionnaires: Mapped[list["AiQuestionnaire"]] = relationship(back_populates="model")


class Symptom(Base):
    __tablename__ = "symptom"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    body_part: Mapped[str | None] = mapped_column(String(100))

    questions: Mapped[list["Question"]] = relationship(back_populates="symptom")


class Question(Base):
    __tablename__ = "question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    symptom_id: Mapped[int | None] = mapped_column(ForeignKey("symptom.id", ondelete="SET NULL"))
    is_initial: Mapped[bool] = mapped_column(Boolean, default=False)

    symptom: Mapped["Symptom | None"] = relationship(back_populates="questions")
    answers: Mapped[list["QuestionnaireAnswer"]] = relationship(back_populates="question")


class AiQuestionnaire(Base):
    __tablename__ = "ai_questionnaire"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.user_id", ondelete="CASCADE"), nullable=False)
    model_id: Mapped[int | None] = mapped_column(ForeignKey("ai_model.id"))
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_result: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (CheckConstraint("duration_days >= 0", name="check_duration_days"),)

    patient: Mapped["Patient"] = relationship(back_populates="questionnaires")
    model: Mapped["AiModel | None"] = relationship(back_populates="questionnaires")
    answers: Mapped[list["QuestionnaireAnswer"]] = relationship(back_populates="questionnaire")
    training_data: Mapped[list["AiTrainingData"]] = relationship(back_populates="questionnaire")


class QuestionnaireAnswer(Base):
    __tablename__ = "questionnaire_answer"

    questionnaire_id: Mapped[int] = mapped_column(ForeignKey("ai_questionnaire.id", ondelete="CASCADE"), primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id", ondelete="CASCADE"), primary_key=True)
    answer: Mapped[bool] = mapped_column(Boolean, nullable=False)

    questionnaire: Mapped["AiQuestionnaire"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")


class AiTrainingData(Base):
    __tablename__ = "ai_training_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    questionnaire_id: Mapped[int | None] = mapped_column(ForeignKey("ai_questionnaire.id", ondelete="SET NULL"))
    final_doctor_diagnosis: Mapped[str | None] = mapped_column(String(100))
    ai_prediction: Mapped[str | None] = mapped_column(String(100))
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    questionnaire: Mapped["AiQuestionnaire | None"] = relationship(back_populates="training_data")


# =====================
# ЖУРНАЛ ДЕЙСТВИЙ
# =====================

class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"))
    action_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    object_type: Mapped[str] = mapped_column(String(100), nullable=False)
    object_id: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")
