"""
联动统计接口 - /api/stats
支持按 timeType/orgType/selectedId/category 联动过滤
返回 ranking/trend/category/department/heatmap 五组数据
+ /api/stats/detail 返回个人/部门的积分明细
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc, and_
from typing import Optional
from datetime import datetime, date
from database import get_db
import models
from auth import get_current_user_optional

router = APIRouter(prefix="/api/stats", tags=["联动统计"])


def _period_to_date_range(time_type: str, year: int = None, month: int = None, quarter: int = None):
    """将 timeType + year/month/quarter 转换为 start_date / end_date"""
    now = datetime.now()
    y = year or now.year

    if time_type == "month":
        m = month or now.month
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)
        return start, end

    elif time_type == "quarter":
        q = quarter or ((now.month - 1) // 3 + 1)
        q = max(1, min(4, q))
        start_m = (q - 1) * 3 + 1
        start = date(y, start_m, 1)
        end_m = start_m + 2
        if end_m >= 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, end_m + 1, 1)
        return start, end

    elif time_type == "year":
        start = date(y, 1, 1)
        end = date(y + 1, 1, 1)
        return start, end

    # 不应到这里（已移除total选项）
    return None, None


@router.get("")
def get_stats(
    timeType: str = Query("month", regex="^(month|quarter|year)$"),
    orgType: str = Query("user", regex="^(user|department)$"),
    selectedId: Optional[int] = Query(None, description="选中的个人/部门ID"),
    category: Optional[str] = Query(None, description="选中的积分渠道分类"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    start_date, end_date = _period_to_date_range(timeType, year, month, quarter)

    # ── 1. Ranking（排行榜）──
    ranking = []
    if orgType == "user":
        q = (
            db.query(
                models.User.id,
                models.User.name,
                models.Department.name.label("dept_name"),
                func.coalesce(func.sum(models.UserScore.score), 0).label("total"),
            )
            .outerjoin(models.UserScore, models.User.id == models.UserScore.user_id)
            .outerjoin(models.Department, models.User.department_id == models.Department.id)
            .filter(models.User.is_active == 1)
        )
        if start_date:
            q = q.filter(models.UserScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.UserScore.score_date < end_date)
        # selectedId 不影响排行榜 — 排行始终显示全部员工
        # selectedId 只影响右侧图表（趋势/渠道/日历/部门积分）
        if category:
            q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
        q = q.group_by(models.User.id, models.User.name, models.Department.name).order_by(desc("total")).limit(500)
        for r in q.all():
            ranking.append({"id": r.id, "name": r.name, "department_name": r.dept_name, "score": float(r.total)})

    else:  # department
        # 只显示有积分的部门（0分部门不显示，与个人榜行为一致）
        q = db.query(
            models.TeamScore.department_id,
            func.coalesce(func.sum(models.TeamScore.score), 0).label("total"),
        )
        if start_date:
            q = q.filter(models.TeamScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.TeamScore.score_date < end_date)
        if category:
            q = q.filter(models.TeamScore.channel.ilike(f"%{category}%"))
        q = q.group_by(models.TeamScore.department_id).having(func.coalesce(func.sum(models.TeamScore.score), 0) > 0).order_by(desc("total")).limit(500)
        # JOIN 部门名称
        for r in q.all():
            dept = db.query(models.Department).filter(models.Department.id == r.department_id).first()
            ranking.append({"id": r.department_id, "name": dept.name if dept else "未知", "score": float(r.total)})

    # ── 2. Trend（积分趋势 - 月度折线）──
    # 默认无选中时显示全公司汇总趋势
    trend = []
    if orgType == "user":
        if selectedId:
            # 选中具体人：显示该人的月度趋势
            q = db.query(
                extract("year", models.UserScore.score_date).label("y"),
                extract("month", models.UserScore.score_date).label("m"),
                func.coalesce(func.sum(models.UserScore.score), 0).label("s"),
            ).filter(models.UserScore.user_id == selectedId)
            if category:
                q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
            if start_date:
                q = q.filter(models.UserScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.UserScore.score_date < end_date)
            rows = q.group_by("y", "m").order_by("y", "m").all()
            trend = [{"date": f"{int(r.y)}-{int(r.m):02d}", "score": float(r.s)} for r in rows]
        else:
            # 未选中：全公司个人积分月度汇总
            q = db.query(
                extract("year", models.UserScore.score_date).label("y"),
                extract("month", models.UserScore.score_date).label("m"),
                func.coalesce(func.sum(models.UserScore.score), 0).label("s"),
            )
            if category:
                q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
            if start_date:
                q = q.filter(models.UserScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.UserScore.score_date < end_date)
            rows = q.group_by("y", "m").order_by("y", "m").all()
            trend = [{"date": f"{int(r.y)}-{int(r.m):02d}", "score": float(r.s)} for r in rows]
    else:
        if selectedId:
            q = db.query(
                extract("year", models.TeamScore.score_date).label("y"),
                extract("month", models.TeamScore.score_date).label("m"),
                func.coalesce(func.sum(models.TeamScore.score), 0).label("s"),
            ).filter(models.TeamScore.department_id == selectedId)
            if category:
                q = q.filter(models.TeamScore.channel.ilike(f"%{category}%"))
            if start_date:
                q = q.filter(models.TeamScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.TeamScore.score_date < end_date)
            rows = q.group_by("y", "m").order_by("y", "m").all()
            trend = [{"date": f"{int(r.y)}-{int(r.m):02d}", "score": float(r.s)} for r in rows]
        else:
            # 全部门汇总
            q = db.query(
                extract("year", models.TeamScore.score_date).label("y"),
                extract("month", models.TeamScore.score_date).label("m"),
                func.coalesce(func.sum(models.TeamScore.score), 0).label("s"),
            )
            if category:
                q = q.filter(models.TeamScore.channel.ilike(f"%{category}%"))
            if start_date:
                q = q.filter(models.TeamScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.TeamScore.score_date < end_date)
            rows = q.group_by("y", "m").order_by("y", "m").all()
            trend = [{"date": f"{int(r.y)}-{int(r.m):02d}", "score": float(r.s)} for r in rows]

    # ── 3. Category（积分渠道分布 - 饼图）──
    category_data = []
    if orgType == "user":
        q = db.query(
            func.coalesce(models.UserScore.channel, "未分类").label("ch"),
            func.sum(models.UserScore.score).label("s"),
        )
        if selectedId:
            q = q.filter(models.UserScore.user_id == selectedId)
        if start_date:
            q = q.filter(models.UserScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.UserScore.score_date < end_date)
        if category:
            q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
        rows = q.group_by("ch").all()
        category_data = [{"name": r.ch, "value": float(r.s)} for r in rows if float(r.s) > 0]
    else:
        q = db.query(
            func.coalesce(models.TeamScore.channel, "未分类").label("ch"),
            func.sum(models.TeamScore.score).label("s"),
        )
        if selectedId:
            q = q.filter(models.TeamScore.department_id == selectedId)
        if start_date:
            q = q.filter(models.TeamScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.TeamScore.score_date < end_date)
        if category:
            q = q.filter(models.TeamScore.channel.ilike(f"%{category}%"))
        rows = q.group_by("ch").all()
        category_data = [{"name": r.ch, "value": float(r.s)} for r in rows if float(r.s) > 0]

    # ── 4. Department（右侧柱状图）──
    # 个人榜：按个人名字取值（Top10），不再按部门合计
    # 部门榜：从TeamScore直接取（部门积分独立表），LEFT JOIN确保0分部门也显示
    department_data = []
    if orgType == "user":
        # 个人榜 — 按个人名字取积分Top10
        q = db.query(
            models.User.id,
            models.User.name,
            func.coalesce(func.sum(models.UserScore.score), 0).label("total"),
        ).outerjoin(models.UserScore, models.User.id == models.UserScore.user_id
        ).outerjoin(models.Department, models.User.department_id == models.Department.id
        ).filter(models.User.is_active == 1)
        if start_date:
            q = q.filter(models.UserScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.UserScore.score_date < end_date)
        if category:
            q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
        if selectedId:
            q = q.filter(models.UserScore.user_id == selectedId)
        rows = q.group_by(models.User.id, models.User.name).order_by(desc("total")).limit(10).all()
        department_data = [{"id": r.id, "name": r.name, "score": float(r.total)} for r in rows]
    else:
        # 部门榜 — 从TeamScore取，过滤0分部门
        subq = db.query(
            models.TeamScore.department_id,
            func.coalesce(func.sum(models.TeamScore.score), 0).label("total"),
        )
        if start_date:
            subq = subq.filter(models.TeamScore.score_date >= start_date)
        if end_date:
            subq = subq.filter(models.TeamScore.score_date < end_date)
        if category:
            subq = subq.filter(models.TeamScore.channel.ilike(f"%{category}%"))
        if selectedId:
            subq = subq.filter(models.TeamScore.department_id == selectedId)
        subq = subq.group_by(models.TeamScore.department_id).having(func.coalesce(func.sum(models.TeamScore.score), 0) > 0).subquery()

        q = db.query(
            models.Department.id,
            models.Department.name,
            subq.c.total,
        ).join(subq, models.Department.id == subq.c.department_id
        ).order_by(desc("total"))
        rows = q.all()
        department_data = [{"id": r.id, "name": r.name, "score": float(r.total)} for r in rows]

    # ── 5. Heatmap（日历热力图 - 默认显示全公司汇总）──
    heatmap = []
    if orgType == "user":
        if selectedId:
            q = db.query(
                models.UserScore.score_date,
                func.sum(models.UserScore.score).label("s"),
            ).filter(models.UserScore.user_id == selectedId)
            if start_date:
                q = q.filter(models.UserScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.UserScore.score_date < end_date)
            if category:
                q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
            rows = q.group_by(models.UserScore.score_date).all()
            heatmap = [[r.score_date.isoformat() if isinstance(r.score_date, date) else str(r.score_date), float(r.s)] for r in rows]
        else:
            # 未选中：全公司个人积分日历汇总
            q = db.query(
                models.UserScore.score_date,
                func.sum(models.UserScore.score).label("s"),
            )
            if start_date:
                q = q.filter(models.UserScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.UserScore.score_date < end_date)
            if category:
                q = q.filter(models.UserScore.channel.ilike(f"%{category}%"))
            rows = q.group_by(models.UserScore.score_date).all()
            heatmap = [[r.score_date.isoformat() if isinstance(r.score_date, date) else str(r.score_date), float(r.s)] for r in rows]
    else:
        if selectedId:
            q = db.query(
                models.TeamScore.score_date,
                func.sum(models.TeamScore.score).label("s"),
            ).filter(models.TeamScore.department_id == selectedId)
            if start_date:
                q = q.filter(models.TeamScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.TeamScore.score_date < end_date)
            if category:
                q = q.filter(models.TeamScore.channel.ilike(f"%{category}%"))
            rows = q.group_by(models.TeamScore.score_date).all()
            heatmap = [[r.score_date.isoformat() if isinstance(r.score_date, date) else str(r.score_date), float(r.s)] for r in rows]
        else:
            q = db.query(
                models.TeamScore.score_date,
                func.sum(models.TeamScore.score).label("s"),
            )
            if start_date:
                q = q.filter(models.TeamScore.score_date >= start_date)
            if end_date:
                q = q.filter(models.TeamScore.score_date < end_date)
            if category:
                q = q.filter(models.TeamScore.channel.ilike(f"%{category}%"))
            rows = q.group_by(models.TeamScore.score_date).all()
            heatmap = [[r.score_date.isoformat() if isinstance(r.score_date, date) else str(r.score_date), float(r.s)] for r in rows]

    return {
        "ranking": ranking,
        "trend": trend,
        "category": category_data,
        "department": department_data,
        "heatmap": heatmap,
    }


@router.get("/detail")
def get_detail(
    orgType: str = Query("user", regex="^(user|department)$"),
    id: int = Query(..., description="个人或部门ID"),
    timeType: str = Query("month", regex="^(month|quarter|year)$"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """获取个人或部门的积分明细列表"""
    start_date, end_date = _period_to_date_range(timeType, year, month, quarter)

    items = []
    if orgType == "user":
        q = db.query(models.UserScore).filter(models.UserScore.user_id == id)
        if start_date:
            q = q.filter(models.UserScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.UserScore.score_date < end_date)
        rows = q.order_by(desc(models.UserScore.score_date)).limit(100).all()
        for r in rows:
            items.append({
                "id": r.id,
                "score": float(r.score),
                "channel": r.channel,
                "event_desc": r.event_desc,
                "score_date": r.score_date.isoformat() if isinstance(r.score_date, date) else str(r.score_date),
                "recorder": r.recorder,
                "remark": r.remark,
            })
        # 查用户名
        user = db.query(models.User).filter(models.User.id == id).first()
        name = user.name if user else "未知"
        dept_name = user.department.name if user and user.department else None
        return {"name": name, "department_name": dept_name, "items": items}
    else:
        q = db.query(models.TeamScore).filter(models.TeamScore.department_id == id)
        if start_date:
            q = q.filter(models.TeamScore.score_date >= start_date)
        if end_date:
            q = q.filter(models.TeamScore.score_date < end_date)
        rows = q.order_by(desc(models.TeamScore.score_date)).limit(100).all()
        for r in rows:
            items.append({
                "id": r.id,
                "score": float(r.score),
                "channel": r.channel,
                "event_desc": r.event_desc,
                "score_date": r.score_date.isoformat() if isinstance(r.score_date, date) else str(r.score_date),
                "recorder": r.recorder,
                "remark": r.remark,
            })
        dept = db.query(models.Department).filter(models.Department.id == id).first()
        name = dept.name if dept else "未知"
        return {"name": name, "items": items}
