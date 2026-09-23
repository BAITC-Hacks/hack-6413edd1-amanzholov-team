from dataclasses import dataclass
from uuid import UUID

from career_quest.modules.careers.domain.matching import Requirement, match
from career_quest.modules.careers.domain.models import (
    CareerTrack,
    CareerTransition,
    EmployeeCareerGoal,
    Grade,
    PromotionReview,
    RoleLevel,
    RoleSkillRequirement,
    Vacancy,
    VacancyRequirement,
)
from career_quest.modules.competencies.domain.models import EmployeeSkill
from career_quest.modules.identity.domain.models import User
from career_quest.modules.people.domain.models import CatalogState, Employee
from career_quest.shared.application.commands import audit, public
from career_quest.shared.application.ports import Store
from career_quest.shared.application.security import authorize
from career_quest.shared.domain.core import Json, require


@dataclass
class CareerContext:
    employee: Employee
    levels: dict[UUID, int]
    claims: dict[UUID, int]
    role: str
    grade: str
    audience_grade: str
    requirements: list[Requirement]
    target_id: UUID | None
    vacancy: Vacancy | None
    versions: dict[str, Json]
    reason: str


async def context(
    store: Store,
    employee_id: UUID,
    vacancy_id: UUID | None = None,
    target_id: UUID | None = None,
) -> CareerContext:
    employee = await store.get(Employee, employee_id)
    skills = await store.find(EmployeeSkill, employee_id=employee_id)
    current = await store.get(RoleLevel, employee.role_level_id)
    track = await store.get(CareerTrack, current.track_id)
    grade = await store.get(Grade, current.grade_id)
    goals = await store.find(EmployeeCareerGoal, employee_id=employee_id)
    reason = "explicit_goal"
    if target_id is None and vacancy_id is None:
        if goals:
            target_id, vacancy_id = goals[0].role_level_id, goals[0].vacancy_id
        else:
            transitions = await store.find(
                CareerTransition, from_level_id=current.id
            )
            if len(transitions) == 1:
                target_id = transitions[0].to_level_id
                reason = "configured_next_transition"
            else:
                reason = "choose_goal" if transitions else "no_next_level"
    vacancy = await store.get(Vacancy, vacancy_id) if vacancy_id else None
    requirements: list[Requirement] = []
    version = 0
    if vacancy:
        target_id = vacancy.role_level_id
        version = vacancy.version
        requirements = [
            Requirement(r.skill_id, r.required_level, r.critical)
            for r in await store.find(
                VacancyRequirement, vacancy_id=vacancy.id
            )
        ]
        if vacancy.status == "closed":
            reason = "vacancy_closed"
    elif target_id:
        target = await store.get(RoleLevel, target_id)
        version = target.version
        requirements = [
            Requirement(r.skill_id, r.required_level, r.critical)
            for r in await store.find(
                RoleSkillRequirement, role_level_id=target.id
            )
        ]
    states = await store.find(CatalogState)
    return CareerContext(
        employee,
        {s.skill_id: s.verified_level for s in skills},
        {s.skill_id: s.claimed_level for s in skills},
        track.name,
        grade.name,
        grade.audience_grade,
        requirements,
        target_id,
        vacancy,
        {
            "profile_version": employee.profile_version,
            "history_version": employee.history_version,
            "catalog_version": sum(s.catalog_version for s in states),
            "policy_version": sum(s.policy_version for s in states),
            "requirements_version": version,
            "target_id": str(target_id) if target_id else None,
            "vacancy_id": str(vacancy.id) if vacancy else None,
            "vacancy_status": vacancy.status if vacancy else None,
        },
        reason,
    )


