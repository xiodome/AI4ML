import React, { useEffect, useState, useCallback } from 'react';
import {
  Tabs, Table, Card, Button, Tag, Typography, message, Row, Col,
  Statistic, Space, InputNumber, Select, Popconfirm, Modal, Form,
} from 'antd';
import {
  UserOutlined, DatabaseOutlined, RobotOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  listUsers, updateUser, updateQuota, deleteUser,
  getPendingDatasets, getPendingModels, getStats,
  reviewDataset, reviewModel,
} from '../api/client';
import type { User, Dataset, MLModel, AdminStats } from '../types';

const { Title, Text } = Typography;

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingDatasets, setPendingDatasets] = useState<Dataset[]>([]);
  const [pendingModels, setPendingModels] = useState<MLModel[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [quotaModal, setQuotaModal] = useState<User | null>(null);
  const [quotaValue, setQuotaValue] = useState<number>(1000);

  const fetchAll = useCallback(() => {
    setUsersLoading(true);
    Promise.all([
      listUsers().then((r) => setUsers(r.data)),
      getPendingDatasets().then((r) => setPendingDatasets(r.data)),
      getPendingModels().then((r) => setPendingModels(r.data)),
      getStats().then((r) => setStats(r.data)),
    ])
      .catch(() => message.error('加载管理数据失败'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpdateQuota = async () => {
    if (!quotaModal) return;
    try {
      await updateQuota(quotaModal.id, quotaValue);
      message.success('配额已更新');
      setQuotaModal(null);
      fetchAll();
    } catch {
      message.error('更新配额失败');
    }
  };

  const handleRoleChange = async (id: number, role: string) => {
    try {
      await updateUser(id, { role: role as User['role'] });
      message.success('角色已更新');
      fetchAll();
    } catch {
      message.error('更新角色失败');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      message.success('状态已更新');
      fetchAll();
    } catch {
      message.error('更新状态失败');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('用户已删除');
      fetchAll();
    } catch {
      message.error('删除失败');
    }
  };

  const handleReviewDataset = async (id: number, status: string) => {
    try {
      await reviewDataset(id, status);
      message.success(`数据集已${status === 'approved' ? '通过' : '拒绝'}`);
      fetchAll();
    } catch {
      message.error('操作失败');
    }
  };

  const handleReviewModel = async (id: number, status: string) => {
    try {
      await reviewModel(id, status);
      message.success(`模型已${status === 'approved' ? '通过' : '拒绝'}`);
      fetchAll();
    } catch {
      message.error('操作失败');
    }
  };

  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (v: string) => <Text strong>{v}</Text> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: User) => (
        <Select
          value={role}
          size="small"
          onChange={(v) => handleRoleChange(record.id, v)}
          style={{ width: 110 }}
        >
          <Select.Option value="domain_user">普通用户</Select.Option>
          <Select.Option value="developer">开发者</Select.Option>
          <Select.Option value="admin">管理员</Select.Option>
        </Select>
      ),
    },
    {
      title: 'Token 使用',
      key: 'quota',
      render: (_: unknown, r: User) => (
        <Text>{r.api_token_used} / {r.api_token_quota}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => { setQuotaModal(record); setQuotaValue(record.api_token_quota); }}
          >
            配额
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleActive(record)}
          >
            {record.is_active ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确认删除此用户？"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'stats',
      label: '平台统计',
      children: stats ? (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="总用户数" value={stats.users} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="总任务数" value={stats.tasks} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="总数据集" value={stats.datasets} prefix={<DatabaseOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="总模型数" value={stats.models} prefix={<RobotOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="待审核数据集" value={stats.pending_datasets} prefix={<UserOutlined />} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="待审核模型" value={stats.pending_models} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
        </Row>
      ) : <div style={{ textAlign: 'center', padding: 32 }}>加载中...</div>,
    },
    {
      key: 'users',
      label: '用户管理',
      children: (
        <Table
          dataSource={users}
          columns={userColumns}
          rowKey="id"
          loading={usersLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      ),
    },
    {
      key: 'datasets',
      label: `待审核数据集 (${pendingDatasets.length})`,
      children: (
        <Row gutter={[16, 16]}>
          {pendingDatasets.length === 0 ? (
            <Col span={24}><div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>暂无待审核数据集</div></Col>
          ) : (
            pendingDatasets.map((d) => (
              <Col key={d.id} xs={24} sm={12} lg={8}>
                <Card
                  title={d.title}
                  extra={<Tag color="warning">待审核</Tag>}
                  actions={[
                    <Popconfirm
                      key="approve"
                      title="确认通过？"
                      onConfirm={() => handleReviewDataset(d.id, 'approved')}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button type="primary" size="small">通过</Button>
                    </Popconfirm>,
                    <Popconfirm
                      key="reject"
                      title="确认拒绝？"
                      onConfirm={() => handleReviewDataset(d.id, 'rejected')}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button danger size="small">拒绝</Button>
                    </Popconfirm>,
                  ]}
                >
                  <p>{d.description}</p>
                  <Tag color="blue">{d.category}</Tag>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    {dayjs(d.created_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </Card>
              </Col>
            ))
          )}
        </Row>
      ),
    },
    {
      key: 'models',
      label: `待审核模型 (${pendingModels.length})`,
      children: (
        <Row gutter={[16, 16]}>
          {pendingModels.length === 0 ? (
            <Col span={24}><div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>暂无待审核模型</div></Col>
          ) : (
            pendingModels.map((m) => (
              <Col key={m.id} xs={24} sm={12} lg={8}>
                <Card
                  title={m.title}
                  extra={<Tag color="warning">待审核</Tag>}
                  actions={[
                    <Popconfirm
                      key="approve"
                      title="确认通过？"
                      onConfirm={() => handleReviewModel(m.id, 'approved')}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button type="primary" size="small">通过</Button>
                    </Popconfirm>,
                    <Popconfirm
                      key="reject"
                      title="确认拒绝？"
                      onConfirm={() => handleReviewModel(m.id, 'rejected')}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button danger size="small">拒绝</Button>
                    </Popconfirm>,
                  ]}
                >
                  <p>{m.description}</p>
                  <Tag color="blue">{m.category}</Tag>
                  {m.performance_metrics?.accuracy !== undefined && (
                    <div>准确率: {(m.performance_metrics.accuracy * 100).toFixed(2)}%</div>
                  )}
                </Card>
              </Col>
            ))
          )}
        </Row>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>管理后台</Title>
      <Tabs items={tabItems} defaultActiveKey="stats" />

      <Modal
        title={`修改配额 - ${quotaModal?.username}`}
        open={!!quotaModal}
        onOk={handleUpdateQuota}
        onCancel={() => setQuotaModal(null)}
        okText="保存"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="API Token 配额">
            <InputNumber
              value={quotaValue}
              onChange={(v) => setQuotaValue(v || 0)}
              min={0}
              step={100}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
