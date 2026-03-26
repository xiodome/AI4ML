export type UserRole = 'admin' | 'developer' | 'domain_user';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  api_token_quota: number;
  api_token_used: number;
  is_active: boolean;
  created_at: string;
}

export interface Dataset {
  id: number;
  title: string;
  description: string;
  file_size: number;
  owner_id: number;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  owner_name?: string;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentLog {
  agent: string;
  message: string;
  log_type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  stage: string;
}

export interface HumanIntervention {
  stage: string;
  action: string;
  parameters: Record<string, unknown>;
  timestamp: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  nl_requirement: string;
  owner_id: number;
  dataset_id: number | null;
  status: TaskStatus;
  current_stage: string;
  agent_logs: AgentLog[];
  generated_code: string | null;
  result_report: ResultReport | null;
  human_interventions: HumanIntervention[];
  created_at: string;
}

export interface ResultReport {
  model_type?: string;
  task_type?: string;
  accuracy?: number;
  rmse?: number;
  r2?: number;
  f1?: number;
  precision?: number;
  recall?: number;
  metrics?: Record<string, number>;
  feature_importance?: Record<string, number>;
  feature_columns?: string[];
  target_column?: string;
  training_samples?: number;
  test_samples?: number;
  model_path?: string;
  model_id?: number;
}

export interface MLModel {
  id: number;
  title: string;
  description: string;
  task_id: number;
  owner_id: number;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  tags: string[];
  is_public: boolean;
  performance_metrics: Record<string, number>;
  feature_importance: Record<string, number>;
  created_at: string;
  owner_name?: string;
}

export interface Pipeline {
  id: number;
  title: string;
  description: string;
  owner_id: number;
  original_pipeline_id: number | null;
  workflow_config: Record<string, unknown>;
  fork_count: number;
  is_public: boolean;
  tags: string[];
  created_at: string;
  owner_name?: string;
}

export interface AdminStats {
  users: number;
  tasks: number;
  completed_tasks: number;
  datasets: number;
  models: number;
  pending_datasets: number;
  pending_models: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface PredictResponse {
  prediction: unknown;
  probability?: number;
  model_id?: number;
}