def map_result(ctx: CareerContext) -> dict[str, Json]:
    result = match(ctx.levels, ctx.requirements)
    return {
        "official_role": ctx.role,
        "official_grade": ctx.grade,
        "target_role_level_id": str(ctx.target_id) if ctx.target_id else None,
        "coverage": round(result.coverage, 2)
        if result.coverage is not None
        else None,
        "ready_for_review": result.ready_for_review,
        "reason_code": ctx.reason
        if ctx.target_id is None or ctx.reason == "vacancy_closed"
        else result.reason_code,
        "goal_reason": ctx.reason,
        "gaps": [
            {
                "skill_id": str(s),
                "current_level": c,
                "required_level": r,
                "critical": critical,
            }
            for s, c, r, critical in result.gaps
        ],
        "unverified_skills": [
            {
                "skill_id": str(s),
                "claimed_level": n,
                "verified_level": ctx.levels.get(s, 0),
            }
            for s, n in ctx.claims.items()
            if n > ctx.levels.get(s, 0)
        ],
        "versions": ctx.versions,
        "administrative_conditions": ["authorized_promotion_decision"],
        "vacancy_status": ctx.vacancy.status if ctx.vacancy else None,
    }


async def set_goal(
    store: Store,
    actor: User,
    role_level_id: UUID | None,
    vacancy_id: UUID | None,
) -> dict[str, Json]:
    employee = await store.get(Employee, actor.employee_id, lock=True)
    require(
        (role_level_id is None) != (vacancy_id is None),
        "one_target_required",
        422,
    )
    if vacancy_id:
        vacancy = await store.get(Vacancy, vacancy_id)
        require(vacancy.status == "open", "vacancy_closed")
        role_level_id = vacancy.role_level_id
    assert role_level_id is not None
    await store.get(RoleLevel, role_level_id)
    existing = await store.find(EmployeeCareerGoal, employee_id=employee.id)
    goal = (
        existing[0]
        if existing
        else EmployeeCareerGoal(
            employee_id=employee.id, role_level_id=role_level_id
        )
    )
    goal.role_level_id, goal.vacancy_id = role_level_id, vacancy_id
    await store.save(goal)
    employee.profile_version += 1
    await store.save(employee)
    await audit(store, actor, "set_career_goal", goal)
    return public(goal)


async def request_promotion(
    store: Store, actor: User, role_level_id: UUID
) -> dict[str, Json]:
    employee = await store.get(Employee, actor.employee_id, lock=True)
    ctx = await context(store, employee.id, target_id=role_level_id)
    require(
        match(ctx.levels, ctx.requirements).ready_for_review,
        "requirements_not_met",
    )
    pending = await store.find(
        PromotionReview,
        employee_id=employee.id,
        role_level_id=role_level_id,
        status="submitted",
    )
    require(not pending, "promotion_already_pending")
    target = await store.get(RoleLevel, role_level_id)
    review = PromotionReview(
        employee_id=employee.id,
        role_level_id=role_level_id,
        profile_version=employee.profile_version,
        requirements_version=target.version,
    )
    await store.save(review)
    await audit(store, actor, "request_promotion", review)
    return public(review)


async def decide_promotion(
    store: Store, actor: User, review_id: UUID, approve: bool, rationale: str
) -> dict[str, Json]:
    initial = await store.get(PromotionReview, review_id)
    employee = await store.get(Employee, initial.employee_id, lock=True)
    review = await store.get(PromotionReview, review_id, lock=True)
    require(employee.id != actor.employee_id, "self_review", 403)
    await authorize(store, actor, employee, "promotion")
    require(review.status == "submitted", "already_decided")
    target = await store.get(RoleLevel, review.role_level_id)
    if approve:
        require(
            employee.profile_version == review.profile_version
            and target.version == review.requirements_version,
            "profile_version_conflict",
        )
        ctx = await context(store, employee.id, target_id=target.id)
        require(
            match(ctx.levels, ctx.requirements).ready_for_review,
            "requirements_not_met",
        )
        employee.role_level_id = target.id
        employee.profile_version += 1
        await store.save(employee)
    review.status = "approved" if approve else "rejected"
    review.decided_by, review.rationale = actor.id, rationale
    await store.save(review)
    await audit(store, actor, "decide_promotion", review)
    return public(review)
