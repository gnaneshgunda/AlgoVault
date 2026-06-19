from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.models.models import Question, User, Interaction, InteractionType, SolvedQuestion
from app.schemas.schemas import QuestionResponse
from typing import List, Optional
from app.api.auth import get_optional_current_user

router = APIRouter(prefix="/feed", tags=["feeds"])

async def _enrich_questions(questions, db, current_user=None):
    responses = []
    user_interactions_map = {}
    solved_set = set()
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

        solved_result = await db.execute(
            select(SolvedQuestion.question_id).filter(
                SolvedQuestion.user_id == current_user.id,
                SolvedQuestion.question_id.in_(question_ids)
            )
        )
        solved_set = {row for row, in solved_result.all()}

    for q in questions:
        user_result = await db.execute(select(User.username).filter(User.id == q.submitter_id))
        username = user_result.scalar_one_or_none() or "Unknown"
        has_upvoted = False
        has_saved = False
        if current_user and q.id in user_interactions_map:
            types = user_interactions_map[q.id]
            has_upvoted = InteractionType.UPVOTE in types
            has_saved = InteractionType.SAVE in types

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
            has_saved=has_saved,
            has_solved=q.id in solved_set,
            topic_tags=q.topic_tags,
            technique_tags=q.technique_tags,
            difficulty=q.difficulty,
        ))
    return responses


def _apply_tag_filters(stmt, topic_tags, technique_tags, difficulty):
    """Filter in Python after fetch since SQLite JSON support is limited."""
    return stmt  # filtering done post-fetch below


async def _fetch_filtered(db, order_col, skip, limit, topic_tags, technique_tags, difficulty):
    # Fetch more than needed to account for post-filtering, then slice
    fetch_limit = limit * 10 if (topic_tags or technique_tags or difficulty) else limit
    result = await db.execute(
        select(Question).order_by(desc(order_col)).limit(fetch_limit)
    )
    questions = result.scalars().all()

    if topic_tags:
        questions = [q for q in questions if q.topic_tags and any(t in q.topic_tags for t in topic_tags)]
    if technique_tags:
        questions = [q for q in questions if q.technique_tags and any(t in q.technique_tags for t in technique_tags)]
    if difficulty:
        questions = [q for q in questions if q.difficulty == difficulty]

    return questions[skip: skip + limit]


@router.get("/trending", response_model=List[QuestionResponse])
async def get_trending_feed(
    skip: int = 0,
    limit: int = 20,
    topic_tags: Optional[List[str]] = Query(default=None),
    technique_tags: Optional[List[str]] = Query(default=None),
    difficulty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    questions = await _fetch_filtered(db, Question.trending_score, skip, limit, topic_tags, technique_tags, difficulty)
    return await _enrich_questions(questions, db, current_user)


@router.get("/best", response_model=List[QuestionResponse])
async def get_best_feed(
    skip: int = 0,
    limit: int = 20,
    topic_tags: Optional[List[str]] = Query(default=None),
    technique_tags: Optional[List[str]] = Query(default=None),
    difficulty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    questions = await _fetch_filtered(db, Question.wilson_score, skip, limit, topic_tags, technique_tags, difficulty)
    return await _enrich_questions(questions, db, current_user)
