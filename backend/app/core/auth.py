from typing import Optional, Dict, Any, Union
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .config import settings
from ..db.session import get_db
from ..models.user import User
from ..schemas.user import TokenPayload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=True)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Validate token and return current user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的身份验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 验证token
        # 优先使用新的配置变量，如果未设置则回退到旧的配置变量
        secret_key = getattr(settings, "SECRET_KEY", settings.JWT_SECRET_KEY)
        algorithm = getattr(settings, "ALGORITHM", settings.JWT_ALGORITHM)
        
        payload = jwt.decode(
            token, secret_key, algorithms=[algorithm]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.sub is None:
            raise credentials_exception
        
        # 注意: token_data.sub可能是int也可能是字符串
        # 确保转换为正确的类型
        user_id = int(token_data.sub)
        
    except JWTError:
        raise credentials_exception
    
    # 获取用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户账户未激活")
    return user

def get_current_active_superuser(current_user: User = Depends(get_current_user)) -> User:
    """
    Validate superuser privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user

# 添加可选的用户认证函数，不要求用户登录
async def get_optional_current_user(
    db: Session = Depends(get_db), 
    authorization: Optional[str] = Header(None)
) -> Optional[User]:
    """
    验证用户身份，但不强制要求登录
    如果用户已登录，返回用户对象，否则返回None
    """
    if not authorization:
        return None
        
    try:
        # 从Authorization头中提取token
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        
        # 优先使用新的配置变量，如果未设置则回退到旧的配置变量
        secret_key = getattr(settings, "SECRET_KEY", settings.JWT_SECRET_KEY)
        algorithm = getattr(settings, "ALGORITHM", settings.JWT_ALGORITHM)
            
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
            
        user = db.query(User).filter(User.id == user_id).first()
        if user is None or not user.is_active:
            return None
            
        return user
    except (JWTError, ValueError):
        return None 