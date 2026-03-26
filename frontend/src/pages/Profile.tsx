import React, { useState } from 'react';
import {
  Card, Typography, Progress, Tag, Form, Input, Button, message, Row, Col,
} from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

const { Title, Text } = Typography;

const roleColor: Record<string, string> = {
  admin: 'red',
  developer: 'blue',
  user: 'default',
};
const roleText: Record<string, string> = {
  admin: '管理员',
  developer: '开发者',
  domain_user: '普通用户',
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [pwdLoading, setPwdLoading] = useState(false);
  const [form] = Form.useForm();

  const tokenPercent = user
    ? Math.round((user.api_token_used / (user.api_token_quota || 1)) * 100)
    : 0;

  const handleChangePassword = async (values: {
    old_password: string;
    new_password: string;
  }) => {
    setPwdLoading(true);
    try {
      await api.post('/api/auth/change-password', values);
      message.success('密码已更新');
      form.resetFields();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      message.error(error?.response?.data?.detail || '密码修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>个人资料</Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>{user.username}</Title>
                <Tag color={roleColor[user.role]}>{roleText[user.role]}</Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary"><UserOutlined /> 用户名</Text>
            <div><Text strong>{user.username}</Text></div>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary"><MailOutlined /> 邮箱</Text>
            <div><Text strong>{user.email}</Text></div>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">注册时间</Text>
            <div><Text>{dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}</Text></div>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">账号状态</Text>
            <div>
              <Tag color={user.is_active ? 'success' : 'default'}>
                {user.is_active ? '正常' : '已禁用'}
              </Tag>
            </div>
          </Col>
        </Row>
      </Card>

      <Card title="API Token 使用情况" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <Text>已使用: </Text>
          <Text strong style={{ color: '#1890ff' }}>{user.api_token_used}</Text>
          <Text> / {user.api_token_quota}</Text>
        </div>
        <Progress
          percent={tokenPercent}
          strokeColor={tokenPercent > 80 ? '#ff4d4f' : tokenPercent > 60 ? '#faad14' : '#52c41a'}
          format={(pct) => `${pct}%`}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          剩余 {user.api_token_quota - user.api_token_used} tokens
        </Text>
      </Card>

      <Card title="修改密码">
        <Form form={form} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 400 }}>
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="当前密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少6位' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={pwdLoading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;
