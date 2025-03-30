import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface PrivateRouteProps {
  element: JSX.Element;
}

/**
 * 私有路由组件，用于保护需要登录才能访问的页面
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ element }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  return isAuthenticated ? element : <Navigate to="/login" />;
};

export default PrivateRoute; 