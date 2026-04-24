from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models, schemas
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/departments", tags=["部门管理"])


@router.get("", response_model=schemas.PageResult)
def list_departments(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Department)
    total = q.count()
    items = q.order_by(models.Department.id).offset((page - 1) * page_size).limit(page_size).all()
    return schemas.PageResult(
        total=total, page=page, page_size=page_size,
        items=[schemas.DepartmentOut.model_validate(d) for d in items]
    )


@router.post("", response_model=schemas.DepartmentOut)
def create_department(body: schemas.DepartmentCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(models.Department).filter(models.Department.name == body.name).first():
        raise HTTPException(400, "部门名称已存在")
    dept = models.Department(**body.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return schemas.DepartmentOut.model_validate(dept)


@router.put("/{dept_id}", response_model=schemas.DepartmentOut)
def update_department(dept_id: int, body: schemas.DepartmentUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "部门不存在")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(dept, field, val)
    db.commit()
    db.refresh(dept)
    return schemas.DepartmentOut.model_validate(dept)


@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "部门不存在")
    db.delete(dept)
    db.commit()
    return {"message": "已删除"}
