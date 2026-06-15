from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    username: str
    codeforces_handle: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: UUID
    credibility_tier: int

    model_config = ConfigDict(from_attributes=True)
