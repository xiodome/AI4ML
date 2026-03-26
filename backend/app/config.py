from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "ai4ml-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = "sqlite:///./ai4ml.db"
    UPLOAD_DIR: str = "./uploads"
    DEFAULT_API_TOKEN_QUOTA: int = 1000
    TOKENS_PER_TASK: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
