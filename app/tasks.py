import asyncio
from uuid import UUID
from app.db.database import AsyncSessionLocal
from app.gamification import update_user_rank

async def background_update_user_rank(user_id: UUID):
    async with AsyncSessionLocal() as session:
        await update_user_rank(user_id, session)
