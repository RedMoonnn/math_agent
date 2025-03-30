import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Row, Col, Divider, Steps, Space } from 'antd';
import { MailOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const { Title, Text, Link: AntLink } = Typography;
const { Step } = Steps;

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // 发送验证码
  const sendVerificationCode = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authAPI.sendPasswordResetCode(values.email);
      setEmail(values.email);
      message.success('验证码已发送到您的邮箱');
      setCurrentStep(1);
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data?.detail || '发送验证码失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const resetPassword = async (values: { verificationCode: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(email, values.verificationCode, values.newPassword);
      message.success('密码重置成功，请登录');
      navigate('/');
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data?.detail || '密码重置失败');
      } else {
        message.error('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: '验证邮箱',
      content: (
        <Form form={form} onFinish={sendVerificationCode} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined key="mail-icon" />}
              placeholder="邮箱"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              发送验证码
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      title: '重置密码',
      content: (
        <Form form={form} onFinish={resetPassword} layout="vertical">
          <Form.Item
            name="verificationCode"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Input
              prefix={<KeyOutlined key="key-icon" />}
              placeholder="验证码"
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
              prefix={<LockOutlined key="lock-icon" />}
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
              重置密码
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

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
            <Title level={2}>找回密码</Title>
            <Text type="secondary">重置您的账号密码</Text>
          </div>

          <Steps current={currentStep} style={{ marginBottom: '24px' }}>
            {steps.map(item => (
              <Step key={item.title} title={item.title} />
            ))}
          </Steps>

          <Divider />

          {steps[currentStep].content}

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Space>
              <Text>记起密码？</Text>
              <AntLink onClick={() => navigate('/')}>返回登录</AntLink>
            </Space>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default ForgotPassword; 