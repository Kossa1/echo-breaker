# backend/models.py
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from db import Base
from datetime import datetime

class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # YouGov topic id (UUID string)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=True, unique=True)

    surveys = relationship("Survey", back_populates="topic")

class Survey(Base):
    __tablename__ = "surveys"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # use the UUID-like id in filenames
    topic_id: Mapped[str | None] = mapped_column(String, ForeignKey("topics.id"))
    title: Mapped[str | None] = mapped_column(String)
    document_url: Mapped[str | None] = mapped_column(String)
    cached_pdf_url: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic = relationship("Topic", back_populates="surveys")
    questions = relationship("Question", back_populates="survey", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_id: Mapped[str] = mapped_column(String, ForeignKey("surveys.id"), nullable=False)
    qnum: Mapped[int | None] = mapped_column(Integer)
    orig_label: Mapped[str | None] = mapped_column(String)
    prompt: Mapped[str | None] = mapped_column(Text)

    survey = relationship("Survey", back_populates="questions")
    responses = relationship("Response", back_populates="question", cascade="all, delete-orphan")

Index("ix_questions_survey_qnum", Question.survey_id, Question.qnum)

class Response(Base):
    __tablename__ = "responses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    response_text: Mapped[str] = mapped_column(String, nullable=False)
    total: Mapped[float | None] = mapped_column(Float)
    dem: Mapped[float | None] = mapped_column(Float)
    ind: Mapped[float | None] = mapped_column(Float)
    rep: Mapped[float | None] = mapped_column(Float)

    question = relationship("Question", back_populates="responses")
Index("ix_responses_question_text", Response.question_id, Response.response_text)

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String, default="twitter")
    external_id: Mapped[str | None] = mapped_column(String)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    media_url: Mapped[str | None] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String)
    created_at_ts: Mapped[datetime | None] = mapped_column(DateTime)
    topic_id: Mapped[str | None] = mapped_column(String, ForeignKey("topics.id"))

    mappings = relationship("PostQuestionMap", back_populates="post", cascade="all, delete-orphan")

Index("ix_posts_platform_external", Post.platform, Post.external_id)

class PostQuestionMap(Base):
    __tablename__ = "post_question_map"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    matched_response_text: Mapped[str | None] = mapped_column(String)
    method: Mapped[str | None] = mapped_column(String)      # e.g., "heuristic" / "llm"
    confidence: Mapped[float | None] = mapped_column(Float)

    post = relationship("Post", back_populates="mappings")

# --- User tracking for leaderboard and logging ---
class User(Base):
    __tablename__ = "users"
    # Store Firebase UID or any unique identifier from the client
    uid: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String)
    score: Mapped[float | None] = mapped_column(Float, default=0.0)
    games_played: Mapped[int | None] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rounds = relationship("UserRound", back_populates="user", cascade="all, delete-orphan")


class UserRound(Base):
    __tablename__ = "user_rounds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_uid: Mapped[str] = mapped_column(String, ForeignKey("users.uid"), nullable=False)
    average_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="rounds")
