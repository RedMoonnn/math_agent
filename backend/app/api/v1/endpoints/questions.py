from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
import traceback
from sqlalchemy.exc import SQLAlchemyError

from ....db.session import get_db
from ....models import question as question_models
from ....models import user as user_models
from ....schemas import question as question_schemas
from ....core.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[question_schemas.QuestionWithAnswers])
def read_questions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    difficulty: str = None,
):
    """
    获取问题列表，包含回答数量信息
    """
    logger.info(f"获取问题列表: skip={skip}, limit={limit}, category={category}, difficulty={difficulty}")
    
    try:
        query = db.query(question_models.Question)
        if category:
            query = query.filter(question_models.Question.category == category)
        if difficulty:
            # 尝试将字符串转换为枚举对象
            try:
                # 将字符串转换为大写，以匹配枚举名称（例如："easy" -> "EASY"）
                difficulty_enum = question_models.QuestionDifficulty[difficulty.upper()]
                query = query.filter(question_models.Question.difficulty == difficulty_enum)
            except (KeyError, ValueError) as e:
                logger.warning(f"转换难度值失败: {difficulty} - {str(e)}")
                # 如果转换失败，忽略此过滤条件
                pass
        
        # 获取问题列表
        questions = query.offset(skip).limit(limit).all()
        logger.info(f"成功获取问题列表，共 {len(questions)} 个问题")
        
        # 增强问题数据，添加回答信息
        result = []
        for question in questions:
            try:
                # 获取问题的回答
                answers = db.query(question_models.Answer).filter(
                    question_models.Answer.question_id == question.id
                ).all()
                
                # 安全地获取difficulty值
                difficulty_value = None
                try:
                    if question.difficulty:
                        difficulty_value = question.difficulty.value
                except (ValueError, AttributeError) as e:
                    logger.warning(f"处理问题ID={question.id}的difficulty值时出错: {str(e)}")
                    # 如果是字符串，尝试直接使用
                    if isinstance(question.difficulty, str):
                        difficulty_value = question.difficulty
                
                # 构建包含回答的问题数据
                question_data = {
                    "id": question.id,
                    "title": question.title,
                    "content": question.content,
                    "category": question.category,
                    "difficulty": difficulty_value,
                    "created_at": question.created_at,
                    "updated_at": question.updated_at,
                    "created_by": question.created_by,
                    "answers": answers
                }
                result.append(question_data)
            except Exception as item_error:
                logger.error(f"处理问题ID={question.id}时出错: {str(item_error)}")
                # 继续处理其他问题
                continue
        
        return result
    except SQLAlchemyError as db_error:
        logger.error(f"数据库错误: {str(db_error)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"数据库错误: {str(db_error)}"
        )
    except Exception as e:
        logger.error(f"获取问题列表失败: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"获取问题列表失败: {str(e)}"
        )

