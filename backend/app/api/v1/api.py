from fastapi import APIRouter

from .endpoints import auth, questions, answers, ai, admin, chat

api_router = APIRouter()

# 身份认证相关路由
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# 问题相关路由
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])

# 答案相关路由
api_router.include_router(answers.router, prefix="/answers", tags=["answers"])

# AI服务相关路由
api_router.include_router(ai.router, prefix="/questions", tags=["ai"])

# 管理员相关路由
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# 聊天功能路由
api_router.include_router(chat.router, prefix="/chat", tags=["chat"]) 