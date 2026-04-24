"""
排行榜路由 - /api/leaderboard
支持搜索：员工榜按姓名模糊搜索，部门榜按部门名模糊搜索
支持按月份/季度筛选
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc, or_
from typing import Optional
from datetime import datetime
from database import get_db
import models, schemas
from auth import get_current_user_optional

router = APIRouter(prefix="/api/leaderboard", tags=["排行榜"])


def _apply_period_filter_user(query, period: str, year: Optional[int] = None, month: Optional[int] = None, quarter: Optional[int] = None):
    now = datetime.now()
    if period == "month":
        y = year or now.year
        m = month or now.month
        return query.filter(
            extract("year", models.UserScore.score_date) == y,
            extract("month", models.UserScore.score_date) == m,
        )
    elif period == "quarter":
        y = year or now.year
        q = quarter or ((now.month - 1) // 3 + 1)
        quarter_start_month = (q - 1) * 3 + 1
        quarter_end_month = quarter_start_month + 2
        return query.filter(
            extract("year", models.UserScore.score_date) == y,
            extract("month", models.UserScore.score_date).between(
                quarter_start_month, quarter_end_month
            ),
        )
    elif period == "year":
        y = year or now.year
        return query.filter(
            extract("year", models.UserScore.score_date) == y
        )
    return query


def _apply_period_filter_team(query, period: str, year: Optional[int] = None, month: Optional[int] = None, quarter: Optional[int] = None):
    now = datetime.now()
    if period == "month":
        y = year or now.year
        m = month or now.month
        return query.filter(
            extract("year", models.TeamScore.score_date) == y,
            extract("month", models.TeamScore.score_date) == m,
        )
    elif period == "quarter":
        y = year or now.year
        q = quarter or ((now.month - 1) // 3 + 1)
        quarter_start_month = (q - 1) * 3 + 1
        quarter_end_month = quarter_start_month + 2
        return query.filter(
            extract("year", models.TeamScore.score_date) == y,
            extract("month", models.TeamScore.score_date).between(
                quarter_start_month, quarter_end_month
            ),
        )
    elif period == "year":
        y = year or now.year
        return query.filter(
            extract("year", models.TeamScore.score_date) == y
        )
    return query


@router.get("/available-months")
def get_available_months(db: Session = Depends(get_db)):
    """获取有数据的月份列表（用于前端月份选择器）"""
    user_months = db.query(
        extract("year", models.UserScore.score_date).label("y"),
        extract("month", models.UserScore.score_date).label("m"),
    ).group_by("y", "m").order_by(desc("y"), desc("m")).all()

    team_months = db.query(
        extract("year", models.TeamScore.score_date).label("y"),
        extract("month", models.TeamScore.score_date).label("m"),
    ).group_by("y", "m").order_by(desc("y"), desc("m")).all()

    # 合并去重
    seen = set()
    months = []
    for r in list(user_months) + list(team_months):
        key = (int(r.y), int(r.m))
        if key not in seen:
            seen.add(key)
            months.append({"year": key[0], "month": key[1], "label": f"{key[0]}年{key[1]:02d}月"})
    # 按年月倒序
    months.sort(key=lambda x: (x["year"], x["month"]), reverse=True)
    return months


@router.get("/users", response_model=schemas.PageResult)
def user_leaderboard(
    type: str = Query("month", regex="^(month|quarter|year|total)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    search: Optional[str] = Query(None, description="按姓名模糊搜索"),
    year: Optional[int] = Query(None, description="年份"),
    month: Optional[int] = Query(None, description="月份（月榜用）"),
    quarter: Optional[int] = Query(None, description="季度（季榜用，1-4）"),
    db: Session = Depends(get_db),
):
    """员工排行榜 - 支持搜索、按月份/季度筛选"""
    base_q = (
        db.query(
            models.User.id,
            models.User.name,
            models.User.department_id,
            models.Department.name.label("dept_name"),
            func.coalesce(func.sum(models.UserScore.score), 0).label("total"),
        )
        .outerjoin(models.UserScore, models.User.id == models.UserScore.user_id)
        .outerjoin(models.Department, models.User.department_id == models.Department.id)
        .filter(models.User.is_active == 1)
    )

    base_q = _apply_period_filter_user(base_q, type, year, month, quarter)

    if department_id:
        base_q = base_q.filter(models.User.department_id == department_id)

    # 搜索：按姓名模糊匹配
    if search:
        base_q = base_q.filter(models.User.name.like(f"%{search}%"))

    base_q = base_q.group_by(
        models.User.id,
        models.User.name,
        models.User.department_id,
        models.Department.name,
    ).having(func.coalesce(func.sum(models.UserScore.score), 0) > 0).order_by(desc("total"))

    total = base_q.count()
    paged_rows = base_q.offset((page - 1) * page_size).limit(page_size).all()

    items = [
        schemas.UserRankItem(
            rank=(page - 1) * page_size + i + 1,
            user_id=row.id,
            name=row.name,
            department_name=row.dept_name,
            total_score=float(row.total),
        )
        for i, row in enumerate(paged_rows)
    ]
    return schemas.PageResult(total=total, page=page, page_size=page_size, items=items)


@router.get("/departments", response_model=schemas.PageResult)
def dept_leaderboard(
    type: str = Query("month", regex="^(month|quarter|year|total)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="按部门名模糊搜索"),
    year: Optional[int] = Query(None, description="年份"),
    month: Optional[int] = Query(None, description="月份（月榜用）"),
    quarter: Optional[int] = Query(None, description="季度（季榜用，1-4）"),
    db: Session = Depends(get_db),
):
    """部门排行榜 - 支持搜索、按月份/季度筛选"""
    base_q = (
        db.query(
            models.Department.id,
            models.Department.name,
            func.coalesce(func.sum(models.TeamScore.score), 0).label("total"),
            func.count(func.distinct(models.User.id)).label("member_count"),
        )
        .outerjoin(models.TeamScore, models.Department.id == models.TeamScore.department_id)
        .outerjoin(models.User, models.Department.id == models.User.department_id)
    )

    base_q = _apply_period_filter_team(base_q, type, year, month, quarter)

    # 搜索：按部门名模糊匹配
    if search:
        base_q = base_q.filter(models.Department.name.like(f"%{search}%"))

    base_q = base_q.group_by(
        models.Department.id,
        models.Department.name,
    ).having(func.coalesce(func.sum(models.TeamScore.score), 0) > 0).order_by(desc("total"))

    total = base_q.count()
    paged_rows = base_q.offset((page - 1) * page_size).limit(page_size).all()

    items = [
        schemas.DeptRankItem(
            rank=(page - 1) * page_size + i + 1,
            department_id=row.id,
            department_name=row.name,
            total_score=float(row.total),
            member_count=row.member_count or 0,
            avg_score=round(
                float(row.total) / max(row.member_count or 1, 1), 2
            ),
        )
        for i, row in enumerate(paged_rows)
    ]
    return schemas.PageResult(total=total, page=page, page_size=page_size, items=items)
