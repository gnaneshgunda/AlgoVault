from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import List, ListQuestion
from app.schemas.list_schemas import ListCreate, ListResponse
from uuid import UUID

router = APIRouter(
    prefix="/lists",
    tags=["lists"]
)

@router.post("/{user_id}", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
async def create_list(user_id: UUID, list_in: ListCreate, db: AsyncSession = Depends(get_db)):
    new_list = List(**list_in.model_dump(), user_id=user_id)
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    return new_list

@router.post("/{list_id}/fork/{new_user_id}", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
async def fork_list(list_id: UUID, new_user_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(List).filter(List.id == list_id))
    original_list = result.scalars().first()
    if not original_list:
        raise HTTPException(status_code=404, detail="Original list not found")

    new_list = List(
        user_id=new_user_id,
        title=f"Fork of {original_list.title}",
        is_public=False,
        forked_from_list_id=original_list.id
    )
    db.add(new_list)
    await db.flush()

    lq_result = await db.execute(select(ListQuestion).filter(ListQuestion.list_id == list_id))
    original_lqs = lq_result.scalars().all()

    for olq in original_lqs:
        new_lq = ListQuestion(
            list_id=new_list.id,
            question_id=olq.question_id,
            status=olq.status
        )
        db.add(new_lq)

    await db.commit()
    await db.refresh(new_list)
    return new_list
