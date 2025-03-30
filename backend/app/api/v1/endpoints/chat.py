from typing import Any
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.orm import Session
import io
import base64
import traceback

from ....db.session import get_db
from ....models import user as user_models
from ....schemas import question as question_schemas
from ....core.auth import get_current_user
from ....services.deepseek import deepseek_client
from ....services.image_process import extract_text_from_image

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/math", response_model=question_schemas.AIAnswerResponse)
async def get_math_answer(
    request: question_schemas.TextQuestion,
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取数学问题的AI回答
    """
    try:
        logger.info(f"用户 {current_user.username} 发送数学聊天问题")
        logger.info(f"处理数学问题: '{request.question[:50]}...'")
        
        response = await deepseek_client.generate_answer(request.question)
        
        # 日志记录回答
        logger.info(f"已生成回答: {response[:100]}...")
        
        # 确保即使返回None也能处理
        if not response:
            logger.warning("AI回答返回为空，使用默认回答")
            response = "抱歉，目前无法生成回答，请稍后重试。"
            
        # 返回标准格式
        return {
            "answer": response,
            "model": "deepseek-chat"
        }
    except Exception as e:
        # 记录详细错误信息
        logger.error(f"处理数学问题时发生错误: {str(e)}")
        logger.error(traceback.format_exc())
        
        # 即使发生错误，也返回标准格式，避免前端解析错误
        return {
            "answer": f"处理问题时出现错误: {str(e)}",
            "model": "error",
            "error": True
        }

@router.post("/upload-math", response_model=question_schemas.AIAnswerResponse)
async def upload_math_question(
    image: UploadFile = File(None),
    question: str = Form(None),
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    上传图片并获取数学问题的AI回答
    """
    try:
        logger.info(f"用户 {current_user.username} 上传图片并请求数学分析")
        
        # 实际项目中需要接入图像识别和处理逻辑
        if image:
            logger.info(f"收到图片: {image.filename}, 类型: {image.content_type}")
            
            # 读取图片内容
            image_content = await image.read()
            logger.info(f"图片大小: {len(image_content)} bytes")
            
            # 在实际项目中，这里应该调用OCR服务识别图片中的文字
            # 这里使用模拟实现
            extracted_text = "图片中的数学问题"  # 实际项目中应该替换为真实的OCR结果
            
            # 合并提问内容
            full_question = f"{question or ''}\n[图片内容]: {extracted_text}"
        else:
            full_question = question
            
        if not full_question:
            logger.warning("请求中没有提供文本问题或图片")
            return {
                "answer": "请提供文本问题或包含数学内容的图片",
                "model": "deepseek-chat"
            }
            
        logger.info(f"处理完整问题: '{full_question[:50]}...'")
        
        # 调用AI服务生成回答
        response = await deepseek_client.generate_answer(full_question)
        
        # 日志记录回答
        logger.info(f"已生成回答: {response[:100]}...")
        
        # 确保即使返回None也能处理
        if not response:
            logger.warning("AI回答返回为空，使用默认回答")
            response = "抱歉，目前无法生成回答，请稍后重试。"
            
        # 返回标准格式
        return {
            "answer": response,
            "model": "deepseek-chat"
        }
    except Exception as e:
        # 记录详细错误信息
        logger.error(f"处理图片数学问题时发生错误: {str(e)}")
        logger.error(traceback.format_exc())
        
        # 即使发生错误，也返回标准格式，避免前端解析错误
        return {
            "answer": f"处理图片问题时出现错误: {str(e)}",
            "model": "error",
            "error": True
        } 