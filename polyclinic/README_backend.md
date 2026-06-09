# Polyclinic Backend

Бэкенд информационной системы записи пациентов к врачам с AI-ассистентом подбора специализации.

## Технологии

* FastAPI — основной фреймворк
* SQLAlchemy (async) — ORM для работы с базой данных
* PostgreSQL — основная база данных
* Alembic — миграции базы данных
* scikit-learn — ML-модель для подбора специализации врача
* python-jose — JWT-аутентификация
* Uvicorn — ASGI-сервер
* pytest + pytest-asyncio — тестирование

## Установка и запуск

### Предварительные требования

* Docker и Docker Compose

### Настройка

1. Создайте файл `.env` на основе `.env.example`:

```
cp .env.example .env
```

2. Укажите необходимые переменные: `POSTGRES_*`, `SECRET_KEY`, `SMTP_*`.

### Запуск

Запуск всего стека (БД + бэкенд + фронтенд):

```
docker compose up -d
```

API будет доступен по адресу `http://localhost:8000`.

Интерактивная документация: `http://localhost:8000/docs`.

## Структура проекта

* `app/routers/` — эндпоинты: `auth`, `users`, `doctors`, `appointments`, `ai`
* `app/models/` — модели SQLAlchemy
* `app/schemas/` — Pydantic-схемы
* `app/core/` — зависимости, ML-модель, вспомогательные утилиты
* `app/db/` — подключение к базе данных
* `schema.sql` — DDL схемы базы данных
* `seed.sql` — начальные данные
* `train_model.py` — обучение ML-модели подбора специализации
* `generate_training_data.py` — генерация обучающих данных
* `models_store/` — сохранённые ML-модели
* `tests/` — тесты API
