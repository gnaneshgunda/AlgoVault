import math
import datetime

WEIGHT_UPVOTE = 1.0
WEIGHT_SAVE = 3.0
CREDIBILITY_MULTIPLIER_BASE = 1.0
CREDIBILITY_MULTIPLIER_HIGH = 2.0
MAX_SCORE_PER_VIEW = WEIGHT_SAVE * CREDIBILITY_MULTIPLIER_HIGH

def calculate_wilson_score(total_weighted_score: float, total_views: int, z: float = 1.96) -> float:
    if total_views == 0: return 0.0
    theoretical_max_total_score = total_views * MAX_SCORE_PER_VIEW
    p = min(total_weighted_score / theoretical_max_total_score, 1.0)
    n = total_views
    denominator = 1 + z**2 / n
    centre_adjusted_probability = p + z**2 / (2 * n)
    adjusted_standard_deviation = z * math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    return (centre_adjusted_probability - adjusted_standard_deviation) / denominator

def calculate_decayed_gravity(total_weighted_score: float, created_at: datetime.datetime, gravity_factor: float = 1.8) -> float:
    now = datetime.datetime.now(datetime.timezone.utc)
    if created_at.tzinfo is None: created_at = created_at.replace(tzinfo=datetime.timezone.utc)
    age_in_hours = max((now - created_at).total_seconds() / 3600.0, 0.1)
    score_numerator = total_weighted_score + 1
    return score_numerator / math.pow(age_in_hours + 2, gravity_factor)
