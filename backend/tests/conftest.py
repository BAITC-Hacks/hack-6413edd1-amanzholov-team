import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from alembic import command
from alembic.config import Config
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.engine import make_url

from career_quest.bootstrap import Runtime, database_factory
from career_quest.demo import seed
from career_quest.infrastructure.database.models import Base
from career_quest.infrastructure.settings import Settings
from career_quest.main import create_app

PASSWORD = "synthetic-test-password-" + str(uuid4())
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
async def runtime(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[Runtime]:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip(
            "Set TEST_DATABASE_URL to a separate PostgreSQL *_test database"
        )
    assert make_url(url).database.endswith("_test"), (
        "Refusing non-test database"
    )
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config(str(ROOT / "alembic.ini"))
    await asyncio.to_thread(command.upgrade, config, "head")
    settings = Settings(
        environment="test",
        database_url=SecretStr(url),
        demo_auth=True,
        demo_seed=False,
    )
    engine, factory = database_factory(settings)
    async with engine.begin() as connection:
        tables = ", ".join(
            '"' + t.name + '"' for t in Base.metadata.sorted_tables
        )
        await connection.execute(text("TRUNCATE " + tables + " CASCADE"))
    await seed(factory, PASSWORD, settings.business_date)
    await engine.dispose()
    app = create_app(settings)
    async with app.router.lifespan_context(app):
        yield app.state.runtime


@pytest.fixture
async def client(runtime: Runtime) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(runtime.settings)
    async with app.router.lifespan_context(app):
        # A shared runtime lets tests replace the LLM port deterministically.
        app.state.runtime = runtime
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client


async def login(
    client: httpx.AsyncClient, user: str = "employee"
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login", json={"login": user, "password": PASSWORD}
    )
    assert response.status_code == 200, response.text
    return {
        "Authorization": "Bearer " + response.json()["access_token"],
        "Idempotency-Key": str(uuid4()),
    }


async def post(
    client: httpx.AsyncClient,
    path: str,
    headers: dict[str, str],
    body: object = None,
    expected: int = 200,
) -> httpx.Response:
    response = await client.post(
        "/api/v1" + path,
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json=body if body is not None else {},
    )
    assert response.status_code == expected, response.text
    return response
