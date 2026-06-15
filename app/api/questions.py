from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import Question, User
from app.schemas.schemas import QuestionCreate, QuestionResponse
from app.utils import normalize_and_hash_url
from app.parsers import auto_detect_platform
from app.tasks import background_update_user_rank
from app.api.auth import get_current_user
from uuid import UUID

router = APIRouter(
    prefix="/questions",
    tags=["questions"]
)

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question_in: QuestionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Auto-detect platform from URL if not provided
    platform = question_in.platform or auto_detect_platform(question_in.original_url)

    url_hash = normalize_and_hash_url(question_in.original_url, platform)

    result = await db.execute(select(Question).filter(Question.normalized_url_hash == url_hash))
    existing_question = result.scalars().first()

    if existing_question:
        return QuestionResponse(
            id=existing_question.id,
            submitter_id=existing_question.submitter_id,
            original_url=existing_question.original_url,
            title=existing_question.title,
            platform=existing_question.platform,
            normalized_url_hash=existing_question.normalized_url_hash,
            total_views=existing_question.total_views,
            total_weighted_score=existing_question.total_weighted_score,
            trending_score=existing_question.trending_score,
            wilson_score=existing_question.wilson_score,
            created_at=existing_question.created_at,
            submitter_username=current_user.username,
        )

    new_question = Question(
        submitter_id=current_user.id,
        normalized_url_hash=url_hash,
        original_url=question_in.original_url,
        title=question_in.title,
        platform=platform
    )

    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)

    background_tasks.add_task(background_update_user_rank, current_user.id)

    return QuestionResponse(
        id=new_question.id,
        submitter_id=new_question.submitter_id,
        original_url=new_question.original_url,
        title=new_question.title,
        platform=new_question.platform,
        normalized_url_hash=new_question.normalized_url_hash,
        total_views=new_question.total_views,
        total_weighted_score=new_question.total_weighted_score,
        trending_score=new_question.trending_score,
        wilson_score=new_question.wilson_score,
        created_at=new_question.created_at,
        submitter_username=current_user.username,
    )

@router.get("/", response_model=list[QuestionResponse])
async def list_questions(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Question).offset(skip).limit(limit)
    )
    questions = result.scalars().all()

    responses = []
    for q in questions:
        # Get submitter username
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
    return responses
