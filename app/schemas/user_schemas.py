from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    pass

class UserStatsUpdate(BaseModel):
    codeforces_rating: Optional[int] = None
    leetcode_solved: Optional[int] = None
    atcoder_rating: Optional[int] = None
    cses_solved: Optional[int] = None

class UserResponse(UserBase):
    id: UUID

    codeforces_rating: int
    leetcode_solved: int
    atcoder_rating: int
    cses_solved: int

    solving_score: int
    curation_score: int
    total_rating: int
    rank_tier: str

    model_config = ConfigDict(from_attributes=True)
