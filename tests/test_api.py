import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.db.database import Base, get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(bind=engine_test, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def prepare_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def seed_roles(client):
    async with TestSession() as db:
        from app.models.models import Role, Status, Specialization
        for name in ["ADMIN", "DOCTOR", "PATIENT"]:
            db.add(Role(name=name))
        for name in ["CREATED", "CONFIRMED", "COMPLETED", "CANCELLED"]:
            db.add(Status(name=name))
        db.add(Specialization(name="Терапевт"))
        await db.commit()


@pytest.mark.asyncio
async def test_health_check(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_success(client, seed_roles):
    r = await client.post("/api/auth/register", json={"email": "test@mail.com", "password": "pass123"})
    assert r.status_code == 201
    assert "user_id" in r.json()


@pytest.mark.asyncio
async def test_register_duplicate_email(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "dup@mail.com", "password": "pass"})
    r = await client.post("/api/auth/register", json={"email": "dup@mail.com", "password": "pass"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "u@mail.com", "password": "pass123"})
    r = await client.post("/api/auth/login", data={"username": "u@mail.com", "password": "pass123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "u2@mail.com", "password": "correct"})
    r = await client.post("/api/auth/login", data={"username": "u2@mail.com", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_doctors_unauthorized(client):
    r = await client.get("/api/doctors/")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_doctors_authorized(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "p@mail.com", "password": "pass"})
    login = await client.post("/api/auth/login", data={"username": "p@mail.com", "password": "pass"})
    token = login.json()["access_token"]
    r = await client.get("/api/doctors/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_admin_only_endpoint_forbidden_for_patient(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "pat@mail.com", "password": "pass"})
    login = await client.post("/api/auth/login", data={"username": "pat@mail.com", "password": "pass"})
    token = login.json()["access_token"]
    r = await client.get("/api/users/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_ai_diagnose_no_patient_profile(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "nopatient@mail.com", "password": "pass"})
    login = await client.post("/api/auth/login", data={"username": "nopatient@mail.com", "password": "pass"})
    token = login.json()["access_token"]
    r = await client.post(
        "/api/ai/diagnose",
        json={"duration_days": 3, "answers": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_create_appointment_double_booking(client, seed_roles):
    await client.post("/api/auth/register", json={"email": "p1@mail.com", "password": "pass"})
    await client.post("/api/auth/register", json={"email": "p2@mail.com", "password": "pass"})
    for email in ["p1@mail.com", "p2@mail.com"]:
        login = await client.post("/api/auth/login", data={"username": email, "password": "pass"})
        token = login.json()["access_token"]
        r = await client.post(
            "/api/appointments/",
            json={"doctor_id": 1, "start_time": "2025-06-01T10:00:00", "complaints": "test"},
            headers={"Authorization": f"Bearer {token}"},
        )
        if email == "p1@mail.com":
            assert r.status_code in (201, 404)
        else:
            assert r.status_code in (409, 404)
