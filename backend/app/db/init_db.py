from sqlalchemy.orm import Session

from ..models.base import Base
from ..models.user import User
from ..models.question import Question, Answer, Feedback, QuestionDifficulty
from ..core.config import settings
from ..core.security import get_password_hash
from .session import engine

# 创建数据库表并初始化基础数据
def init_db(db: Session):
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    # 创建初始数据
    create_initial_data(db)

# 创建初始管理员用户
def create_initial_data(db: Session):
    # 创建AI用户（用于生成AI回答）
    ai_user = db.query(User).filter(User.id == 1).first()
    if not ai_user:
        # 如果数据库中不存在ID为1的用户，则创建
        ai_user = User(
            id=1,  # 明确指定ID为1
            username="AI助手",
            email="ai@mathsolver.system",
            hashed_password=get_password_hash("ai_system_password"),  # 不会用于登录
            is_active=True,
            is_superuser=False,
            email_verified=True,
        )
        db.add(ai_user)
        db.commit()
        db.refresh(ai_user)
        print("创建AI用户成功")
    
    # 创建超级管理员用户
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_superuser=True,
            email_verified=True,  # 确保邮箱已验证
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    
    # 创建测试用户
    test_user = db.query(User).filter(User.username == "testuser").first()
    if not test_user:
        test_user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True,
            is_superuser=False,
            email_verified=True,  # 确保邮箱已验证
        )
        db.add(test_user)
        db.commit()
        print("创建测试用户成功：testuser/password123")
    
    # 创建一些示例问题
    if db.query(Question).count() == 0:
        questions = [
            {
                "title": "求解一元二次方程",
                "content": "如何求解一元二次方程 ax² + bx + c = 0？",
                "category": "代数",
                "difficulty": QuestionDifficulty.EASY,
                "created_by": admin.id,
            },
            {
                "title": "等差数列求和",
                "content": "等差数列 1, 3, 5, 7, 9, ... 的前n项和是多少？",
                "category": "数列",
                "difficulty": QuestionDifficulty.MEDIUM,
                "created_by": admin.id,
            },
            {
                "title": "二项式定理展开",
                "content": "用二项式定理展开 (a + b)^5",
                "category": "代数",
                "difficulty": QuestionDifficulty.MEDIUM,
                "created_by": admin.id,
            },
        ]
        
        for q in questions:
            question = Question(**q)
            db.add(question)
        
        db.commit() 