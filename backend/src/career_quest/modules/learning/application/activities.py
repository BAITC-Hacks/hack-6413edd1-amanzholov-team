from dataclasses import dataclass
from datetime import date
from uuid import UUID

from career_quest.modules.careers.application.career import (
    CareerContext,
    context,
)
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    SkillChange,
)
from career_quest.modules.identity.domain.models import User
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
from career_quest.modules.learning.domain.progression import (
    Eligibility,
    apply_effect,
    eligibility,
)
from career_quest.modules.people.domain.models import Employee
from career_quest.shared.application.commands import audit, public
from career_quest.shared.application.ports import Store
from career_quest.shared.application.security import authorize, own
from career_quest.shared.domain.core import Json, SystemClock, require


@dataclass
class ActivityFacts:
    activity: Activity
    audiences: set[tuple[str, str]]
    prerequisites: dict[UUID, int]
    sessions: list[ActivitySession]
    effects: list[ActivitySkillEffect]

    def eligible(
        self,
        ctx: CareerContext,
        history: list[Enrollment],
        today: date,
        levels: dict[UUID, int] | None = None,
    ) -> Eligibility:
        used = {
            h.session_id
            for h in history
            if h.activity_id == self.activity.id
            and h.status in {"completed", "enrolled"}
        }
        return eligibility(
            role=ctx.role,
            grade=ctx.audience_grade,
            audiences=self.audiences,
            prerequisites=self.prerequisites,
            levels=ctx.levels if levels is None else levels,
            sessions=[s.starts_on for s in self.sessions if s.id not in used],
            today=today,
            self_paced=self.activity.format == "self_paced",
            completed=any(
                h.activity_id == self.activity.id and h.status == "completed"
                for h in history
            ),
            repeatable=self.activity.repeatable,
        )


async def catalog(store: Store) -> list[ActivityFacts]:
    activities = await store.find(Activity)
    audiences = await store.find(ActivityAudience)
    prerequisites = await store.find(ActivityPrerequisite)
    sessions = await store.find(ActivitySession)
    effects = await store.find(ActivitySkillEffect)
    return [
        ActivityFacts(
            a,
            {(r.role, r.grade) for r in audiences if r.activity_id == a.id},
            {
                r.skill_id: r.required_level
                for r in prerequisites
                if r.activity_id == a.id
            },
            [s for s in sessions if s.activity_id == a.id],
            [e for e in effects if e.activity_id == a.id],
        )
        for a in activities
    ]


def project(levels: dict[UUID, int], facts: ActivityFacts) -> dict[UUID, int]:
    result = levels.copy()
    if facts.activity.grants_verified:
        for effect in facts.effects:
            result[effect.skill_id] = apply_effect(
                result.get(effect.skill_id, 0), effect.gain, effect.max_level
            )
    return result


async def enroll(
    store: Store,
    actor: User,
    activity_id: UUID,
    session_id: UUID | None,
    today: date,
) -> dict[str, Json]:
    employee = await store.get(Employee, actor.employee_id, lock=True)
    ctx = await context(store, employee.id)
    facts = next(
        (a for a in await catalog(store) if a.activity.id == activity_id), None
    )
    require(facts is not None, "not_found", 404)
    assert facts is not None
    history = await store.find(Enrollment, employee_id=employee.id)
    available = facts.eligible(ctx, history, today)
    require(available.allowed, available.reason)
    if facts.activity.format != "self_paced":
        require(session_id is not None, "session_required", 422)
    if session_id:
        session = await store.get(ActivitySession, session_id)
        require(
            session.activity_id == activity_id and session.starts_on >= today,
            "invalid_session",
            422,
        )
    participation = str(session_id) if facts.activity.repeatable else "once"
    require(
        not facts.activity.repeatable or session_id is not None,
        "repeatable_session_required",
        422,
    )
    require(
        not any(
            h.activity_id == activity_id
            and h.participation_key == participation
            for h in history
        ),
        "already_enrolled",
    )
    enrollment = Enrollment(
        employee_id=employee.id,
        activity_id=activity_id,
        session_id=session_id,
        participation_key=participation,
        enrolled_on=today,
    )
    await store.save(enrollment)
    employee.history_version += 1
    await store.save(employee)
    await audit(store, actor, "enroll", enrollment)
    return public(enrollment)


async def request_completion(
    store: Store, actor: User, enrollment_id: UUID, evidence: str, today: date
) -> dict[str, Json]:
    enrollment = await store.get(Enrollment, enrollment_id, lock=True)
    own(actor, enrollment.employee_id)
    require(enrollment.status == "enrolled", "invalid_status")
    if enrollment.session_id:
        session = await store.get(ActivitySession, enrollment.session_id)
        require(session.starts_on <= today, "session_not_started")
    existing = await store.find(CompletionRequest, enrollment_id=enrollment_id)
    require(not existing, "completion_already_requested")
    request = CompletionRequest(enrollment_id=enrollment_id, evidence=evidence)
    await store.save(request)
    await audit(store, actor, "request_completion", request)
    return public(request)


async def confirm_completion(
    store: Store, actor: User, request_id: UUID, today: date
) -> dict[str, Json]:
    initial = await store.get(CompletionRequest, request_id)
    enrollment = await store.get(Enrollment, initial.enrollment_id)
    employee = await store.get(Employee, enrollment.employee_id, lock=True)
    require(employee.id != actor.employee_id, "self_review", 403)
    activity = await store.get(Activity, enrollment.activity_id)
    await authorize(store, actor, employee, "completion", activity.kind)
    request = await store.get(CompletionRequest, request_id, lock=True)
    require(request.status == "submitted", "already_completed")
    if enrollment.session_id:
        session = await store.get(ActivitySession, enrollment.session_id)
        require(session.starts_on <= today, "session_not_started")
    completion = ActivityCompletion(
        enrollment_id=enrollment.id,
        completed_at=SystemClock().now(),
        completion_time_source="confirmed",
        confirmed_by=actor.id,
    )
    await store.save(completion)
    if activity.grants_verified:
        effects = await store.find(
            ActivitySkillEffect, activity_id=activity.id
        )
        for effect in sorted(effects, key=lambda e: e.skill_id):
            skills = await store.find(
                EmployeeSkill,
                employee_id=employee.id,
                skill_id=effect.skill_id,
            )
            skill = (
                skills[0]
                if skills
                else EmployeeSkill(
                    employee_id=employee.id,
                    skill_id=effect.skill_id,
                    verified_level=0,
                )
            )
            before = skill.verified_level
            skill.verified_level = apply_effect(
                before, effect.gain, effect.max_level
            )
            skill.provenance, skill.assessed_on = "confirmed_activity", today
            await store.save(skill)
            await store.save(
                SkillChange(
                    employee_id=employee.id,
                    skill_id=skill.skill_id,
                    before_level=before,
                    after_level=skill.verified_level,
                    origin="completion",
                    origin_id=completion.id,
                    created_at=SystemClock().now(),
                )
            )
        employee.profile_version += 1
    employee.history_version += 1
    enrollment.status, request.status = "completed", "confirmed"
    await store.save(employee)
    await store.save(enrollment)
    await store.save(request)
    await audit(store, actor, "confirm_completion", completion)
    return public(completion)
