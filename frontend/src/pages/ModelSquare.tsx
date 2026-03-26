import React, { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, Tag, Button, Typography, Input, Select, message,
  Modal, Descriptions, Popconfirm,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { listModels, reviewModel } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { MLModel } from '../types';

const { Title, Text } = Typography;

const ModelSquare: React.FC = () => {
  const { isAdmin } = useAuth();
  const [models, setModels] = useState<MLModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [selected, setSelected] = useState<MLModel | null>(null);

  const fetchModels = useCallback(() => {
    setLoading(true);
    listModels()
      .then((res) => setModels(res.data))
      .catch(() => message.error('加载模型失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleReview = async (id: number, status: string) => {
    try {
      await reviewModel(id, status);
      message.success(`模型已${status === 'approved' ? '通过' : '拒绝'}`);
      fetchModels();
    } catch {
      message.error('审核操作失败');
    }
  };

  const filtered = models.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && m.category !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(models.map((m) => m.category))];

  const featureData = selected?.feature_importance
    ? Object.entries(selected.feature_importance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([k, v]) => ({ name: k, value: Number(v.toFixed(4)) }))
    : [];

  const statusColor: Record<string, string> = {
    pending: 'warning', approved: 'success', rejected: 'error',
  };
  const statusText: Record<string, string> = {
    pending: '待审核', approved: '已通过', rejected: '已拒绝',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>模型广场</Title>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索模型名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="筛选分类"
              allowClear
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {categories.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {loading ? (
          <Col span={24}><div style={{ textAlign: 'center', padding: 32 }}>加载中...</div></Col>
        ) : filtered.length === 0 ? (
          <Col span={24}><div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>暂无模型</div></Col>
        ) : (
          filtered.map((model) => (
            <Col key={model.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                hoverable
                title={model.title}
                extra={<Tag color={statusColor[model.status]}>{statusText[model.status]}</Tag>}
                actions={[
                  <Button type="link" key="view" onClick={() => setSelected(model)}>查看详情</Button>,
                  ...(isAdmin && model.status === 'pending' ? [
                    <Popconfirm
                      key="approve"
                      title="确认通过？"
                      onConfirm={() => handleReview(model.id, 'approved')}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button type="link" size="small">通过</Button>
                    </Popconfirm>,
                    <Popconfirm
                      key="reject"
                      title="确认拒绝？"
                      onConfirm={() => handleReview(model.id, 'rejected')}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button type="link" danger size="small">拒绝</Button>
                    </Popconfirm>,
                  ] : []),
                ]}
              >
                <div style={{ marginBottom: 8 }}>
                  <Tag color="blue">{model.category || '未分类'}</Tag>
                  <Tag color={model.is_public ? 'green' : 'default'}>
                    {model.is_public ? '公开' : '私有'}
                  </Tag>
                </div>
                <div>
                  {model.performance_metrics?.accuracy !== undefined && (
                    <div>
                      <Text type="secondary">准确率: </Text>
                      <Text strong style={{ color: '#52c41a' }}>
                        {(model.performance_metrics.accuracy * 100).toFixed(2)}%
                      </Text>
                    </div>
                  )}
                  {model.performance_metrics?.rmse !== undefined && (
                    <div>
                      <Text type="secondary">RMSE: </Text>
                      <Text strong style={{ color: '#1890ff' }}>
                        {model.performance_metrics.rmse.toFixed(4)}
                      </Text>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  {(model.tags || []).map((tag) => (
                    <Tag key={tag} style={{ marginBottom: 4 }}>{tag}</Tag>
                  ))}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(model.created_at).format('YYYY-MM-DD')}
                </Text>
              </Card>
            </Col>
          ))
        )}
      </Row>

      <Modal
        title={selected?.title}
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>关闭</Button>}
        width={800}
      >
        {selected && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="分类">{selected.category}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[selected.status]}>{statusText[selected.status]}</Tag>
              </Descriptions.Item>
              {selected.performance_metrics?.accuracy !== undefined && (
                <Descriptions.Item label="准确率">
                  {(selected.performance_metrics.accuracy * 100).toFixed(2)}%
                </Descriptions.Item>
              )}
              {selected.performance_metrics?.rmse !== undefined && (
                <Descriptions.Item label="RMSE">
                  {selected.performance_metrics.rmse.toFixed(4)}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {dayjs(selected.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {featureData.length > 0 && (
              <>
                <Title level={5}>特征重要性</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#722ed1" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModelSquare;
