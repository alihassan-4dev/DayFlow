import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_dayflow.db"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["GROQ_API_KEY"] = ""
os.environ["MEM0_API_KEY"] = ""

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.base import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
async def clean_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    res = await client.post(
        "/auth/signup",
        json={"name": "Test", "email": "test@example.com", "password": "password123"},
    )
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}
