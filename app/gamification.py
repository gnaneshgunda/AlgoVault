from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import User, Question, Interaction, List, ListQuestion
from uuid import UUID

def calculate_solving_score(user: User) -> int:
    cf = min((user.codeforces_rating / 2200.0) * 100, 100.0)
    lc = min((user.leetcode_solved / 800.0) * 100, 100.0)
    ac = min((user.atcoder_rating / 2000.0) * 100, 100.0)
    cses = min((user.cses_solved / 150.0) * 100, 100.0)

    unified_index = (cf * 0.35) + (lc * 0.25) + (ac * 0.20) + (cses * 0.20)

    # Scale to max 1500
    score = int((unified_index / 100.0) * 1500)
    return min(score, 1500)

async def calculate_curation_score(user_id: UUID, db: AsyncSession) -> int:
    import math

    # Submissions component: max 500, scaled by 10 * sqrt(S)
    q_result = await db.execute(select(func.count(Question.id)).filter(Question.submitter_id == user_id))
    submitted_count = q_result.scalar_one()
    sub_contrib = min(500, int(10 * math.sqrt(submitted_count)))

    # Interactions component: max 500, scaled by 50 * sqrt(I)
    interactions_result = await db.execute(
        select(func.count(Interaction.id))
        .join(Question, Interaction.question_id == Question.id)
        .filter(Question.submitter_id == user_id)
    )
    interaction_count = interactions_result.scalar_one()
    int_contrib = min(500, int(50 * math.sqrt(interaction_count)))

    # Forks component: max 500, scaled by 150 * sqrt(F)
    lists_result = await db.execute(select(List.id).filter(List.user_id == user_id))
    user_list_ids = [row[0] for row in lists_result.all()]

    fork_count = 0
    if user_list_ids:
        fork_result = await db.execute(
            select(func.count(List.id))
            .filter(List.forked_from_list_id.in_(user_list_ids))
        )
        fork_count = fork_result.scalar_one()
    fork_contrib = min(500, int(150 * math.sqrt(fork_count)))

    score = sub_contrib + int_contrib + fork_contrib
    return min(score, 1500)

async def update_user_rank(user_id: UUID, db: AsyncSession):
    user_result = await db.execute(select(User).filter(User.id == user_id))
    user = user_result.scalars().first()
    if not user:
        return

    solving_score = calculate_solving_score(user)
    curation_score = await calculate_curation_score(user_id, db)

    total = solving_score + curation_score

    tier = 'Scripter'
    if 1200 <= total <= 1399: tier = 'Explorer'
    elif 1400 <= total <= 1599: tier = 'Curator'
    elif 1600 <= total <= 1899: tier = 'Architect'
    elif 1900 <= total <= 2199: tier = 'Algorithmist'
    elif 2200 <= total <= 2599: tier = 'Master'
    elif total >= 2600: tier = 'Grandmaster'

    user.solving_score = solving_score
    user.curation_score = curation_score
    user.total_rating = total
    user.rank_tier = tier

    await db.commit()

def get_weight_multiplier_for_rank(rank_tier: str) -> float:
    mapping = {
        'Scripter': 1.0,
        'Explorer': 1.2,
        'Curator': 1.5,
        'Architect': 2.0,
        'Algorithmist': 2.5,
        'Master': 3.0,
        'Grandmaster': 4.0
    }
    return mapping.get(rank_tier, 1.0)
