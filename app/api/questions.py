from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import Question
from app.schemas.schemas import QuestionCreate, QuestionResponse
from app.utils import normalize_and_hash_url

router = APIRouter(
    prefix="/questions",
    tags=["questions"]
)

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(question_in: QuestionCreate, db: AsyncSession = Depends(get_db)):
    url_hash = normalize_and_hash_url(question_in.original_url)

    result = await db.execute(select(Question).filter(Question.normalized_url_hash == url_hash))
    existing_question = result.scalars().first()

    if existing_question:
        return existing_question

    new_question = Question(
        normalized_url_hash=url_hash,
        original_url=question_in.original_url,
        title=question_in.title,
        platform=question_in.platform
    )

    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)

    return new_question
