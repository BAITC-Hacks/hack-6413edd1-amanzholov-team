import asyncio
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from conftest import login, post

from career_quest.bootstrap import Runtime
from career_quest.demo import demo_id
from career_quest.modules.competencies.domain.models import SkillChange
from career_quest.modules.identity.domain.models import Session
from career_quest.modules.learning.domain.models import ActivityCompletion
from career_quest.shared.domain.audit import AuditEvent
from career_quest.shared.domain.core import SystemClock

pytestmark = pytest.mark.postgres


def claim_body() -> dict[str, object]:
    return {
        "skill_id": str(demo_id("DEMO_PYTHON")),
        "claimed_level": 3,
        "evidence": "Synthetic code review evidence",
    }


async def verified_claim(
    client: httpx.AsyncClient,
    employee: dict[str, str],
    admin: dict[str, str],
    reviewer: dict[str, str],
) -> str:
    claim = (
        await post(client, "/me/skill-claims", employee, claim_body())
    ).json()
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
            "decision": "approved",
            "observed_level": 2,
            "rubric": "Independent practical exercise",
            "rationale": "Observed working knowledge",
        },
    )
    return claim["id"]


async def test_complete_journey_and_ui_invariance(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    employee, admin, reviewer = [
        await login(client, name) for name in ["employee", "admin", "reviewer"]
    ]
    original = (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json()
    claim = (
        await post(client, "/me/skill-claims", employee, claim_body())
    ).json()
    after_claim = (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json()
    assert after_claim["coverage"] == original["coverage"]
    assert after_claim["unverified_skills"][0]["claimed_level"] == 3
    await post(
        client,
        f"/verification-requests/{claim['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:reviewer"))},
    )
    review_body = {
        "decision": "approved",
        "observed_level": 2,
        "rubric": "Practical assessment",
        "rationale": "Working knowledge",
    }
    review_path = f"/api/v1/verification-requests/{claim['id']}/reviews"
    first = await client.post(review_path, headers=reviewer, json=review_body)
    assert first.status_code == 200, first.text
    repeat = await client.post(review_path, headers=reviewer, json=review_body)
    assert repeat.json() == first.json()
    conflict = await client.post(
        review_path,
        headers=reviewer,
        json={**review_body, "observed_level": 3},
    )
    assert conflict.status_code == 409
    reviewed = (await client.get("/api/v1/me/skills", headers=employee)).json()
    python = next(
        s
        for s in reviewed["items"]
        if s["skill_id"] == str(demo_id("DEMO_PYTHON"))
    )
    assert python["verified_level"] == 2
    goal = await client.put(
        "/api/v1/me/career-goal",
        headers=employee,
        json={"vacancy_id": str(demo_id("vacancy"))},
    )
    assert goal.status_code == 200, goal.text
    recommendations = (await post(client, "/recommendations", employee)).json()
    assert recommendations["mode"] == "rule_based_fallback"
    assert recommendations["reason_code"] == "ai_disabled"
    assert len(recommendations["items"]) == 1
    item = recommendations["items"][0]
    event = item["activity_id"]
    assert item["explanation"]["critical_gap_reduction"] == 1
    simulation = (
        await post(client, "/simulations", employee, {"activity_ids": [event]})
    ).json()
    assert simulation["coverage_after"] == 100
    enrollment = (
        await post(client, f"/activities/{event}/enrollments", employee)
    ).json()
    completion_request = (
        await post(
            client,
            f"/enrollments/{enrollment['id']}/completion-requests",
            employee,
            {"evidence": "Synthetic assessed practical work"},
        )
    ).json()
    before_confirm = (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json()
    assert before_confirm["coverage"] < 100
    await post(
        client,
        f"/completion-requests/{completion_request['id']}/confirm",
        employee,
        expected=403,
    )
    confirms = await asyncio.gather(
        *[
            client.post(
                f"/api/v1/completion-requests/{completion_request['id']}/confirm",
                headers={**reviewer, "Idempotency-Key": str(uuid4())},
                json={},
            )
            for _ in range(2)
        ]
    )
    assert sorted(r.status_code for r in confirms) == [200, 409]
    final = (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json()
    assert final["coverage"] == 100
    assert final["ready_for_review"] is True
    assert final["official_grade"] == "Junior"
    assert (
        await client.get("/api/v1/recommendations/current", headers=employee)
    ).status_code == 409
    old_run = (
        await client.get(
            f"/api/v1/recommendations/{recommendations['id']}",
            headers=employee,
        )
    ).json()
    assert old_run["is_current"] is False
    preference = await client.patch(
        "/api/v1/me/preferences",
        headers=employee,
        json={"ui_mode": "rpg", "locale": "ru", "reduced_motion": True},
    )
    assert preference.status_code == 200
    assert (
        await client.get("/api/v1/me/career-map", headers=employee)
    ).json() == final
    empty = (await post(client, "/recommendations", employee)).json()
    assert empty["items"] == []
    actual = (await client.get("/api/v1/me/skills", headers=employee)).json()
    assert {
        s["skill_id"]: s["verified_level"] for s in actual["items"]
    } == simulation["after"]
    async with runtime.factory() as uow:
        assert len(await uow.store.find(ActivityCompletion)) == 1
        assert len(await uow.store.find(SkillChange)) == 3
        operations = {e.operation for e in await uow.store.find(AuditEvent)}
        assert {"review_claim", "confirm_completion"} <= operations


async def test_authorization_evidence_and_experience(
    client: httpx.AsyncClient,
) -> None:
    employee, reviewer, admin, outsider, hr = [
        await login(client, name)
        for name in ["employee", "reviewer", "admin", "outsider", "hr"]
    ]
    claim = (
        await post(client, "/me/skill-claims", employee, claim_body())
    ).json()
    path = f"/verification-requests/{claim['id']}/reviews"
    body = {
        "decision": "approved",
        "observed_level": 2,
        "rubric": "Practical assessment",
        "rationale": "Observed result",
    }
    for headers in [employee, reviewer, admin]:
        await post(client, path, headers, body, expected=403)
    assert (
        await client.get(
            f"/api/v1/verification-requests/{claim['id']}", headers=outsider
        )
    ).status_code == 403
    await post(
        client,
        f"/verification-requests/{claim['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:employee"))},
        expected=403,
    )
    await post(
        client,
        "/admin/vacancies",
        employee,
        {
            "title": "bad",
            "role_level_id": str(demo_id("role:Junior+")),
            "department_id": str(demo_id("department")),
            "requirements": [],
        },
        expected=403,
    )
    assert (
        await client.get("/api/v1/hr/overview", headers=employee)
    ).status_code == 403
    assert (
        await client.get(
            f"/api/v1/hr/employees/{demo_id('employee:outsider')}", headers=hr
        )
    ).status_code == 403
    overview = (await client.get("/api/v1/hr/overview", headers=hr)).json()
    assert overview["employee_count"] == 5
    before = (await client.get("/api/v1/me/skills", headers=employee)).json()
    exp = (
        await post(
            client,
            "/me/experience-claims",
            employee,
            {
                "project": "Synthetic migration",
                "start_date": "2026-01-01",
                "end_date": "2026-02-01",
                "role": "Developer",
                "contribution": "Built migration checks",
                "skill_ids": [str(demo_id("DEMO_SQL"))],
                "evidence": "Synthetic project report",
            },
        )
    ).json()
    await post(
        client,
        f"/verification-requests/{exp['id']}/assignment",
        admin,
        {"assignee_user_id": str(demo_id("user:reviewer"))},
    )
    await post(
        client,
        f"/verification-requests/{exp['id']}/reviews",
        reviewer,
        {
            "decision": "approved",
            "rubric": "Project records",
            "rationale": "Participation confirmed",
        },
    )
    assert (
        await client.get("/api/v1/me/skills", headers=employee)
    ).json() == before


async def test_logout_expiration_and_validation(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    assert (await client.get("/api/v1/me")).status_code == 401
    employee = await login(client)
    await post(
        client,
        "/me/skill-claims",
        employee,
        {**claim_body(), "claimed_level": True},
        expected=422,
    )
    await post(
        client,
        "/me/skill-claims",
        employee,
        {**claim_body(), "employee_id": str(uuid4())},
        expected=422,
    )
    await post(client, "/auth/logout", employee)
    assert (
        await client.get("/api/v1/me", headers=employee)
    ).status_code == 401
    employee = await login(client)
    async with runtime.factory() as uow:
        for session in await uow.store.find(Session):
            session.expires_at = SystemClock().now() - timedelta(seconds=1)
            await uow.store.save(session)
        await uow.commit()
    response = await client.get("/api/v1/me", headers=employee)
    assert response.status_code == 401
    assert set(response.json()) == {"code", "message", "details", "request_id"}
