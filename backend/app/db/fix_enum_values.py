"""
修复数据库中的枚举值问题
将数据库中现有的小写difficulty值转换为正确的枚举值
"""
import logging
import sqlite3
import os
import sys

# 设置Python路径，以便能够导入应用模块
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("fix_enum_values")

def fix_difficulty_values():
    """修复问题表中的难度枚举值"""
    # 数据库文件路径
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..', 'math_agent.db'))
    logger.info(f"数据库路径: {db_path}")
    
    if not os.path.exists(db_path):
        logger.error(f"数据库文件不存在: {db_path}")
        return
    
    try:
        # 连接SQLite数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查数据库中的值
        cursor.execute("SELECT id, difficulty FROM questions")
        results = cursor.fetchall()
        logger.info(f"找到 {len(results)} 个问题记录")
        
        updated_count = 0
        for id, difficulty in results:
            logger.info(f"问题ID={id}, 当前difficulty={difficulty}")
            
            if difficulty in ['easy', 'medium', 'hard']:
                # 使用枚举值名称的大写版本
                if difficulty == "easy":
                    new_value = "EASY"
                elif difficulty == "medium":
                    new_value = "MEDIUM"
                elif difficulty == "hard":
                    new_value = "HARD"
                else:
                    continue
                
                # 更新记录
                cursor.execute(
                    "UPDATE questions SET difficulty = ? WHERE id = ?",
                    (new_value, id)
                )
                updated_count += 1
                logger.info(f"已更新问题ID={id}的difficulty为{new_value}")
        
        if updated_count > 0:
            conn.commit()
            logger.info(f"成功更新了 {updated_count} 个问题的难度值")
        else:
            logger.info("没有需要更新的记录")
            
        # 显示更新后的数据
        cursor.execute("SELECT id, difficulty FROM questions")
        updated_results = cursor.fetchall()
        logger.info("更新后的数据:")
        for id, difficulty in updated_results:
            logger.info(f"问题ID={id}, difficulty={difficulty}")
            
    except Exception as e:
        logger.error(f"修复枚举值时出错: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def main():
    """主函数"""
    logger.info("开始修复数据库中的枚举值")
    try:
        fix_difficulty_values()
        logger.info("枚举值修复完成")
    except Exception as e:
        logger.error(f"修复过程中发生错误: {str(e)}")

if __name__ == "__main__":
    main() 