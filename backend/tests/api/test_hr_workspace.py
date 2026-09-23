from datetime import timedelta
from pathlib import Path

import httpx
import pytest
from conftest import login

from career_quest.bootstrap import Runtime
from career_quest.demo import demo_id
from career_quest.hr_demo import initialize_hr
from career_quest.modules.careers.domain.models import Vacancy
from career_quest.modules.learning.domain.models import Enrollment

pytestmark = pytest.mark.postgres
DATA_PATH = Path(__file__).resolve().parents[3] / "frontend/public/data"


async def test_workspace_auth_scope_and_history(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    path = "/api/v1/hr/workspace"
    assert (await client.get(path)).status_code == 401
    employee = await login(client)
    assert (await client.get(path, headers=employee)).status_code == 403
    today = runtime.clock.today()
    async with runtime.factory() as uow:
        for user, when in [
            ("employee", today),
            ("outsider", today),
            ("employee", today + timedelta(days=1)),
        ]:
            await uow.store.save(
                Enrollment(
                    employee_id=demo_id("employee:" + user),
                    activity_id=demo_id("activity"),
                    participation_key=f"{user}:{when}",
                    enrolled_on=when,
                )
            )
        await uow.commit()
    hr = await login(client, "hr")
    response = await client.get(path, headers=hr)
    assert response.status_code == 200
    data = response.json()
    assert len(data["employees"]) == 5
    ids = {e["employee_id"] for e in data["employees"]}
    assert str(demo_id("employee:outsider")) not in ids
    assert len(data["activities"]) == 1
    assert data["activities"][0]["employee_id"] in ids
    assert data["activities"][0]["completion_pct"] is None
    person = next(
        e for e in data["employees"] if e["external_id"] == "DEMO_employee"
    )
    assert person["target_profile"]["grade"] == "Junior+"
    assert person["vacancy_status"] == "open"
    assert (
        person["target_profile"]["required_skills"][
            str(demo_id("DEMO_PYTHON"))
        ]
        == 3
    )
    assert person["skills"][str(demo_id("DEMO_PYTHON"))] == 1
    assert "password_hash" not in response.text
    async with runtime.factory() as uow:
        vacancy = await uow.store.get(Vacancy, demo_id("vacancy"))
        vacancy.status = "closed"
        await uow.store.save(vacancy)
        await uow.commit()
    closed = (await client.get(path, headers=hr)).json()
    assert (
        next(
            e
            for e in closed["employees"]
            if e["external_id"] == "DEMO_employee"
        )["vacancy_status"]
        == "closed"
    )
    await client.post("/api/v1/auth/logout", headers=hr, json={})
    assert (await client.get(path, headers=hr)).status_code == 401


async def test_canonical_hr_bootstrap_is_repeatable(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    await initialize_hr(runtime.factory, DATA_PATH)
    hr = await login(client, "hr")
    first = (await client.get("/api/v1/hr/workspace", headers=hr)).json()
    await initialize_hr(runtime.factory, DATA_PATH)
    second = (await client.get("/api/v1/hr/workspace", headers=hr)).json()
    assert first == second
    assert len(first["employees"]) > 5
    assert all(e["external_id"] != "DEMO_outsider" for e in first["employees"])
    assert first["activities"]
    employees = {e["employee_id"] for e in first["employees"]}
    events = {e["event_id"] for e in first["events"]}
    assert all(
        h["employee_id"] in employees and h["event_id"] in events
        for h in first["activities"]
    )
