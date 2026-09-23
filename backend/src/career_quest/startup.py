import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config

from career_quest.bootstrap import database_factory
from career_quest.demo import seed
from career_quest.infrastructure.settings import Settings


async def initialize() -> None:
    settings = Settings()
    if settings.demo_seed:
        if not settings.demo_password:
            raise ValueError("DEMO_PASSWORD is required when DEMO_SEED=true")
        engine, factory = database_factory(settings)
        try:
            await seed(
                factory,
                settings.demo_password.get_secret_value(),
                settings.business_date,
            )
        finally:
            await engine.dispose()


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    command.upgrade(Config(str(root / "alembic.ini")), "head")
    asyncio.run(initialize())
