from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.database import get_db
from app.models.models import List, ListQuestion, Question, User, Interaction, InteractionType
from app.schemas.list_schemas import ListCreate, ListUpdate, ListResponse, ListDetailResponse, ListQuestionAdd
from app.algorithms import WEIGHT_SAVE, calculate_wilson_score, calculate_decayed_gravity
from app.gamification import get_weight_multiplier_for_rank
from app.tasks import background_update_user_rank
from app.api.auth import get_current_user
from uuid import UUID

router = APIRouter(
    prefix="/lists",
    tags=["lists"]
)

def _build_list_response(lst, question_count=0, owner_username=None):
    return ListResponse(
        id=lst.id,
        user_id=lst.user_id,
        title=lst.title,
        description=lst.description or "",
        is_public=lst.is_public,
        forked_from_list_id=lst.forked_from_list_id,
        created_at=lst.created_at,
        question_count=question_count,
        owner_username=owner_username,
    )


@router.put("/{list_id}", response_model=ListResponse)
async def update_list(
    list_id: UUID,
    list_in: ListUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(List).filter(List.id == list_id))
    lst = result.scalars().first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    if lst.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your list")

    if list_in.title is not None:
        lst.title = list_in.title
    if list_in.description is not None:
        lst.description = list_in.description
    if list_in.is_public is not None:
        lst.is_public = list_in.is_public

    await db.commit()
    await db.refresh(lst)

    count_result = await db.execute(
        select(func.count()).select_from(ListQuestion).filter(ListQuestion.list_id == lst.id)
    )
    count = count_result.scalar_one()

    return _build_list_response(lst, count, current_user.username)

