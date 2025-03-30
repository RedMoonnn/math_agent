from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....models import user as user_models
from ....schemas import user as user_schemas
from ....core.auth import get_current_user

router = APIRouter()

@router.get("/users", response_model=List[user_schemas.User])
def get_all_users(
    *,
    db: Session = Depends(get_db),
    current_user: user_models.User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    获取所有用户（仅限管理员）
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员可以访问此功能"
        )
        
    users = db.query(user_models.User).offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}/activate", response_model=user_schemas.User)
def activate_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    激活用户（仅限管理员）
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员可以访问此功能"
        )
        
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
        
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}/deactivate", response_model=user_schemas.User)
def deactivate_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    停用用户（仅限管理员）
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员可以访问此功能"
        )
        
    # 不允许停用自己
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能停用自己的账号"
        )
        
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
        
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", response_model=user_schemas.User)
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    删除用户（仅限管理员）
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员可以访问此功能"
        )
        
    # 不允许删除自己
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )
        
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
        
    db.delete(user)
    db.commit()
    return user 