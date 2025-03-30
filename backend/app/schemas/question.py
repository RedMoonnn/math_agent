from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class QuestionDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class AnswerBase(BaseModel):
    content: str

class AnswerCreate(AnswerBase):
    pass

class FeedbackBase(BaseModel):
    rating: int
    comment: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class QuestionBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    difficulty: Optional[QuestionDifficulty] = None

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[QuestionDifficulty] = None

class Feedback(FeedbackBase):
    id: int
    answer_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Answer(AnswerBase):
    id: int
    question_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    feedback: Optional[List[Feedback]] = None

    class Config:
        from_attributes = True

class Question(QuestionBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    answers: Optional[List[Answer]] = None

    class Config:
        from_attributes = True

class QuestionWithAnswers(Question):
    """带有回答列表的问题"""
    answers: Optional[List[Answer]] = [] 

# 数学聊天问题模型
class MathQuestion(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)

# AI响应模型
class AIResponse(BaseModel):
    answer: str

class TextQuestion(BaseModel):
    """文本问题"""
    question: str

class AIAnswerResponse(BaseModel):
    """标准AI回答响应"""
    answer: str
    model: str = "deepseek-chat"
    error: bool = False
    usage: Optional[Dict[str, Any]] = None 