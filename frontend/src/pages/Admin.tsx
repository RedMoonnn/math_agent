import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, Popconfirm, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import { adminAPI } from '../services/api';
import { User } from '../store/slices/authSlice';

const { Title } = Typography;

interface UserWithKey extends User {
  key: string;
}

const Admin: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithKey[]>([]);
  const [loading, setLoading] = useState(false);

  // 如果用户未登录或不是管理员，重定向到首页
  useEffect(() => {
    if (!isAuthenticated || (user && !user.is_superuser)) {
      message.error('您没有权限访问管理页面');
      navigate('/');
    } else {
      fetchUsers();
    }
  }, [isAuthenticated, user, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      const usersWithKey = response.data.map((user: User) => ({
        ...user,
        key: user.id.toString(),
      }));
      setUsers(usersWithKey);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      await adminAPI.activateUser(userId);
      message.success('用户已激活');
      fetchUsers();
    } catch (error) {
      message.error('激活用户失败');
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    try {
      await adminAPI.deactivateUser(userId);
      message.success('用户已停用');
      fetchUsers();
    } catch (error: any) {
      if (error.response?.data.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('停用用户失败');
      }
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await adminAPI.deleteUser(userId);
      message.success('用户已删除');
      fetchUsers();
    } catch (error: any) {
      if (error.response?.data.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('删除用户失败');
      }
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        isActive ? <Tag color="green">已激活</Tag> : <Tag color="red">已停用</Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'is_superuser',
      key: 'is_superuser',
      render: (isSuperuser: boolean) => (
        isSuperuser ? <Tag color="blue">管理员</Tag> : <Tag>普通用户</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserWithKey) => (
        <Space size="middle">
          {record.is_active ? (
            <Popconfirm
              title="确定要停用此用户吗？"
              onConfirm={() => handleDeactivateUser(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                type="primary" 
                danger 
                icon={<LockOutlined />}
                disabled={record.id === user?.id}
              >
                停用
              </Button>
            </Popconfirm>
          ) : (
            <Button 
              type="primary" 
              icon={<UnlockOutlined />} 
              onClick={() => handleActivateUser(record.id)}
            >
              激活
            </Button>
          )}
          
          <Popconfirm
            title="确定要删除此用户吗？此操作不可撤销。"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              disabled={record.id === user?.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <UserOutlined /> 用户管理
        </Title>
        <Table 
          columns={columns} 
          dataSource={users} 
          loading={loading} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default Admin; 