from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.models.models import Question
from app.schemas.schemas import QuestionResponse
from typing import List

router = APIRouter(prefix="/feed", tags=["feeds"])

@router.get("/trending", response_model=List[QuestionResponse])
async def get_trending_feed(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).order_by(desc(Question.trending_score)).limit(limit))
    return result.scalars().all()

@router.get("/best", response_model=List[QuestionResponse])
async def get_best_feed(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).order_by(desc(Question.wilson_score)).limit(limit))
    return result.scalars().all()
