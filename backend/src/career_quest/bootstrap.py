from dataclasses import dataclass

import httpx
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)

from career_quest.infrastructure.authentication.passwords import ArgonPasswords
from career_quest.infrastructure.database.uow import PostgresUnitOfWork
from career_quest.infrastructure.observability.rate_limit import RateLimiter
from career_quest.infrastructure.settings import Settings
from career_quest.modules.identity.application.auth import Authentication
from career_quest.modules.recommendations.application.recommend import (
    GenerateRecommendations,
)
from career_quest.modules.recommendations.infrastructure.llm import (
    HttpLlmGateway,
)
from career_quest.shared.application.ports import UowFactory
from career_quest.shared.domain.core import DatasetClock, SystemClock


@dataclass
class Runtime:
    settings: Settings
    factory: UowFactory
    auth: Authentication
    recommendations: GenerateRecommendations
    clock: DatasetClock
    limiter: RateLimiter


def database_factory(settings: Settings) -> tuple[AsyncEngine, UowFactory]:
    engine = create_async_engine(
        settings.database_url.get_secret_value(), pool_pre_ping=True
    )
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    return engine, lambda: PostgresUnitOfWork(sessions)


def build(
    settings: Settings, factory: UowFactory, client: httpx.AsyncClient
) -> Runtime:
    return Runtime(
        settings,
        factory,
        Authentication(
            factory,
            ArgonPasswords(),
            SystemClock(),
            settings.demo_auth,
            settings.token_hours,
        ),
        GenerateRecommendations(
            factory,
            HttpLlmGateway(client, settings),
            settings.llm_timeout_seconds,
        ),
        DatasetClock(settings.business_date),
        RateLimiter(),
    )
