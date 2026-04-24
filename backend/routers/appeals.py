from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from typing import Optional, List
from datetime import datetime
import json, os, uuid
from database import get_db
import models, schemas
from auth import get_current_user, require_admin
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/appeals", tags=["申诉"])


@router.get("", response_model=schemas.PageResult)
def list_appeals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    q = db.query(models.Appeal)
    if current.role == "employee":
        q = q.filter(models.Appeal.user_id == current.id)
    if status:
        q = q.filter(models.Appeal.status == status)
    total = q.count()
    items = q.order_by(models.Appeal.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for a in items:
        out = schemas.AppealOut.model_validate(a)
        out.user_name = a.user.name if a.user else None
        result.append(out)
    return schemas.PageResult(total=total, page=page, page_size=page_size, items=result)


@router.post("", response_model=schemas.AppealOut)
def create_appeal(body: schemas.AppealCreate, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    appeal = models.Appeal(
        user_id=current.id,
        score_id=body.score_id,
        title=body.title,
        content=body.content,
        image_urls=json.dumps(body.image_urls or [], ensure_ascii=False),
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    out = schemas.AppealOut.model_validate(appeal)
    out.user_name = current.name
    return out


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current: models.User = Depends(get_current_user)):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())
    return {"url": f"/uploads/{filename}"}


@router.put("/{appeal_id}/review", response_model=schemas.AppealOut)
def review_appeal(
    appeal_id: int,
    body: schemas.AppealReview,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "状态无效")
    appeal = db.query(models.Appeal).filter(models.Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(404, "申诉不存在")
    appeal.status = body.status
    appeal.reviewer_id = admin.id
    appeal.review_note = body.review_note
    appeal.reviewed_at = datetime.now()
    db.commit()
    db.refresh(appeal)
    out = schemas.AppealOut.model_validate(appeal)
    out.user_name = appeal.user.name if appeal.user else None
    return out
