from pydantic_settings import BaseSettings
from typing import Optional, List
import os
from pathlib import Path
from pydantic import field_validator, ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Math Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS配置
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "*"]
    
    # 数据库配置
    DB_TYPE: str = os.getenv("DB_TYPE", "sqlite")  # 默认使用sqlite
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "math_agent"
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # 身份验证配置
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 旧配置，兼容性保留
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    
    # AI服务配置
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1/chat/completions"
    USE_MOCK_ANSWERS: bool = True  # 默认启用模拟模式
    
    # SMTP 邮件服务器配置
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "your-email@gmail.com"
    SMTP_PASSWORD: str = "your-email-password"
    
    # 静态文件配置
    STATIC_DIR: str = ""
    API_HOST: str = os.getenv("API_HOST", "http://localhost:8000")
    
    model_config = ConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow" # 允许额外的属性
    )
    
    @field_validator("USE_MOCK_ANSWERS", mode="before")
    @classmethod
    def validate_use_mock_answers(cls, v):
        if isinstance(v, str):
            return v.lower() == "true"
        return v

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SQLALCHEMY_DATABASE_URI:
            if self.DB_TYPE == "sqlite":
                # 使用SQLite
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                self.SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(base_dir, 'math_agent.db')}"
            else:
                # 使用PostgreSQL
                self.SQLALCHEMY_DATABASE_URI = (
                    f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                    f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
                )
                
        # 设置静态文件目录
        if not self.STATIC_DIR:
            base_dir = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            self.STATIC_DIR = str(base_dir / "static")

settings = Settings() 