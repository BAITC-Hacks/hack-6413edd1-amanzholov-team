from datetime import date
from urllib.parse import urlparse

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    environment: str = "development"
    database_url: SecretStr = SecretStr(
        "postgresql+asyncpg://career_quest:local@localhost:5432/career_quest"
    )
    demo_auth: bool = True
    demo_seed: bool = False
    demo_password: SecretStr | None = None
    business_date: date = date(2026, 10, 1)
    token_hours: int = 8
    cors_origins: list[str] = ["http://localhost:5173"]
    llm_endpoint: str | None = None
    llm_model: str = "local-model"
    llm_api_key: SecretStr | None = None
    allow_external_ai: bool = False
    llm_timeout_seconds: float = 3.0

    @model_validator(mode="after")
    def validate_security(self) -> "Settings":
        if self.environment not in {"development", "test", "production"}:
            raise ValueError("Unknown environment")
        if self.environment == "production" and (
            self.demo_auth or self.demo_seed
        ):
            raise ValueError(
                "Demo authentication/seed forbidden in production"
            )
        if not 0 < self.llm_timeout_seconds <= 5:
            raise ValueError("LLM timeout must be within (0, 5] seconds")
        if not 1 <= self.token_hours <= 24:
            raise ValueError("Token lifetime must be within 1..24 hours")
        if self.llm_endpoint:
            url = urlparse(self.llm_endpoint)
            local = url.hostname in {"localhost", "127.0.0.1", "::1"}
            if (
                url.scheme not in {"http", "https"}
                or url.username
                or url.password
            ):
                raise ValueError("Invalid AI endpoint")
            if not local and not self.allow_external_ai:
                raise ValueError("External AI requires explicit opt-in")
            if not local and url.scheme != "https":
                raise ValueError("External AI requires HTTPS")
        return self
