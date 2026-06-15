from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

TIER_COLORS = {
    'Scripter': '#808080',
    'Explorer': '#22c55e',
    'Curator': '#3b82f6',
    'Architect': '#a855f7',
    'Algorithmist': '#f97316',
    'Master': '#ef4444',
    'Grandmaster': '#eab308',
}

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    email: str
    password: str

class UserStatsUpdate(BaseModel):
    codeforces_rating: Optional[int] = None
    leetcode_solved: Optional[int] = None
    atcoder_rating: Optional[int] = None
    cses_solved: Optional[int] = None

class UserResponse(UserBase):
    id: UUID
    email: str

    codeforces_rating: int
    leetcode_solved: int
    atcoder_rating: int
    cses_solved: int

    solving_score: int
    curation_score: int
    total_rating: int
    rank_tier: str
    tier_color: Optional[str] = None

    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserProfileResponse(UserResponse):
    questions_submitted: int = 0
    lists_created: int = 0
    total_saves_received: int = 0
