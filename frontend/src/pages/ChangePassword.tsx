import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Row, Col, Divider } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { authAPI } from '../services/api';

const { Title, Text } = Typography;

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // 如果用户未登录，重定向到登录页
  if (!isAuthenticated) {
    navigate('/');
    return null;
  }

  const onFinish = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(values.currentPassword, values.newPassword);
      message.success('密码修改成功');
      navigate('/profile');
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data?.detail || '密码修改失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: 'calc(100vh - 112px)' }}>
      <Col xs={24} sm={20} md={16} lg={12} xl={8}>
        <Card
          bordered={false}
          style={{
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            backgroundColor: '#fff'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Title level={2}>修改密码</Title>
            <Text type="secondary">更新您的账号密码</Text>
          </div>

          <Divider />

          <Form
            name="changePassword"
            onFinish={onFinish}
            layout="vertical"
          >
            <Form.Item
              name="currentPassword"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined key="current-lock-icon" />}
                placeholder="当前密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度不能小于6位' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined key="new-lock-icon" />}
                placeholder="新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined key="confirm-lock-icon" />}
                placeholder="确认新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                修改密码
              </Button>
            </Form.Item>

            <Form.Item>
              <Button type="default" block size="large" onClick={() => navigate('/profile')}>
                返回个人中心
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default ChangePassword; 