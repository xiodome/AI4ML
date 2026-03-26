import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Card, Tag, Typography, Spin, message, Row, Col, Tabs, Button,
  Modal, Form, Input, Select, Alert, Badge, Divider, Space,
} from 'antd';
import {
  RobotOutlined, CheckCircleOutlined, LoadingOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, DownloadOutlined, SaveOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { getTask, getTaskCode, updateTaskCode, interveneTask, predictModel } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Task, AgentLog, ResultReport } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type AgentStatus = 'waiting' | 'running' | 'done' | 'error';

interface AgentState {
  name: string;
  label: string;
  status: AgentStatus;
}

const AGENTS: AgentState[] = [
  { name: 'ManagerAgent', label: '管理智能体', status: 'waiting' },
  { name: 'DataAgent', label: '数据智能体', status: 'waiting' },
  { name: 'ModelAgent', label: '模型智能体', status: 'waiting' },
  { name: 'OperationAgent', label: '运维智能体', status: 'waiting' },
];

const logColor: Record<string, string> = {
  info: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
};

const AgentCard: React.FC<{ agent: AgentState }> = ({ agent }) => {
  const statusIcon = {
    waiting: <ClockCircleOutlined style={{ color: '#d9d9d9' }} />,
    running: <LoadingOutlined style={{ color: '#1890ff' }} spin />,
    done: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    error: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
  }[agent.status];

  const statusColor = { waiting: 'default', running: 'processing', done: 'success', error: 'error' }[agent.status] as 'default' | 'processing' | 'success' | 'error';

  return (
    <Card size="small" style={{ textAlign: 'center', minWidth: 140 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>
        <RobotOutlined style={{ color: agent.status === 'running' ? '#1890ff' : '#8c8c8c' }} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 12 }}>{agent.label}</div>
      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 8 }}>{agent.name}</div>
      <Badge status={statusColor} text={statusIcon} />
    </Card>
  );
};

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const { isDeveloper, isAdmin } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agents, setAgents] = useState<AgentState[]>(AGENTS.map((a) => ({ ...a })));
  const [code, setCode] = useState('');
  const [editingCode, setEditingCode] = useState('');
  const [codeSaving, setCodeSaving] = useState(false);
  const [interveneModal, setInterveneModal] = useState(false);
  const [interveneForm] = Form.useForm();
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<unknown>(null);
  const [predictionForm] = Form.useForm();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      const res = await getTask(taskId);
      setTask(res.data);
      if (res.data.agent_logs?.length) {
        setLogs(res.data.agent_logs);
      }
    } catch {
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(`${WS_BASE}/api/tasks/ws/tasks/${taskId}/progress`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          const log: AgentLog = data.data;
          setLogs((prev) => [...prev, log]);
          setAgents((prev) =>
            prev.map((a) =>
              a.name === log.agent ? { ...a, status: 'running' } : a
            )
          );
        } else if (data.type === 'status') {
          fetchTask();
          if (data.data?.status === 'completed' || data.data?.status === 'failed') {
            setAgents((prev) =>
              prev.map((a) => ({
                ...a,
                status: data.data.status === 'completed' ? 'done' : 'error',
              }))
            );
            ws.close();
          }
        } else if (data.type === 'agent_done') {
          setAgents((prev) =>
            prev.map((a) =>
              a.name === data.agent ? { ...a, status: 'done' } : a
            )
          );
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(() => {
        if (task?.status === 'running') {
          connectWs();
        }
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [taskId, fetchTask, task?.status]);

  useEffect(() => {
    fetchTask();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [fetchTask]);

  useEffect(() => {
    if (task?.status === 'running') {
      connectWs();
    }
    if (task?.status === 'completed' || task?.status === 'failed') {
      wsRef.current?.close();
      loadCode();
    }
  }, [task?.status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const loadCode = async () => {
    try {
      const res = await getTaskCode(taskId);
      const c = res.data.code || '';
      setCode(c);
      setEditingCode(c);
    } catch {
      // no code yet
    }
  };

  const handleSaveCode = async () => {
    setCodeSaving(true);
    try {
      await updateTaskCode(taskId, editingCode);
      setCode(editingCode);
      message.success('代码已保存');
    } catch {
      message.error('保存代码失败');
    } finally {
      setCodeSaving(false);
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task_${taskId}_model.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleIntervene = async (values: { stage: string; action: string; parameters: string }) => {
    try {
      let params = {};
      if (values.parameters) {
        params = JSON.parse(values.parameters);
      }
      await interveneTask(taskId, { stage: values.stage, action: values.action, parameters: params });
      message.success('干预指令已发送');
      setInterveneModal(false);
      interveneForm.resetFields();
    } catch {
      message.error('干预失败');
    }
  };

  const handlePredict = async (values: Record<string, string>) => {
    const report = task?.result_report;
    if (!report?.model_id) {
      message.error('未找到模型ID');
      return;
    }
    setPredicting(true);
    try {
      const inputData: Record<string, unknown> = {};
      for (const key of Object.keys(values)) {
        const v = values[key];
        inputData[key] = isNaN(Number(v)) ? v : Number(v);
      }
      const res = await predictModel(report.model_id, inputData);
      setPredictionResult(res.data.prediction);
    } catch {
      message.error('预测失败');
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;
  }
  if (!task) return <Alert type="error" message="任务不存在" />;

  const report: ResultReport | null = task.result_report;
  const statusColor: Record<string, string> = {
    pending: 'default', running: 'processing', completed: 'success',
    failed: 'error', cancelled: 'warning',
  };
  const statusText: Record<string, string> = {
    pending: '待处理', running: '运行中', completed: '已完成',
    failed: '失败', cancelled: '已取消',
  };

  // Metrics chart data
  const metricsData = report?.metrics
    ? Object.entries(report.metrics).map(([k, v]) => ({ name: k, value: Number(v.toFixed(4)) }))
    : [];
  if (report?.accuracy) metricsData.push({ name: 'accuracy', value: Number(report.accuracy.toFixed(4)) });
  if (report?.rmse) metricsData.push({ name: 'RMSE', value: Number(report.rmse.toFixed(4)) });
  if (report?.r2) metricsData.push({ name: 'R²', value: Number(report.r2.toFixed(4)) });

  const featureData = report?.feature_importance
    ? Object.entries(report.feature_importance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([k, v]) => ({ name: k, value: Number(v.toFixed(4)) }))
    : [];

  const featureColumns = report?.feature_columns || [];

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>{task.title}</Title>
            <div style={{ marginTop: 8 }}>
              <Tag color={statusColor[task.status]}>{statusText[task.status]}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                创建于 {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
              </Text>
            </div>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              需求：{task.nl_requirement}
            </Paragraph>
          </div>
          <Space>
            {(isDeveloper || isAdmin) && task.status === 'running' && (
              <Button type="dashed" onClick={() => setInterveneModal(true)}>
                介入/干预
              </Button>
            )}
            <Button onClick={fetchTask}>刷新</Button>
          </Space>
        </div>
      </Card>

      {/* Agent Progress */}
      {(task.status === 'running' || task.status === 'pending') && (
        <Card title="智能体进度" style={{ marginBottom: 16 }}>
          {task.current_stage && (
            <Alert
              message={`当前阶段: ${task.current_stage}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {agents.map((agent) => (
              <Col key={agent.name} xs={12} sm={6}>
                <AgentCard agent={agent} />
              </Col>
            ))}
          </Row>
          <Divider>实时日志</Divider>
          <div
            style={{
              background: '#0d1117',
              borderRadius: 8,
              padding: 16,
              height: 300,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {logs.length === 0 ? (
              <Text style={{ color: '#8c8c8c' }}>等待日志输出...</Text>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <span style={{ color: '#8c8c8c' }}>[{dayjs(log.timestamp).format('HH:mm:ss')}]</span>{' '}
                  <span style={{ color: '#569cd6' }}>[{log.agent}]</span>{' '}
                  <span style={{ color: logColor[log.log_type] || '#fff' }}>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </Card>
      )}

      {/* Also show logs for completed/failed */}
      {(task.status === 'completed' || task.status === 'failed') && logs.length > 0 && (
        <Card title="运行日志" style={{ marginBottom: 16 }}>
          <div
            style={{
              background: '#0d1117',
              borderRadius: 8,
              padding: 16,
              height: 200,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#8c8c8c' }}>[{dayjs(log.timestamp).format('HH:mm:ss')}]</span>{' '}
                <span style={{ color: '#569cd6' }}>[{log.agent}]</span>{' '}
                <span style={{ color: logColor[log.log_type] || '#fff' }}>{log.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results */}
      {task.status === 'completed' && report && (
        <Card title="任务结果">
          <Tabs
            defaultActiveKey="report"
            items={[
              {
                key: 'report',
                label: '模型报告',
                children: (
                  <div>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      {report.model_type && (
                        <Col><Tag color="blue">模型类型: {report.model_type}</Tag></Col>
                      )}
                      {report.task_type && (
                        <Col><Tag color="purple">任务类型: {report.task_type}</Tag></Col>
                      )}
                    </Row>
                    <Row gutter={[16, 16]}>
                      {report.accuracy !== undefined && (
                        <Col xs={12} sm={8} lg={6}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>
                                {(report.accuracy * 100).toFixed(2)}%
                              </div>
                              <div style={{ color: '#8c8c8c' }}>准确率</div>
                            </div>
                          </Card>
                        </Col>
                      )}
                      {report.rmse !== undefined && (
                        <Col xs={12} sm={8} lg={6}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>
                                {report.rmse.toFixed(4)}
                              </div>
                              <div style={{ color: '#8c8c8c' }}>RMSE</div>
                            </div>
                          </Card>
                        </Col>
                      )}
                      {report.r2 !== undefined && (
                        <Col xs={12} sm={8} lg={6}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#722ed1' }}>
                                {report.r2.toFixed(4)}
                              </div>
                              <div style={{ color: '#8c8c8c' }}>R²</div>
                            </div>
                          </Card>
                        </Col>
                      )}
                      {report.f1 !== undefined && (
                        <Col xs={12} sm={8} lg={6}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>
                                {(report.f1 * 100).toFixed(2)}%
                              </div>
                              <div style={{ color: '#8c8c8c' }}>F1</div>
                            </div>
                          </Card>
                        </Col>
                      )}
                    </Row>
                    {metricsData.length > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <Title level={5}>性能指标</Title>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={metricsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#1890ff" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'features',
                label: '特征重要性',
                children: featureData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={featureData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#722ed1" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert message="暂无特征重要性数据" type="info" />
                ),
              },
              {
                key: 'code',
                label: '生成代码',
                children: (
                  <div>
                    <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                      {(isDeveloper || isAdmin) && (
                        <Button
                          icon={<SaveOutlined />}
                          onClick={handleSaveCode}
                          loading={codeSaving}
                        >
                          保存
                        </Button>
                      )}
                      <Button icon={<DownloadOutlined />} onClick={handleDownloadCode}>
                        下载
                      </Button>
                    </div>
                    {isDeveloper || isAdmin ? (
                      <TextArea
                        value={editingCode}
                        onChange={(e) => setEditingCode(e.target.value)}
                        rows={20}
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                      />
                    ) : (
                      <pre
                        style={{
                          background: '#0d1117',
                          color: '#e6edf3',
                          padding: 16,
                          borderRadius: 8,
                          fontSize: 12,
                          overflowX: 'auto',
                          maxHeight: 500,
                        }}
                      >
                        {code || '暂无代码'}
                      </pre>
                    )}
                  </div>
                ),
              },
              {
                key: 'predict',
                label: '在线预测',
                children: featureColumns.length > 0 && report.model_id ? (
                  <div style={{ maxWidth: 600 }}>
                    <Form form={predictionForm} layout="vertical" onFinish={handlePredict}>
                      {featureColumns.map((col) => (
                        <Form.Item
                          key={col}
                          name={col}
                          label={col}
                          rules={[{ required: true, message: `请输入 ${col}` }]}
                        >
                          <Input placeholder={`输入 ${col} 的值`} />
                        </Form.Item>
                      ))}
                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={predicting}>
                          预测
                        </Button>
                      </Form.Item>
                    </Form>
                    {predictionResult !== null && (
                      <Alert
                        message="预测结果"
                        description={
                          <Text strong style={{ fontSize: 18 }}>
                            {String(predictionResult)}
                          </Text>
                        }
                        type="success"
                        showIcon
                      />
                    )}
                  </div>
                ) : (
                  <Alert message="暂无预测功能（需要模型ID和特征列信息）" type="info" />
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Intervene Modal */}
      <Modal
        title="智能体干预"
        open={interveneModal}
        onCancel={() => setInterveneModal(false)}
        footer={null}
      >
        <Form form={interveneForm} layout="vertical" onFinish={handleIntervene}>
          <Form.Item name="stage" label="阶段" rules={[{ required: true }]}>
            <Select placeholder="选择干预阶段">
              <Select.Option value="data">数据处理阶段</Select.Option>
              <Select.Option value="feature_engineering">特征工程阶段</Select.Option>
              <Select.Option value="model_selection">模型选择阶段</Select.Option>
              <Select.Option value="training">模型训练阶段</Select.Option>
              <Select.Option value="evaluation">模型评估阶段</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="action" label="干预动作" rules={[{ required: true }]}>
            <Input placeholder="例如：change_model, adjust_params" />
          </Form.Item>
          <Form.Item name="parameters" label="参数 (JSON)">
            <TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交干预</Button>
              <Button onClick={() => setInterveneModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskDetail;
