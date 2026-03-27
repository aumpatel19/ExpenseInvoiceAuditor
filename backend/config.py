from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    # MongoDB
    mongo_uri: str = Field(default="mongodb://localhost:27017", alias="MONGO_URI")
    db_name: str = Field(default="expense_auditor", alias="DB_NAME")

    # OCR
    ocr_provider: str = Field(default="tesseract", alias="OCR_PROVIDER")

    # LLM
    llm_enabled: bool = Field(default=False, alias="LLM_ENABLED")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")

    # Upload
    max_upload_mb: int = Field(default=20, alias="MAX_UPLOAD_MB")

    # Policy defaults
    policy_amount_threshold: float = Field(default=1000.0, alias="POLICY_AMOUNT_THRESHOLD")
    policy_allowed_currencies: str = Field(default="USD,EUR,GBP,INR", alias="POLICY_ALLOWED_CURRENCIES")
    policy_allow_weekend_expenses: bool = Field(default=False, alias="POLICY_ALLOW_WEEKEND_EXPENSES")

    # Auth
    jwt_secret: str = Field(default="dev-only-secret-replace-in-production-32x", alias="JWT_SECRET")
    jwt_expire_hours: int = Field(default=24, alias="JWT_EXPIRE_HOURS")

    # CORS — comma-separated list of allowed origins
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    # App
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_currencies_list(self) -> List[str]:
        return [c.strip() for c in self.policy_allowed_currencies.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    model_config = {"env_file": ".env", "populate_by_name": True}


settings = Settings()
