"""
Migration: add topic_tags, technique_tags, difficulty to questions table.
Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.
"""
import asyncio
from app.db.database import engine

async def migrate():
    async with engine.begin() as conn:
        await conn.execute(__import__('sqlalchemy').text(
            "ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_tags JSONB"
        ))
        await conn.execute(__import__('sqlalchemy').text(
            "ALTER TABLE questions ADD COLUMN IF NOT EXISTS technique_tags JSONB"
        ))
        await conn.execute(__import__('sqlalchemy').text(
            "ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR"
        ))
    print("Migration complete.")

asyncio.run(migrate())
