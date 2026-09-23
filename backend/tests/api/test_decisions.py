from uuid import uuid4

import httpx
import pytest
from conftest import login, post

from career_quest.bootstrap import Runtime
from career_quest.demo import demo_id
from career_quest.modules.people.domain.models import Employee
from career_quest.shared.domain.core import Json

pytestmark = pytest.mark.postgres


async def test_draft_appeal_and_profile_version_conflict(
    client: httpx.AsyncClient,
) -> None:
    employee, admin, reviewer, second = [
        await login(client, name)
        for name in ["employee", "admin", "reviewer", "reviewer2"]
    ]
    claim = (
        await post(
            client,
            "/me/skill-claims",
            employee,
            {
                "skill_id": str(demo_id("DEMO_PYTHON")),
                "claimed_level": 3,
                "evidence": "Synthetic evidence",
                "draft": True,
            },
        )
    ).json()
    assert claim["status"] == "draft"
    await post(
        client,
        f"/verification-requests/{claim['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:reviewer"))},
        expected=409,
    )
    await post(
        client, f"/verification-requests/{claim['id']}/submit", employee
    )
    await post(
        client,
        f"/verification-requests/{claim['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:reviewer"))},
    )
    await post(
        client,
        f"/verification-requests/{claim['id']}/reviews",
        reviewer,
        {
            "decision": "needs_changes",
            "rubric": "Practical work",
            "rationale": "Provide another sample",
        },
    )
    appeal = (
        await post(
            client,
            f"/verification-requests/{claim['id']}/appeals",
            employee,
            {"evidence": "Additional independent sample", "claimed_level": 2},
        )
    ).json()
    assert appeal["version"] == 2
    assert appeal["previous_id"] == claim["id"]
    await post(
        client,
        f"/verification-requests/{appeal['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:reviewer"))},
        expected=403,
    )
    await post(
        client,
        f"/verification-requests/{appeal['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:reviewer2"))},
    )
    await post(
        client,
        "/me/skill-claims",
        employee,
        {
            "skill_id": str(demo_id("DEMO_SQL")),
            "claimed_level": 2,
            "evidence": "Concurrent profile change",
        },
    )
    failed = await post(
        client,
        f"/verification-requests/{appeal['id']}/reviews",
        second,
        {
            "decision": "approved",
            "observed_level": 2,
            "rubric": "Practical work",
            "rationale": "Observed independent work",
        },
        expected=409,
    )
    assert failed.json()["code"] == "profile_version_conflict"
    old = (
        await client.get(
            f"/api/v1/verification-requests/{claim['id']}", headers=employee
        )
    ).json()
    assert old["status"] == "needs_changes"
    assert len(old["reviews"]) == 1


async def test_closed_vacancy_and_saved_run_access(
    client: httpx.AsyncClient,
) -> None:
    employee, admin, outsider = [
        await login(client, name) for name in ["employee", "admin", "outsider"]
    ]
    run = (await post(client, "/recommendations", employee)).json()
    denied = await client.get(
        f"/api/v1/recommendations/{run['id']}", headers=outsider
    )
    assert denied.status_code == 403
    closed = await client.patch(
        f"/api/v1/admin/vacancies/{demo_id('vacancy')}",
        headers=admin,
        json={"status": "closed"},
    )
    assert closed.status_code == 200
    assert (
        await client.get("/api/v1/recommendations/current", headers=employee)
    ).status_code == 409
    result = (await post(client, "/recommendations", employee)).json()
    assert result["items"] == []
    assert result["reason_code"] == "vacancy_closed"
    career_map = (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json()
    assert career_map["target_role_level_id"] is not None
    assert career_map["vacancy_status"] == "closed"


async def test_promotion_requires_separate_hr_decision(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    from career_quest.modules.competencies.domain.models import EmployeeSkill

    employee, hr, admin = [
        await login(client, name) for name in ["employee", "hr", "admin"]
    ]
    await post(
        client,
        "/promotion-reviews",
        employee,
        {"role_level_id": str(demo_id("role:Junior+"))},
        expected=409,
    )
    # Arrange an already independently assessed profile, then test decisions.
    async with runtime.factory() as uow:
        for skill in await uow.store.find(
            EmployeeSkill, employee_id=demo_id("employee:employee")
        ):
            skill.verified_level = 3
            await uow.store.save(skill)
        await uow.commit()
    promotion = (
        await post(
            client,
            "/promotion-reviews",
            employee,
            {"role_level_id": str(demo_id("role:Junior+"))},
        )
    ).json()
    for denied in [employee, admin]:
        await post(
            client,
            f"/promotion-reviews/{promotion['id']}/decision",
            denied,
            {"approve": True, "rationale": "Synthetic approval"},
            expected=403,
        )
    approved = await post(
        client,
        f"/promotion-reviews/{promotion['id']}/decision",
        hr,
        {"approve": True, "rationale": "Synthetic authorized approval"},
    )
    assert approved.json()["status"] == "approved"
    current = (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json()
    assert current["official_grade"] == "Junior+"
    await post(
        client,
        f"/promotion-reviews/{promotion['id']}/decision",
        hr,
        {"approve": True, "rationale": "Another attempt"},
        expected=409,
    )


async def test_changes_during_ai_call_are_rejected(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    class MutatingGateway:
        async def rank(self, facts: dict[str, Json]) -> dict[str, Json]:
            async with runtime.factory() as uow:
                employee = await uow.store.get(
                    Employee, demo_id("employee:employee"), lock=True
                )
                employee.profile_version += 1
                await uow.store.save(employee)
                await uow.commit()
            return {"disabled": True}

    runtime.recommendations.gateway = MutatingGateway()
    employee = await login(client)
    result = await post(client, "/recommendations", employee, expected=409)
    assert result.json()["code"] == "stale_recommendation"


async def test_admin_import_and_error_locale(
    client: httpx.AsyncClient,
) -> None:
    employee = await login(client)
    denied = await client.get(
        f"/api/v1/admin/imports/{uuid4()}", headers=employee
    )
    assert denied.status_code == 403
    response = await client.get(
        "/api/v1/me", headers={"Accept-Language": "kk"}
    )
    assert response.json()["message"] == "Жүйеге кіріңіз"
    ready = await client.get("/health/ready")
    assert ready.json() == {"status": "ready"}
    openapi = (await client.get("/openapi.json")).json()
    assert "/api/v1/recommendations/current" in openapi["paths"]
    assert (
        await client.get("/api/v1/me/skills?limit=1000", headers=employee)
    ).status_code == 422
