from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date, datetime
from database import get_db
import models, schemas
from auth import get_current_user, require_admin
import io, pandas as pd, os

router = APIRouter(prefix="/api/team-scores", tags=["团队积分"])


@router.get("", response_model=schemas.PageResult)
def list_team_scores(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.TeamScore)
    if department_id:
        q = q.filter(models.TeamScore.department_id == department_id)
    if start_date:
        q = q.filter(models.TeamScore.score_date >= start_date)
    if end_date:
        q = q.filter(models.TeamScore.score_date <= end_date)
    total = q.count()
    records = q.order_by(models.TeamScore.score_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in records:
        out = schemas.TeamScoreOut.model_validate(r)
        out.department_name = r.department.name if r.department else None
        items.append(out)
    return schemas.PageResult(total=total, page=page, page_size=page_size, items=items)


@router.post("", response_model=schemas.TeamScoreOut)
def create_team_score(body: schemas.TeamScoreCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ts = models.TeamScore(**body.model_dump(), recorder=admin.name)
    db.add(ts)
    db.commit()
    db.refresh(ts)
    out = schemas.TeamScoreOut.model_validate(ts)
    out.department_name = ts.department.name if ts.department else None
    return out


@router.put("/{ts_id}", response_model=schemas.TeamScoreOut)
def update_team_score(ts_id: int, body: schemas.TeamScoreUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    ts = db.query(models.TeamScore).filter(models.TeamScore.id == ts_id).first()
    if not ts:
        raise HTTPException(404, "记录不存在")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(ts, field, val)
    db.commit()
    db.refresh(ts)
    out = schemas.TeamScoreOut.model_validate(ts)
    out.department_name = ts.department.name if ts.department else None
    return out


@router.delete("/{ts_id}")
def delete_team_score(ts_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    ts = db.query(models.TeamScore).filter(models.TeamScore.id == ts_id).first()
    if not ts:
        raise HTTPException(404, "记录不存在")
    db.delete(ts)
    db.commit()
    return {"message": "已删除"}


@router.post("/import/excel")
def import_team_scores(
    file: UploadFile = File(...),
    overwrite: bool = Query(False, description="全覆盖导入：先清空已有数据再导入"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """批量导入团队积分 Excel
    增量导入(overwrite=False)：追加新记录
    全覆盖导入(overwrite=True)：先删除全部已有记录再导入
    期望列：部门、积分、积分日期；可选列：积分渠道、事件说明、备注
    """
    # 部门名称映射：Excel中可能的写法 → 数据库标准名称
    DEPT_NAME_MAP = {
        "日用百货一组": "日用百货部（一组）",
        "日用百货二组": "日用百货部（二组）",
        "日用百货三组": "日用百货部（三组）",
        "日用百货部三组": "日用百货部（三组）",
        "日本事业部": "日本事业部（一部）",  # 默认映射到一部
        "上海事业部": "上海分公司",
        "业务管理部": "业务管理部",
        "行政管理部": "行政管理部",
        "人力资源部": "人力资源部",
        "财务管理部": "财务管理部",
        "惠州分公司": "惠州分公司",
        "视觉设计部": "视觉设计部",
        "单证部": "单证部",
        "管培生": "管培生",
    }

    contents = file.file.read()
    df = pd.read_excel(io.BytesIO(contents))
    required = ["部门", "积分", "积分日期"]
    for col in required:
        if col not in df.columns:
            raise HTTPException(400, f"缺少列: {col}")

    # 全覆盖模式：先清空
    if overwrite:
        db.query(models.TeamScore).delete()
        db.commit()

    success, fail = 0, []
    for _, row in df.iterrows():
        dept_name = str(row.get("部门", "")).strip()
        dept_name = DEPT_NAME_MAP.get(dept_name, dept_name)  # 应用名称映射
        dept = db.query(models.Department).filter(models.Department.name == dept_name).first()
        if not dept:
            fail.append(f"找不到部门: {dept_name}")
            continue
        try:
            score_date = pd.to_datetime(row["积分日期"]).date()
        except Exception:
            fail.append(f"{dept_name}: 日期格式错误")
            continue
        ts = models.TeamScore(
            department_id=dept.id,
            score=float(row["积分"]),
            channel=str(row.get("积分渠道", "") or "").strip() or None,
            event_desc=str(row.get("事件说明", "") or "").strip() or None,
            score_date=score_date,
            recorder=admin.name,
            remark=str(row.get("备注", "") or "").strip() or None,
        )
        db.add(ts)
        success += 1
    db.commit()
    return {"success": success, "failed": fail, "message": f"成功导入{success}条"}


@router.get("/import/template")
def download_team_score_template(_: models.User = Depends(get_current_user)):
    """下载团队积分导入模板"""
    template_path = os.path.join(os.path.dirname(__file__), '..', 'templates', '团队积分导入模板.xlsx')
    # Docker容器内路径
    if not os.path.exists(template_path):
        template_path = '/app/templates/团队积分导入模板.xlsx'
    if not os.path.exists(template_path):
        raise HTTPException(404, "模板文件不存在")
    return FileResponse(
        template_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="团队积分导入模板.xlsx",
    )
