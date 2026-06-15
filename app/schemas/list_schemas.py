from pydantic import BaseModel, ConfigDict
from typing import Optional, List as PyList
from uuid import UUID
from datetime import datetime
from app.models.models import ListQuestionStatus

class ListBase(BaseModel):
    title: str
    description: str = ""
    is_public: bool = True

class ListCreate(ListBase):
    pass

class ListResponse(ListBase):
    id: UUID
    user_id: UUID
    forked_from_list_id: Optional[UUID] = None
    created_at: datetime
    question_count: int = 0
    owner_username: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ListQuestionBase(BaseModel):
    status: ListQuestionStatus = ListQuestionStatus.TODO

class ListQuestionAdd(BaseModel):
    question_id: UUID
    status: ListQuestionStatus = ListQuestionStatus.TODO

class ListQuestionResponse(ListQuestionBase):
    list_id: UUID
    question_id: UUID

    model_config = ConfigDict(from_attributes=True)

class ListDetailResponse(ListResponse):
    """List with its questions included"""
    questions: PyList[dict] = []
