import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def send_email(to: str, subject: str, body: str) -> None:
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    context = ssl.create_default_context()

    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], to, msg.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], to, msg.as_string())


def send_verification_email(to: str, token: str) -> None:
    url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    body = f"""
    <h2>Подтверждение email</h2>
    <p>Для подтверждения аккаунта перейдите по ссылке:</p>
    <a href="{url}">{url}</a>
    <p>Ссылка действительна 24 часа.</p>
    """
    send_email(to, "Подтверждение email — Поликлиника", body)


def send_reset_email(to: str, token: str) -> None:
    url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    body = f"""
    <h2>Восстановление пароля</h2>
    <p>Для сброса пароля перейдите по ссылке:</p>
    <a href="{url}">{url}</a>
    <p>Ссылка действительна 1 час.</p>
    """
    send_email(to, "Восстановление пароля — Поликлиника", body)