import logging
from sqlalchemy.orm import Session
from .db.init_db import init_db, create_initial_data
from .db.session import SessionLocal
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init() -> None:
    db = SessionLocal()
    try:
        init_db(db)
        create_initial_data(db)
        logger.info("Database initialized successfully")
    finally:
        db.close()

def start():
    """
    启动应用服务
    """
    logger.info("启动应用服务...")
    # 启动服务器
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )

if __name__ == "__main__":
    start() 