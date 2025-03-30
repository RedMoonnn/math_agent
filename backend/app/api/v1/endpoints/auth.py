from datetime import timedelta
from typing import Any
import secrets
import string
import os
import shutil
from pathlib import Path
import base64
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ....core import security
from ....core.config import settings
from ....schemas import user as user_schemas
from ....models import user as user_models
from ....db.session import get_db
from ....utils.email import send_email
from ....core.auth import get_current_user

router = APIRouter()

# 生成随机验证码
def generate_verification_code(length=6):
    """生成6位数字验证码"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))

@router.post("/login", response_model=user_schemas.Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    print(f"尝试登录用户: {form_data.username}")
    user = db.query(user_models.User).filter(user_models.User.username == form_data.username).first()
    if not user:
        print(f"用户不存在: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码不正确",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not security.verify_password(form_data.password, user.hashed_password):
        print(f"密码验证失败: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码不正确",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查用户是否被激活
    if not user.is_active:
        print(f"用户未激活: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户账号已被停用，请联系管理员",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"登录成功: {form_data.username}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        {"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # 返回token和token类型
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=user_schemas.User)
def register(
    *,
    db: Session = Depends(get_db),
    user_in: user_schemas.UserCreate,
) -> Any:
    """
    创建新用户
    """
    user = db.query(user_models.User).filter(user_models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="该邮箱已注册",
        )
    user = db.query(user_models.User).filter(user_models.User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="该用户名已被使用",
        )
    user = user_models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        email_verified=False,  # 默认邮箱未验证
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/verify-email/send-code")
async def send_email_verification_code(
    *,
    db: Session = Depends(get_db),
    email_in: user_schemas.EmailVerifyRequest
):
    """
    发送邮箱验证码
    """
    user = db.query(user_models.User).filter(user_models.User.email == email_in.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="该邮箱未注册"
        )
    
    if user.email_verified:
        return {"message": "邮箱已验证，无需重复验证"}
    
    # 生成验证码
    verification_code = generate_verification_code()
    
    # 将验证码存入数据库
    user.reset_code = verification_code
    db.commit()
    
    # 发送验证码邮件
    subject = "【数学问题解答系统】邮箱验证码"
    body = f"""
尊敬的 {user.username}：

您好！

感谢您注册数学问题解答系统。请使用以下验证码验证您的邮箱：

{verification_code}

该验证码将在10分钟内有效，请尽快完成验证。

此致，
数学问题解答系统团队
    """
    
    # 发送邮件
    email_sent = await send_email(
        email_to=user.email,
        subject=subject,
        body=body
    )
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后重试")
    
    return {"message": "验证码已发送到您的邮箱，请查收"}

@router.post("/verify-email/verify")
def verify_email(
    *,
    db: Session = Depends(get_db),
    verify_data: user_schemas.EmailVerifyVerify
):
    """
    验证邮箱
    """
    user = db.query(user_models.User).filter(user_models.User.email == verify_data.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="该邮箱未注册"
        )
    
    # 验证码验证
    if not user.reset_code or user.reset_code != verify_data.verification_code:
        raise HTTPException(
            status_code=400,
            detail="验证码错误或已过期"
        )
    
    # 更新邮箱验证状态
    user.email_verified = True
    # 清除验证码
    user.reset_code = None
    
    db.commit()
    
    return {"message": "邮箱验证成功"}

@router.post("/reset-password/send-code")
async def send_password_reset_code(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    email_in: user_schemas.UserPasswordResetRequest
):
    """
    发送密码重置验证码到用户邮箱
    """
    user = db.query(user_models.User).filter(user_models.User.email == email_in.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="该邮箱未注册"
        )
    
    # 生成验证码
    verification_code = generate_verification_code()
    
    # 将验证码存入数据库（在实际项目中应该使用Redis等缓存系统）
    user.reset_code = verification_code
    db.commit()
    
    # 发送验证码邮件
    subject = "【数学问题解答系统】密码重置验证码"
    body = f"""
尊敬的 {user.username}：

您好！

您正在进行密码重置操作。您的验证码是：

{verification_code}

该验证码将在10分钟内有效，请尽快完成操作。

如果不是您本人进行的操作，请忽略此邮件，或立即修改您的账号密码。

此致，
数学问题解答系统团队
    """
    
    # 使用后台任务发送邮件
    email_sent = await send_email(
        email_to=user.email,
        subject=subject,
        body=body
    )
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后重试")
    
    return {"message": "验证码已发送到您的邮箱，请查收"}

@router.post("/reset-password/verify")
def verify_and_reset_password(
    *,
    db: Session = Depends(get_db),
    reset_data: user_schemas.UserPasswordReset
):
    """
    验证验证码并重置密码
    """
    user = db.query(user_models.User).filter(user_models.User.email == reset_data.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="该邮箱未注册"
        )
    
    # 验证验证码
    if not user.reset_code or user.reset_code != reset_data.verification_code:
        raise HTTPException(
            status_code=400,
            detail="验证码错误或已过期"
        )
    
    # 重置密码
    user.hashed_password = security.get_password_hash(reset_data.new_password)
    # 清除验证码
    user.reset_code = None
    
    db.commit()
    
    return {"message": "密码重置成功"}

@router.post("/change-password")
def change_password(
    *,
    db: Session = Depends(get_db),
    password_data: user_schemas.UserChangePassword,
    current_user: user_models.User = Depends(get_current_user)
):
    """
    修改当前用户密码
    """
    # 验证当前密码
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="当前密码不正确"
        )
    
    # 更新密码
    current_user.hashed_password = security.get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "密码修改成功"}

@router.get("/me", response_model=user_schemas.User)
def get_current_user_info(
    current_user: user_models.User = Depends(get_current_user)
) -> Any:
    """
    获取当前用户信息
    """
    return current_user

@router.post("/update-avatar", response_model=user_schemas.User)
async def update_avatar(
    *,
    db: Session = Depends(get_db),
    avatar_data: user_schemas.UserAvatarUpdate,
    current_user: user_models.User = Depends(get_current_user)
):
    """
    更新用户头像
    """
    try:
        # 检查是否为base64格式的图片数据
        if avatar_data.avatar.startswith('data:image'):
            # 创建存储目录
            avatar_dir = Path(settings.STATIC_DIR) / "avatars" 
            avatar_dir.mkdir(parents=True, exist_ok=True)
            
            # 从base64中提取图片格式
            image_format = avatar_data.avatar.split(';')[0].split('/')[1]
            
            # 生成唯一文件名
            filename = f"avatar_{current_user.id}_{secrets.token_hex(8)}.{image_format}"
            file_path = avatar_dir / filename
            
            # 从base64中提取图像数据并保存
            image_data = avatar_data.avatar.split(',')[1]
            with open(file_path, "wb") as f:
                f.write(base64.b64decode(image_data))

            # 构建访问URL - 使用完整URL路径
            avatar_url = f"{settings.API_HOST}/static/avatars/{filename}"
            
            # 更新用户头像路径
            current_user.avatar = avatar_url
            db.commit()
            db.refresh(current_user)
            
            return current_user
        else:
            raise HTTPException(
                status_code=400,
                detail="无效的图片格式，请提供base64编码的图片数据"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新头像失败: {str(e)}"
        ) 