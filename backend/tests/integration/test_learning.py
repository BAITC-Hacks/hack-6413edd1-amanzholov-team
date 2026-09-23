from dataclasses import replace
from datetime import date
from uuid import uuid4

import pytest

from career_quest.bootstrap import Runtime
from career_quest.demo import demo_id
from career_quest.infrastructure.database.uow import PostgresStore
from career_quest.modules.careers.application.career import context
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    SkillChange,
)
from career_quest.modules.identity.domain.models import User
from career_quest.modules.learning.application.activities import (
    confirm_completion,
    enroll,
    request_completion,
)
from career_quest.modules.learning.domain.models import (
    Activity,
    ActivityAudience,
    ActivityCompletion,
    ActivityPrerequisite,
    ActivitySession,
    ActivitySkillEffect,
    CompletionRequest,
    Enrollment,
)
from career_quest.modules.recommendations.application.recommend import (
    candidates,
)
from career_quest.shared.application.commands import execute
from career_quest.shared.domain.core import Entity

pytestmark = pytest.mark.postgres


async def test_critical_priority_and_all_exclusion_rules(
    runtime: Runtime,
) -> None:
    async with runtime.factory() as uow:
        store = uow.store
        original = await store.get(Activity, demo_id("activity"))
        original.mandatory = True
        await store.save(original)
        ids = {}
        for label in [
            "critical",
            "low_skill",
            "exhausted",
            "blocked",
            "past",
            "wrong_role",
        ]:
            activity = replace(
                original,
                id=uuid4(),
                external_id=label,
                mandatory=False,
                format="online" if label == "past" else "self_paced",
            )
            ids[label] = activity.id
            await store.save(activity)
            await store.save(
                ActivityAudience(
                    activity_id=activity.id,
                    role="Wrong"
                    if label == "wrong_role"
                    else "Demo Backend Engineer",
                    grade="Junior",
                )
            )
            await store.save(
                ActivitySkillEffect(
                    activity_id=activity.id,
                    skill_id=demo_id("DEMO_SQL")
                    if label == "low_skill"
                    else demo_id("DEMO_PYTHON"),
                    gain=1,
                    max_level=1 if label == "exhausted" else 5,
                )
            )
            if label == "blocked":
                await store.save(
                    ActivityPrerequisite(
                        activity_id=activity.id,
                        skill_id=demo_id("DEMO_SQL"),
                        required_level=5,
                    )
                )
            if label == "past":
                await store.save(
                    ActivitySession(
                        activity_id=activity.id, starts_on=date(2026, 1, 1)
                    )
                )
        ctx = await context(store, demo_id("employee:employee"))
        options, facts = await candidates(store, ctx, runtime.clock.today())
        assert [o.activity_id for o in options] == [
            ids["critical"],
            ids["low_skill"],
        ]
        assert options[0].coverage_gain < options[1].coverage_gain
        assert facts["history"]["available"] is False
        await store.save(
            Enrollment(
                employee_id=ctx.employee.id,
                activity_id=ids["critical"],
                participation_key="old-no-show",
                enrolled_on=date(2026, 1, 1),
                status="no_show",
            )
        )
        updated, facts = await candidates(store, ctx, runtime.clock.today())
        assert updated[0].history_penalty == 1
        assert facts["history"]["available"] is True


async def test_failure_rolls_back_completion_and_effects(
    runtime: Runtime, monkeypatch: pytest.MonkeyPatch
) -> None:
    async with runtime.factory() as uow:
        employee = await uow.store.get(User, demo_id("user:employee"))
        reviewer = await uow.store.get(User, demo_id("user:reviewer"))
        enrollment = await enroll(
            uow.store,
            employee,
            demo_id("activity"),
            None,
            runtime.clock.today(),
        )
        from uuid import UUID

        request = await request_completion(
            uow.store,
            employee,
            UUID(enrollment["id"]),
            "Synthetic evidence",
            runtime.clock.today(),
        )
        await uow.commit()
    original = PostgresStore.save

    async def fail_on_change(self: PostgresStore, entity: Entity) -> None:
        if isinstance(entity, SkillChange):
            raise RuntimeError("Injected transaction failure")
        await original(self, entity)

    monkeypatch.setattr(PostgresStore, "save", fail_on_change)
    with pytest.raises(RuntimeError, match="Injected"):
        await execute(
            runtime.factory,
            reviewer,
            "confirm",
            "injected",
            {},
            lambda store: confirm_completion(
                store, reviewer, UUID(request["id"]), runtime.clock.today()
            ),
        )
    async with runtime.factory() as uow:
        assert not await uow.store.find(ActivityCompletion)
        assert not await uow.store.find(SkillChange)
        assert (
            await uow.store.get(CompletionRequest, UUID(request["id"]))
        ).status == "submitted"
        assert all(
            s.verified_level == 1
            for s in await uow.store.find(
                EmployeeSkill, employee_id=employee.employee_id
            )
        )
