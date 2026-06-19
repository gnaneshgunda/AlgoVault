import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy import JSON
import enum

from app.db.database import Base

class InteractionType(str, enum.Enum):
    UPVOTE = "Upvote"
    SAVE = "Save"

class ListQuestionStatus(str, enum.Enum):
    TODO = "To Do"
    SOLVED = "Solved"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # External Stats
    cf_handle = Column(String, nullable=True)
    lc_handle = Column(String, nullable=True)
    ac_handle = Column(String, nullable=True)
    cses_handle = Column(String, nullable=True)

    codeforces_rating = Column(Integer, default=0)
    leetcode_solved = Column(Integer, default=0)
    atcoder_rating = Column(Integer, default=0)
    cses_solved = Column(Integer, default=0)

    last_rating_update = Column(DateTime(timezone=True), nullable=True)

    # Gamification
    solving_score = Column(Integer, default=0)
    curation_score = Column(Integer, default=0)
    total_rating = Column(Integer, default=0)
    rank_tier = Column(String, default='Scripter')

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    lists = relationship("List", back_populates="user")
    interactions = relationship("Interaction", back_populates="user")
    submitted_questions = relationship("Question", back_populates="submitter")

class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submitter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    normalized_url_hash = Column(String, unique=True, index=True, nullable=False)
    original_url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    platform = Column(String, nullable=False)

    total_views = Column(Integer, default=0)
    total_weighted_score = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    trending_score = Column(Float, default=0.0)
    wilson_score = Column(Float, default=0.0)

    # Tags & metadata — nullable, existing rows unaffected
    topic_tags = Column(JSON, nullable=True)        # e.g. ["Array", "Graph"]
    technique_tags = Column(JSON, nullable=True)    # e.g. ["Binary Search", "DFS"]
    difficulty = Column(String, nullable=True)      # "Easy" | "Medium" | "Hard"

    submitter = relationship("User", back_populates="submitted_questions")
    list_questions = relationship("ListQuestion", back_populates="question")
    interactions = relationship("Interaction", back_populates="question")

class List(Base):
    __tablename__ = "lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    is_public = Column(Boolean, default=True)
    forked_from_list_id = Column(UUID(as_uuid=True), ForeignKey("lists.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="lists")
    list_questions = relationship("ListQuestion", back_populates="list")
    forks = relationship("List")

class ListQuestion(Base):
    __tablename__ = "list_questions"

    list_id = Column(UUID(as_uuid=True), ForeignKey("lists.id"), primary_key=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), primary_key=True)
    status = Column(Enum(ListQuestionStatus), default=ListQuestionStatus.TODO)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    list = relationship("List", back_populates="list_questions")
    question = relationship("Question", back_populates="list_questions")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    interaction_type = Column(Enum(InteractionType), nullable=False)
    weight_applied = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="interactions")
    question = relationship("Question", back_populates="interactions")

    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', 'interaction_type', name='uix_user_question_interaction'),
    )
