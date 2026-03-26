import React, { useState } from 'react';
import { Layout, Menu, Avatar, Typography, Progress, Button } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  RobotOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/tasks', icon: <FileTextOutlined />, label: '我的任务' },
    { key: '/data-center', icon: <DatabaseOutlined />, label: '数据中心' },
    { key: '/model-square', icon: <RobotOutlined />, label: '模型广场' },
    { key: '/community', icon: <TeamOutlined />, label: '社区' },
    ...(isAdmin ? [{ key: '/admin', icon: <SettingOutlined />, label: '管理后台' }] : []),
    { key: '/profile', icon: <UserOutlined />, label: '个人资料' },
  ];

  const tokenPercent = user
    ? Math.round((user.api_token_used / (user.api_token_quota || 1)) * 100)
    : 0;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        style={{ background: '#001529' }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <RobotOutlined style={{ color: '#1890ff', fontSize: 24 }} />
          {!collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 16, marginLeft: 10 }}>
              智算 AI4ML
            </Text>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8, flex: 1 }}
        />

        {/* User footer */}
        {!collapsed && user && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              position: 'absolute',
              bottom: 48,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontSize: 12 }} ellipsis>
                {user.username}
              </Text>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              Token: {user.api_token_used}/{user.api_token_quota}
            </Text>
            <Progress
              percent={tokenPercent}
              showInfo={false}
              size="small"
              strokeColor={tokenPercent > 80 ? '#ff4d4f' : '#1890ff'}
              trailColor="rgba(255,255,255,0.1)"
              style={{ marginTop: 4 }}
            />
          </div>
        )}
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {user.username} ({user.role})
              </Text>
            )}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
