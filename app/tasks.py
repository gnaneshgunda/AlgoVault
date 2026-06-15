import asyncio
from uuid import UUID
from app.db.database import AsyncSessionLocal
from app.gamification import update_user_rank
from app.services.rating_sync import sync_user_ratings
from sqlalchemy import select
from app.models.models import User

async def background_update_user_rank(user_id: UUID):
    async with AsyncSessionLocal() as session:
        await update_user_rank(user_id, session)

async def background_sync_ratings(user_id: UUID):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
        if user:
            updated = await sync_user_ratings(user)
            if updated:
                await session.commit()
                await update_user_rank(user_id, session)
            else:
                # Even if no rating changed, we still want to save the `last_rating_update` timestamp
                await session.commit()
