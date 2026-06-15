from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.models.models import Question, User, Interaction, InteractionType
from app.schemas.schemas import QuestionResponse
from typing import List
from app.api.auth import get_optional_current_user

router = APIRouter(prefix="/feed", tags=["feeds"])

async def _enrich_questions(questions, db, current_user=None):
    """Add submitter usernames and check if current user has interacted."""
    responses = []

    # Pre-fetch user interactions if logged in
    user_interactions_map = {}
    if current_user:
        question_ids = [q.id for q in questions]
        interactions_result = await db.execute(
            select(Interaction).filter(
                Interaction.user_id == current_user.id,
                Interaction.question_id.in_(question_ids)
            )
        )
        for interaction in interactions_result.scalars().all():
            if interaction.question_id not in user_interactions_map:
                user_interactions_map[interaction.question_id] = set()
            user_interactions_map[interaction.question_id].add(interaction.interaction_type)

    for q in questions:
        user_result = await db.execute(select(User.username).filter(User.id == q.submitter_id))
        username = user_result.scalar_one_or_none() or "Unknown"

        has_upvoted = False
        has_saved = False
        if current_user and q.id in user_interactions_map:
            types = user_interactions_map[q.id]
            if InteractionType.UPVOTE in types:
                has_upvoted = True
            if InteractionType.SAVE in types:
                has_saved = True

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
            has_upvoted=has_upvoted,
            has_saved=has_saved
        ))

    return responses

@router.get("/trending", response_model=List[QuestionResponse])
async def get_trending_feed(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_optional_current_user)):
    result = await db.execute(
        select(Question).order_by(desc(Question.trending_score)).offset(skip).limit(limit)
    )
    questions = result.scalars().all()
    return await _enrich_questions(questions, db, current_user)

@router.get("/best", response_model=List[QuestionResponse])
async def get_best_feed(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_optional_current_user)):
    result = await db.execute(
        select(Question).order_by(desc(Question.wilson_score)).offset(skip).limit(limit)
    )
    questions = result.scalars().all()
    return await _enrich_questions(questions, db, current_user)
