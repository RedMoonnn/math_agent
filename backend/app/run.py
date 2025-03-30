"""
Math Agent API 启动模块
"""
import logging
import uvicorn
from app.main import app
from app.core.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("app.start")

def start():
    """
    启动应用服务
    """
    logger.info(f"启动 {settings.PROJECT_NAME} 服务")
    logger.info(f"数据库URI: {settings.SQLALCHEMY_DATABASE_URI}")
    logger.info(f"CORS配置: 允许所有来源")
    logger.info("Database initialized successfully")
    
    # 启动服务器
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    start() 