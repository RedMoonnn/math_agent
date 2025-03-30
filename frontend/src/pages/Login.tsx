import React from 'react';
import { Form, Input, Button, Card, message, Typography, Row, Col, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authAPI } from '../services/api';
import { setCredentials, setUser } from '../store/slices/authSlice';

const { Title, Text, Link: AntLink } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      console.log("正在尝试登录:", values.username);
      const response = await authAPI.login(values.username, values.password);
      console.log("登录成功响应:", response);
      if (!response.data || !response.data.access_token) {
        throw new Error("返回的数据格式不正确");
      }
      dispatch(setCredentials(response.data));
      
      try {
        const userResponse = await authAPI.getCurrentUser();
        console.log("用户信息:", userResponse.data);
        dispatch(setUser(userResponse.data));
      } catch (userError) {
        console.error("获取用户信息失败:", userError);
      }
      
      message.success('登录成功！');
      navigate('/');
    } catch (error: any) {
      console.error("登录错误:", error);
      
      if (error.response) {
        console.error("错误响应:", error.response.data);
        
        if (error.response.status === 401) {
          message.error('用户名或密码错误，请重新输入');
        } else {
          const errorDetail = error.response.data?.detail || '请检查用户名和密码';
          message.error(`登录失败: ${errorDetail}`);
        }
      } else if (error.request) {
        console.error("请求错误:", error.request);
        message.error('服务器未响应，请检查网络连接');
      } else {
        console.error("其他错误:", error.message);
        message.error(`登录失败: ${error.message}`);
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
            <Text type="secondary">使用Deepseek大模型解答数学问题</Text>
          </div>
          
          <Divider>用户登录</Divider>
          
          <Form
            name="login"
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
              name="password"
              rules={[{ required: true, message: '请输入密码！' }]}
            >
              <Input.Password
                prefix={<LockOutlined key="lock-icon" />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                登录
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical">
              <Space>
                <Text>还没有账号？</Text>
                <AntLink onClick={() => navigate('/register')}>立即注册</AntLink>
              </Space>
              <Space>
                <Text>忘记密码？</Text>
                <AntLink onClick={() => navigate('/forgot-password')}>找回密码</AntLink>
              </Space>
            </Space>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Login; 