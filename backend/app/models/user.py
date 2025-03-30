from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel

class User(BaseModel):
    __tablename__ = "users"
    
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    reset_code = Column(String(10), nullable=True)  # 存储密码重置验证码
    email_verified = Column(Boolean, default=False)  # 邮箱是否已验证
    avatar = Column(String(255), nullable=True)  # 存储用户头像URL
    
    # 关系定义
    questions = relationship("Question", back_populates="user")
    answers = relationship("Answer", back_populates="user")
    feedback = relationship("Feedback", back_populates="user") 