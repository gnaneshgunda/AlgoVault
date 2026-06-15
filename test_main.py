import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import engine, Base

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    # Setup test database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_create_question():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/questions/", json={
            "original_url": "https://codeforces.com/problemset/problem/1/A",
            "title": "Theatre Square",
            "platform": "Codeforces"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Theatre Square"
        assert "normalized_url_hash" in data
