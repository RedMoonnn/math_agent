"""
Math Agent API 启动脚本
"""
import logging
import uvicorn

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("app.start")

if __name__ == "__main__":
    logger.info("启动 Math Agent 服务")
    logger.info("注意: 使用8000端口，避免与其他服务冲突")
    
    # 启动服务器
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    ) 