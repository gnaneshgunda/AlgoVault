from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.models.models import Question, User
from app.schemas.schemas import QuestionResponse
from typing import List

router = APIRouter(prefix="/feed", tags=["feeds"])

async def _enrich_questions(questions, db):
    """Add submitter usernames and increment view counts."""
    responses = []
    for q in questions:
        # Increment views
        q.total_views += 1

        user_result = await db.execute(select(User.username).filter(User.id == q.submitter_id))
        username = user_result.scalar_one_or_none() or "Unknown"

        responses.append(QuestionResponse(
            id=q.id,
            submitter_id=q.submitter_id,
            original_url=q.original_url,
            title=q.title,
            platform=q.platform,
            normalized_url_hash=q.normalized_url_hash,
            total_views=q.total_views,
            total_weighted_score=q.total_weighted_score,
            trending_score=q.trending_score,
            wilson_score=q.wilson_score,
            created_at=q.created_at,
            submitter_username=username,
        ))

    await db.commit()
    return responses

@router.get("/trending", response_model=List[QuestionResponse])
async def get_trending_feed(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Question).order_by(desc(Question.trending_score)).offset(skip).limit(limit)
    )
    questions = result.scalars().all()
    return await _enrich_questions(questions, db)

@router.get("/best", response_model=List[QuestionResponse])
async def get_best_feed(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Question).order_by(desc(Question.wilson_score)).offset(skip).limit(limit)
    )
    questions = result.scalars().all()
    return await _enrich_questions(questions, db)
