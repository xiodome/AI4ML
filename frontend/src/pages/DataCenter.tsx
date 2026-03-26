import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Button, Tag, Space, Modal, Form, Input, Select,
  Upload, Switch, message, Typography, Row, Col, Popconfirm,
} from 'antd';
import { PlusOutlined, InboxOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { listDatasets, createDataset, reviewDataset } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Dataset } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const categoryOptions = [
  '农业', '金融', '医疗', '教育', '工业', '交通', '环境', '社会', '其他',
];

const DataCenter: React.FC = () => {
  const { isAdmin } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchDatasets = useCallback(() => {
    setLoading(true);
    listDatasets()
      .then((res) => setDatasets(res.data))
      .catch(() => message.error('加载数据集失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleUpload = async (values: {
    title: string;
    description: string;
    category: string;
    tags: string;
    is_public: boolean;
  }) => {
    if (!file) {
      message.error('请选择文件');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('category', values.category);
    formData.append('tags', values.tags || '');
    formData.append('is_public', String(values.is_public ?? true));
    try {
      await createDataset(formData);
      message.success('数据集上传成功，等待审核');
      setUploadModal(false);
      form.resetFields();
      setFile(null);
      fetchDatasets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      message.error(error?.response?.data?.detail || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async (id: number, status: string) => {
    try {
      await reviewDataset(id, status);
      message.success(`数据集已${status === 'approved' ? '通过' : '拒绝'}`);
      fetchDatasets();
    } catch {
      message.error('审核操作失败');
    }
  };

  const filtered = datasets.filter((d) => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && d.category !== categoryFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const statusColor: Record<string, string> = {
    pending: 'warning', approved: 'success', rejected: 'error',
  };
  const statusText: Record<string, string> = {
    pending: '待审核', approved: '已通过', rejected: '已拒绝',
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColor[v]}>{statusText[v]}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (v: number) => formatSize(v),
    },
    {
      title: '公开',
      dataIndex: 'is_public',
      key: 'is_public',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '公开' : '私有'}</Tag>,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {(tags || []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Dataset) => (
        <Space>
          {isAdmin && record.status === 'pending' && (
            <>
              <Popconfirm
                title="确认通过该数据集？"
                onConfirm={() => handleReview(record.id, 'approved')}
                okText="确认"
                cancelText="取消"
              >
                <Button type="primary" size="small">通过</Button>
              </Popconfirm>
              <Popconfirm
                title="确认拒绝该数据集？"
                onConfirm={() => handleReview(record.id, 'rejected')}
                okText="确认"
                cancelText="取消"
              >
                <Button danger size="small">拒绝</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>数据中心</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadModal(true)}>
          上传数据集
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索数据集名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="筛选分类"
              allowClear
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {categoryOptions.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="approved">已通过</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="上传数据集"
        open={uploadModal}
        onCancel={() => { setUploadModal(false); form.resetFields(); setFile(null); }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item name="title" label="数据集名称" rules={[{ required: true }]}>
            <Input placeholder="请输入数据集名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="数据集描述" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select placeholder="选择分类">
              {categoryOptions.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tags" label="标签（逗号分隔）">
            <Input placeholder="tag1,tag2,tag3" />
          </Form.Item>
          <Form.Item name="is_public" label="公开" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="文件（CSV）" required>
            <Dragger
              accept=".csv"
              beforeUpload={(f) => { setFile(f); return false; }}
              maxCount={1}
              onRemove={() => setFile(null)}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽 CSV 文件到此处</p>
            </Dragger>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={uploading}>上传</Button>
              <Button onClick={() => { setUploadModal(false); form.resetFields(); setFile(null); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataCenter;
