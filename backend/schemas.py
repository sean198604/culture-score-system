from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ─── Pagination ───────────────────────────────────────────
class PageResult(BaseModel):
    total: int
    page: int
    page_size: int
    items: list


# ─── Auth ─────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    role: str
    department_id: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Department ───────────────────────────────────────────
class DepartmentBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None


class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── User ─────────────────────────────────────────────────
class UserBase(BaseModel):
    username: str
    name: str
    department_id: Optional[int] = None
    role: Optional[str] = "employee"
    email: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[int] = None
    password: Optional[str] = None


class UserOut(UserBase):
    id: int
    avatar: Optional[str] = None
    is_active: int
    created_at: datetime
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class UserDetail(UserOut):
    total_score: Optional[float] = 0
    rank: Optional[int] = None


# ─── ScoreRule ────────────────────────────────────────────
class ScoreRuleBase(BaseModel):
    name: str
    category: str
    channel: Optional[str] = None
    description: Optional[str] = None
    min_score: Optional[Decimal] = Decimal("0")
    max_score: Optional[Decimal] = Decimal("100")


class ScoreRuleCreate(ScoreRuleBase):
    pass


class ScoreRuleUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    channel: Optional[str] = None
    description: Optional[str] = None
    min_score: Optional[Decimal] = None
    max_score: Optional[Decimal] = None
    is_active: Optional[int] = None


class ScoreRuleOut(ScoreRuleBase):
    id: int
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── UserScore ────────────────────────────────────────────
class UserScoreBase(BaseModel):
    user_id: int
    rule_id: Optional[int] = None
    score: Decimal
    channel: Optional[str] = None
    event_desc: Optional[str] = None
    score_date: date
    recorder: Optional[str] = None
    remark: Optional[str] = None


class UserScoreCreate(UserScoreBase):
    pass


class UserScoreUpdate(BaseModel):
    rule_id: Optional[int] = None
    score: Optional[Decimal] = None
    channel: Optional[str] = None
    event_desc: Optional[str] = None
    score_date: Optional[date] = None
    recorder: Optional[str] = None
    remark: Optional[str] = None


class UserScoreOut(UserScoreBase):
    id: int
    user_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── TeamScore ────────────────────────────────────────────
class TeamScoreBase(BaseModel):
    department_id: int
    rule_id: Optional[int] = None
    score: Decimal
    channel: Optional[str] = None
    event_desc: Optional[str] = None
    score_date: date
    recorder: Optional[str] = None
    remark: Optional[str] = None


class TeamScoreCreate(TeamScoreBase):
    pass


class TeamScoreUpdate(BaseModel):
    rule_id: Optional[int] = None
    score: Optional[Decimal] = None
    channel: Optional[str] = None
    event_desc: Optional[str] = None
    score_date: Optional[date] = None
    recorder: Optional[str] = None
    remark: Optional[str] = None


class TeamScoreOut(TeamScoreBase):
    id: int
    department_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Appeal ───────────────────────────────────────────────
class AppealCreate(BaseModel):
    score_id: Optional[int] = None
    title: str
    content: str
    image_urls: Optional[List[str]] = []


class AppealReview(BaseModel):
    status: str  # approved | rejected
    review_note: Optional[str] = None


class AppealOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    score_id: Optional[int] = None
    title: str
    content: str
    image_urls: Optional[str] = None
    status: str
    reviewer_id: Optional[int] = None
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Leaderboard ──────────────────────────────────────────
class UserRankItem(BaseModel):
    rank: int
    user_id: int
    name: str
    department_name: Optional[str] = None
    total_score: float


class DeptRankItem(BaseModel):
    rank: int
    department_id: int
    department_name: str
    total_score: float
    member_count: int
    avg_score: float


# ─── Dashboard ────────────────────────────────────────────
class TrendPoint(BaseModel):
    month: str
    score: float


class DashboardData(BaseModel):
    my_total_score: float
    my_rank: int
    total_users: int
    score_trend: List[TrendPoint]
    top_users: List[UserRankItem]
    top_depts: List[DeptRankItem]
