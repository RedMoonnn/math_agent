import React from 'react';
import { Form, Input, Button, Card, message, Typography, Row, Col, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const { Title, Text, Link: AntLink } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = async (values: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致！');
      return;
    }

    try {
      await authAPI.register(values.username, values.email, values.password);
      message.success('注册成功！请验证您的邮箱');
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.detail || '注册失败，请稍后重试！';
        message.error(errorMessage);
      } else if (error.request) {
        message.error('无法连接到服务器，请检查网络连接！');
        console.error('Network error:', error);
      } else {
        message.error('注册请求错误，请稍后重试！');
        console.error('Request error:', error);
      }
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
            <Title level={2}>数学问题解答系统</Title>
            <Text type="secondary">注册新账号体验AI解题能力</Text>
          </div>
          
          <Divider>用户注册</Divider>
          
          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名！' }]}
            >
              <Input
                prefix={<UserOutlined key="user-icon" />}
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱！' },
                { type: 'email', message: '请输入有效的邮箱地址！' }
              ]}
            >
              <Input
                prefix={<MailOutlined key="mail-icon" />}
                placeholder="邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码！' },
                { min: 6, message: '密码长度不能小于6位！' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined key="lock-icon" />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[
                { required: true, message: '请确认密码！' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致！'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined key="confirm-lock-icon" />}
                placeholder="确认密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                注册
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center' }}>
            <Space>
              <Text>已有账号？</Text>
              <AntLink onClick={() => navigate('/')}>返回登录</AntLink>
            </Space>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Register; 