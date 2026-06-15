from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class QuestionBase(BaseModel):
    original_url: str
    title: str
    platform: str

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: UUID
    normalized_url_hash: str
    total_views: int
    total_weighted_score: float
    trending_score: float
    wilson_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
