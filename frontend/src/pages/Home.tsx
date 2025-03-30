import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { QuestionCircleOutlined, UserOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import { adminAPI, questionAPI } from '../services/api';
import QuestionDialog from '../components/QuestionDialog';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface Stats {
  totalQuestions: number;
  totalUsers: number;
  answeredQuestions: number;
  recentQuestions: Array<{id: number; title: string; created_at: string}>;
  popularQuestions: Array<{id: number; title: string; answers_count: number}>;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    totalUsers: 0,
    answeredQuestions: 0,
    recentQuestions: [],
    popularQuestions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 获取问题列表
      const questionsResponse = await questionAPI.getQuestions();
      const questions = questionsResponse.data || [];
      
      // 获取用户列表（仅管理员可访问，普通用户会返回错误）
      let totalUsers = 0;
      try {
        const usersResponse = await adminAPI.getAllUsers();
        // 过滤掉管理员账户，只统计普通用户
        totalUsers = usersResponse.data?.filter((user: any) => !user.is_superuser)?.length || 0;
      } catch (error) {
        // 普通用户无法访问此API，设置默认值
        console.log('用户无管理员权限，无法获取用户统计');
        totalUsers = 1; // 至少有当前用户
      }
      
      // 计算已回答的问题数
      const answeredQuestions = questions.filter((q: any) => 
        q.answers && Array.isArray(q.answers) && q.answers.length > 0
      ).length;
      
      // 获取最新问题（按创建时间排序）
      const recentQuestions = [...questions]
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5)
        .map((q: any) => ({
          id: q.id,
          title: q.title,
          created_at: q.created_at || new Date().toISOString()
        }));
        
      // 获取热门问题（按回答数排序）
      const popularQuestions = [...questions]
        .sort((a: any, b: any) => 
          ((a.answers && Array.isArray(a.answers) ? a.answers.length : 0) - 
           (b.answers && Array.isArray(b.answers) ? b.answers.length : 0)) * -1
        )
        .slice(0, 5)
        .map((q: any) => ({
          id: q.id,
          title: q.title,
          answers_count: q.answers && Array.isArray(q.answers) ? q.answers.length : 0
        }));
      
      setStats({
        totalQuestions: questions.length || 0,
        totalUsers,
        answeredQuestions,
        recentQuestions,
        popularQuestions
      });
    } catch (error: any) {
      console.error('获取统计数据失败:', error);
      message.error('获取统计数据失败，请刷新页面重试');
      // 设置默认值
      setStats({
        totalQuestions: 0,
        totalUsers: 1,
        answeredQuestions: 0,
        recentQuestions: [],
        popularQuestions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = () => {
    if (!isAuthenticated) {
      message.warning('请先登录后再提问');
      navigate('/');
      return;
    }
    setShowQuestionDialog(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="总问题数"
              value={stats.totalQuestions}
              prefix={<QuestionCircleOutlined key="question-icon" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined key="user-icon" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="已解答问题"
              value={stats.answeredQuestions}
              prefix={<CheckCircleOutlined key="check-icon" />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: '24px' }}>
        <Row>
          <Col span={16}>
            <h2>欢迎使用数学问题解答系统</h2>
            <p>
              这是一个基于Deepseek大模型的数学问题解答系统。在这里，你可以：
            </p>
            <ul>
              <li>提出数学问题</li>
              <li>获取AI解答</li>
              <li>查看其他用户的解答</li>
              <li>对解答进行评分和反馈</li>
            </ul>
          </Col>
          <Col span={8} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<QuestionCircleOutlined />}
                onClick={() => navigate('/questions')}
              >
                查看问题
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<EditOutlined />}
                onClick={handleAskQuestion}
              >
                提出问题
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={12}>
          <Card title="最新问题" loading={loading}>
            {stats.recentQuestions.length > 0 ? (
              <ul style={{ paddingLeft: '20px' }}>
                {stats.recentQuestions.map((q) => (
                  <li key={q.id} style={{ marginBottom: '8px' }}>
                    <a onClick={() => navigate(`/questions/${q.id}`)}>
                      {q.title}
                    </a>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {new Date(q.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>暂无数据</p>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="热门问题" loading={loading}>
            {stats.popularQuestions.length > 0 ? (
              <ul style={{ paddingLeft: '20px' }}>
                {stats.popularQuestions.map((q) => (
                  <li key={q.id} style={{ marginBottom: '8px' }}>
                    <a onClick={() => navigate(`/questions/${q.id}`)}>
                      {q.title}
                    </a>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {q.answers_count || 0} 个回答
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>暂无数据</p>
            )}
          </Card>
        </Col>
      </Row>
      
      {/* 提问对话框 */}
      <QuestionDialog 
        visible={showQuestionDialog} 
        onClose={() => setShowQuestionDialog(false)}
        onSuccess={fetchStats}
      />
    </div>
  );
};

export default Home; 