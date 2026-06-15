import os
# Force testing to use an isolated local SQLite database to prevent dropping production tables
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_isolated.db"

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


async def register_user(ac, username="testuser", email="test@test.com", password="testpass123"):
    """Helper to register a user and return the token + user_id"""
    res = await ac.post("/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    assert res.status_code == 201
    data = res.json()
    return data["access_token"], data["user_id"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_auth_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register
        token, user_id = await register_user(ac)
        assert token

        # Login
        login_res = await ac.post("/auth/login", json={
            "username": "testuser",
            "password": "testpass123"
        })
        assert login_res.status_code == 200
        assert login_res.json()["access_token"]

        # Get profile
        me_res = await ac.get("/users/me", headers=auth_headers(token))
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "testuser"
        assert me_res.json()["rank_tier"] == "Scripter"


@pytest.mark.asyncio
async def test_full_gamification_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register user
        token, user_id = await register_user(ac, "grandmaster_user", "gm@test.com", "pass123")

        # 2. Update Stats
        stats_res = await ac.put("/users/me/stats", json={
            "codeforces_rating": 3000,
            "leetcode_solved": 1000,
            "atcoder_rating": 2800,
            "cses_solved": 200
        }, headers=auth_headers(token))
        assert stats_res.status_code == 200

        await asyncio.sleep(0.5)

        # 3. Create a Question
        q_res = await ac.post("/questions/", json={
            "original_url": "https://codeforces.com/contest/1/problem/A",
            "title": "Theatre Square"
        }, headers=auth_headers(token))
        assert q_res.status_code == 201
        q_id = q_res.json()["id"]
        assert q_res.json()["platform"] == "Codeforces"  # Auto-detected!

        # Check normalization
        assert isinstance(q_res.json()["normalized_url_hash"], str)
        assert len(q_res.json()["normalized_url_hash"]) == 64

        # Wait for background task to update user rank and verify the new curation score
        await asyncio.sleep(0.5)
        profile_res = await ac.get("/users/me", headers=auth_headers(token))
        assert profile_res.status_code == 200
        # 1 submission should give 10 * sqrt(1) = 10 curation score
        assert profile_res.json()["curation_score"] == 10

        # 4. Create second user and interact
        token2, u2_id = await register_user(ac, "noob", "noob@test.com", "pass456")

        int_res = await ac.post("/interactions/", json={
            "question_id": q_id,
            "interaction_type": "Upvote"
        }, headers=auth_headers(token2))
        assert int_res.status_code == 201

        # Delete interaction (undo upvote)
        del_res = await ac.delete("/interactions/", params={
            "question_id": q_id,
            "interaction_type": "Upvote"
        }, headers=auth_headers(token2))
        assert del_res.status_code == 204

        # 5. Check feeds
        trending = await ac.get("/feed/trending")
        assert trending.status_code == 200
        assert len(trending.json()) > 0

        best = await ac.get("/feed/best")
        assert best.status_code == 200


@pytest.mark.asyncio
async def test_list_management():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token, user_id = await register_user(ac)

        # Create a list
        list_res = await ac.post("/lists/", json={
            "title": "Hard DP Problems",
            "description": "Collection of hard DP questions",
            "is_public": True
        }, headers=auth_headers(token))
        assert list_res.status_code == 201
        list_id = list_res.json()["id"]

        # Create a question
        q_res = await ac.post("/questions/", json={
            "original_url": "https://leetcode.com/problems/two-sum/",
            "title": "Two Sum"
        }, headers=auth_headers(token))
        q_id = q_res.json()["id"]

        # Add question to list
        add_res = await ac.post(f"/lists/{list_id}/questions", json={
            "question_id": q_id
        }, headers=auth_headers(token))
        assert add_res.status_code == 201

        # Get list detail
        detail_res = await ac.get(f"/lists/{list_id}", headers=auth_headers(token))
        assert detail_res.status_code == 200
        assert detail_res.json()["question_count"] == 1

        # Fork the list as another user
        token2, _ = await register_user(ac, "user2", "user2@test.com", "pass789")
        fork_res = await ac.post(f"/lists/{list_id}/fork", headers=auth_headers(token2))
        assert fork_res.status_code == 201
        assert "Fork of" in fork_res.json()["title"]
