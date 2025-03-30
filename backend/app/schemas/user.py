from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    avatar: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    avatar: Optional[str] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class UserPasswordResetRequest(BaseModel):
    email: EmailStr

class UserPasswordReset(BaseModel):
    email: EmailStr
    verification_code: str
    new_password: str

class UserChangePassword(BaseModel):
    current_password: str
    new_password: str

class EmailVerifyRequest(BaseModel):
    email: EmailStr

class EmailVerifyVerify(BaseModel):
    email: EmailStr
    verification_code: str

class UserAvatarUpdate(BaseModel):
    avatar: str 