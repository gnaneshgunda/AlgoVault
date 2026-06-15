from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.models.models import User, Question, Interaction, List
from app.schemas.user_schemas import UserResponse, UserStatsUpdate, UserProfileResponse, TIER_COLORS
from app.tasks import background_update_user_rank, background_sync_ratings
from app.api.auth import get_current_user
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

def _build_user_response(user):
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        cf_handle=user.cf_handle,
        lc_handle=user.lc_handle,
        ac_handle=user.ac_handle,
        cses_handle=user.cses_handle,
        codeforces_rating=user.codeforces_rating,
        leetcode_solved=user.leetcode_solved,
        atcoder_rating=user.atcoder_rating,
        cses_solved=user.cses_solved,
        solving_score=user.solving_score,
        curation_score=user.curation_score,
        total_rating=user.total_rating,
        rank_tier=user.rank_tier,
        tier_color=TIER_COLORS.get(user.rank_tier, '#808080'),
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.last_rating_update:
        background_tasks.add_task(background_sync_ratings, current_user.id)
    else:
        last_update = current_user.last_rating_update
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        if (datetime.now(timezone.utc) - last_update).total_seconds() > 86400:
            background_tasks.add_task(background_sync_ratings, current_user.id)

    q_count = await db.execute(
        select(func.count()).select_from(Question).filter(Question.submitter_id == current_user.id)
    )
    l_count = await db.execute(
        select(func.count()).select_from(List).filter(List.user_id == current_user.id)
    )
    saves_count = await db.execute(
        select(func.count()).select_from(Interaction)
        .join(Question, Interaction.question_id == Question.id)
        .filter(Question.submitter_id == current_user.id)
    )

    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        cf_handle=current_user.cf_handle,
        lc_handle=current_user.lc_handle,
        ac_handle=current_user.ac_handle,
        cses_handle=current_user.cses_handle,
        codeforces_rating=current_user.codeforces_rating,
        leetcode_solved=current_user.leetcode_solved,
        atcoder_rating=current_user.atcoder_rating,
        cses_solved=current_user.cses_solved,
        solving_score=current_user.solving_score,
        curation_score=current_user.curation_score,
        total_rating=current_user.total_rating,
        rank_tier=current_user.rank_tier,
        tier_color=TIER_COLORS.get(current_user.rank_tier, '#808080'),
        created_at=current_user.created_at,
        questions_submitted=q_count.scalar_one(),
        lists_created=l_count.scalar_one(),
        total_saves_received=saves_count.scalar_one(),
    )


@router.put("/me/stats", response_model=UserResponse)
async def update_my_stats(
    stats_in: UserStatsUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    update_data = stats_in.model_dump(exclude_unset=True)

    handles_changed = False
    for key, value in update_data.items():
        if getattr(current_user, key) != value:
            setattr(current_user, key, value)
            if key in ['cf_handle', 'lc_handle', 'ac_handle', 'cses_handle']:
                handles_changed = True

    await db.commit()
    await db.refresh(current_user)

    if handles_changed:
        background_tasks.add_task(background_sync_ratings, current_user.id)
    else:
        background_tasks.add_task(background_update_user_rank, current_user.id)

    return _build_user_response(current_user)


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    q_count = await db.execute(
        select(func.count()).select_from(Question).filter(Question.submitter_id == user_id)
    )
    l_count = await db.execute(
        select(func.count()).select_from(List).filter(List.user_id == user_id)
    )
    saves_count = await db.execute(
        select(func.count()).select_from(Interaction)
        .join(Question, Interaction.question_id == Question.id)
        .filter(Question.submitter_id == user_id)
    )

    return UserProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        cf_handle=user.cf_handle,
        lc_handle=user.lc_handle,
        ac_handle=user.ac_handle,
        cses_handle=user.cses_handle,
        codeforces_rating=user.codeforces_rating,
        leetcode_solved=user.leetcode_solved,
        atcoder_rating=user.atcoder_rating,
        cses_solved=user.cses_solved,
        solving_score=user.solving_score,
        curation_score=user.curation_score,
        total_rating=user.total_rating,
        rank_tier=user.rank_tier,
        tier_color=TIER_COLORS.get(user.rank_tier, '#808080'),
        created_at=user.created_at,
        questions_submitted=q_count.scalar_one(),
        lists_created=l_count.scalar_one(),
        total_saves_received=saves_count.scalar_one(),
    )
