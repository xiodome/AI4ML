import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Button, List, Tag, Typography, Spin, message,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { listTasks } from '../api/client';
import type { Task, TaskStatus } from '../types';

const { Title, Text } = Typography;

const statusColor: Record<TaskStatus, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const statusText: Record<TaskStatus, string> = {
  pending: '待处理',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTasks()
      .then((res) => setTasks(res.data))
      .catch(() => message.error('加载任务失败'))
      .finally(() => setLoading(false));
  }, []);

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const recentTasks = tasks.slice(0, 5);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 4 }}>
        欢迎回来，{user?.username} 👋
      </Title>
      <Text type="secondary">智算 AI4ML · 基于多智能体协作的AI开发社区</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={tasks.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成任务"
              value={completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已用 Token"
              value={user?.api_token_used ?? 0}
              suffix={`/ ${user?.api_token_quota ?? 0}`}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="剩余 Token"
              value={(user?.api_token_quota ?? 0) - (user?.api_token_used ?? 0)}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/tasks/create')}
          >
            创建新任务
          </Button>
        </Col>
        <Col>
          <Button
            icon={<UploadOutlined />}
            size="large"
            onClick={() => navigate('/data-center')}
          >
            上传数据集
          </Button>
        </Col>
      </Row>

      <Card
        title="最近任务"
        style={{ marginTop: 24 }}
        extra={
          <Button type="link" onClick={() => navigate('/tasks')}>
            查看全部
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : (
          <List
            dataSource={recentTasks}
            locale={{ emptyText: '暂无任务，去创建第一个任务吧！' }}
            renderItem={(task) => (
              <List.Item
                key={task.id}
                actions={[
                  <Button
                    type="link"
                    key="view"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    查看
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={task.title}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  }
                />
                <Tag color={statusColor[task.status]}>{statusText[task.status]}</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
