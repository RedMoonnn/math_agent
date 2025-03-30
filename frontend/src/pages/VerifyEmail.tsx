import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Row, Col, Divider, Steps, Space } from 'antd';
import { MailOutlined, KeyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const { Title, Text, Link: AntLink } = Typography;
const { Step } = Steps;

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // 如果有查询参数传递邮箱地址，自动填充
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      form.setFieldsValue({ email: emailParam });
    }
  }, [location.search, form]);

  // 发送验证码
  const sendVerificationCode = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authAPI.sendEmailVerificationCode(values.email);
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

  // 验证邮箱
  const verifyEmail = async (values: { verificationCode: string }) => {
    setLoading(true);
    try {
      await authAPI.verifyEmail(email, values.verificationCode);
      message.success('邮箱验证成功');
      setCurrentStep(2);
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data?.detail || '验证失败');
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
      title: '输入验证码',
      content: (
        <Form form={form} onFinish={verifyEmail} layout="vertical">
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
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              验证邮箱
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      title: '验证成功',
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
          <Title level={4} style={{ margin: '16px 0' }}>邮箱验证成功</Title>
          <Text>您的邮箱已成功验证，现在可以使用所有功能。</Text>
          <div style={{ marginTop: '24px' }}>
            <Button type="primary" size="large" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
        </div>
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
            <Title level={2}>邮箱验证</Title>
            <Text type="secondary">验证您的邮箱地址</Text>
          </div>

          <Steps current={currentStep} style={{ marginBottom: '24px' }}>
            {steps.map(item => (
              <Step key={item.title} title={item.title} />
            ))}
          </Steps>

          <Divider />

          {steps[currentStep].content}

          {currentStep < 2 && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Space>
                <Text>不需要验证？</Text>
                <AntLink onClick={() => navigate('/')}>返回首页</AntLink>
              </Space>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default VerifyEmail; 