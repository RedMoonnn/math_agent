from typing import Any
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....models import question as question_models
from ....models import user as user_models
from ....schemas import question as question_schemas
from ....core.auth import get_current_user
from ....services.deepseek import deepseek_client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/{question_id}/ai-answer", response_model=question_schemas.AIResponse)
async def generate_ai_answer(
    *,
    db: Session = Depends(get_db),
    question_id: int,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    使用Deepseek生成问题的AI回答
    """
    # 日志记录请求信息
    logger.info(f"用户 {current_user.username} 请求问题 {question_id} 的AI回答")
    
    # 查找问题
    question = db.query(question_models.Question).filter(question_models.Question.id == question_id).first()
    if not question:
        logger.warning(f"问题不存在: {question_id}")
        raise HTTPException(status_code=404, detail="问题不存在")
    
    # 检查是否已有AI回答
    existing_ai_answer = db.query(question_models.Answer).filter(
        question_models.Answer.question_id == question_id,
        question_models.Answer.created_by == 1  # 假设ID为1的用户是AI
    ).first()
    
    if existing_ai_answer:
        logger.info(f"问题 {question_id} 已存在AI回答，返回已有回答")
        return {"answer": existing_ai_answer.content}
    
    # 准备完整的问题内容
    question_prompt = f"问题标题: {question.title}\n\n问题内容: {question.content}"
    logger.info(f"正在生成问题 '{question.title}' 的AI回答")
    
    try:
        # 调用Deepseek API生成回答
        ai_response = await deepseek_client.generate_answer(question_prompt)
        
        if not ai_response:
            logger.error(f"为问题 {question_id} 生成AI回答失败")
            # 使用默认回答替代报错
            ai_response = r"""
            很抱歉，无法为问题"{question.title}"生成AI回答。
            
            以下是一些常见解题方法：
            
            对于二次方程 $ax^2 + bx + c = 0$：
            - 使用判别式 $\Delta = b^2 - 4ac$ 确定解的性质
            - 使用求根公式 $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
            
            如果您有更具体的问题，请提供更多详细信息。
            """.format(question=question)
        
        # 创建答案记录
        try:
            ai_answer = question_models.Answer(
                content=ai_response,
                question_id=question_id,
                created_by=1,  # AI用户ID
            )
            
            db.add(ai_answer)
            db.commit()
            db.refresh(ai_answer)
            logger.info(f"已将AI回答保存到数据库")
        except Exception as db_error:
            logger.error(f"保存AI回答到数据库时出错: {str(db_error)}")
            # 即使保存失败也继续返回回答
        
        logger.info(f"已成功生成问题 {question_id} 的AI回答")
        return {"answer": ai_response}
        
    except Exception as e:
        logger.error(f"生成AI回答时发生错误: {str(e)}")
        
        # 使用默认回答替代报错
        default_answer = r"""
        很抱歉，处理问题"{question.title}"时遇到了技术问题。
        
        以下是一些常见的数学知识点，希望对您有所帮助：
        
        1. 二次方程求解：$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
        2. 微分基本公式：$\frac{d}{dx}x^n = nx^{n-1}$
        3. 积分基本公式：$\int x^n dx = \frac{x^{n+1}}{n+1} + C$
        
        请稍后再试，或者尝试重新表述您的问题。
        """.format(question=question)
        
        # 尝试保存默认回答
        try:
            default_ai_answer = question_models.Answer(
                content=default_answer,
                question_id=question_id,
                created_by=1,  # AI用户ID
            )
            
            db.add(default_ai_answer)
            db.commit()
            db.refresh(default_ai_answer)
        except Exception:
            logger.error("保存默认回答到数据库时出错")
        
        return {"answer": default_answer} 