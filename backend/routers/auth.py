from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已停用")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        role=user.role,
        department_id=user.department_id,
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    dept_name = current_user.department.name if current_user.department else None
    out = schemas.UserOut.model_validate(current_user)
    out.department_name = dept_name
    return out
