from uuid import UUID

from fastapi import APIRouter

from career_quest.modules.careers.application.career import (
    context,
    decide_promotion,
    map_result,
    request_promotion,
    set_goal,
)
from career_quest.modules.careers.application.vacancies import save_vacancy
from career_quest.modules.careers.domain.matching import Requirement
from career_quest.modules.careers.domain.models import (
    CareerFramework,
    CareerTrack,
    CareerTransition,
    Grade,
    RoleLevel,
    RoleSkillRequirement,
    Vacancy,
    VacancyRequirement,
)
from career_quest.shared.application.commands import public
from career_quest.shared.domain.core import Json
from career_quest.shared.presentation.dependencies import (
    Actor,
    App,
    IdempotencyKey,
    Pagination,
    ReadStore,
    command,
    page,
)
from career_quest.shared.presentation.schemas import (
    Decision,
    Goal,
    PromotionInput,
    VacancyInput,
    VacancyPatch,
)

router = APIRouter(tags=["careers"])


@router.get("/career-tracks")
async def tracks(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    result = page(
        [public(t) for t in await store.find(CareerTrack)], pagination
    )
    result["frameworks"] = [
        public(r) for r in await store.find(CareerFramework)
    ]
    result["grades"] = [public(r) for r in await store.find(Grade)]
    result["role_levels"] = [public(r) for r in await store.find(RoleLevel)]
    result["transitions"] = [
        public(r) for r in await store.find(CareerTransition)
    ]
    result["requirements"] = [
        public(r) for r in await store.find(RoleSkillRequirement)
    ]
    return result


@router.put("/me/career-goal")
async def goal(
    body: Goal, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        "career_goal",
        key,
        body,
        lambda store: set_goal(
            store, actor, body.role_level_id, body.vacancy_id
        ),
    )


@router.get("/me/career-map")
async def career_map(actor: Actor, store: ReadStore) -> dict[str, Json]:
    return map_result(await context(store, actor.employee_id))


@router.get("/vacancies")
async def vacancies(
    actor: Actor,
    store: ReadStore,
    pagination: Pagination,
    status: str | None = None,
) -> dict[str, Json]:
    return page(
        [
            public(v)
            for v in await store.find(Vacancy)
            if status is None or v.status == status
        ],
        pagination,
    )


@router.get("/vacancies/{vacancy_id}")
async def vacancy(
    vacancy_id: UUID, actor: Actor, store: ReadStore
) -> dict[str, Json]:
    result = public(await store.get(Vacancy, vacancy_id))
    result["requirements"] = [
        public(r)
        for r in await store.find(VacancyRequirement, vacancy_id=vacancy_id)
    ]
    return result


@router.get("/vacancies/{vacancy_id}/match")
async def vacancy_match(
    vacancy_id: UUID, actor: Actor, store: ReadStore
) -> dict[str, Json]:
    return map_result(
        await context(store, actor.employee_id, vacancy_id=vacancy_id)
    )


@router.post("/admin/vacancies")
async def create_vacancy(
    body: VacancyInput, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        "create_vacancy",
        key,
        body,
        lambda store: save_vacancy(
            store,
            actor,
            None,
            body.title,
            body.role_level_id,
            body.department_id,
            body.status,
            body.is_demo,
            [
                Requirement(r.skill_id, r.required_level, r.critical)
                for r in body.requirements
            ],
        ),
    )


@router.patch("/admin/vacancies/{vacancy_id}")
async def update_vacancy(
    vacancy_id: UUID,
    body: VacancyPatch,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
) -> dict[str, Json]:
    requirements = (
        [
            Requirement(r.skill_id, r.required_level, r.critical)
            for r in body.requirements
        ]
        if body.requirements is not None
        else None
    )
    return await command(
        app,
        actor,
        f"vacancy:{vacancy_id}",
        key,
        body,
        lambda store: save_vacancy(
            store,
            actor,
            vacancy_id,
            body.title,
            None,
            None,
            body.status,
            False,
            requirements,
        ),
    )


@router.post("/promotion-reviews")
async def promotion(
    body: PromotionInput, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        "promotion_request",
        key,
        body,
        lambda store: request_promotion(store, actor, body.role_level_id),
    )


@router.post("/promotion-reviews/{review_id}/decision")
async def promotion_decision(
    review_id: UUID,
    body: Decision,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"promotion_decision:{review_id}",
        key,
        body,
        lambda store: decide_promotion(
            store, actor, review_id, body.approve, body.rationale
        ),
    )
