import React, { useEffect, useState } from 'react';
import { Card, Tabs, List, Tag, Space, message, Rate, Button, Descriptions, Avatar } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import { questionAPI } from '../services/api';

const { TabPane } = Tabs;

interface Question {
  id: number;
  title: string;
  content: string;
  category: string;
  difficulty: string;
  created_at: string;
  created_by: number;
}

interface Answer {
  id: number;
  content: string;
  question_id: number;
  question_title: string;
  created_at: string;
  created_by: number;
  feedback?: {
    rating: number;
    comment: string;
  };
}

const Profile: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [myAnswers, setMyAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyQuestions();
    fetchMyAnswers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMyQuestions = async () => {
    try {
      setLoading(true);
      const response = await questionAPI.getQuestions();
      setMyQuestions(response.data.filter((q: Question) => q.created_by === user?.id));
    } catch (error) {
      message.error('获取我的问题失败，请稍后重试！');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAnswers = async () => {
    try {
      setLoading(true);
      const response = await questionAPI.getAnswers(0); // 获取所有答案
      setMyAnswers(response.data.filter((a: Answer) => a.created_by === user?.id));
    } catch (error) {
      message.error('获取我的答案失败，请稍后重试！');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'green';
      case 'medium':
        return 'orange';
      case 'hard':
        return 'red';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="个人中心" loading={loading}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="个人信息" key="1">
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Avatar size={64} icon={<UserOutlined />} />
                <div style={{ marginLeft: '24px' }}>
                  <h2>{user?.username}</h2>
                  <p>{user?.email}</p>
                </div>
              </div>
              <Descriptions title="账号信息" bordered>
                <Descriptions.Item label="用户名" span={3}>{user?.username}</Descriptions.Item>
                <Descriptions.Item label="邮箱" span={3}>{user?.email}</Descriptions.Item>
                <Descriptions.Item label="账号类型" span={3}>
                  {user?.is_superuser ? '管理员' : '普通用户'}
                </Descriptions.Item>
                <Descriptions.Item label="账号状态" span={3}>
                  {user?.is_active ? <Tag color="green">已激活</Tag> : <Tag color="red">未激活</Tag>}
                </Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <Button 
                  type="primary" 
                  icon={<LockOutlined />} 
                  onClick={() => navigate('/change-password')}
                >
                  修改密码
                </Button>
              </div>
            </Card>
          </TabPane>
          <TabPane tab="我的问题" key="2">
            <List
              dataSource={myQuestions}
              renderItem={(question) => (
                <List.Item>
                  <Card style={{ width: '100%' }}>
                    <h3>{question.title}</h3>
                    <p>{question.content.substring(0, 100)}...</p>
                    <Space>
                      <Tag color={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Tag>
                      <Tag color="blue">{question.category}</Tag>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </TabPane>
          <TabPane tab="我的答案" key="3">
            <List
              dataSource={myAnswers}
              renderItem={(answer) => (
                <List.Item>
                  <Card style={{ width: '100%' }}>
                    <h3>问题：{answer.question_title}</h3>
                    <p>答案：{answer.content}</p>
                    {answer.feedback && (
                      <div>
                        <Rate disabled defaultValue={answer.feedback.rating} />
                        {answer.feedback.comment && (
                          <p style={{ marginTop: 8 }}>{answer.feedback.comment}</p>
                        )}
                      </div>
                    )}
                  </Card>
                </List.Item>
              )}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Profile; 