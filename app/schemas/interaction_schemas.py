from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.models import InteractionType

class InteractionBase(BaseModel):
    interaction_type: InteractionType

class InteractionCreate(InteractionBase):
    question_id: UUID
    # user_id is derived from auth token, no longer in request body

class InteractionResponse(InteractionBase):
    id: UUID
    user_id: UUID
    question_id: UUID
    weight_applied: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
