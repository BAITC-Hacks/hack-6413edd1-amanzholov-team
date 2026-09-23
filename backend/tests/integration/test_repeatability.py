from datetime import timedelta
from uuid import UUID

import httpx
import pytest
from conftest import login, post

from career_quest.bootstrap import Runtime
from career_quest.demo import demo_id
from career_quest.modules.competencies.domain.models import EmployeeSkill
from career_quest.modules.learning.domain.models import (
    Activity,
    ActivityCompletion,
    ActivitySession,
)
from career_quest.shared.domain.core import DatasetClock

pytestmark = pytest.mark.postgres


async def test_repeatable_club_credits_each_participation_once(
    client: httpx.AsyncClient, runtime: Runtime
) -> None:
    today = runtime.clock.today()
    async with runtime.factory() as uow:
        activity = await uow.store.get(Activity, demo_id("activity"))
        activity.repeatable = True
        activity.format = "online"
        await uow.store.save(activity)
        sessions = [
            ActivitySession(
                activity_id=activity.id, starts_on=today + timedelta(days=i)
            )
            for i in [0, 1]
        ]
        for session in sessions:
            await uow.store.save(session)
        await uow.commit()
    employee, reviewer = [
        await login(client, name) for name in ["employee", "reviewer"]
    ]
    for session in sessions:
        runtime.clock = DatasetClock(session.starts_on)
        enrollment = (
            await post(
                client,
                f"/activities/{activity.id}/enrollments",
                employee,
                {"session_id": str(session.id)},
            )
        ).json()
        request = (
            await post(
                client,
                f"/enrollments/{enrollment['id']}/completion-requests",
                employee,
                {"evidence": "Synthetic club participation"},
            )
        ).json()
        await post(
            client, f"/completion-requests/{request['id']}/confirm", reviewer
        )
        await post(
            client,
            f"/completion-requests/{request['id']}/confirm",
            reviewer,
            expected=409,
        )
        await post(
            client,
            f"/activities/{activity.id}/enrollments",
            employee,
            {"session_id": str(session.id)},
            expected=409,
        )
    async with runtime.factory() as uow:
        completions = await uow.store.find(ActivityCompletion)
        assert len(completions) == 2
        assert len({c.enrollment_id for c in completions}) == 2
        skills = await uow.store.find(
            EmployeeSkill, employee_id=demo_id("employee:employee")
        )
        assert all(s.verified_level == 3 for s in skills)
        assert UUID(request["id"])
