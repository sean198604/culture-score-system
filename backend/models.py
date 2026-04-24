from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date,
    ForeignKey, DECIMAL, Enum, SmallInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="department")
    team_scores = relationship("TeamScore", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(50), nullable=False)
    password_hash = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    role = Column(Enum("employee", "admin", "hr"), default="employee")
    email = Column(String(100))
    phone = Column(String(20))
    avatar = Column(String(255))
    is_active = Column(SmallInteger, default=1)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="users")
    user_scores = relationship("UserScore", back_populates="user", foreign_keys="UserScore.user_id")
    appeals = relationship("Appeal", back_populates="user", foreign_keys="Appeal.user_id")


class ScoreRule(Base):
    __tablename__ = "score_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    channel = Column(String(100))
    description = Column(Text)
    min_score = Column(DECIMAL(8, 2), default=0)
    max_score = Column(DECIMAL(8, 2), default=100)
    is_active = Column(SmallInteger, default=1)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user_scores = relationship("UserScore", back_populates="rule")
    team_scores = relationship("TeamScore", back_populates="rule")


class UserScore(Base):
    __tablename__ = "user_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rule_id = Column(Integer, ForeignKey("score_rules.id"), nullable=True)
    score = Column(DECIMAL(8, 2), nullable=False)
    channel = Column(String(100))
    event_desc = Column(Text)
    score_date = Column(Date, nullable=False, index=True)
    recorder = Column(String(50))
    remark = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="user_scores", foreign_keys=[user_id])
    rule = relationship("ScoreRule", back_populates="user_scores")


class TeamScore(Base):
    __tablename__ = "team_scores"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    rule_id = Column(Integer, ForeignKey("score_rules.id"), nullable=True)
    score = Column(DECIMAL(8, 2), nullable=False)
    channel = Column(String(100))
    event_desc = Column(Text)
    score_date = Column(Date, nullable=False, index=True)
    recorder = Column(String(50))
    remark = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="team_scores")
    rule = relationship("ScoreRule", back_populates="team_scores")


class Appeal(Base):
    __tablename__ = "appeals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score_id = Column(Integer, ForeignKey("user_scores.id"), nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    image_urls = Column(Text)  # JSON array string
    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text)
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="appeals", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
