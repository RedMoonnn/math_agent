import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Upload, message, Card, List, Avatar, Typography, Spin, Divider, Tooltip, Tag } from 'antd';
import { SendOutlined, CameraOutlined, LoadingOutlined, RobotOutlined, UserOutlined, PictureOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { questionAPI } from '../services/api';
import MathDisplay from './MathDisplay';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import 'highlight.js/styles/github.css';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

/**
 * 聊天组件，支持文本输入和图片上传
 */
const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: '你好！我是大学数学助手，精通微积分、线性代数、概率统计、数学分析和离散数学。请输入您的大学数学问题，我将为您提供详细解答。',
      sender: 'ai',
      timestamp: new Date(),
      status: 'sent',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [longWaitWarning, setLongWaitWarning] = useState(false);

  // 监听用户信息变化
  useEffect(() => {
    // 用户信息变化时不需要处理，因为我们直接从Redux中获取最新的用户信息
  }, [user]);

  // 监听消息列表变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 设置长时间等待提示内容数组
  const longWaitMessages = [
    '正在思考中，复杂数学问题可能需要较长时间处理，请耐心等待...',
    '正在计算中...微积分问题需要仔细推导每一步...',
    '数学问题正在求解中，请稍候...',
    '复杂数学问题需要更长的思考时间，正在处理...',
    '正在分析您的问题并寻找最优解法...'
  ];

  // 处理发送消息
  const handleSendMessage = async () => {
    if (loading) return; // 如果正在加载中，不允许发送新消息
    if ((!inputValue.trim() && fileList.length === 0)) return;

    const userContent = inputValue.trim();
    console.log("发送消息:", userContent);
    
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: userContent,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    // 先添加用户消息到列表，确保用户可以看到自己的输入
    setMessages((prev) => [...prev, userMessage]);
    setInputValue(''); // 清空输入框
    
    // 添加等待响应的AI消息
    const tempAiMessageId = (Date.now() + 1).toString();
    const tempAiMessage: Message = {
      id: tempAiMessageId,
      content: '正在思考...',
      sender: 'ai',
      timestamp: new Date(),
      status: 'sending',
    };
    
    setMessages((prev) => [...prev, tempAiMessage]);
    setLoading(true);

    // 设置长时间等待提示计时器
    const waitTimer = setTimeout(() => {
      setLongWaitWarning(true);
      // 更新等待消息
      setMessages((prev) => prev.map(msg => 
        msg.id === tempAiMessageId ? 
        { ...msg, content: longWaitMessages[0] } : msg
      ));
    }, 8000); // 8秒后显示等待提示

    // 设置等待提示更新计时器
    let messageIndex = 0;
    const updateWaitMessageTimer = setInterval(() => {
      if (messageIndex < longWaitMessages.length - 1) {
        messageIndex++;
        setMessages((prev) => prev.map(msg => 
          msg.id === tempAiMessageId ? 
          { ...msg, content: longWaitMessages[messageIndex] } : msg
        ));
      }
    }, 20000); // 每20秒更新一次等待消息

    // 设置超时处理
    const timeoutTimer = setTimeout(() => {
      if (loading) {
        setMessages((prev) => prev.map(msg => 
          msg.id === tempAiMessageId ? 
          { ...msg, content: '回答生成时间过长，请稍后重试或简化您的问题。微积分和高等数学的复杂问题可能需要更长的计算时间。', status: 'error' } : msg
        ));
        setLoading(false);
        setLongWaitWarning(false);
      }
    }, 180000); // 180秒超时 - 增加到3分钟

    try {
      if (fileList.length > 0) {
        // 处理图片上传
        const formData = new FormData();
        // @ts-ignore
        if (fileList[0].originFileObj) {
          // @ts-ignore
          formData.append('image', fileList[0].originFileObj);
        }
        if (userContent) {
          formData.append('question', userContent);
        }
        
        console.log("上传图片并分析问题");
        try {
          const response = await questionAPI.uploadAndAnalyze(formData);
          console.log("收到图片分析响应:", response.data);
          
          if (response.data && response.data.answer) {
            // 更新AI消息
            setMessages((prev) => prev.map(msg => 
              msg.id === tempAiMessageId ? 
              { ...msg, content: response.data.answer, status: 'sent' } : msg
            ));
          } else {
            throw new Error("响应数据格式不正确");
          }
        } catch (error) {
          console.error('图片分析失败:', error);
          throw error;
        }
      } else {
        // 纯文本问题
        try {
          console.log("发送纯文本问题:", userContent);
          const response = await questionAPI.getAIAnswerDirect(userContent);
          console.log("收到AI回答类型:", typeof response.data, "内容:", response.data);
          
          if (response.data && response.data.answer) {
            // 更新AI消息
            setMessages((prev) => prev.map(msg => 
              msg.id === tempAiMessageId ? 
              { ...msg, content: response.data.answer, status: 'sent' } : msg
            ));
          } else {
            console.error('AI回答格式错误:', response.data);
            throw new Error("AI回答格式错误");
          }
        } catch (error) {
          console.error('获取AI回答失败:', error);
          throw error;
        }
      }
    } catch (error: any) {
      console.error('AI回答处理错误:', error);
      let errorMessage = '抱歉，处理您的问题时出错了。请稍后再试。';
      
      // 处理API错误
      if (error.response) {
        console.error('错误响应详情:', error.response.status, error.response.data);
        if (error.response.status === 429) {
          errorMessage = '请求过于频繁，请稍后再试。';
        } else if (error.response.status === 408 || error.response.status === 504) {
          errorMessage = '请求超时，这可能是由于DeepSeek API响应时间过长。请尝试简化您的问题或稍后再试。';
        } else if (error.response.data?.detail) {
          errorMessage = `处理错误: ${error.response.data.detail}`;
        } else if (error.response.data?.answer) {
          // 如果错误响应中包含answer，尝试使用它
          setMessages((prev) => prev.map(msg => 
            msg.id === tempAiMessageId ? 
            { ...msg, content: error.response.data.answer, status: 'sent' } : msg
          ));
          // 清除计时器
          clearTimeout(waitTimer);
          clearTimeout(timeoutTimer);
          clearInterval(updateWaitMessageTimer);
          setLongWaitWarning(false);
          setLoading(false);
          setFileList([]);
          return; // 提前返回，避免显示错误消息
        }
      } else if (error.request) {
        errorMessage = '请求未收到响应，请检查网络连接并稍后再试。';
      }
      
      setMessages((prev) => prev.map(msg => 
        msg.id === tempAiMessageId ? 
        { ...msg, content: errorMessage, status: 'error' } : msg
      ));
      message.error('获取回答失败，请稍后重试');
    } finally {
      // 清除计时器
      clearTimeout(waitTimer);
      clearTimeout(timeoutTimer);
      clearInterval(updateWaitMessageTimer);
      setLongWaitWarning(false);
      setLoading(false);
      setFileList([]);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // 上传前检查
  const beforeUpload = (file: UploadFile) => {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
    }
    
    const isLt5M = file.size && file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片必须小于5MB！');
    }
    
    return isImage && isLt5M ? true : Upload.LIST_IGNORE;
  };

  // 上传变化处理
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 回车键发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 自定义上传按钮
  const uploadButton = (
    <Button icon={<CameraOutlined />} type="text" size="large">
      拍照上传
    </Button>
  );

  // 处理自定义上传
  const customUploadRequest = async ({ 
    file, 
    onSuccess, 
    onError 
  }: any) => {
    try {
      // 这里不实际上传，只是预览
      onSuccess('ok');
    } catch (error) {
      onError(error);
    }
  };

  // 添加handleRetry函数
  const handleRetry = async (messageId: string) => {
    if (loading) return; // 如果有其他请求正在进行，不允许重试
    
    // 找到失败的消息
    const failedMessage = messages.find(msg => msg.id === messageId);
    if (!failedMessage) return;
    
    // 找到关联的用户消息（前一条消息）
    const index = messages.findIndex(msg => msg.id === messageId);
    if (index <= 0) return;
    
    const userMessage = messages[index - 1];
    if (userMessage.sender !== 'user') return;
    
    // 更新AI消息状态为sending
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: '正在重新生成回答...', status: 'sending' } 
        : msg
    ));
    setLoading(true);

    // 设置长时间等待提示计时器
    const waitTimer = setTimeout(() => {
      setLongWaitWarning(true);
      // 更新等待消息
      setMessages((prev) => prev.map(msg => 
        msg.id === messageId ? 
        { ...msg, content: longWaitMessages[0] } : msg
      ));
    }, 8000); // 8秒后显示等待提示

    // 设置等待提示更新计时器
    let messageIndex = 0;
    const updateWaitMessageTimer = setInterval(() => {
      if (messageIndex < longWaitMessages.length - 1) {
        messageIndex++;
        setMessages((prev) => prev.map(msg => 
          msg.id === messageId ? 
          { ...msg, content: longWaitMessages[messageIndex] } : msg
        ));
      }
    }, 20000); // 每20秒更新一次等待消息

    // 设置超时处理
    const timeoutTimer = setTimeout(() => {
      if (loading) {
        setMessages((prev) => prev.map(msg => 
          msg.id === messageId ? 
          { ...msg, content: '回答生成时间过长，请稍后重试或简化您的问题。微积分和高等数学的复杂问题可能需要更长的计算时间。', status: 'error' } : msg
        ));
        setLoading(false);
        setLongWaitWarning(false);
      }
    }, 180000); // 180秒超时
    
    try {
      console.log("重试问题:", userMessage.content);
      const response = await questionAPI.getAIAnswerDirect(userMessage.content);
      console.log("收到重试响应:", response.data);
      
      // 更新回答
      if (response.data && response.data.answer) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: response.data.answer, status: 'sent' } 
            : msg
        ));
      } else {
        throw new Error("重试响应格式不正确");
      }
    } catch (error: any) {
      console.error('重试获取AI回答失败:', error);
      let errorMessage = '重试失败，请稍后再试。';
      
      if (error.response) {
        if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data?.answer) {
          // 如果错误响应中包含answer，尝试使用它
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: error.response.data.answer, status: 'sent' } 
              : msg
          ));
          // 清除计时器和状态
          clearTimeout(waitTimer);
          clearTimeout(timeoutTimer);
          clearInterval(updateWaitMessageTimer);
          setLongWaitWarning(false);
          setLoading(false);
          return; // 提前返回，避免显示错误消息
        }
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: errorMessage, status: 'error' } 
          : msg
      ));
      message.error('重试失败，请稍后再试');
    } finally {
      // 清除计时器
      clearTimeout(waitTimer);
      clearTimeout(timeoutTimer);
      clearInterval(updateWaitMessageTimer);
      setLongWaitWarning(false);
      setLoading(false);
    }
  };

  // 消息渲染函数
  const renderMessage = (item: Message) => {
    const isUser = item.sender === 'user';
    
    return (
      <List.Item
        style={{
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          padding: '12px 24px',
          borderBottom: 'none',
          marginBottom: '8px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          maxWidth: '800px',
          width: '100%',
        }}>
          {/* 头像区域 - 为用户和AI都显示头像 */}
          <div style={{ marginRight: isUser ? 0 : '16px', marginLeft: isUser ? '16px' : 0, flexShrink: 0 }}>
            {isUser ? (
              <Avatar
                src={user?.avatar}
                icon={!user?.avatar && <UserOutlined />}
                style={{
                  backgroundColor: !user?.avatar ? '#1890ff' : undefined,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
                size="large"
              />
            ) : (
              <Avatar
                icon={<RobotOutlined />}
                style={{
                  backgroundColor: '#52c41a',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
                size="large"
              />
            )}
          </div>
          
          <div style={{ flex: 1, maxWidth: '85%' }}>
            {/* 消息头部 - 只在AI消息显示名称和重试按钮 */}
            {!isUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontWeight: 500, color: '#333' }}>AI助手</span>
                {item.status === 'error' && (
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => handleRetry(item.id)}
                    style={{ marginLeft: 8 }}
                  >
                    重试
                  </Button>
                )}
                {item.status === 'sent' && (
                  <Text style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                    记忆已更新
                  </Text>
                )}
              </div>
            )}
            
            {/* 消息内容 */}
            <div
              className={`message-content ${isUser ? 'user-message' : 'ai-message'}`}
              style={{
                padding: '16px 20px',
                backgroundColor: isUser ? 'rgba(24, 144, 255, 0.8)' : 'white',
                color: isUser ? 'white' : 'inherit',
                borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                border: item.status === 'error' ? '1px solid #ff4d4f' : isUser ? 'none' : '1px solid #f0f0f0',
                wordBreak: 'break-word',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                fontSize: isUser ? '16px' : '15px',
                position: 'relative',
                lineHeight: '1.6',
              }}
            >
              {item.status === 'sending' ? (
                <div>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                  {longWaitWarning && item.sender === 'ai' && (
                    <div style={{ marginTop: '10px', color: '#faad14', fontWeight: 'bold' }}>
                      计算中，请耐心等待...
                    </div>
                  )}
                </div>
              ) : isUser ? (
                <div>{item.content}</div>
              ) : (
                <div className="formatted-content">
                  <MathDisplay content={item.content} />
                </div>
              )}
            </div>
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <RobotOutlined style={{ fontSize: '20px', marginRight: '10px', color: '#52c41a' }} />
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>大学数学教育平台</span>
        </div>
      }
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        borderRadius: '12px',
      }}
      bodyStyle={{ 
        padding: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        overflow: 'hidden',
        borderRadius: '0 0 12px 12px', 
      }}
      headStyle={{
        borderBottom: '1px solid #f0f0f0',
        padding: '12px 24px',
      }}
    >
      <style>
        {`
          .message-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .formatted-content a {
            color: #1890ff;
          }
          .formatted-content a:hover {
            text-decoration: underline;
          }
          .formatted-content code {
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
          }
          .formatted-content pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
          }
          .ai-message code {
            background-color: #f6f8fa;
            border-radius: 3px;
            padding: 0.2em 0.4em;
            font-size: 85%;
          }
          .ai-message ul, .ai-message ol {
            padding-left: 1.5em;
            margin: 0.5em 0;
          }
          .ai-message p {
            margin: 0.5em 0;
          }
        `}
      </style>
    
      {/* 消息列表区域 - 使用单一容器实现滚动 */}
      <div 
        ref={messagesContainerRef}
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f7f9fa',
        }}
      >
        {messages.map(item => renderMessage(item))}
        <div ref={messageEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{ 
        padding: '20px 24px', 
        borderTop: '1px solid #f0f0f0',
        backgroundColor: 'white',
        borderRadius: '0 0 12px 12px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ 
          maxWidth: '900px', 
          width: '100%', 
          margin: '0 auto'
        }}>
          <Upload
            listType="picture"
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleChange}
            maxCount={1}
            customRequest={customUploadRequest}
          >
            {fileList.length >= 1 ? null : (
              <Button 
                icon={<CameraOutlined />} 
                type="text" 
                size="large"
                style={{ marginBottom: '8px' }}
              >
                拍照上传
              </Button>
            )}
          </Upload>
          
          <div style={{ 
            display: 'flex', 
            marginTop: fileList.length > 0 ? '12px' : '4px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
            borderRadius: '8px',
            overflow: 'hidden',
            width: '100%',
          }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入您的大学数学问题（如微积分、线性代数、概率统计等）..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              onKeyPress={handleKeyPress}
              style={{ 
                flex: 1, 
                border: 'none',
                borderRadius: '8px 0 0 8px',
                padding: '12px 16px',
                resize: 'none',
                fontSize: '15px',
              }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              style={{ 
                marginLeft: '0', 
                height: 'auto',
                borderRadius: '0 8px 8px 0',
                width: '56px',
              }}
              loading={loading}
              disabled={loading}
              size="large"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ChatWidget; 