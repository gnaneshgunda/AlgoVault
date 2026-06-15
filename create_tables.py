from app.models.models import Base
from app.db.database import engine
import asyncio

async def make_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(make_tables())
