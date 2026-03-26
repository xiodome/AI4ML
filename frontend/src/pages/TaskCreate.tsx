import React, { useState, useEffect } from 'react';
import {
  Steps, Form, Input, Button, Card, Select, Upload, Typography,
  message, Divider, Row, Col, Tag, Space,
} from 'antd';
import { InboxOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listDatasets, createTask } from '../api/client';
import type { Dataset } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const TaskCreate: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [formValues, setFormValues] = useState<{
    title: string;
    nl_requirement: string;
    dataset_id?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listDatasets().then((res) => setDatasets(res.data)).catch(() => {});
  }, []);

  const onStep1Finish = (values: { title: string; nl_requirement: string; dataset_id?: number }) => {
    setFormValues(values);
    setCurrent(1);
  };

  const onConfirm = async () => {
    if (!formValues) return;
    setLoading(true);
    try {
      const res = await createTask({
        title: formValues.title,
        nl_requirement: formValues.nl_requirement,
        dataset_id: formValues.dataset_id,
      });
      message.success('任务创建成功！');
      navigate(`/tasks/${res.data.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      message.error(error?.response?.data?.detail || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedDataset = datasets.find((d) => d.id === formValues?.dataset_id);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>创建新任务</Title>
      <Steps
        current={current}
        items={[{ title: '描述任务' }, { title: '确认提交' }]}
        style={{ marginBottom: 32 }}
      />

      {current === 0 && (
        <Card>
          <Form form={form} layout="vertical" onFinish={onStep1Finish} size="large">
            <Form.Item
              name="title"
              label="任务标题"
              rules={[{ required: true, message: '请输入任务标题' }]}
            >
              <Input placeholder="例如：农作物产量预测模型" />
            </Form.Item>

            <Form.Item
              name="nl_requirement"
              label="自然语言需求描述"
              rules={[{ required: true, message: '请描述您的需求' }]}
            >
              <TextArea
                rows={6}
                placeholder="例如：请帮我用这份土壤数据集建立一个预测农作物产量的模型，要求准确率尽量高"
              />
            </Form.Item>

            <Form.Item name="dataset_id" label="选择数据集（可选）">
              <Select
                placeholder="选择已有数据集"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {datasets
                  .filter((d) => d.status === 'approved')
                  .map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.title} ({d.category})
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item label="或上传新数据集（CSV）">
              <Dragger
                accept=".csv"
                beforeUpload={() => false}
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽 CSV 文件到此处</p>
                <p className="ant-upload-hint">支持单个 CSV 文件，文件将在任务确认后上传</p>
              </Dragger>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large">
                下一步
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {current === 1 && formValues && (
        <Card>
          <Title level={4}>确认任务信息</Title>

          <Row gutter={[0, 16]}>
            <Col span={24}>
              <Text type="secondary">任务标题</Text>
              <Paragraph strong style={{ marginTop: 4 }}>{formValues.title}</Paragraph>
            </Col>
            <Col span={24}>
              <Text type="secondary">需求描述</Text>
              <Paragraph style={{ marginTop: 4, background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
                {formValues.nl_requirement}
              </Paragraph>
            </Col>
            {selectedDataset && (
              <Col span={24}>
                <Text type="secondary">选择的数据集</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">{selectedDataset.title}</Tag>
                  <Tag>{selectedDataset.category}</Tag>
                </div>
              </Col>
            )}
          </Row>

          <Divider />

          <Card
            style={{ background: '#fffbe6', border: '1px solid #ffe58f', marginBottom: 24 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThunderboltOutlined style={{ color: '#faad14', fontSize: 18 }} />
              <div>
                <Text strong>本次任务将消耗 </Text>
                <Text strong style={{ color: '#faad14', fontSize: 18 }}>100</Text>
                <Text strong> 个 API Token</Text>
              </div>
            </div>
          </Card>

          <Space>
            <Button onClick={() => setCurrent(0)}>上一步</Button>
            <Button type="primary" size="large" onClick={onConfirm} loading={loading}>
              确认创建任务
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default TaskCreate;
