import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Input, Space, message, Rate, Divider } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { questionAPI } from '../services/api';
import { setCurrentQuestion, setLoading, setError } from '../store/slices/questionSlice';
import { RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import MathDisplay from '../components/MathDisplay';

const { TextArea } = Input;

/**
 * 定义答案数据接口
 */
interface Answer {
  id: number;
  content: string;
  created_by: number;
  created_at: string;
  feedback?: {
    rating: number;
    comment: string;
  };
}

/**
 * 问题详情页组件
 * 展示问题详情、提交答案、获取AI回答以及评价功能
 */
const QuestionDetail: React.FC = () => {
  // 从URL参数中获取问题ID
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate(); // 添加导航hook
  
  // 从Redux store获取当前问题和加载状态
  const { currentQuestion, loading } = useSelector((state: RootState) => state.questions);
  
  // 本地状态管理
  const [answer, setAnswer] = useState(''); // 用户输入的答案
  const [answers, setAnswers] = useState<Answer[]>([]); // 问题的所有答案
  const [feedback, setFeedback] = useState<{ [key: number]: { rating: number; comment: string } }>({}); // 用户反馈
  const [aiLoading, setAILoading] = useState(false); // AI回答加载状态
  const [aiAnswer, setAiAnswer] = useState(''); // AI回答
  const [aiAnswerLoading, setAiAnswerLoading] = useState(false); // AI回答加载状态
  const [aiAnswerError, setAiAnswerError] = useState<string | null>(null); // AI回答错误信息

  // 组件挂载或问题ID变化时获取问题详情和答案列表
  useEffect(() => {
    if (id) {
      fetchQuestion(parseInt(id));
      fetchAnswers(parseInt(id));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 获取问题详情
   * @param questionId 问题ID
   */
  const fetchQuestion = async (questionId: number) => {
    try {
      dispatch(setLoading(true));
      const response = await questionAPI.getQuestion(questionId);
      dispatch(setCurrentQuestion(response.data));
    } catch (error) {
      dispatch(setError('获取问题详情失败'));
      message.error('获取问题详情失败，请稍后重试！');
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * 获取问题的答案列表
   * @param questionId 问题ID
   */
  const fetchAnswers = async (questionId: number) => {
    try {
      const response = await questionAPI.getAnswers(questionId);
      setAnswers(response.data);
    } catch (error) {
      message.error('获取答案列表失败，请稍后重试！');
    }
  };

  /**
   * 提交用户的答案
   */
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      message.warning('请输入答案内容！');
      return;
    }

    try {
      await questionAPI.submitAnswer(parseInt(id!), answer);
      message.success('提交答案成功！');
      setAnswer(''); // 清空输入框
      fetchAnswers(parseInt(id!)); // 重新加载答案列表
    } catch (error) {
      message.error('提交答案失败，请稍后重试！');
    }
  };

  /**
   * 提交对答案的反馈
   * @param answerId 答案ID
   */
  const handleSubmitFeedback = async (answerId: number) => {
    const currentFeedback = feedback[answerId];
    if (!currentFeedback) {
      message.warning('请先评分！');
      return;
    }

    try {
      await questionAPI.submitFeedback(
        answerId,
        currentFeedback.rating,
        currentFeedback.comment
      );
      message.success('提交反馈成功！');
      // 删除已提交的反馈记录
      const newFeedback = { ...feedback };
      delete newFeedback[answerId];
      setFeedback(newFeedback);
      fetchAnswers(parseInt(id!)); // 重新加载答案列表
    } catch (error) {
      message.error('提交反馈失败，请稍后重试！');
    }
  };

  /**
   * 获取AI自动生成的答案
   */
  const handleGetAIAnswer = async () => {
    if (aiAnswerLoading) return;
    
    try {
      setAiAnswerLoading(true);
      setAiAnswerError(null);
      
      console.log("请求AI回答，问题ID:", currentQuestion?.id);
      
      const response = await questionAPI.getAIAnswer(currentQuestion!.id);
      console.log("收到AI回答:", response.data);
      
      // 更新AI回答状态
      setAiAnswer(response.data.answer);
      
      // 刷新问题详情（如果后端保存了AI回答）
      fetchQuestion(parseInt(id!));
      
    } catch (err: any) {
      console.error("获取AI回答失败:", err);
      
      // 处理不同的错误情况
      if (err.response) {
        console.log("错误响应:", err.response.status, err.response.data);
        
        if (err.response.status === 401) {
          setAiAnswerError("请先登录后再获取AI回答");
        } else if (err.response.status === 429) {
          setAiAnswerError("请求过于频繁，请稍后再试");
        } else {
          setAiAnswerError(err.response.data?.detail || "获取AI回答失败，请稍后再试");
        }
      } else if (err.request) {
        console.log("请求错误:", err.request);
        setAiAnswerError("服务器未响应，请检查网络连接");
      } else {
        console.log("其他错误:", err.message);
        setAiAnswerError(`未知错误: ${err.message}`);
      }
      
      // 即使API失败，也提供一个预设的回答作为后备
      if (!aiAnswer) {
        setAiAnswer(`
          很抱歉，目前无法提供实时的AI回答。以下是常见的数学问题解答方法：
          
          对于二次方程 $ax^2 + bx + c = 0$，解法是：
          
          $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
          
          对于您的问题，建议尝试：
          1. 确认问题中的已知条件和未知数
          2. 根据题目特点选择合适的解题方法
          3. 按步骤推导求解
          
          您也可以尝试稍后再次获取AI回答。
        `);
      }
    } finally {
      setAiAnswerLoading(false);
    }
  };

  /**
   * 判断是否为AI生成的答案
   * @param answer 答案对象
   * @returns 是否为AI答案
   */
  const isAIAnswer = (answer: Answer) => {
    return answer.created_by === 1; // 假设ID为1的用户是AI
  };

  // 处理返回按钮点击
  const handleGoBack = () => {
    navigate('/questions');
  };

  // 数据加载中显示加载提示
  if (!currentQuestion) {
    return <div>加载中...</div>;
  }

  // 渲染组件UI
  return (
    <div style={{ padding: '24px' }}>
      {/* 返回按钮 */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleGoBack}
        style={{ marginBottom: 16 }}
      >
        返回问题列表
      </Button>
      
      {/* 问题详情卡片 */}
      <Card title={currentQuestion.title} loading={loading}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 问题标签区域 */}
          <div>
            <Space>
              <Tag color={currentQuestion.difficulty === 'easy' ? 'green' : 
                         currentQuestion.difficulty === 'medium' ? 'orange' : 'red'}>
                {currentQuestion.difficulty}
              </Tag>
              <Tag color="blue">{currentQuestion.category}</Tag>
            </Space>
          </div>
          
          {/* 问题描述区域 */}
          <div style={{ marginTop: 16 }}>
            <h3>问题描述：</h3>
            <p>{currentQuestion.content}</p>
          </div>

          {/* AI解答按钮区域 */}
          <div style={{ marginTop: 16 }}>
            <Button 
              type="primary" 
              icon={<RobotOutlined key="robot-icon" />} 
              loading={aiLoading}
              onClick={handleGetAIAnswer}
            >
              获取AI解答
            </Button>
          </div>

          <Divider />

          {/* 提交答案区域 */}
          <div style={{ marginTop: 24 }}>
            <h3>提交答案：</h3>
            <TextArea
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="请输入你的答案..."
            />
            <Button
              type="primary"
              onClick={handleSubmitAnswer}
              style={{ marginTop: 16 }}
            >
              提交答案
            </Button>
          </div>

          {/* 答案列表区域 */}
          <div style={{ marginTop: 24 }}>
            <h3>答案列表：</h3>
            {answers.length > 0 ? (
              answers.map((answer) => (
                <Card 
                  key={answer.id} 
                  style={{ marginBottom: 16 }} 
                  title={isAIAnswer(answer) ? 'AI回答' : '用户回答'}
                  extra={isAIAnswer(answer) && <RobotOutlined key="robot-answer-icon" />}
                >
                  {/* 答案内容 - 使用MathDisplay组件渲染 */}
                  <div className="math-content">
                    <MathDisplay content={answer.content} />
                  </div>
                  
                  {/* 反馈输入区域 - 仅对非AI答案且未提交过反馈的显示 */}
                  {!answer.feedback && !isAIAnswer(answer) && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Rate
                        onChange={(value) =>
                          setFeedback({
                            ...feedback,
                            [answer.id]: { ...feedback[answer.id], rating: value },
                          })
                        }
                      />
                      <TextArea
                        rows={2}
                        placeholder="请输入反馈意见（选填）"
                        value={feedback[answer.id]?.comment || ''}
                        onChange={(e) =>
                          setFeedback({
                            ...feedback,
                            [answer.id]: {
                              ...feedback[answer.id],
                              comment: e.target.value,
                            },
                          })
                        }
                      />
                      <Button
                        type="primary"
                        onClick={() => handleSubmitFeedback(answer.id)}
                      >
                        提交反馈
                      </Button>
                    </Space>
                  )}
                  
                  {/* 显示已提交的反馈 */}
                  {answer.feedback && (
                    <div>
                      <Rate disabled defaultValue={answer.feedback.rating} />
                      {answer.feedback.comment && (
                        <p style={{ marginTop: 8 }}>{answer.feedback.comment}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div style={{ textAlign: 'center', margin: '24px 0', color: '#999' }}>
                暂无回答，尝试点击"获取AI解答"或提交您的答案
              </div>
            )}
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default QuestionDetail; 