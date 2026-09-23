"""Read-only projection for HR, restricted by department grants."""

from datetime import date

from career_quest.modules.careers.domain.models import (
    CareerTrack,
    CareerTransition,
    EmployeeCareerGoal,
    Grade,
    RoleLevel,
    RoleSkillRequirement,
    Vacancy,
    VacancyRequirement,
)
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    Skill,
)
from career_quest.modules.hr.application.analytics import scope
from career_quest.modules.identity.domain.models import User
from career_quest.modules.learning.domain.models import (
    Activity,
    ActivityAudience,
    ActivityPrerequisite,
    ActivitySession,
    ActivitySkillEffect,
    Enrollment,
)
from career_quest.modules.people.domain.models import Department
from career_quest.shared.application.commands import json_value
from career_quest.shared.application.ports import Store
from career_quest.shared.domain.core import Json


async def workspace(store: Store, actor: User, today: date) -> dict[str, Json]:
    employees = sorted(await scope(store, actor), key=lambda e: str(e.id))
    employee_ids = {e.id for e in employees}
    departments = {d.id: d for d in await store.find(Department)}
    tracks = {t.id: t for t in await store.find(CareerTrack)}
    grades = {g.id: g for g in await store.find(Grade)}
    roles = {r.id: r for r in await store.find(RoleLevel)}
    skills = await store.find(Skill)
    assessments = await store.find(EmployeeSkill)
    goals = {g.employee_id: g for g in await store.find(EmployeeCareerGoal)}
    transitions = await store.find(CareerTransition)
    requirements = await store.find(RoleSkillRequirement)
    vacancies = {v.id: v for v in await store.find(Vacancy)}
    vacancy_requirements = await store.find(VacancyRequirement)
    activities = await store.find(Activity)
    audiences = await store.find(ActivityAudience)
    prerequisites = await store.find(ActivityPrerequisite)
    sessions = await store.find(ActivitySession)
    effects = await store.find(ActivitySkillEffect)
    history = await store.find(Enrollment)

    people: list[Json] = []
    for employee in employees:
        role = roles[employee.role_level_id]
        goal = goals.get(employee.id)
        vacancy = (
            vacancies.get(goal.vacancy_id)
            if goal and goal.vacancy_id
            else None
        )
        next_roles = [
            t.to_level_id for t in transitions if t.from_level_id == role.id
        ]
        target_id = (
            goal.role_level_id
            if goal
            else (next_roles[0] if len(next_roles) == 1 else None)
        )
        target = roles.get(target_id) if target_id else None
        target_requirements: list[
            VacancyRequirement | RoleSkillRequirement
        ] = (
            [
                r
                for r in vacancy_requirements
                if r.vacancy_id == goal.vacancy_id
            ]
            if goal and goal.vacancy_id
            else [r for r in requirements if r.role_level_id == target_id]
        )
        people.append(
            json_value(
                {
                    "employee_id": employee.id,
                    "external_id": employee.external_id,
                    "full_name": employee.full_name,
                    "department": departments[employee.department_id].name,
                    "role": tracks[role.track_id].name,
                    "grade": grades[role.grade_id].name,
                    "audience_grade": grades[role.grade_id].audience_grade,
                    "manager_id": employee.manager_id
                    if employee.manager_id in employee_ids
                    else None,
                    "hire_date": employee.hire_date,
                    "tenure_months": max(
                        0,
                        (today.year - employee.hire_date.year) * 12
                        + today.month
                        - employee.hire_date.month
                        - (today.day < employee.hire_date.day),
                    ),
                    "work_format": employee.work_format,
                    "preferred_language": employee.preferred_language,
                    "last_review_date": employee.last_review_date,
                    "skills": {
                        str(s.skill_id): s.verified_level
                        for s in assessments
                        if s.employee_id == employee.id
                    },
                    "career_goal": {
                        "target_role": tracks[target.track_id].name,
                        "target_grade": grades[target.grade_id].name,
                    }
                    if goal and target
                    else None,
                    "vacancy_status": vacancy.status if vacancy else None,
                    "target_profile": {
                        "role": tracks[target.track_id].name,
                        "grade": grades[target.grade_id].name,
                        "required_skills": {
                            str(r.skill_id): r.required_level
                            for r in target_requirements
                            if r.required_level > 0
                        },
                        "critical_skills": [
                            str(r.skill_id)
                            for r in target_requirements
                            if r.critical
                        ],
                    }
                    if target
                    else None,
                }
            )
        )

    result = json_value(
        {
            "asOfDate": today,
            "employees": people,
            "skills": [
                {
                    "skill_id": s.id,
                    "name": s.name,
                    "type": s.kind,
                    "category": s.category,
                    "description": s.description,
                }
                for s in skills
            ],
            "roleProfiles": [
                {
                    "role": tracks[r.track_id].name,
                    "grade": grades[r.grade_id].name,
                    "required_skills": {
                        str(q.skill_id): q.required_level
                        for q in requirements
                        if q.role_level_id == r.id and q.required_level > 0
                    },
                    "critical_skills": [
                        str(q.skill_id)
                        for q in requirements
                        if q.role_level_id == r.id and q.critical
                    ],
                }
                for r in roles.values()
            ],
            "events": [
                {
                    "event_id": a.id,
                    "title": a.title,
                    "description": a.description,
                    "type": a.kind,
                    "format": a.format,
                    "duration_hours": a.duration_hours,
                    "mandatory": a.mandatory,
                    "repeatable": a.repeatable,
                    "target_roles": sorted(
                        {v.role for v in audiences if v.activity_id == a.id}
                    ),
                    "target_grades": sorted(
                        {v.grade for v in audiences if v.activity_id == a.id}
                    ),
                    "develops_skills": [
                        {
                            "skill_id": e.skill_id,
                            "gain": e.gain,
                            "max_level": e.max_level,
                        }
                        for e in effects
                        if e.activity_id == a.id
                    ],
                    "prerequisites": {
                        str(p.skill_id): p.required_level
                        for p in prerequisites
                        if p.activity_id == a.id
                    },
                    "upcoming_sessions": sorted(
                        s.starts_on
                        for s in sessions
                        if s.activity_id == a.id and s.starts_on >= today
                    ),
                }
                for a in activities
            ],
            "activities": [
                {
                    "record_id": h.id,
                    "employee_id": h.employee_id,
                    "event_id": h.activity_id,
                    "date": h.enrolled_on,
                    "due_date": "",
                    "status": h.status,
                    "completion_pct": 100 if h.status == "completed" else None,
                    "score": None,
                    "feedback_rating": None,
                    "assigned_by": "",
                }
                for h in history
                if h.employee_id in employee_ids and h.enrolled_on <= today
            ],
        }
    )
    assert isinstance(result, dict)
    return result
