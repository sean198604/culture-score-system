from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from database import get_db
import models, schemas
from auth import get_current_user, require_admin, get_password_hash
import io, pandas as pd, os
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/users", tags=["用户管理"])


def build_user_out(user: models.User) -> schemas.UserOut:
    out = schemas.UserOut.model_validate(user)
    out.department_name = user.department.name if user.department else None
    return out


@router.get("", response_model=schemas.PageResult)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    keyword: Optional[str] = None,
    department_id: Optional[int] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    q = db.query(models.User)
    if keyword:
        q = q.filter(
            (models.User.name.ilike(f"%{keyword}%")) | (models.User.username.ilike(f"%{keyword}%"))
        )
    if department_id:
        q = q.filter(models.User.department_id == department_id)
    if role:
        q = q.filter(models.User.role == role)
    total = q.count()
    users = q.order_by(models.User.id).offset((page - 1) * page_size).limit(page_size).all()
    return schemas.PageResult(total=total, page=page, page_size=page_size, items=[build_user_out(u) for u in users])


@router.post("", response_model=schemas.UserOut)
def create_user(body: schemas.UserCreate, db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    if db.query(models.User).filter(models.User.username == body.username).first():
        raise HTTPException(400, "用户名已存在")
    user = models.User(
        username=body.username,
        name=body.name,
        password_hash=get_password_hash(body.password),
        department_id=body.department_id,
        role=body.role,
        email=body.email,
        phone=body.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_user_out(user)


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    if current.role not in ("admin", "hr") and current.id != user_id:
        raise HTTPException(403, "无权限")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    return build_user_out(user)


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, body: schemas.UserUpdate, db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    for field, val in body.model_dump(exclude_none=True).items():
        if field == "password":
            setattr(user, "password_hash", get_password_hash(val))
        else:
            setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return build_user_out(user)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    user.is_active = 0
    db.commit()
    return {"message": "已停用"}


@router.post("/import/excel")
def import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    contents = file.file.read()
    df = pd.read_excel(io.BytesIO(contents))
    # 期望列: 姓名, 用户名, 部门, 手机, 邮箱
    required = ["姓名", "用户名"]
    for col in required:
        if col not in df.columns:
            raise HTTPException(400, f"缺少必要列: {col}")

    success, fail = 0, []
    for _, row in df.iterrows():
        username = str(row.get("用户名", "")).strip()
        name = str(row.get("姓名", "")).strip()
        if not username or not name:
            fail.append(f"空行跳过")
            continue
        dept_name = str(row.get("部门", "")).strip()
        dept = db.query(models.Department).filter(models.Department.name == dept_name).first() if dept_name else None
        existing = db.query(models.User).filter(models.User.username == username).first()
        if existing:
            fail.append(f"{username} 已存在")
            continue
        user = models.User(
            username=username,
            name=name,
            password_hash=get_password_hash("Ego@123456"),
            department_id=dept.id if dept else None,
            email=str(row.get("邮箱", "") or "").strip() or None,
            phone=str(row.get("手机", "") or "").strip() or None,
        )
        db.add(user)
        success += 1
    db.commit()
    return {"success": success, "failed": fail, "message": f"成功导入{success}条"}


@router.get("/import/template")
def download_user_template(_: models.User = Depends(require_admin)):
    """下载员工导入模板"""
    template_path = os.path.join(os.path.dirname(__file__), '..', 'templates', '员工导入模板.xlsx')
    if not os.path.exists(template_path):
        template_path = '/app/templates/员工导入模板.xlsx'
    if not os.path.exists(template_path):
        raise HTTPException(404, "模板文件不存在")
    return FileResponse(
        template_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="员工导入模板.xlsx",
    )
