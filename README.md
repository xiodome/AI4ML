# 智算 AI4ML

**基于多智能体协作的 AI 低代码/零代码开发社区**

## 项目简介

"智算"平台是一个基于多智能体协作（Multi-Agent）的 AI4ML 低代码/零代码开发社区。用户仅需通过自然语言描述任务需求并上传原始数据，平台内的"智能体开发团队"即可自动完成数据预处理、模型搜索、训练以及部署的端到端工作。

## 功能特性

### 用户角色
- **管理员 (admin)**：管理用户权限、API Token 额度、审核数据集和模型
- **AI 开发者 (developer)**：使用人机协同功能、修改生成代码、分享工作流
- **业务领域用户 (domain_user)**：通过自然语言描述任务、上传数据集、查看分析报告

### 核心功能
1. **自然语言任务创建**：输入需求描述，上传 CSV 数据集，一键启动 AI 开发流程
2. **多智能体工作流可视化**：实时查看 ManagerAgent、DataAgent、ModelAgent、OperationAgent 的工作进度
3. **数据中心**：上传、管理、分享数据集（支持表格回归/分类、图像分类、时间序列等）
4. **模型广场**：浏览社区共享的 AI 预测模型，查看性能指标和特征重要性
5. **在线预测 Demo**：训练完成后直接在网页上测试模型
6. **人机协同（Human-in-the-loop）**：开发者可在多阶段验证中介入，修改智能体规划
7. **代码查看与下载**：查看、编辑并下载生成的完整 Python 源代码
8. **社区 Pipeline**：分享和 Fork 优质工作流模板

## 技术栈

- **后端**：Python FastAPI + SQLite（SQLAlchemy）+ WebSocket
- **前端**：React + TypeScript + Ant Design + Recharts
- **机器学习**：scikit-learn + XGBoost + pandas
- **认证**：JWT（python-jose + passlib）

## 快速启动

### 后端

```bash
cd backend
pip install -r requirements.txt
python init_db.py           # 初始化数据库，创建默认管理员账号
uvicorn app.main:app --reload --port 8000
```

默认管理员账号：`admin` / `Admin123!`

API 文档：http://localhost:8000/docs

### 前端

```bash
cd frontend
npm install
npm run dev                  # 启动开发服务器（http://localhost:5173）
```

## 项目结构

```
AI4ML/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── config.py        # 配置项
│   │   ├── database.py      # 数据库连接
│   │   ├── dependencies.py  # 依赖注入（JWT 验证）
│   │   ├── models/          # SQLAlchemy 数据模型
│   │   ├── schemas/         # Pydantic 请求/响应模型
│   │   ├── routers/         # API 路由（auth/users/datasets/tasks/models/pipelines/admin）
│   │   └── agents/          # 多智能体系统（Manager/Data/Model/Operation）
│   ├── uploads/             # 用户上传的数据集文件
│   ├── init_db.py           # 数据库初始化脚本
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/             # Axios API 客户端
    │   ├── contexts/        # React Context（Auth）
    │   ├── components/      # 公共组件（Layout、ProtectedRoute）
    │   ├── pages/           # 页面组件
    │   │   ├── Login / Register
    │   │   ├── Dashboard
    │   │   ├── Tasks / TaskCreate / TaskDetail
    │   │   ├── DataCenter
    │   │   ├── ModelSquare
    │   │   ├── Community
    │   │   ├── AdminPanel
    │   │   └── Profile
    │   └── types/           # TypeScript 类型定义
    └── package.json
```

