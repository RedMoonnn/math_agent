from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....models import question as question_models
from ....models import user as user_models
from ....schemas import question as question_schemas
from ....core.auth import get_current_user

router = APIRouter()

@router.post("/{question_id}/answers", response_model=question_schemas.Answer)
def create_answer(
    *,
    db: Session = Depends(get_db),
    question_id: int,
    answer_in: question_schemas.AnswerCreate,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    Create new answer for a question.
    """
    question = db.query(question_models.Question).filter(question_models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    answer = question_models.Answer(
        content=answer_in.content,
        question_id=question_id,
        created_by=current_user.id,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer

@router.get("/{question_id}/answers", response_model=List[question_schemas.Answer])
def read_answers(
    *,
    db: Session = Depends(get_db),
    question_id: int,
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve answers for a question.
    """
    question = db.query(question_models.Question).filter(question_models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    answers = db.query(question_models.Answer).filter(
        question_models.Answer.question_id == question_id
    ).offset(skip).limit(limit).all()
    
    return answers

@router.post("/{answer_id}/feedback", response_model=question_schemas.Feedback)
def create_feedback(
    *,
    db: Session = Depends(get_db),
    answer_id: int,
    feedback_in: question_schemas.FeedbackCreate,
    current_user: user_models.User = Depends(get_current_user),
):
    """
    Create feedback for an answer.
    """
    answer = db.query(question_models.Answer).filter(question_models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    # Check if the user has already provided feedback for this answer
    existing_feedback = db.query(question_models.Feedback).filter(
        question_models.Feedback.answer_id == answer_id,
        question_models.Feedback.user_id == current_user.id
    ).first()
    
    if existing_feedback:
        raise HTTPException(status_code=400, detail="User has already provided feedback for this answer")
    
    feedback = question_models.Feedback(
        rating=feedback_in.rating,
        comment=feedback_in.comment,
        answer_id=answer_id,
        user_id=current_user.id,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback 