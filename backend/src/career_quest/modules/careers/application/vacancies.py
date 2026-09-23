from uuid import UUID

from career_quest.modules.careers.domain.matching import Requirement
from career_quest.modules.careers.domain.models import (
    RoleLevel,
    Vacancy,
    VacancyRequirement,
)
from career_quest.modules.competencies.domain.models import Skill
from career_quest.modules.identity.domain.models import User
from career_quest.modules.people.domain.models import CatalogState, Department
from career_quest.shared.application.commands import audit, public
from career_quest.shared.application.ports import Store
from career_quest.shared.application.security import admin
from career_quest.shared.domain.core import Json, SystemClock, require


async def save_vacancy(
    store: Store,
    actor: User,
    vacancy_id: UUID | None,
    title: str | None,
    role_level_id: UUID | None,
    department_id: UUID | None,
    status: str | None,
    is_demo: bool,
    requirements: list[Requirement] | None,
) -> dict[str, Json]:
    admin(actor)
    await store.lock("catalog")
    if vacancy_id:
        vacancy = await store.get(Vacancy, vacancy_id, lock=True)
        if title is not None:
            vacancy.title = title
        if status is not None:
            vacancy.status = status
        vacancy.version += 1
    else:
        assert role_level_id is not None and department_id is not None
        assert title is not None and status is not None
        await store.get(RoleLevel, role_level_id)
        await store.get(Department, department_id)
        vacancy = Vacancy(
            title=title,
            role_level_id=role_level_id,
            department_id=department_id,
            status=status,
            source="demo" if is_demo else "admin",
            is_demo=is_demo,
            published_at=SystemClock().now(),
            updated_at=SystemClock().now(),
        )
    vacancy.updated_at = SystemClock().now()
    await store.save(vacancy)
    if requirements is not None:
        require(
            len({r.skill_id for r in requirements}) == len(requirements),
            "duplicate_requirement",
            422,
        )
        for previous in await store.find(
            VacancyRequirement, vacancy_id=vacancy.id
        ):
            await store.delete(previous)
        for requirement in requirements:
            await store.get(Skill, requirement.skill_id)
            await store.save(
                VacancyRequirement(
                    vacancy_id=vacancy.id,
                    skill_id=requirement.skill_id,
                    required_level=requirement.level,
                    critical=requirement.critical,
                )
            )
    for state in await store.find(CatalogState):
        state.catalog_version += 1
        await store.save(state)
    await audit(store, actor, "save_vacancy", vacancy)
    return public(vacancy)
