import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import JSONResponse

from .api.v1.api import api_router
from .core.config import settings
from .db.init_db import init_db
from .db.session import SessionLocal

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 设置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，简化开发
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
static_dir = Path(settings.STATIC_DIR)
if not static_dir.exists():
    os.makedirs(static_dir, exist_ok=True)
    logger.info(f"创建了静态文件目录: {static_dir}")

# 确保头像目录存在
avatars_dir = static_dir / "avatars"
if not avatars_dir.exists():
    os.makedirs(avatars_dir, exist_ok=True)
    logger.info(f"创建了头像目录: {avatars_dir}")

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
logger.info(f"挂载静态文件目录: {static_dir}")

# 挂载API路由
app.include_router(api_router, prefix=settings.API_V1_STR)

# 错误处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"全局异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误，请稍后重试"}
    )

# 初始化应用
@app.on_event("startup")
def on_startup():
    logger.info("应用启动：初始化数据库")
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    logger.info("应用启动完成")

# 健康检查
@app.get("/health")
def health_check():
    return {"status": "healthy", "version": settings.VERSION}

@app.get("/")
def read_root():
    return {"message": "Welcome to Math Agent API"} 