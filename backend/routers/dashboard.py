from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from datetime import datetime
from typing import Optional
from database import get_db
import models, schemas
from auth import get_current_user_optional

router = APIRouter(prefix="/api/dashboard", tags=["仪表盘"])


@router.get("", response_model=schemas.DashboardData)
def get_dashboard(
    db: Session = Depends(get_db),
    current: Optional[models.User] = Depends(get_current_user_optional),
):
    """
    仪表盘数据（公开接口，无需登录）
    - 未登录用户：my_total_score=0, my_rank=0
    - 已登录用户：显示个人积分和排名
    """
    now = datetime.now()

    # 在职员工数（始终展示）
    total_users = db.query(models.User).filter(models.User.is_active == 1).count()

    if current:
        # 已登录：计算个人积分和排名
        my_total = db.query(func.coalesce(func.sum(models.UserScore.score), 0)).filter(
            models.UserScore.user_id == current.id
        ).scalar() or 0

        all_totals = db.query(
            models.UserScore.user_id,
            func.sum(models.UserScore.score).label("total")
        ).group_by(models.UserScore.user_id).order_by(desc("total")).all()
        rank = next((i + 1 for i, r in enumerate(all_totals) if r.user_id == current.id), len(all_totals) + 1)

        # 趋势（近12个月）
        trend_raw = db.query(
            extract("year", models.UserScore.score_date).label("y"),
            extract("month", models.UserScore.score_date).label("m"),
            func.sum(models.UserScore.score).label("s"),
        ).filter(models.UserScore.user_id == current.id
        ).group_by("y", "m").order_by("y", "m").all()
        trend = [schemas.TrendPoint(month=f"{int(r.y)}-{int(r.m):02d}", score=float(r.s)) for r in trend_raw]
    else:
        # 未登录：个人数据为 0，无趋势
        my_total = 0
        rank = 0
        trend = []

    # Top10 员工（始终展示）
    top_rows = db.query(
        models.User.id,
        models.User.name,
        models.Department.name.label("dept_name"),
        func.coalesce(func.sum(models.UserScore.score), 0).label("total"),
    ).outerjoin(models.UserScore, models.User.id == models.UserScore.user_id
    ).outerjoin(models.Department, models.User.department_id == models.Department.id
    ).filter(models.User.is_active == 1
    ).group_by(models.User.id, models.User.name, models.Department.name
    ).order_by(desc("total")).limit(10).all()

    top_users = [
        schemas.UserRankItem(rank=i + 1, user_id=r.id, name=r.name, department_name=r.dept_name, total_score=float(r.total))
        for i, r in enumerate(top_rows)
    ]

    # Top10 部门（始终展示）
    top_depts_rows = db.query(
        models.Department.id,
        models.Department.name,
        func.coalesce(func.sum(models.TeamScore.score), 0).label("total"),
        func.count(func.distinct(models.User.id)).label("cnt"),
    ).outerjoin(models.TeamScore, models.Department.id == models.TeamScore.department_id
    ).outerjoin(models.User, models.Department.id == models.User.department_id
    ).group_by(models.Department.id, models.Department.name
    ).order_by(desc("total")).limit(10).all()

    top_depts = [
        schemas.DeptRankItem(
            rank=i + 1,
            department_id=r.id,
            department_name=r.name,
            total_score=float(r.total),
            member_count=r.cnt or 0,
            avg_score=round(float(r.total) / max(r.cnt or 1, 1), 2),
        )
        for i, r in enumerate(top_depts_rows)
    ]

    return schemas.DashboardData(
        my_total_score=float(my_total),
        my_rank=rank,
        total_users=total_users,
        score_trend=trend,
        top_users=top_users,
        top_depts=top_depts,
    )
