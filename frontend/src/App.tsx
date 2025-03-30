import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Layout } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { setUser } from './store/slices/authSlice';
import { authAPI } from './services/api';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import ChangePassword from './pages/ChangePassword';
import QuestionList from './pages/QuestionList';
import QuestionDetail from './pages/QuestionDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import './App.css';

const { Header, Content } = Layout;

/**
 * 应用程序主组件
 * 负责整体布局和路由配置
 */
const App: React.FC = () => {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // 当组件挂载或token变化时，获取用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (isAuthenticated && token) {
        try {
          const response = await authAPI.getCurrentUser();
          dispatch(setUser(response.data));
        } catch (error) {
          console.error('获取用户信息失败', error);
        }
      }
    };

    fetchCurrentUser();
  }, [isAuthenticated, token, dispatch]);

  return (
    <Router>
      {/* 整体布局容器 */}
      <Layout className="layout" style={{ minHeight: '100vh' }}>
        {/* 页面头部导航 */}
        <Header>
          <Navbar />
        </Header>
        {/* 页面主体内容区域 */}
        <Content style={{ padding: '0', background: '#f0f2f5' }}>
          {/* 路由配置 */}
          <Routes>
            <Route path="/" element={isAuthenticated ? <Home /> : <Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/questions" element={<PrivateRoute element={<QuestionList />} />} />
            <Route path="/questions/:id" element={<PrivateRoute element={<QuestionDetail />} />} />
            <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />
            <Route path="/change-password" element={<PrivateRoute element={<ChangePassword />} />} />
            <Route path="/admin" element={<AdminRoute element={<Admin />} />} />
            <Route path="/chat" element={<PrivateRoute element={<Chat />} />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
};

export default App; 