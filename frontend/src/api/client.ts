import axios from 'axios';
import type {
  User,
  Dataset,
  Task,
  MLModel,
  Pipeline,
  LoginResponse,
  AdminStats,
  PredictResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ai4ml_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/api/auth/login', { username, password });

export const register = (username: string, email: string, password: string) =>
  api.post<User>('/api/auth/register', { username, email, password });

export const getMe = () => api.get<User>('/api/auth/me');

// Users
export const listUsers = () => api.get<User[]>('/api/users/');
export const getUser = (id: number) => api.get<User>(`/api/users/${id}`);
export const updateUser = (id: number, data: Partial<User>) =>
  api.put<User>(`/api/users/${id}`, data);
export const updateQuota = (id: number, quota: number) =>
  api.put<User>(`/api/users/${id}/quota`, { quota });
export const deleteUser = (id: number) => api.delete(`/api/users/${id}`);

// Datasets
export const listDatasets = (params?: Record<string, unknown>) =>
  api.get<Dataset[]>('/api/datasets/', { params });
export const createDataset = (formData: FormData) =>
  api.post<Dataset>('/api/datasets/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getDataset = (id: number) => api.get<Dataset>(`/api/datasets/${id}`);
export const reviewDataset = (id: number, status: string, reason?: string) =>
  api.post(`/api/datasets/${id}/review`, { status, reason });
export const downloadDataset = (id: number) =>
  api.get(`/api/datasets/${id}/download`, { responseType: 'blob' });

// Tasks
export const listTasks = () => api.get<Task[]>('/api/tasks/');
export const createTask = (data: {
  title: string;
  description?: string;
  nl_requirement: string;
  dataset_id?: number;
}) => api.post<Task>('/api/tasks/', data);
export const getTask = (id: number) => api.get<Task>(`/api/tasks/${id}`);
export const getTaskLogs = (id: number) => api.get<{ logs: string }>(`/api/tasks/${id}/logs`);
export const getTaskCode = (id: number) => api.get<{ code: string }>(`/api/tasks/${id}/code`);
export const updateTaskCode = (id: number, code: string) =>
  api.put(`/api/tasks/${id}/code`, { code });
export const getTaskReport = (id: number) =>
  api.get<{ report: string }>(`/api/tasks/${id}/report`);
export const interveneTask = (
  id: number,
  data: { stage: string; action: string; parameters?: Record<string, unknown> }
) => api.post(`/api/tasks/${id}/intervene`, data);
export const cancelTask = (id: number) => api.post(`/api/tasks/${id}/cancel`);

// Models
export const listModels = (params?: Record<string, unknown>) =>
  api.get<MLModel[]>('/api/models/', { params });
export const getModel = (id: number) => api.get<MLModel>(`/api/models/${id}`);
export const reviewModel = (id: number, status: string, reason?: string) =>
  api.post(`/api/models/${id}/review`, { status, reason });
export const predictModel = (id: number, inputData: Record<string, unknown>) =>
  api.post<PredictResponse>(`/api/models/${id}/predict`, { input_data: inputData });

// Pipelines
export const listPipelines = () => api.get<Pipeline[]>('/api/pipelines/');
export const createPipeline = (data: Partial<Pipeline>) =>
  api.post<Pipeline>('/api/pipelines/', data);
export const getPipeline = (id: number) => api.get<Pipeline>(`/api/pipelines/${id}`);
export const updatePipeline = (id: number, data: Partial<Pipeline>) =>
  api.put<Pipeline>(`/api/pipelines/${id}`, data);
export const deletePipeline = (id: number) => api.delete(`/api/pipelines/${id}`);
export const forkPipeline = (id: number) => api.post<Pipeline>(`/api/pipelines/${id}/fork`);

// Admin
export const getStats = () => api.get<AdminStats>('/api/admin/stats');
export const getPendingDatasets = () => api.get<Dataset[]>('/api/admin/pending-datasets');
export const getPendingModels = () => api.get<MLModel[]>('/api/admin/pending-models');

export default api;
