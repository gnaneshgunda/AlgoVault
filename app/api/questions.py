from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import Question, User
from app.schemas.schemas import QuestionCreate, QuestionResponse
from app.utils import normalize_and_hash_url
from app.tasks import background_update_user_rank
from uuid import UUID

router = APIRouter(
    prefix="/questions",
    tags=["questions"]
)

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(question_in: QuestionCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Demo fix: create dummy user if it doesn't exist
    if question_in.submitter_id == UUID("00000000-0000-0000-0000-000000000000"):
        user_result = await db.execute(select(User).filter(User.id == question_in.submitter_id))
        user = user_result.scalars().first()
        if not user:
            user = User(id=question_in.submitter_id, username="demo_user", rank_tier='Scripter')
            db.add(user)
            await db.commit()

    user_result = await db.execute(select(User).filter(User.id == question_in.submitter_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Submitter not found")

    url_hash = normalize_and_hash_url(question_in.original_url, question_in.platform)

    result = await db.execute(select(Question).filter(Question.normalized_url_hash == url_hash))
    existing_question = result.scalars().first()

    if existing_question:
        return existing_question

    new_question = Question(
        submitter_id=question_in.submitter_id,
        normalized_url_hash=url_hash,
        original_url=question_in.original_url,
        title=question_in.title,
        platform=question_in.platform
    )

    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)

    background_tasks.add_task(background_update_user_rank, user.id)

    return new_question
