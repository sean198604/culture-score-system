from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models, schemas
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/rules", tags=["积分规则"])


@router.get("", response_model=schemas.PageResult)
def list_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.ScoreRule)
    if category:
        q = q.filter(models.ScoreRule.category == category)
    if keyword:
        q = q.filter(models.ScoreRule.name.ilike(f"%{keyword}%"))
    total = q.count()
    items = q.order_by(models.ScoreRule.id).offset((page - 1) * page_size).limit(page_size).all()
    return schemas.PageResult(
        total=total, page=page, page_size=page_size,
        items=[schemas.ScoreRuleOut.model_validate(r) for r in items]
    )


@router.post("", response_model=schemas.ScoreRuleOut)
def create_rule(body: schemas.ScoreRuleCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    rule = models.ScoreRule(**body.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return schemas.ScoreRuleOut.model_validate(rule)


@router.put("/{rule_id}", response_model=schemas.ScoreRuleOut)
def update_rule(rule_id: int, body: schemas.ScoreRuleUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    rule = db.query(models.ScoreRule).filter(models.ScoreRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "规则不存在")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(rule, field, val)
    db.commit()
    db.refresh(rule)
    return schemas.ScoreRuleOut.model_validate(rule)


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    rule = db.query(models.ScoreRule).filter(models.ScoreRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "规则不存在")
    db.delete(rule)
    db.commit()
    return {"message": "已删除"}
