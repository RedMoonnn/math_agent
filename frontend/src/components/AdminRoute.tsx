import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface AdminRouteProps {
  element: JSX.Element;
}

/**
 * 管理员路由组件，只允许超级管理员访问
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ element }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // 判断用户是否登录且是否为管理员
  const isAdmin = isAuthenticated && user?.is_superuser;
  
  return isAdmin ? element : <Navigate to="/" />;
};

export default AdminRoute; 