from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import Interaction, InteractionType, User, Question
from app.schemas.interaction_schemas import InteractionCreate, InteractionResponse
from app.algorithms import WEIGHT_UPVOTE, WEIGHT_SAVE, CREDIBILITY_MULTIPLIER_BASE, CREDIBILITY_MULTIPLIER_HIGH, calculate_wilson_score, calculate_decayed_gravity
from uuid import UUID

router = APIRouter(prefix="/interactions", tags=["interactions"])

@router.post("/", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(interaction_in: InteractionCreate, db: AsyncSession = Depends(get_db)):
    # Quick fix for demo UI: if user doesn't exist, create them for demo purposes
    if interaction_in.user_id == UUID("00000000-0000-0000-0000-000000000000"):
        user_result = await db.execute(select(User).filter(User.id == interaction_in.user_id))
        user = user_result.scalars().first()
        if not user:
            user = User(id=interaction_in.user_id, username="demo_user", credibility_tier=1)
            db.add(user)
            await db.commit()

    user_result = await db.execute(select(User).filter(User.id == interaction_in.user_id))
    user = user_result.scalars().first()
    if not user: raise HTTPException(status_code=404, detail="User not found")

    question_result = await db.execute(select(Question).filter(Question.id == interaction_in.question_id))
    question = question_result.scalars().first()
    if not question: raise HTTPException(status_code=404, detail="Question not found")

    existing_result = await db.execute(
        select(Interaction).filter(
            Interaction.user_id == user.id,
            Interaction.question_id == question.id,
            Interaction.interaction_type == interaction_in.interaction_type
        )
    )
    if existing_result.scalars().first():
        raise HTTPException(status_code=400, detail="Interaction already exists")

    base_weight = WEIGHT_UPVOTE if interaction_in.interaction_type == InteractionType.UPVOTE else WEIGHT_SAVE
    multiplier = CREDIBILITY_MULTIPLIER_HIGH if user.credibility_tier > 1 else CREDIBILITY_MULTIPLIER_BASE
    applied_weight = base_weight * multiplier

    new_interaction = Interaction(
        user_id=user.id, question_id=question.id,
        interaction_type=interaction_in.interaction_type, weight_applied=applied_weight
    )

    # Update question score
    question.total_weighted_score += applied_weight

    # Recalculate algorithm scores synchronously since this is a simple testbed.
    # In a production app, this would be an async background task to prevent blocking.
    question.wilson_score = calculate_wilson_score(question.total_weighted_score, question.total_views)
    question.trending_score = calculate_decayed_gravity(question.total_weighted_score, question.created_at)

    db.add(new_interaction)
    await db.commit()
    await db.refresh(new_interaction)
    return new_interaction
