from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel

class QuestionDifficulty(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class Question(BaseModel):
    __tablename__ = "questions"
    
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50))
    difficulty = Column(Enum(QuestionDifficulty))
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    user = relationship("User", back_populates="questions")
    answers = relationship("Answer", back_populates="question")

class Answer(BaseModel):
    __tablename__ = "answers"
    
    content = Column(Text, nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    question = relationship("Question", back_populates="answers")
    user = relationship("User", back_populates="answers")
    feedback = relationship("Feedback", back_populates="answer")

class Feedback(BaseModel):
    __tablename__ = "feedback"
    
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    answer_id = Column(Integer, ForeignKey("answers.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    answer = relationship("Answer", back_populates="feedback")
    user = relationship("User", back_populates="feedback") 