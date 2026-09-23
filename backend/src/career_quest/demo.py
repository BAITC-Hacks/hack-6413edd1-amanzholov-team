import asyncio
from datetime import date
from uuid import NAMESPACE_URL, UUID, uuid5

from career_quest.infrastructure.authentication.passwords import ArgonPasswords
from career_quest.modules.careers.domain.models import (
    CareerFramework,
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
from career_quest.modules.identity.domain.models import PermissionGrant, User
from career_quest.modules.learning.domain.models import (
    Activity,
    ActivityAudience,
    ActivitySkillEffect,
)
from career_quest.modules.people.domain.models import (
    CatalogState,
    Department,
    Employee,
)
from career_quest.shared.application.ports import UowFactory
from career_quest.shared.domain.core import SystemClock, require


def demo_id(name: str) -> UUID:
    return uuid5(NAMESPACE_URL, "career-quest:synthetic:v1:" + name)


async def seed(factory: UowFactory, password: str, today: date) -> None:
    require(len(password) >= 12, "demo_password_too_short", 422)
    hashed = await asyncio.to_thread(ArgonPasswords().hash, password)
    async with factory() as uow:
        store = uow.store
        await store.lock("catalog")
        if await store.find(User, login="employee"):
            return
        department = Department(
            id=demo_id("department"),
            source="demo",
            name="Synthetic Engineering",
        )
        other = Department(
            id=demo_id("other_department"),
            source="demo",
            name="Synthetic Other",
        )
        await store.save(department)
        await store.save(other)
        framework = CareerFramework(
            id=demo_id("framework"),
            source="demo",
            name="Demo explicit ladder v1",
            is_demo=True,
        )
        await store.save(framework)
        track = CareerTrack(
            id=demo_id("track"),
            framework_id=framework.id,
            name="Demo Backend Engineer",
        )
        await store.save(track)
        skills = [
            Skill(
                id=demo_id(s),
                source="demo",
                external_id=s,
                name=s.removeprefix("DEMO_"),
                category="engineering",
                kind="hard",
            )
            for s in ["DEMO_PYTHON", "DEMO_SQL"]
        ]
        for skill in skills:
            await store.save(skill)
        requirements = [
            ("Стажёр", "Junior", 1, 1),
            ("Junior", "Junior", 2, 1),
            ("Junior+", "Junior", 3, 2),
            ("Middle", "Middle", 3, 3),
            ("Middle+", "Middle", 4, 3),
            ("Senior", "Senior", 4, 4),
            ("Expert", "Senior", 5, 5),
            ("Manager", "Lead", 4, 4),
        ]
        roles = []
        for name, audience, python, sql in requirements:
            grade = Grade(
                id=demo_id("grade:" + name),
                framework_id=framework.id,
                name=name,
                audience_grade=audience,
            )
            await store.save(grade)
            role = RoleLevel(
                id=demo_id("role:" + name),
                track_id=track.id,
                grade_id=grade.id,
            )
            roles.append(role)
            await store.save(role)
            for skill, level in zip(skills, [python, sql], strict=True):
                await store.save(
                    RoleSkillRequirement(
                        role_level_id=role.id,
                        skill_id=skill.id,
                        required_level=level,
                        critical=skill == skills[0],
                    )
                )
        for first, second in zip(roles[:5], roles[1:6], strict=True):
            await store.save(
                CareerTransition(
                    from_level_id=first.id,
                    to_level_id=second.id,
                    kind="vertical",
                )
            )
        for target, kind in [(roles[6], "expert"), (roles[7], "management")]:
            await store.save(
                CareerTransition(
                    from_level_id=roles[5].id, to_level_id=target.id, kind=kind
                )
            )
        alternate_track = CareerTrack(
            id=demo_id("alternate_track"),
            framework_id=framework.id,
            name="Demo Data Engineer",
        )
        await store.save(alternate_track)
        alternate = RoleLevel(
            id=demo_id("alternate_role"),
            track_id=alternate_track.id,
            grade_id=roles[3].grade_id,
        )
        await store.save(alternate)
        for skill, level in zip(skills, [2, 4], strict=True):
            await store.save(
                RoleSkillRequirement(
                    role_level_id=alternate.id,
                    skill_id=skill.id,
                    required_level=level,
                    critical=skill == skills[1],
                )
            )
        await store.save(
            CareerTransition(
                from_level_id=roles[3].id,
                to_level_id=alternate.id,
                kind="horizontal",
            )
        )
        for login, role_name in [
            ("employee", "employee"),
            ("reviewer", "reviewer"),
            ("reviewer2", "reviewer"),
            ("hr", "hr"),
            ("admin", "admin"),
            ("outsider", "employee"),
        ]:
            employee = Employee(
                id=demo_id("employee:" + login),
                source="demo",
                external_id="DEMO_" + login,
                full_name="Synthetic " + login,
                department_id=other.id
                if login == "outsider"
                else department.id,
                role_level_id=roles[1].id,
                last_review_date=today,
                hire_date=date(2026, 1, 1),
            )
            await store.save(employee)
            user = User(
                id=demo_id("user:" + login),
                login=login,
                password_hash=hashed,
                employee_id=employee.id,
                role=role_name,
            )
            await store.save(user)
            for skill in skills:
                await store.save(
                    EmployeeSkill(
                        employee_id=employee.id,
                        skill_id=skill.id,
                        verified_level=1,
                        provenance="demo_assessment",
                        assessed_on=today,
                    )
                )
            if role_name == "reviewer":
                for permission in ["review", "completion"]:
                    await store.save(
                        PermissionGrant(
                            user_id=user.id,
                            department_id=department.id,
                            permission=permission,
                            scope="*",
                        )
                    )
            if role_name == "hr":
                for permission in ["hr", "promotion"]:
                    await store.save(
                        PermissionGrant(
                            user_id=user.id,
                            department_id=department.id,
                            permission=permission,
                            scope="*",
                        )
                    )
        activity = Activity(
            id=demo_id("activity"),
            source="demo",
            external_id="DEMO_LAB",
            title="Synthetic Python and SQL lab",
            description=(
                "Synthetic assessed practice; "
                "independent confirmation required."
            ),
            kind="assessed_lab",
            format="self_paced",
            duration_hours=3,
            grants_verified=True,
        )
        await store.save(activity)
        for grade_name in {r[1] for r in requirements}:
            await store.save(
                ActivityAudience(
                    activity_id=activity.id, role=track.name, grade=grade_name
                )
            )
        for skill in skills:
            await store.save(
                ActivitySkillEffect(
                    activity_id=activity.id,
                    skill_id=skill.id,
                    gain=1,
                    max_level=4,
                )
            )
        vacancy = Vacancy(
            id=demo_id("vacancy"),
            title="DEMO Python Junior+",
            role_level_id=roles[2].id,
            department_id=department.id,
            status="open",
            source="demo",
            is_demo=True,
            published_at=SystemClock().now(),
            updated_at=SystemClock().now(),
        )
        await store.save(vacancy)
        for skill, level in zip(skills, [3, 2], strict=True):
            await store.save(
                VacancyRequirement(
                    vacancy_id=vacancy.id,
                    skill_id=skill.id,
                    required_level=level,
                    critical=skill == skills[0],
                )
            )
        await store.save(
            EmployeeCareerGoal(
                employee_id=demo_id("employee:employee"),
                role_level_id=roles[2].id,
                vacancy_id=vacancy.id,
            )
        )
        await store.save(CatalogState(name="demo", as_of_date=today))
        await uow.commit()
