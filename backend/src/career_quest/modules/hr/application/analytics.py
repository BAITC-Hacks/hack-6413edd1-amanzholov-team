from datetime import date
from uuid import UUID

from career_quest.modules.careers.application.career import context, map_result
from career_quest.modules.careers.domain.models import EmployeeCareerGoal
from career_quest.modules.competencies.domain.experience import experience_days
from career_quest.modules.competencies.domain.models import VerificationRequest
from career_quest.modules.identity.domain.models import PermissionGrant, User
from career_quest.modules.learning.domain.models import Enrollment
from career_quest.modules.people.domain.models import Employee
from career_quest.modules.recommendations.application.recommend import (
    candidates,
)
from career_quest.modules.recommendations.domain.models import (
    RecommendationRun,
)
from career_quest.shared.application.commands import public
from career_quest.shared.application.ports import Store
from career_quest.shared.domain.core import Json, require


async def scope(store: Store, actor: User) -> list[Employee]:
    grants = await store.find(
        PermissionGrant, user_id=actor.id, permission="hr"
    )
    departments = {g.department_id for g in grants}
    require(bool(departments), "forbidden", 403)
    return [
        e for e in await store.find(Employee) if e.department_id in departments
    ]


async def employee_view(
    store: Store, actor: User, employee_id: UUID
) -> dict[str, Json]:
    employees = await scope(store, actor)
    employee = next((e for e in employees if e.id == employee_id), None)
    require(employee is not None, "forbidden", 403)
    assert employee is not None
    experience = await store.find(
        VerificationRequest,
        employee_id=employee.id,
        kind="experience",
        status="approved",
    )
    return {
        "employee": public(employee),
        "career_map": map_result(await context(store, employee.id)),
        "verified_experience_days": experience_days(
            [
                (e.start_date, e.end_date)
                for e in experience
                if e.start_date is not None and e.end_date is not None
            ]
        ),
    }


async def report(
    store: Store,
    actor: User,
    kind: str,
    today: date,
    since: date | None = None,
) -> dict[str, Json]:
    employees = await scope(store, actor)
    employee_ids = {e.id for e in employees}
    result: dict[str, Json] = {
        "as_of_date": today.isoformat(),
        "since": since.isoformat() if since else None,
        "department_ids": [
            s for s in sorted({str(e.department_id) for e in employees})
        ],
        "employee_count": len(employees),
        "aggregation": "counts_by_goal_and_skill; no cross-goal averaging",
    }
    if kind in {"overview", "activity-participation"}:
        history = [
            h
            for h in await store.find(Enrollment)
            if h.employee_id in employee_ids
            and h.enrolled_on <= today
            and (since is None or h.enrolled_on >= since)
        ]
        result["participations"] = len(history)
        result["completed"] = sum(h.status == "completed" for h in history)
        result["aggregation_period"] = "enrollment_date"
        goals = await store.find(EmployeeCareerGoal)
        result["with_explicit_goal"] = len(
            [g for g in goals if g.employee_id in employee_ids]
        )
    elif kind == "skill-gaps":
        counts: dict[tuple[str, str, str], int] = {}
        for employee in employees:
            ctx = await context(store, employee.id)
            for requirement in ctx.requirements:
                if ctx.levels.get(requirement.skill_id, 0) < requirement.level:
                    key = (
                        str(ctx.target_id),
                        str(ctx.vacancy.id) if ctx.vacancy else "",
                        str(requirement.skill_id),
                    )
                    counts[key] = counts.get(key, 0) + 1
        result["items"] = [
            {
                "role_level_id": r,
                "vacancy_id": v or None,
                "skill_id": s,
                "employees_with_gap": n,
            }
            for (r, v, s), n in sorted(counts.items())
        ]
    elif kind == "employees-without-next-step":
        items: list[Json] = []
        all_goals = await store.find(EmployeeCareerGoal)
        all_runs = await store.find(RecommendationRun)
        for employee in employees:
            ctx = await context(store, employee.id)
            reason = ""
            if not any(g.employee_id == employee.id for g in all_goals):
                reason = "no_goal"
            elif not ctx.requirements:
                reason = "requirements_not_configured"
            else:
                eligible, _ = await candidates(store, ctx, today)
                if not eligible:
                    reason = "no_eligible_activity"
                else:
                    runs = [
                        r for r in all_runs if r.employee_id == employee.id
                    ]
                    if (
                        not runs
                        or max(runs, key=lambda r: r.created_at).versions
                        != ctx.versions
                    ):
                        reason = "stale_recommendation"
                    elif (
                        max(runs, key=lambda r: r.created_at).business_date
                        != today
                    ):
                        reason = "stale_recommendation"
            if reason:
                items.append(
                    {"employee_id": str(employee.id), "reason_code": reason}
                )
        result["items"] = items
    return result
