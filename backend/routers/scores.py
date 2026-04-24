from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from typing import Optional
from datetime import date, datetime
from database import get_db
import models, schemas
from auth import get_current_user, require_admin
import io, pandas as pd, os

router = APIRouter(prefix="/api/scores", tags=["员工积分"])


def _date_filter(q, period: str):
    now = datetime.now()
    if period == "month":
        return q.filter(
            extract("year", models.UserScore.score_date) == now.year,
            extract("month", models.UserScore.score_date) == now.month,
        )
    elif period == "quarter":
        q_num = (now.month - 1) // 3 + 1
        start_month = (q_num - 1) * 3 + 1
        end_month = start_month + 2
        return q.filter(
            extract("year", models.UserScore.score_date) == now.year,
            extract("month", models.UserScore.score_date) >= start_month,
            extract("month", models.UserScore.score_date) <= end_month,
        )
    elif period == "year":
        return q.filter(extract("year", models.UserScore.score_date) == now.year)
    return q  # total


@router.get("", response_model=schemas.PageResult)
def list_scores(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    department_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    channel: Optional[str] = None,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    q = db.query(models.UserScore)
    # 员工只能看自己
    if current.role == "employee":
        q = q.filter(models.UserScore.user_id == current.id)
    elif user_id:
        q = q.filter(models.UserScore.user_id == user_id)

    if department_id:
        q = q.join(models.User, models.UserScore.user_id == models.User.id).filter(
            models.User.department_id == department_id
        )
    if start_date:
        q = q.filter(models.UserScore.score_date >= start_date)
    if end_date:
        q = q.filter(models.UserScore.score_date <= end_date)
    if channel:
        q = q.filter(models.UserScore.channel.ilike(f"%{channel}%"))

    total = q.count()
    records = q.order_by(models.UserScore.score_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in records:
        out = schemas.UserScoreOut.model_validate(r)
        out.user_name = r.user.name if r.user else None
        out.department_name = r.user.department.name if r.user and r.user.department else None
        items.append(out)

    return schemas.PageResult(total=total, page=page, page_size=page_size, items=items)


@router.post("", response_model=schemas.UserScoreOut)
def create_score(body: schemas.UserScoreCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    score = models.UserScore(**body.model_dump(), recorder=admin.name)
    db.add(score)
    db.commit()
    db.refresh(score)
    out = schemas.UserScoreOut.model_validate(score)
    out.user_name = score.user.name if score.user else None
    out.department_name = score.user.department.name if score.user and score.user.department else None
    return out


@router.put("/{score_id}", response_model=schemas.UserScoreOut)
def update_score(score_id: int, body: schemas.UserScoreUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    score = db.query(models.UserScore).filter(models.UserScore.id == score_id).first()
    if not score:
        raise HTTPException(404, "记录不存在")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(score, field, val)
    db.commit()
    db.refresh(score)
    out = schemas.UserScoreOut.model_validate(score)
    out.user_name = score.user.name if score.user else None
    return out


@router.delete("/{score_id}")
def delete_score(score_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    score = db.query(models.UserScore).filter(models.UserScore.id == score_id).first()
    if not score:
        raise HTTPException(404, "记录不存在")
    db.delete(score)
    db.commit()
    return {"message": "已删除"}


@router.post("/import/excel")
def import_scores(
    file: UploadFile = File(...),
    overwrite: bool = Query(False, description="全覆盖导入：先清空已有数据再导入"),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """批量导入员工积分 Excel
    增量导入(overwrite=False)：追加新记录
    全覆盖导入(overwrite=True)：先删除全部已有记录再导入
    期望列：姓名、积分、积分日期；可选列：积分渠道、事件说明、备注
    """
    contents = file.file.read()
    df = pd.read_excel(io.BytesIO(contents))
    required = ["姓名", "积分", "积分日期"]
    for col in required:
        if col not in df.columns:
            raise HTTPException(400, f"缺少列: {col}")

    # 全覆盖模式：先清空
    if overwrite:
        db.query(models.UserScore).delete()
        db.commit()

    success, fail = 0, []
    for _, row in df.iterrows():
        name = str(row.get("姓名", "")).strip()
        user = db.query(models.User).filter(models.User.name == name).first()
        if not user:
            fail.append(f"找不到用户: {name}")
            continue
        try:
            score_date = pd.to_datetime(row["积分日期"]).date()
        except Exception:
            fail.append(f"{name}: 日期格式错误")
            continue
        score = models.UserScore(
            user_id=user.id,
            score=float(row["积分"]),
            channel=str(row.get("积分渠道", "") or "").strip() or None,
            event_desc=str(row.get("事件说明", "") or "").strip() or None,
            score_date=score_date,
            recorder=admin.name,
            remark=str(row.get("备注", "") or "").strip() or None,
        )
        db.add(score)
        success += 1
    db.commit()
    return {"success": success, "failed": fail}


@router.get("/import/template")
def download_score_template(_: models.User = Depends(get_current_user)):
    """下载个人积分导入模板"""
    template_path = os.path.join(os.path.dirname(__file__), '..', 'templates', '个人积分导入模板.xlsx')
    # Docker容器内路径
    if not os.path.exists(template_path):
        template_path = '/app/templates/个人积分导入模板.xlsx'
    if not os.path.exists(template_path):
        raise HTTPException(404, "模板文件不存在")
    return FileResponse(
        template_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="个人积分导入模板.xlsx",
    )
