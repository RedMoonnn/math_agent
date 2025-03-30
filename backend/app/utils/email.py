import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import time
from ..core.config import settings

logger = logging.getLogger(__name__)

async def send_email(email_to: str, subject: str, body: str, max_retries=3):
    """
    发送邮件的异步函数，带重试机制
    
    Args:
        email_to: 收件人邮箱
        subject: 邮件主题
        body: 邮件正文
        max_retries: 最大重试次数
    """
    retries = 0
    while retries < max_retries:
        try:
            # 创建邮件对象
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USER
            msg['To'] = email_to
            msg['Subject'] = subject
            
            # 添加邮件正文
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # 连接SMTP服务器
            server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
            server.ehlo()  # 问候SMTP服务器
            server.starttls()  # 启用TLS加密
            server.ehlo()  # 问候SMTP服务器
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            # 发送邮件
            server.send_message(msg)
            server.quit()
            
            logger.info(f"邮件已成功发送到 {email_to}")
            return True
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP认证失败，请检查用户名和密码")
            # 认证错误不重试
            return False
        except (smtplib.SMTPException, ConnectionError) as e:
            retries += 1
            wait_time = 2 ** retries  # 指数退避策略
            logger.warning(f"发送邮件失败 (尝试 {retries}/{max_retries}): {str(e)}. 等待 {wait_time} 秒后重试")
            time.sleep(wait_time)
        except Exception as e:
            logger.error(f"发送邮件时发生未知错误: {str(e)}")
            return False
    
    # 所有重试都失败
    logger.error(f"发送邮件到 {email_to} 失败，已达到最大重试次数 {max_retries}")
    return False 