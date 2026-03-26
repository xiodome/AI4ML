import React, { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, Tag, Button, Typography, Modal, Form, Input,
  Switch, message, Space,
} from 'antd';
import { PlusOutlined, ForkOutlined, BranchesOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { listPipelines, createPipeline, forkPipeline, getPipeline } from '../api/client';
import type { Pipeline } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const Community: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState<Pipeline | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetchPipelines = useCallback(() => {
    setLoading(true);
    listPipelines()
      .then((res) => setPipelines(res.data))
      .catch(() => message.error('加载 Pipeline 失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleCreate = async (values: {
    title: string;
    description: string;
    workflow_config: string;
    tags: string;
    is_public: boolean;
  }) => {
    setCreating(true);
    try {
      let workflowConfig = {};
      if (values.workflow_config) {
        workflowConfig = JSON.parse(values.workflow_config);
      }
      await createPipeline({
        title: values.title,
        description: values.description,
        workflow_config: workflowConfig,
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()) : [],
        is_public: values.is_public ?? true,
      });
      message.success('Pipeline 创建成功');
      setCreateModal(false);
      form.resetFields();
      fetchPipelines();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      message.error(error?.response?.data?.detail || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleFork = async (id: number) => {
    try {
      await forkPipeline(id);
      message.success('Fork 成功！');
      fetchPipelines();
    } catch {
      message.error('Fork 失败');
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getPipeline(id);
      setDetailModal(res.data);
    } catch {
      message.error('加载详情失败');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <BranchesOutlined /> 社区 Pipeline
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
          分享我的 Pipeline
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {loading ? (
          <Col span={24}><div style={{ textAlign: 'center', padding: 32 }}>加载中...</div></Col>
        ) : pipelines.length === 0 ? (
          <Col span={24}>
            <div style={{ textAlign: 'center', padding: 48, color: '#8c8c8c' }}>
              暂无 Pipeline，成为第一个分享的人吧！
            </div>
          </Col>
        ) : (
          pipelines.map((p) => (
            <Col key={p.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                title={p.title}
                extra={<Tag color={p.is_public ? 'green' : 'default'}>{p.is_public ? '公开' : '私有'}</Tag>}
                actions={[
                  <Button
                    type="link"
                    key="view"
                    onClick={() => handleViewDetail(p.id)}
                  >
                    查看详情
                  </Button>,
                  <Button
                    type="link"
                    key="fork"
                    icon={<ForkOutlined />}
                    onClick={() => handleFork(p.id)}
                  >
                    Fork ({p.fork_count})
                  </Button>,
                ]}
              >
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ color: '#595959', minHeight: 44 }}
                >
                  {p.description || '暂无描述'}
                </Paragraph>
                <div style={{ marginBottom: 8 }}>
                  {(p.tags || []).map((tag) => (
                    <Tag key={tag} style={{ marginBottom: 4 }}>{tag}</Tag>
                  ))}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(p.created_at).format('YYYY-MM-DD')}
                </Text>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Create Modal */}
      <Modal
        title="分享 Pipeline"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields(); }}
        footer={null}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="Pipeline 标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="描述此 Pipeline 的功能和用途" />
          </Form.Item>
          <Form.Item
            name="workflow_config"
            label="工作流配置 (JSON)"
            rules={[{
              validator: (_, v) => {
                if (!v) return Promise.resolve();
                try { JSON.parse(v); return Promise.resolve(); }
                catch { return Promise.reject(new Error('JSON 格式不正确')); }
              },
            }]}
          >
            <TextArea rows={6} placeholder='{"steps": [...]}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="tags" label="标签（逗号分隔）">
            <Input placeholder="分类, 回归, NLP" />
          </Form.Item>
          <Form.Item name="is_public" label="公开分享" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={creating}>分享</Button>
              <Button onClick={() => { setCreateModal(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={detailModal?.title}
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={
          <Button onClick={() => setDetailModal(null)}>关闭</Button>
        }
        width={700}
      >
        {detailModal && (
          <div>
            <Paragraph>{detailModal.description}</Paragraph>
            <div style={{ marginBottom: 12 }}>
              {(detailModal.tags || []).map((tag) => <Tag key={tag}>{tag}</Tag>)}
              <Tag color="blue">Fork: {detailModal.fork_count}</Tag>
              <Tag color={detailModal.is_public ? 'green' : 'default'}>
                {detailModal.is_public ? '公开' : '私有'}
              </Tag>
            </div>
            <Title level={5}>工作流配置</Title>
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 300,
              }}
            >
              {JSON.stringify(detailModal.workflow_config, null, 2)}
            </pre>
            <Text type="secondary">
              创建时间：{dayjs(detailModal.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Community;
