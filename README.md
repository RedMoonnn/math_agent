# 🧮 数学助手系统(Math Agent)

## 📑 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [前端结构](#前端结构)
  - [核心组件](#核心组件)
  - [页面结构](#页面结构)
  - [状态管理](#状态管理)
- [后端结构](#后端结构)
  - [API接口](#api接口)
  - [服务模块](#服务模块)
  - [数据模型](#数据模型)
- [核心功能](#核心功能)
  - [智能问答](#智能问答)
  - [图片识别](#图片识别)
  - [用户系统](#用户系统)
- [部署说明](#部署说明)
- [技术栈](#技术栈)

## 📋 项目概述

Math Agent是一个专注于数学学习的智能教育系统，基于大模型AI技术，为用户提供数学问题的智能解答、题目分析和学习指导。系统支持文本输入和图片上传功能，能够识别数学公式和题目内容，为用户提供详细的解题步骤和思路。

![系统概览](https://cdn.pixabay.com/photo/2015/11/15/07/47/geometry-1044090_960_720.jpg)

## 🏗️ 系统架构

整个系统采用前后端分离架构：

```
Math Agent
├── 前端 (Frontend)
│   ├── React + TypeScript
│   ├── Ant Design 组件库
│   └── Redux 状态管理
└── 后端 (Backend)
    ├── FastAPI 框架
    ├── SQLAlchemy ORM
    └── DeepSeek 大模型服务
```

### 数据流向图

```
用户请求 → 前端UI → API请求 → 后端服务 → 数据库/AI模型 → 返回结果 → 前端渲染 → 用户界面展示
```

## 🖥️ 前端结构

前端采用React + TypeScript开发，使用Ant Design组件库构建UI界面，通过Redux进行状态管理。

### 目录结构

```
frontend/
├── public/          # 静态资源
├── src/
│   ├── assets/      # 图片、图标等资源
│   ├── components/  # 可复用组件
│   ├── pages/       # 页面组件
│   ├── services/    # API服务
│   ├── store/       # Redux状态管理
│   ├── types/       # TypeScript类型定义
│   ├── utils/       # 工具函数
│   ├── App.tsx      # 主应用组件
│   └── index.tsx    # 应用入口
└── package.json     # 依赖配置
```

### 核心组件

#### 🤖 ChatWidget 组件

`ChatWidget`是系统的核心交互组件，提供实时的问答功能：

- 支持文本输入和图片上传
- 实时显示AI思考状态
- 集成数学公式渲染
- 处理长时间等待和错误情况

#### 📐 MathDisplay 组件

`MathDisplay`负责数学公式的渲染：

- 使用KaTeX/MathJax渲染LaTex公式
- 支持行内和块级公式
- 支持代码高亮和特殊格式

#### 🧭 Navbar 组件

负责系统的主导航，包括：

- 用户认证状态管理
- 功能模块导航
- 用户信息显示

### 页面结构

前端包含多个功能页面：

- 🏠 **Home**: 系统首页和功能入口
- 💬 **Chat**: 实时AI对话页面
- 📝 **QuestionList**: 问题列表页面
- 📄 **QuestionDetail**: 问题详情和答案页面
- 👤 **Profile**: 用户个人信息页面
- 🔐 **Login/Register**: 用户认证页面
- 🔑 **ForgotPassword/ChangePassword**: 密码管理页面
- 📧 **VerifyEmail**: 邮箱验证页面
- 👑 **Admin**: 管理员控制页面

## 🖧 后端结构

后端采用Python + FastAPI框架开发，使用SQLAlchemy进行ORM数据库操作。

### 目录结构

```
backend/
├── app/
│   ├── api/         # API路由和端点
│   ├── core/        # 核心配置和工具
│   ├── db/          # 数据库相关
│   ├── models/      # 数据模型
│   ├── schemas/     # Pydantic模式
│   ├── services/    # 服务层
│   └── utils/       # 工具函数
├── .venv/           # 虚拟环境
├── run.py           # 应用启动脚本
└── requirements.txt # 依赖配置
```

### API接口

系统提供了多个API接口：

#### 🔒 auth.py

提供用户认证相关功能：
- 登录/注册
- 密码重置
- 邮箱验证
- 获取用户信息

#### 💡 ai.py

AI功能接口：
- 生成AI回答
- 处理复杂请求

#### 📋 questions.py

问题管理接口：
- 创建/查询/更新/删除问题
- 问题分类和标签管理

#### 📝 answers.py

答案管理接口：
- 提交答案
- 查询答案列表
- 反馈和评分

#### 💬 chat.py

实时对话接口：
- 消息处理
- 对话历史管理

### 服务模块

#### 🧠 DeepSeek服务

`DeepSeekClient`是系统的AI核心：
- 调用DeepSeek大模型API
- 处理数学问题解答
- 错误处理和回退策略

#### 🖼️ 图像处理服务

`image_process.py`提供图像处理功能：
- 数学公式识别
- 题目内容提取
- 图像预处理

## 🔑 核心功能

### 智能问答

系统的核心功能是智能数学问答：

1. 用户提交数学问题
2. 大模型分析问题内容
3. 生成详细解答步骤
4. 支持公式渲染和解释

### 图片识别

系统支持上传数学题目图片：

1. 用户上传含有数学题目的图片
2. 后端处理图片并提取题目内容
3. 转换为文本后提交给AI模型
4. 返回解答结果

### 用户系统

完善的用户管理功能：

- 账号注册和登录
- 个人信息管理
- 问题历史记录
- 答案收藏和反馈

## 🚀 部署说明

### 前端部署

```bash
# 安装依赖
cd frontend
npm install

# 开发模式运行
npm start

# 构建生产版本
npm run build
```

### 后端部署

```bash
# 创建虚拟环境
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务
python run.py
```

## 💻 技术栈

### 前端技术

- ⚛️ **React**: 用户界面构建
- 📘 **TypeScript**: 类型安全保障
- 🐜 **Ant Design**: UI组件库
- 🔄 **Redux**: 状态管理
- 📊 **KaTeX/MathJax**: 数学公式渲染
- 🌐 **Axios**: HTTP请求处理

### 后端技术

- 🚀 **FastAPI**: 高性能API框架
- 🐍 **Python**: 主要编程语言
- 📊 **SQLAlchemy**: ORM数据库操作
- 🧠 **DeepSeek**: 大模型AI服务
- 🔒 **JWT**: 用户认证
- 📁 **SQLite**: 数据存储

---

📌 系统特点：
- 🎯 专注于数学教育领域
- 🧠 采用先进大模型解决复杂数学问题
- 📱 响应式设计，支持多设备访问
- 🔍 支持文本和图片输入多种方式
- 📊 详细的公式渲染和解题步骤

