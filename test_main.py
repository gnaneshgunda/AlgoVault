import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import engine, Base

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_full_gamification_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create a User
        user_res = await ac.post("/users/", json={"username": "grandmaster_user"})
        assert user_res.status_code == 201
        user_id = user_res.json()["id"]

        # 2. Update Stats
        stats_res = await ac.put(f"/users/{user_id}/stats", json={
            "codeforces_rating": 3000,
            "leetcode_solved": 1000,
            "atcoder_rating": 2800,
            "cses_solved": 200
        })
        assert stats_res.status_code == 200

        # Wait a tiny bit for the background task
        await asyncio.sleep(0.5)

        # 3. Create a Question
        q_res = await ac.post("/questions/", json={
            "submitter_id": user_id,
            "original_url": "https://codeforces.com/contest/1/problem/A",
            "title": "Theatre Square",
            "platform": "Codeforces"
        })
        assert q_res.status_code == 201
        q_id = q_res.json()["id"]

        # Check normalization worked. We hash the canonical url, so it's a hex string
        assert isinstance(q_res.json()["normalized_url_hash"], str)
        assert len(q_res.json()["normalized_url_hash"]) == 64

        # 4. Create another user to upvote
        user2_res = await ac.post("/users/", json={"username": "noob"})
        u2_id = user2_res.json()["id"]

        int_res = await ac.post("/interactions/", json={
            "user_id": u2_id,
            "question_id": q_id,
            "interaction_type": "Upvote"
        })
        assert int_res.status_code == 201
