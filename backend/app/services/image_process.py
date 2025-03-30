import logging
import io
import base64
from typing import Optional
import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

async def extract_text_from_image(image_data: bytes) -> Optional[str]:
    """
    从图片中提取文本
    使用OCR服务识别图片中的数学问题
    """
    if not image_data:
        logger.error("提供的图像数据为空")
        return "图像数据为空，无法处理"
        
    try:
        # 如果配置了OCR API，则使用外部OCR服务
        ocr_api_url = getattr(settings, 'OCR_API_URL', None)
        
        if ocr_api_url:
            logger.info(f"使用OCR API: {ocr_api_url}")
            return await extract_text_with_api(image_data)
        
        # 未配置API，使用简单的占位符实现
        # 未来可以集成tesseract-ocr或其他OCR库
        logger.warning("未配置OCR API，返回占位符文本")
        return """
        图片中检测到数学问题。由于OCR服务未配置，无法自动识别具体内容。
        您可以在下方输入框中手动补充具体的数学问题描述。
        """
    
    except Exception as e:
        logger.error(f"图像处理错误: {str(e)}")
        return "图像处理出错，请尝试提供更清晰的图片或直接输入问题"

async def extract_text_with_api(image_data: bytes) -> Optional[str]:
    """
    使用外部OCR API提取图片文本
    """
    try:
        # 检查图片大小
        if len(image_data) > 5 * 1024 * 1024:  # 5MB
            logger.warning("图片过大，可能导致OCR处理失败")
            return "图片大小超过限制，请提供小于5MB的图片"
            
        # 将图片转换为base64编码
        try:
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        except Exception as e:
            logger.error(f"图片base64编码失败: {str(e)}")
            return "图片格式不正确或已损坏"
        
        # 获取API设置
        ocr_api_url = getattr(settings, 'OCR_API_URL', '')
        ocr_api_key = getattr(settings, 'OCR_API_KEY', '')
        
        # 构建API请求
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    ocr_api_url,
                    json={
                        "image": image_base64
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {ocr_api_key}" if ocr_api_key else ""
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if 'text' in result and result['text']:
                        extracted_text = result['text']
                        if len(extracted_text.strip()) > 0:
                            return extracted_text
                        else:
                            return "OCR识别成功，但未检测到文本内容"
                    logger.error(f"OCR API返回格式错误: {result}")
                    return "OCR服务返回格式错误"
                else:
                    error_msg = f"OCR API返回错误: {response.status_code}"
                    logger.error(error_msg)
                    if response.status_code == 401:
                        return "OCR服务认证失败，请检查API密钥"
                    elif response.status_code >= 500:
                        return "OCR服务暂时不可用，请稍后再试"
                    return f"OCR服务错误，请稍后再试"
        except httpx.TimeoutException:
            logger.error("OCR API请求超时")
            return "OCR服务响应超时，请稍后再试"
        except Exception as e:
            logger.error(f"OCR API请求错误: {str(e)}")
            return "OCR服务请求失败，请稍后再试"
                
        return "无法从图片中提取文本，请提供更清晰的图片或直接输入问题"
    except Exception as e:
        logger.error(f"调用OCR API时出错: {str(e)}")
        return "OCR处理出错，请稍后再试" 