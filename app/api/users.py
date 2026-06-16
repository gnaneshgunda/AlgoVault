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
import httpx, re

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


@router.get("/cses-proxy")
async def cses_proxy(user_id: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://cses.fi/user/{user_id}",
                headers={'User-Agent': 'Mozilla/5.0'},
            )
            if resp.status_code == 200:
                m = re.search(r'Submission count:</td><td\s*>\s*(\d+)', resp.text)
                return {"solved": int(m.group(1)) if m else 0}
    except Exception:
        pass
    return {"solved": 0}


@router.get("/leetcode-proxy")
async def leetcode_proxy(handle: str):
    try:
        query = '{matchedUser(username:"%s"){submitStats{acSubmissionNum{difficulty count}}}}' % handle.lstrip('@').strip()
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://leetcode.com/graphql",
                json={"query": query},
                headers={
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/json',
                    'Referer': 'https://leetcode.com',
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                stats = data.get("data", {}).get("matchedUser", {}) or {}
                for s in (stats.get("submitStats") or {}).get("acSubmissionNum", []):
                    if s["difficulty"] == "All":
                        return {"solved": s["count"]}
    except Exception:
        pass
    return {"solved": 0}


@router.get("/atcoder-proxy")
async def atcoder_proxy(handle: str):
    try:
        h = handle.lstrip('@').strip()
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://atcoder.jp/users/{h}",
                headers={'User-Agent': 'Mozilla/5.0'},
            )
            if resp.status_code == 200:
                m = re.search(r'Rating</th>\s*<td>[^<]*<span[^>]*>(\d+)</span>', resp.text)
                return {"rating": int(m.group(1)) if m else 0}
    except Exception:
        pass
    return {"rating": 0}


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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

    raw_stats_provided = any(
        k in update_data for k in ['codeforces_rating', 'leetcode_solved', 'atcoder_rating', 'cses_solved']
    )

    for key, value in update_data.items():
        setattr(current_user, key, value)

    await db.commit()
    await db.refresh(current_user)

    if raw_stats_provided:
        # Stats already synced client-side, just recalculate rank
        background_tasks.add_task(background_update_user_rank, current_user.id)
    else:
        # Only handles changed, trigger server-side sync (local dev / fallback)
        background_tasks.add_task(background_sync_ratings, current_user.id)

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
