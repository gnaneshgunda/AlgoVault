from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class QuestionBase(BaseModel):
    original_url: str
    title: str

class QuestionCreate(QuestionBase):
    platform: Optional[str] = None  # Auto-detected from URL if not provided

class QuestionResponse(QuestionBase):
    id: UUID
    submitter_id: UUID
    platform: str
    normalized_url_hash: str
    total_views: int
    total_weighted_score: float
    trending_score: float
    wilson_score: float
    created_at: datetime
    submitter_username: Optional[str] = None
    has_upvoted: bool = False
    has_saved: bool = False

    model_config = ConfigDict(from_attributes=True)
