import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, users, datasets, ml_models, tasks, pipelines, admin

app = FastAPI(
    title="AI4ML Platform API",
    version="1.0.0",
    description="智算 AI4ML community platform backend",
)

# CORS – allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files as static assets
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(datasets.router)
app.include_router(ml_models.router)
app.include_router(tasks.router)
app.include_router(pipelines.router)
app.include_router(admin.router)


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "message": "AI4ML Platform API is running"}