@router.post("/", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
async def create_list(
    list_in: ListCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_list = List(
        user_id=current_user.id,
        title=list_in.title,
        description=list_in.description,
        is_public=list_in.is_public,
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    return _build_list_response(new_list, 0, current_user.username)


@router.get("/my", response_model=list[ListResponse])
async def get_my_lists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(List).filter(List.user_id == current_user.id).order_by(desc(List.created_at))
    )
    lists = result.scalars().all()

    responses = []
    for lst in lists:
        count_result = await db.execute(
            select(func.count()).select_from(ListQuestion).filter(ListQuestion.list_id == lst.id)
        )
        count = count_result.scalar_one()
        responses.append(_build_list_response(lst, count, current_user.username))
    return responses


@router.get("/containing-question/{question_id}", response_model=list[UUID])
async def get_lists_containing_question(
    question_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ListQuestion.list_id)
        .join(List, ListQuestion.list_id == List.id)
        .filter(List.user_id == current_user.id, ListQuestion.question_id == question_id)
    )
    return [row for row, in result.all()]


@router.get("/public", response_model=list[ListResponse])
async def get_public_lists(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(List).filter(List.is_public == True).order_by(desc(List.created_at)).offset(skip).limit(limit)
    )
    lists = result.scalars().all()

    responses = []
    for lst in lists:
        count_result = await db.execute(
            select(func.count()).select_from(ListQuestion).filter(ListQuestion.list_id == lst.id)
        )
        count = count_result.scalar_one()
        user_result = await db.execute(select(User.username).filter(User.id == lst.user_id))
        username = user_result.scalar_one_or_none() or "Unknown"
        responses.append(_build_list_response(lst, count, username))
    return responses


@router.get("/{list_id}", response_model=ListDetailResponse)
async def get_list_detail(
    list_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(List).filter(List.id == list_id))
    lst = result.scalars().first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Enforce private visibility
    if not lst.is_public and lst.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This list is private")

    # Get questions in this list
    lq_result = await db.execute(
        select(ListQuestion, Question)
        .join(Question, ListQuestion.question_id == Question.id)
        .filter(ListQuestion.list_id == list_id)
    )
    rows = lq_result.all()

    questions = []
    for lq, q in rows:
        questions.append({
            "id": str(q.id),
            "title": q.title,
            "original_url": q.original_url,
            "platform": q.platform,
            "total_weighted_score": q.total_weighted_score,
            "status": lq.status.value if lq.status else "To Do",
        })

    user_result = await db.execute(select(User.username).filter(User.id == lst.user_id))
    username = user_result.scalar_one_or_none() or "Unknown"

    return ListDetailResponse(
        id=lst.id,
        user_id=lst.user_id,
        title=lst.title,
        description=lst.description or "",
        is_public=lst.is_public,
        forked_from_list_id=lst.forked_from_list_id,
        created_at=lst.created_at,
        question_count=len(questions),
        owner_username=username,
        questions=questions,
    )


@router.post("/{list_id}/questions", status_code=status.HTTP_201_CREATED)
async def add_question_to_list(
    list_id: UUID,
    item: ListQuestionAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify list ownership
    result = await db.execute(select(List).filter(List.id == list_id))
    lst = result.scalars().first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    if lst.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your list")

    # Check question exists
    q_result = await db.execute(select(Question).filter(Question.id == item.question_id))
    if not q_result.scalars().first():
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if already in list
    existing = await db.execute(
        select(ListQuestion).filter(
            ListQuestion.list_id == list_id,
            ListQuestion.question_id == item.question_id
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Question already in list")

    lq = ListQuestion(list_id=list_id, question_id=item.question_id, status=item.status)
    db.add(lq)
    await db.commit()
    return {"message": "Question added to list"}


@router.patch("/{list_id}/questions/{question_id}/status")
async def update_question_status(
    list_id: UUID,
    question_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(List).filter(List.id == list_id))
    lst = result.scalars().first()
    if not lst or lst.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your list")

    lq_result = await db.execute(
        select(ListQuestion).filter(
            ListQuestion.list_id == list_id,
            ListQuestion.question_id == question_id
        )
    )
    lq = lq_result.scalars().first()
    if not lq:
        raise HTTPException(status_code=404, detail="Question not in list")

    lq.status = ListQuestionStatus.TODO if lq.status == ListQuestionStatus.SOLVED else ListQuestionStatus.SOLVED
    await db.commit()
    return {"status": lq.status.value}


@router.delete("/{list_id}/questions/{question_id}", status_code=status.HTTP_200_OK)
async def remove_question_from_list(
    list_id: UUID,
    question_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(List).filter(List.id == list_id))
    lst = result.scalars().first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    if lst.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your list")

    lq_result = await db.execute(
        select(ListQuestion).filter(
            ListQuestion.list_id == list_id,
            ListQuestion.question_id == question_id
        )
    )
    lq = lq_result.scalars().first()
    if not lq:
        raise HTTPException(status_code=404, detail="Question not in list")

    await db.delete(lq)
    await db.commit()
    return {"message": "Question removed from list"}


@router.post("/{list_id}/fork", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
async def fork_list(
    list_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(List).filter(List.id == list_id))
    original_list = result.scalars().first()
    if not original_list:
        raise HTTPException(status_code=404, detail="Original list not found")

    if not original_list.is_public and original_list.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot fork a private list")

    new_list = List(
        user_id=current_user.id,
        title=f"Fork of {original_list.title}",
        description=original_list.description or "",
        is_public=False,
        forked_from_list_id=original_list.id
    )
    db.add(new_list)
    await db.flush()

    # Copy all questions and create Save interactions for each
    lq_result = await db.execute(select(ListQuestion).filter(ListQuestion.list_id == list_id))
    original_lqs = lq_result.scalars().all()

    for olq in original_lqs:
        new_lq = ListQuestion(
            list_id=new_list.id,
            question_id=olq.question_id,
            status=olq.status
        )
        db.add(new_lq)

        # Create implicit Save interaction (fork = save signal)
        existing_interaction = await db.execute(
            select(Interaction).filter(
                Interaction.user_id == current_user.id,
                Interaction.question_id == olq.question_id,
                Interaction.interaction_type == InteractionType.SAVE
            )
        )
        if not existing_interaction.scalars().first():
            multiplier = get_weight_multiplier_for_rank(current_user.rank_tier)
            weight = WEIGHT_SAVE * multiplier

            save_interaction = Interaction(
                user_id=current_user.id,
                question_id=olq.question_id,
                interaction_type=InteractionType.SAVE,
                weight_applied=weight
            )
            db.add(save_interaction)

            # Update question scores
            q_result = await db.execute(select(Question).filter(Question.id == olq.question_id))
            question = q_result.scalars().first()
            if question:
                question.total_weighted_score += weight
                question.wilson_score = calculate_wilson_score(question.total_weighted_score, question.total_views)
                question.trending_score = calculate_decayed_gravity(question.total_weighted_score, question.created_at)

    await db.commit()
    await db.refresh(new_list)

    # Trigger rank recalculation for original list owner
    background_tasks.add_task(background_update_user_rank, original_list.user_id)

    count_result = await db.execute(
        select(func.count()).select_from(ListQuestion).filter(ListQuestion.list_id == new_list.id)
    )
    count = count_result.scalar_one()

    return _build_list_response(new_list, count, current_user.username)