@router.post("/", response_model=question_schemas.Question)
def create_question(
    *,
    db: Session = Depends(get_db),
    question_in: question_schemas.QuestionCreate,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    Create new question.
    """
    logger.info(f"用户 {current_user.username} 创建问题: {question_in.title}")
    
    try:
        # 处理difficulty字段
        difficulty = None
        if question_in.difficulty:
            try:
                # 确保使用枚举值而不是字符串值
                difficulty_name = question_in.difficulty.name if hasattr(question_in.difficulty, 'name') else question_in.difficulty.upper()
                difficulty = question_models.QuestionDifficulty[difficulty_name]
                logger.info(f"处理难度值: 输入={question_in.difficulty}, 转换后={difficulty.name}")
            except (KeyError, AttributeError) as e:
                logger.warning(f"无法将难度值转换为枚举: {question_in.difficulty} - {str(e)}")
                # 尝试直接使用值
                if isinstance(question_in.difficulty, str):
                    for enum_item in question_models.QuestionDifficulty:
                        if enum_item.value.lower() == question_in.difficulty.lower():
                            difficulty = enum_item
                            break
        
        question = question_models.Question(
            title=question_in.title,
            content=question_in.content,
            category=question_in.category,
            difficulty=difficulty,
            created_by=current_user.id,
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        
        logger.info(f"问题创建成功, ID={question.id}")
        
        # 构造返回响应，确保difficulty是字符串值
        question_data = {
            "id": question.id,
            "title": question.title,
            "content": question.content,
            "category": question.category,
            "difficulty": question.difficulty.value if question.difficulty else None,
            "created_at": question.created_at,
            "updated_at": question.updated_at,
            "created_by": question.created_by,
        }
        
        return question_data
    except Exception as e:
        db.rollback()
        logger.error(f"创建问题失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"创建问题失败: {str(e)}"
        )

@router.get("/{question_id}", response_model=question_schemas.Question)
def read_question(
    *,
    db: Session = Depends(get_db),
    question_id: int,
):
    """
    Get question by ID.
    """
    logger.info(f"获取问题详情: ID={question_id}")
    
    question = db.query(question_models.Question).filter(question_models.Question.id == question_id).first()
    if not question:
        logger.warning(f"问题不存在: ID={question_id}")
        raise HTTPException(status_code=404, detail="Question not found")
    
    # 构造返回响应，确保difficulty是字符串值
    question_data = {
        "id": question.id,
        "title": question.title,
        "content": question.content,
        "category": question.category,
        "difficulty": question.difficulty.value if question.difficulty else None,
        "created_at": question.created_at,
        "updated_at": question.updated_at,
        "created_by": question.created_by,
    }
    
    logger.info(f"成功获取问题详情: ID={question_id}")
    return question_data

@router.put("/{question_id}", response_model=question_schemas.Question)
def update_question(
    *,
    db: Session = Depends(get_db),
    question_id: int,
    question_in: question_schemas.QuestionUpdate,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    Update question.
    """
    logger.info(f"用户 {current_user.username} 更新问题: ID={question_id}")
    
    question = db.query(question_models.Question).filter(question_models.Question.id == question_id).first()
    if not question:
        logger.warning(f"问题不存在: ID={question_id}")
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.created_by != current_user.id and not current_user.is_superuser:
        logger.warning(f"用户 {current_user.username} 无权更新问题 {question_id}")
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # 特殊处理difficulty字段
        update_data = {}
        for field in ["title", "content", "category"]:
            if hasattr(question_in, field) and getattr(question_in, field) is not None:
                update_data[field] = getattr(question_in, field)
        
        # 处理difficulty字段
        if question_in.difficulty is not None:
            try:
                difficulty_name = question_in.difficulty.name if hasattr(question_in.difficulty, 'name') else question_in.difficulty.upper()
                update_data["difficulty"] = question_models.QuestionDifficulty[difficulty_name]
                logger.info(f"处理难度值: 输入={question_in.difficulty}, 转换后={update_data['difficulty'].name}")
            except (KeyError, AttributeError) as e:
                logger.warning(f"无法将难度值转换为枚举: {question_in.difficulty} - {str(e)}")
                # 如果转换失败，不更新此字段
                if isinstance(question_in.difficulty, str):
                    for enum_item in question_models.QuestionDifficulty:
                        if enum_item.value.lower() == question_in.difficulty.lower():
                            update_data["difficulty"] = enum_item
                            break
        
        # 更新字段
        for key, value in update_data.items():
            setattr(question, key, value)
        
        db.add(question)
        db.commit()
        db.refresh(question)
        
        # 构造返回响应，确保difficulty是字符串值
        question_data = {
            "id": question.id,
            "title": question.title,
            "content": question.content,
            "category": question.category,
            "difficulty": question.difficulty.value if question.difficulty else None,
            "created_at": question.created_at,
            "updated_at": question.updated_at,
            "created_by": question.created_by,
        }
        
        logger.info(f"问题更新成功: ID={question_id}")
        return question_data
    except Exception as e:
        db.rollback()
        logger.error(f"更新问题失败: ID={question_id}, 错误={str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"更新问题失败: {str(e)}"
        )

@router.delete("/{question_id}", response_model=question_schemas.Question)
def delete_question(
    *,
    db: Session = Depends(get_db),
    question_id: int,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    Delete question.
    """
    logger.info(f"用户 {current_user.username} 删除问题: ID={question_id}")
    
    question = db.query(question_models.Question).filter(question_models.Question.id == question_id).first()
    if not question:
        logger.warning(f"问题不存在: ID={question_id}")
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.created_by != current_user.id and not current_user.is_superuser:
        logger.warning(f"用户 {current_user.username} 无权删除问题 {question_id}")
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # 保存问题数据以便返回
        question_data = {
            "id": question.id,
            "title": question.title,
            "content": question.content,
            "category": question.category,
            "difficulty": question.difficulty.value if question.difficulty else None,
            "created_at": question.created_at,
            "updated_at": question.updated_at,
            "created_by": question.created_by,
        }
        
        db.delete(question)
        db.commit()
        
        logger.info(f"问题删除成功: ID={question_id}")
        return question_data
    except Exception as e:
        db.rollback()
        logger.error(f"删除问题失败: ID={question_id}, 错误={str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"删除问题失败: {str(e)}"
        ) 