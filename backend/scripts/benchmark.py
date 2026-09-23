"""Measure authenticated API against an explicitly isolated test database."""

import asyncio
import os
import secrets
import statistics
from pathlib import Path
from time import perf_counter

import httpx
from pydantic import SecretStr
from sqlalchemy.engine import make_url

from career_quest.bootstrap import database_factory
from career_quest.infrastructure.authentication.passwords import ArgonPasswords
from career_quest.infrastructure.settings import Settings
from career_quest.main import create_app
from career_quest.modules.data_import.application.importer import ImportDataset
from career_quest.modules.data_import.infrastructure.parser import read_directory
from career_quest.modules.identity.domain.models import User
from career_quest.modules.people.domain.models import Employee

ROOT = Path(__file__).resolve().parents[1]


async def run() -> str:
    url = os.environ["TEST_DATABASE_URL"]
    if not (make_url(url).database or "").endswith("_test"):
        raise ValueError("Benchmark requires an isolated *_test database")
    settings = Settings(environment="test", database_url=SecretStr(url))
    engine, factory = database_factory(settings)
    password = secrets.token_urlsafe(32)
    package = await asyncio.to_thread(
        read_directory, ROOT.parent / "frontend/public/data"
    )
    await ImportDataset(factory).execute(package, "canonical", None)
    async with factory() as uow:
        employees = await uow.store.find(Employee, source="canonical")
        if len(employees) < 200:
            raise ValueError("Import the full canonical dataset first")
        selected = min(employees, key=lambda e: e.external_id)
        users = await uow.store.find(User, employee_id=selected.id)
        if users:
            user = users[0]
            user.password_hash = ArgonPasswords().hash(password)
        else:
            user = User(login="local-benchmark", employee_id=selected.id,
                        password_hash=ArgonPasswords().hash(password))
        await uow.store.save(user)
        await uow.commit()
    await engine.dispose()
    app = create_app(settings)
    lines = ["# Local API benchmark", "",
             "Windows, Python 3.13.8, PostgreSQL 18, loopback; one worker, "
             "httpx ASGI transport; LLM disabled. Full canonical dataset "
             "(200 employees, 60 skills, 40 events, 2743 history records) "
             "plus synthetic demo. Imported employee used for calculations.", "",
             "10 sequential samples after one warm-up per route. "
             "Includes auth and SQL; excludes network transport and startup. "
             "This is a local measurement, not an SLA.", "",
             "| Route | Median ms | Max ms |", "|---|---:|---:|"]
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://benchmark") as client:
            response = await client.post("/api/v1/auth/login", json={
                "login": user.login, "password": password})
            response.raise_for_status()
            headers = {"Authorization": "Bearer " + response.json()["access_token"]}
            for method, path in [("GET", "/me"), ("GET", "/me/career-map"),
                                 ("GET", "/activities"), ("POST", "/recommendations")]:
                samples = []
                for index in range(11):
                    start = perf_counter()
                    response = await client.request(method, "/api/v1" + path,
                        headers=headers, json={} if method == "POST" else None)
                    response.raise_for_status()
                    duration = (perf_counter() - start) * 1000
                    if index:
                        samples.append(duration)
                lines.append(f"| {method} {path} | {statistics.median(samples):.2f} "
                             f"| {max(samples):.2f} |")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    result = asyncio.run(run())
    (ROOT / "docs/benchmark-results.md").write_text(result, encoding="utf-8")
    print(result)
