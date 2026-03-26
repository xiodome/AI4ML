import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskCreate from './pages/TaskCreate';
import TaskDetail from './pages/TaskDetail';
import DataCenter from './pages/DataCenter';
import ModelSquare from './pages/ModelSquare';
import Community from './pages/Community';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import './index.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/create" element={<TaskCreate />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="data-center" element={<DataCenter />} />
              <Route path="model-square" element={<ModelSquare />} />
              <Route path="community" element={<Community />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;

