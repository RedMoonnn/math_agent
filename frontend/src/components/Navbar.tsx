import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Space, Modal, Upload, message, Input } from 'antd';
import {
  HomeOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  CommentOutlined,
  SettingOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout, setUser } from '../store/slices/authSlice';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { authAPI } from '../services/api';

const { Header } = Layout;

/**
 * 导航栏组件
 */
const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [current, setCurrent] = useState(location.pathname);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([]);
  const [username, setUsername] = useState(user?.username || '');

  // 处理菜单项点击
  const handleMenuClick = (e: { key: string }) => {
    setCurrent(e.key);
    navigate(e.key);
  };

  // 处理登出
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // 打开个人信息设置对话框
  const handleOpenProfileModal = () => {
    setIsProfileModalVisible(true);
    setUsername(user?.username || '');
    setAvatarFileList([]);
  };

  // 上传前检查
  const beforeUpload = (file: UploadFile) => {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
    }
    
    const isLt5M = file.size && file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片必须小于5MB！');
    }
    
    return isImage && isLt5M ? true : Upload.LIST_IGNORE;
  };

  // 处理头像上传
  const handleAvatarUpload = ({ fileList }: any) => {
    setAvatarFileList(fileList);
  };

  // 保存个人信息设置
  const saveProfileSettings = () => {
    if (!user) return;
    
    const updatedUser = { ...user };
    
    // 更新用户名
    if (username.trim() && username !== user.username) {
      updatedUser.username = username.trim();
    }
    
    // 更新头像
    if (avatarFileList.length > 0 && avatarFileList[0].originFileObj) {
      message.loading('正在处理头像...');
      
      // 使用FileReader读取文件为base64
      const reader = new FileReader();
      reader.readAsDataURL(avatarFileList[0].originFileObj);
      reader.onload = async () => {
        try {
          // 将base64数据发送到后端
          const base64Image = reader.result as string;
          const response = await authAPI.updateAvatar(base64Image);
          
          // 更新Redux中的用户信息
          if (response.data) {
            dispatch(setUser(response.data));
            message.success('个人信息设置已更新');
          }
        } catch (error) {
          console.error('头像上传失败', error);
          message.error('头像上传失败，请稍后重试');
        } finally {
          setIsProfileModalVisible(false);
        }
      };
      reader.onerror = () => {
        message.error('文件读取失败，请重试');
        setIsProfileModalVisible(false);
      };
      return; // 提前返回，避免执行后续代码
    }
    
    // 如果没有更新头像，只更新用户名
    if (updatedUser.username !== user.username) {
      // 更新Redux中的用户信息
      dispatch(setUser(updatedUser));
      message.success('个人信息设置已更新');
    }
    
    setIsProfileModalVisible(false);
  };

  // 自定义上传请求
  const customUploadRequest = async ({ 
    file, 
    onSuccess, 
    onError 
  }: any) => {
    try {
      // 这里不实际上传，只是预览
      onSuccess('ok');
    } catch (error) {
      onError(error);
    }
  };

  // 用户下拉菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="settings" onClick={handleOpenProfileModal}>
        <SettingOutlined /> 个人设置
      </Menu.Item>
      <Menu.Item key="profile" onClick={() => navigate('/profile')}>
        <UserOutlined /> 个人中心
      </Menu.Item>
      {user?.is_superuser && (
        <Menu.Item key="admin" onClick={() => navigate('/admin')}>
          <UserOutlined /> 管理中心
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item key="logout" onClick={handleLogout}>
        <LogoutOutlined /> 退出登录
      </Menu.Item>
    </Menu>
  );

  // 基本菜单项
  const baseMenuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    }
  ];
  
  // 登录后显示的菜单项
  const authenticatedMenuItems = [
    {
      key: '/questions',
      icon: <QuestionCircleOutlined />,
      label: '问题列表',
    },
    {
      key: '/chat',
      icon: <CommentOutlined />,
      label: '数学聊天',
    },
  ];

  // 根据登录状态展示不同的菜单项
  const menuItems = isAuthenticated 
    ? [...baseMenuItems, ...authenticatedMenuItems]
    : baseMenuItems;

  return (
    <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
      <div className="logo" style={{ marginRight: '24px' }}>
        <h1 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>数学问题解答系统</h1>
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[current]}
        onClick={handleMenuClick}
        items={menuItems}
        style={{ flex: 1 }}
      />
      <div>
        {isAuthenticated ? (
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer', color: '#fff' }}>
              <Avatar 
                src={user?.avatar} 
                icon={!user?.avatar && <UserOutlined />} 
                style={{
                  backgroundColor: !user?.avatar ? '#1890ff' : undefined
                }}
              />
              {user?.username}
            </Space>
          </Dropdown>
        ) : (
          <Space>
            <Button type="primary" onClick={() => navigate('/login')}>
              <LoginOutlined key="login-icon" /> 登录
            </Button>
            <Button onClick={() => navigate('/register')}>注册</Button>
          </Space>
        )}
      </div>

      {/* 个人信息设置对话框 */}
      <Modal
        title="个人信息设置"
        open={isProfileModalVisible}
        onOk={saveProfileSettings}
        onCancel={() => setIsProfileModalVisible(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>用户名</div>
          <Input 
            placeholder="输入您的用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div>
          <div style={{ marginBottom: 8 }}>头像设置</div>
          <Upload
            listType="picture-card"
            fileList={avatarFileList}
            onChange={handleAvatarUpload}
            beforeUpload={beforeUpload}
            maxCount={1}
            customRequest={customUploadRequest}
          >
            {avatarFileList.length >= 1 ? null : (
              <div>
                <PictureOutlined />
                <div style={{ marginTop: 8 }}>上传头像</div>
              </div>
            )}
          </Upload>
          <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
            点击上方区域选择本地图片作为您的头像
          </div>
        </div>
      </Modal>
    </Header>
  );
};

export default Navbar; 