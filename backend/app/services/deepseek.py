import logging
import os
import httpx
import re
import asyncio
import json
import traceback
import random
import time
from typing import Optional, Dict, Any, List
from ..core.config import settings
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class DeepSeekClient:
    """
    DeepSeek API客户端，用于与DeepSeek API通信
    支持回退到模拟回答
    """
    
    def __init__(self):
        # 直接从settings中获取配置值
        self.api_key = settings.DEEPSEEK_API_KEY
        self.api_url = settings.DEEPSEEK_API_URL
        self.model = "deepseek-chat" # 默认模型
        self.use_mock = settings.USE_MOCK_ANSWERS
        self.timeout = 240.0  # 设置超时时间为240秒
        
        logger.info(f"初始化DeepSeek客户端，模拟模式: {self.use_mock}")
        logger.info(f"API URL: {self.api_url if self.api_url else '未配置'}")
        if not self.api_key and not self.use_mock:
            logger.warning("未配置DEEPSEEK_API_KEY，将无法调用真实API")
        
    async def generate_answer(self, question: str) -> Optional[str]:
        """
        根据问题生成AI回答
        """
        if not question or not question.strip():
            logger.error("问题内容为空")
            return "请提供一个有效的数学问题。"
            
        logger.info(f"生成问题的回答: {question[:50]}...")
        
        try:
            # 模拟API调用延迟
            await asyncio.sleep(0.5)
            
            # 如果配置为使用模拟回答，就不尝试调用API
            if self.use_mock:
                logger.info("使用模拟回答模式")
                mock_answer = self._generate_mock_answer(question)
                logger.info("已生成模拟回答")
                return mock_answer
            
            # 检查是否配置了API
            if self.api_key and self.api_url:
                logger.info("尝试使用真实API生成回答")
                
                # 定义可能的API端点
                api_endpoints = [
                    self.api_url,
                    "https://api.deepseek.com/v1/chat/completions",
                    "https://api.deepseek.ai/v1/chat/completions",
                    "https://api.deepseek.com/v1/chat/completions"
                ]
                
                # 尝试所有端点
                for endpoint in api_endpoints:
                    try:
                        logger.info(f"尝试调用API端点: {endpoint}")
                        result = await self._call_api_with_url(question, endpoint)
                        if result:
                            logger.info(f"使用端点 {endpoint} 成功获取API回答")
                            return result
                    except Exception as e:
                        logger.error(f"API调用 {endpoint} 失败: {str(e)}")
                        logger.error(traceback.format_exc())
                
                # 如果所有API调用都失败，回退到模拟回答
                logger.warning("所有API调用失败，使用模拟回答")
            else:
                logger.info("使用模拟回答（未配置API）")
            
            # 使用模拟回答
            mock_answer = self._generate_mock_answer(question)
            logger.info("已生成模拟回答")
            return mock_answer
            
        except Exception as e:
            logger.error(f"生成回答错误: {str(e)}")
            logger.error(traceback.format_exc())
            # 返回一个友好的错误消息
            return "很抱歉，处理您的问题时遇到了技术问题。请稍后再试。"
    
    async def _call_api_with_url(self, question: str, api_url: str) -> Optional[str]:
        """使用指定URL调用API"""
        try:
            logger.info(f"准备调用API: URL={api_url}")
            # 构建API请求
            async with httpx.AsyncClient(timeout=self.timeout) as client:  # 增加超时时间到60秒
                # 构建请求数据
                request_data = self._build_request_data(question)
                
                logger.info(f"发送API请求: {json.dumps(request_data, ensure_ascii=False)[:200]}...")
                
                # 确保API KEY已设置
                api_key = self.api_key
                if not api_key:
                    logger.error("API KEY未设置，无法调用API")
                    return None
                
                # 打印头信息，但不显示完整的API密钥
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key[:5]}...{api_key[-5:]}"
                }
                logger.info(f"请求头信息: {headers}")
                
                # 发送请求时使用正确的API密钥格式
                real_headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                
                try:
                    # 发送请求
                    response = await client.post(
                        api_url,
                        json=request_data,
                        headers=real_headers,
                        timeout=self.timeout  # 设置更长的超时时间
                    )
                    
                    logger.info(f"API请求完成，状态码: {response.status_code}")
                except httpx.TimeoutException:
                    logger.error(f"API请求超时: {api_url}")
                    return "请求DeepSeek API超时，请尝试简化您的问题或稍后再试。"
                
                # 检查响应
                if response.status_code == 200:
                    try:
                        result = response.json()
                        logger.info(f"API响应: {str(result)[:200]}...")
                        
                        # 记录完整响应，用于调试
                        logger.debug(f"完整响应: {json.dumps(result, ensure_ascii=False)}")
                        
                        # 尝试所有可能的响应格式
                        return self._extract_content_from_response(result)
                    except json.JSONDecodeError:
                        logger.error("API响应不是有效的JSON")
                        return f"API响应格式错误: {response.text[:100]}"
                else:
                    error_detail = self._handle_error_response(response)
                    logger.error(f"API错误响应: {error_detail}")
                    return f"API请求错误 ({response.status_code}): {error_detail}"
            
            return None
        except httpx.RequestError as e:
            logger.error(f"请求错误: {str(e)}")
            if "timeout" in str(e).lower():
                return "DeepSeek API请求超时，请尝试简化您的问题或减少问题长度。"
            raise
        except Exception as e:
            logger.error(f"API调用错误: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def _extract_content_from_response(self, response_data: Dict) -> Optional[str]:
        """从各种可能的响应格式中提取内容"""
        # 标准OpenAI格式
        if "choices" in response_data and len(response_data["choices"]) > 0:
            if "message" in response_data["choices"][0]:
                message = response_data["choices"][0]["message"]
                if "content" in message:
                    return message["content"]
            
            # 其他变体
            if "text" in response_data["choices"][0]:
                return response_data["choices"][0]["text"]
            
            # 提取内容字段
            for field in ["content", "text", "answer", "message"]:
                if field in response_data["choices"][0]:
                    return response_data["choices"][0][field]
        
        # DeepSeek专有格式
        if "response" in response_data:
            return response_data["response"]
        
        # 其他常见格式
        if "output" in response_data:
            return response_data["output"]
        
        # 嵌套数据
        if "data" in response_data and isinstance(response_data["data"], dict):
            data = response_data["data"]
            for field in ["content", "text", "answer", "message"]:
                if field in data:
                    return data[field]
        
        # 如果所有尝试都失败，返回格式化的原始JSON
        logger.warning(f"无法从响应中提取内容: {response_data}")
        return json.dumps(response_data, ensure_ascii=False, indent=2)
    
    def _handle_error_response(self, response) -> str:
        """处理错误响应"""
        try:
            error_data = response.json()
            if "error" in error_data:
                if isinstance(error_data["error"], dict):
                    return error_data["error"].get("message", str(error_data["error"]))
                return str(error_data["error"])
            return response.text
        except:
            return response.text
    
    async def _call_deepseek_api(self, question: str) -> Optional[str]:
        """
        调用DeepSeek API生成回答
        """
        return await self._call_api_with_url(question, self.api_url)
    
    def _build_request_data(self, question: str) -> Dict[str, Any]:
        """构建API请求数据"""
        return {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system", 
                    "content": "你是一位资深的大学数学教授，在顶尖大学一线教学数学30余年，精通微积分、线性代数、概率统计、数学分析和离散数学等众多数学分支。请以大学教授的专业水准回答数学问题，提供详尽的概念解释、理论背景、推导过程和应用示例。\n\n回答要求：\n1. 使用严谨的数学语言和符号，必须用LaTeX表示所有数学公式，行内公式用$...$包裹，块级公式用$$...$$包裹\n2. 展示完整的证明步骤和推导过程，不要跳过中间环节\n3. 对重要定理提供其历史背景和发展过程\n4. 介绍相关概念在学术研究和实际应用中的意义\n5. 提供多角度的解题思路和方法，包括经典方法和现代方法\n6. 适当引入高级概念，但要确保解释清晰\n7. 必要时补充相关知识点，使回答系统完整\n8. 重要：不要使用\\begin{align}、\\begin{align*}，而是使用\\begin{aligned}包裹在$$...$$之间\n9. 使用\\cdot而不是使用点号表示乘法\n10. 确保所有公式正确编写，不要有未闭合的括号或错误的语法\n\n你的回答应当既能满足大学本科生的学习需求，也能为研究生提供有深度的学术洞见。"
                },
                {
                    "role": "user",
                    "content": question
                }
            ],
            "temperature": 0.3,  # 增加温度以提供更丰富的回答
            "max_tokens": 3000,  # 增加token数以容纳更详细的回答
            "stream": False,
            "timeout": 60  # 增加超时时间
        }
            
    def _build_prompt(self, question: str) -> str:
        """
        构建DeepSeek API的提示语
        """
        return f"""
        你是一位专业的大学数学教授，精通微积分、线性代数、概率统计、数学分析和离散数学。
        请回答以下大学水平的数学问题。
        如果需要使用数学公式，请使用LaTeX格式，行内公式用$...$包裹，块级公式用$$...$$包裹。
        请确保你的解答清晰、步骤完整且易于理解，并尽可能提供大学教学中常见的解题思路和方法。
        
        问题：{question}
        
        回答：
        """
        
    def _generate_mock_answer(self, question: str) -> str:
        """
        生成模拟回答，用于开发和测试
        实际项目中应该被替换为真实API调用
        """
        try:
            # 识别常见数学问题类型
            question_lower = question.lower()
            
            # 微积分问题
            if any(keyword in question_lower for keyword in ["微积分", "导数", "积分", "微分", "极限", "calculus", "derivative", "integral"]):
                return """
                ## 微积分核心概念
                
                微积分主要研究变化率（导数）和累积变化（积分）的数学分支。
                
                ### 导数与微分
                
                函数 $f(x)$ 在点 $x=a$ 处的导数定义为：
                
                $$f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}$$
                
                基本导数公式：
                
                - $\\frac{d}{dx}(x^n) = nx^{n-1}$
                - $\\frac{d}{dx}(e^x) = e^x$
                - $\\frac{d}{dx}(\\ln x) = \\frac{1}{x}$
                - $\\frac{d}{dx}(\\sin x) = \\cos x$
                - $\\frac{d}{dx}(\\cos x) = -\\sin x$
                
                链式法则：若 $y = f(g(x))$，则 $\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$，其中 $u = g(x)$
                
                ### 积分
                
                不定积分基本公式：
                
                - $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C, n \\neq -1$
                - $\\int \\frac{1}{x} dx = \\ln|x| + C$
                - $\\int e^x dx = e^x + C$
                - $\\int \\sin x dx = -\\cos x + C$
                - $\\int \\cos x dx = \\sin x + C$
                
                定积分与微积分基本定理：
                
                $$\\int_a^b f(x) dx = F(b) - F(a)$$
                
                其中 $F(x)$ 是 $f(x)$ 的一个原函数。
                
                ### 积分技巧
                
                - 换元积分法
                - 分部积分法：$\\int u(x)v'(x)dx = u(x)v(x) - \\int u'(x)v(x)dx$
                - 部分分式分解
                """
                
            # 处理例题：求导数
            elif "求 y = sin(x²) 的导数" in question:
                return """
                ## 求 $y = \\sin(x^2)$ 的导数
                
                要求函数 $y = \\sin(x^2)$ 的导数，我们可以使用链式法则。
                
                设 $u = x^2$，则 $y = \\sin(u)$。
                
                根据链式法则：
                
                $$\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$$
                
                计算每一部分：
                
                - $\\frac{dy}{du} = \\cos(u) = \\cos(x^2)$
                - $\\frac{du}{dx} = 2x$
                
                将这两部分结合：
                
                $$\\frac{dy}{dx} = \\cos(x^2) \\cdot 2x = 2x\\cos(x^2)$$
                
                因此，$y = \\sin(x^2)$ 的导数为 $y' = 2x\\cos(x^2)$
                """
                
            # 处理例题：多层复合函数的导数
            elif "求 y = e^√(tan x) 的导数" in question:
                return """
                ## 求 $y = e^{\\sqrt{\\tan x}}$ 的导数
                
                这是一个多层复合函数，我们需要使用链式法则逐层求导。
                
                设：
                - $u = \\tan x$
                - $v = \\sqrt{u} = \\sqrt{\\tan x}$
                - $y = e^v = e^{\\sqrt{\\tan x}}$
                
                根据链式法则，我们有：
                
                $$\\frac{dy}{dx} = \\frac{dy}{dv} \\cdot \\frac{dv}{du} \\cdot \\frac{du}{dx}$$
                
                计算各部分导数：
                
                1. $\\frac{dy}{dv} = e^v = e^{\\sqrt{\\tan x}}$
                
                2. $\\frac{dv}{du} = \\frac{1}{2}u^{-1/2} = \\frac{1}{2\\sqrt{\\tan x}}$
                
                3. $\\frac{du}{dx} = \\sec^2 x$
                
                组合这三部分：
                
                $$\\frac{dy}{dx} = e^{\\sqrt{\\tan x}} \\cdot \\frac{1}{2\\sqrt{\\tan x}} \\cdot \\sec^2 x = \\frac{e^{\\sqrt{\\tan x}} \\cdot \\sec^2 x}{2\\sqrt{\\tan x}}$$
                
                因此，$y = e^{\\sqrt{\\tan x}}$ 的导数为：
                
                $$y' = \\frac{e^{\\sqrt{\\tan x}} \\cdot \\sec^2 x}{2\\sqrt{\\tan x}}$$
                """
                
            # 线性代数问题
            elif any(keyword in question_lower for keyword in ["线性代数", "矩阵", "向量", "特征值", "行列式", "linear algebra", "matrix", "vector", "eigenvalue"]):
                return """
                ## 线性代数核心概念
                
                ### 向量空间
                
                向量空间是满足加法和标量乘法运算封闭性的集合。$\\mathbb{R}^n$ 是最常见的向量空间。
                
                ### 矩阵运算
                
                矩阵 $A$ 和 $B$ 的基本运算：
                
                - 加法：$(A + B)_{ij} = A_{ij} + B_{ij}$
                - 数乘：$(kA)_{ij} = k \\cdot A_{ij}$
                - 矩阵乘法：$(AB)_{ij} = \\sum_{k=1}^{n} A_{ik} \\cdot B_{kj}$
                
                ### 行列式
                
                $n \\times n$ 矩阵 $A$ 的行列式计算：
                
                $$|A| = \\sum_{j=1}^{n} (-1)^{1+j} a_{1j} \\cdot M_{1j}$$
                
                其中 $M_{1j}$ 是去掉第1行和第j列后剩余元素组成的子矩阵的行列式。
                
                ### 矩阵求逆
                
                可逆矩阵 $A$ 的逆矩阵：
                
                $$A^{-1} = \\frac{1}{|A|} \\cdot \\text{adj}(A)$$
                
                其中 $\\text{adj}(A)$ 是 $A$ 的伴随矩阵。
                
                ### 特征值和特征向量
                
                矩阵 $A$ 的特征值 $\\lambda$ 和特征向量 $\\vec{v}$ 满足：
                
                $$A\\vec{v} = \\lambda \\vec{v}$$
                
                特征值可通过求解特征多项式得到：
                
                $$|A - \\lambda I| = 0$$
                
                ### 向量空间的基与维数
                
                线性无关向量组成的基可以唯一表示向量空间中的任何向量。向量空间的维数等于基中向量的数量。
                
                ### 正交基与正交矩阵
                
                正交基中的向量彼此垂直。正交矩阵 $Q$ 满足 $Q^T Q = Q Q^T = I$。
                """
                
            # 概率统计问题
            elif any(keyword in question_lower for keyword in ["概率", "统计", "分布", "期望", "方差", "probability", "statistics", "distribution"]):
                return """
                ## 概率统计核心概念
                
                ### 概率论基础
                
                - 条件概率：$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$
                - 全概率公式：$P(A) = \\sum_{i} P(A|B_i)P(B_i)$
                - 贝叶斯定理：$P(B_i|A) = \\frac{P(A|B_i)P(B_i)}{P(A)}$
                
                ### 随机变量
                
                离散随机变量 $X$ 的概率质量函数(PMF)：$P(X = x)$
                连续随机变量 $X$ 的概率密度函数(PDF)：$f_X(x)$
                
                ### 期望和方差
                
                随机变量 $X$ 的期望：
                
                - 离散情况：$E(X) = \\sum_{i} x_i P(X = x_i)$
                - 连续情况：$E(X) = \\int_{-\\infty}^{\\infty} x f_X(x) dx$
                
                随机变量 $X$ 的方差：
                
                $$Var(X) = E[(X - E(X))^2] = E(X^2) - [E(X)]^2$$
                
                ### 常见概率分布
                
                #### 离散分布
                
                - 二项分布 $B(n, p)$：$P(X = k) = C_n^k p^k (1-p)^{n-k}$
                  - 期望：$E(X) = np$
                  - 方差：$Var(X) = np(1-p)$
                
                - 泊松分布 $P(\\lambda)$：$P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$
                  - 期望：$E(X) = \\lambda$
                  - 方差：$Var(X) = \\lambda$
                
                #### 连续分布
                
                - 正态分布 $N(\\mu, \\sigma^2)$：$f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$
                  - 期望：$E(X) = \\mu$
                  - 方差：$Var(X) = \\sigma^2$
                
                - 指数分布：$f(x) = \\lambda e^{-\\lambda x}, x > 0$
                  - 期望：$E(X) = \\frac{1}{\\lambda}$
                  - 方差：$Var(X) = \\frac{1}{\\lambda^2}$
                
                ### 中心极限定理
                
                当样本量足够大时，样本均值的分布近似服从正态分布，无论原始总体分布的形态如何。
                """
                
            # 数学分析问题
            elif any(keyword in question_lower for keyword in ["数学分析", "级数", "收敛", "数列", "拓扑", "mathematical analysis", "series", "convergence"]):
                return """
                ## 数学分析核心概念
                
                数学分析是研究函数、极限、级数、微积分等概念的数学分支，比普通微积分更加严格和抽象。
                
                ### 数列与级数
                
                数列 ${a_n}$ 收敛于 $L$ 的定义：
                
                $$\\forall \\varepsilon > 0, \\exists N \\in \\mathbb{N}, \\forall n > N, |a_n - L| < \\varepsilon$$
                
                级数 $\\sum_{n=1}^{\\infty} a_n$ 收敛的条件：部分和数列 $S_n = \\sum_{i=1}^{n} a_i$ 收敛。
                
                #### 常见级数收敛性判断
                
                - 几何级数 $\\sum_{n=0}^{\\infty} ar^n$：当且仅当 $|r| < 1$ 时收敛
                - 调和级数 $\\sum_{n=1}^{\\infty} \\frac{1}{n}$：发散
                - p-级数 $\\sum_{n=1}^{\\infty} \\frac{1}{n^p}$：当且仅当 $p > 1$ 时收敛
                
                #### 收敛性判断方法
                
                - 比较判别法
                - 比值判别法：$\\lim_{n \\to \\infty} |\\frac{a_{n+1}}{a_n}| = L$
                  - 若 $L < 1$，级数绝对收敛
                  - 若 $L > 1$，级数发散
                  - 若 $L = 1$，无法判断
                - 根值判别法：$\\lim_{n \\to \\infty} \\sqrt[n]{|a_n|} = L$
                  - 判断标准同比值判别法
                
                ### 函数极限与连续性
                
                函数在点 $x_0$ 处的极限：
                
                $$\\lim_{x \\to x_0} f(x) = L \\\\ \\Leftrightarrow \\\\ \\forall \\varepsilon > 0, \\exists \\delta > 0, \\forall x, 0 < |x - x_0| < \\delta \\Rightarrow |f(x) - L| < \\varepsilon$$
                
                函数 $f$ 在点 $x_0$ 处连续的条件：$\\lim_{x \\to x_0} f(x) = f(x_0)$
                
                ### 一致连续与一致收敛
                
                函数 $f$ 在区间 $I$ 上一致连续：
                
                $$\\forall \\varepsilon > 0, \\exists \\delta > 0, \\forall x,y \\in I, |x - y| < \\delta \\Rightarrow |f(x) - f(y)| < \\varepsilon$$
                
                函数列 $\\{f_n\\}$ 在区间 $I$ 上一致收敛于函数 $f$：
                
                $$\\forall \\varepsilon > 0, \\exists N \\in \\mathbb{N}, \\forall n > N, \\forall x \\in I, |f_n(x) - f(x)| < \\varepsilon$$
                """
                
            # 离散数学问题
            elif any(keyword in question_lower for keyword in ["离散数学", "组合", "图论", "集合", "离散", "逻辑", "discrete mathematics", "combinatorics", "graph theory"]):
                return """
                ## 离散数学核心概念
                
                离散数学研究离散结构，包括组合数学、图论、集合论、逻辑等。
                
                ### 集合论
                
                集合运算：
                - 并集：$A \\cup B = \\{x | x \\in A \\text{ 或 } x \\in B\\}$
                - 交集：$A \\cap B = \\{x | x \\in A \\text{ 且 } x \\in B\\}$
                - 差集：$A \\setminus B = \\{x | x \\in A \\text{ 且 } x \\notin B\\}$
                - 补集：$A^c = \\{x \\in U | x \\notin A\\}$
                
                ### 组合数学
                
                排列数：$P(n,k) = \\frac{n!}{(n-k)!} = n(n-1)(n-2)\\cdots(n-k+1)$
                
                组合数：$C(n,k) = \\binom{n}{k} = \\frac{n!}{k!(n-k)!}$
                
                二项式定理：$(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k$
                
                鸽巢原理：若有 $n$ 个鸽巢和 $m$ 个鸽子，且 $m > n$，则至少有一个鸽巢包含多于一个鸽子。
                
                ### 图论
                
                图 $G = (V, E)$ 由顶点集 $V$ 和边集 $E$ 组成。
                
                #### 图的基本概念
                
                - 度：顶点 $v$ 的度是与之相连的边的数量
                - 路径：顶点序列，相邻顶点之间有边相连
                - 连通图：任意两点之间都存在路径
                - 树：无环连通图
                - 完全图：任意两个顶点之间都有边相连
                
                #### 图的性质
                
                - 握手定理：所有顶点度数之和等于边数的两倍
                - 欧拉路径：经过每条边恰好一次的路径
                - 哈密顿路径：经过每个顶点恰好一次的路径
                
                ### 递归与归纳
                
                递归定义：通过自身更简单的情况定义
                
                数学归纳法：证明 $P(n)$ 对所有自然数 $n$ 成立
                1. 证明基础情形 $P(1)$ 成立
                2. 假设 $P(k)$ 成立，证明 $P(k+1)$ 成立
                """
                
            # 默认回答
            else:
                return f"""
                ## 大学数学学习指南
                
                您的问题是关于："{question[:50]}..."
                
                在大学数学课程中，我们主要学习以下几个核心领域：
                
                ### 1. 微积分
                
                微积分是研究函数、极限、导数、积分和无穷级数的数学分支。它为理解变化率和累积变化提供了数学工具，是物理学、工程学和经济学等领域的基础。
                
                主要内容包括：
                - 极限与连续性
                - 导数与微分
                - 积分与微积分基本定理
                - 级数与收敛性
                - 多变量微积分
                
                ### 2. 线性代数
                
                线性代数研究向量空间、线性变换和线性方程组。它在数据科学、计算机图形学和量子力学等领域有广泛应用。
                
                主要内容包括：
                - 向量与向量空间
                - 矩阵运算与线性变换
                - 行列式
                - 特征值与特征向量
                - 向量空间的基与维数
                
                ### 3. 概率统计
                
                概率统计提供了分析随机现象和数据的方法，是数据科学、机器学习和风险管理的基础。
                
                主要内容包括：
                - 概率论基础
                - 随机变量与概率分布
                - 期望与方差
                - 样本统计量
                - 参数估计与假设检验
                
                ### 4. 数学分析
                
                数学分析是微积分的严格理论基础，更加注重严谨的数学推导和证明。
                
                主要内容包括：
                - 数列与级数的严格理论
                - 函数极限的严格定义
                - 连续函数性质
                - 微积分基本定理的严格证明
                - 度量空间与拓扑概念
                
                ### 5. 离散数学
                
                离散数学研究离散结构，是计算机科学的数学基础。
                
                主要内容包括：
                - 集合论与逻辑
                - 组合数学
                - 图论
                - 递归与归纳
                - 离散概率
                
                请提供更具体的问题，我可以给您详细讲解相关的数学概念和解题方法。
                """
        except Exception as e:
            logger.error(f"生成模拟回答时出错: {str(e)}")
            return "很抱歉，处理您的问题时遇到了技术问题。请稍后再试。"

# 创建客户端实例
deepseek_client = DeepSeekClient() 