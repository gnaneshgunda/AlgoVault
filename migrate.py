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
        await conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS solved_questions (
                user_id UUID NOT NULL REFERENCES users(id),
                question_id UUID NOT NULL REFERENCES questions(id),
                solved_at TIMESTAMPTZ DEFAULT now(),
                PRIMARY KEY (user_id, question_id)
            )
        """))
    print("Migration complete.")

asyncio.run(migrate())
