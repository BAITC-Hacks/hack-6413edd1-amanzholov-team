from uuid import UUID

from fastapi import APIRouter

from career_quest.modules.competencies.application.verification import (
    assign_reviewer,
    request_detail,
    review_claim,
    revise_claim,
    submit_draft,
    submit_experience_claim,
    submit_skill_claim,
)
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    ReviewerAssignment,
    Skill,
    VerificationRequest,
)
from career_quest.shared.application.commands import public
from career_quest.shared.domain.core import Json
from career_quest.shared.presentation.dependencies import (
    Actor,
    App,
    IdempotencyKey,
    Pagination,
    ReadStore,
    Today,
    command,
    page,
)
from career_quest.shared.presentation.schemas import (
    Appeal,
    Assignment,
    Command,
    ExperienceClaim,
    Review,
    SkillClaim,
)

router = APIRouter(tags=["competencies"])


@router.get("/skills")
async def skills(
    actor: Actor,
    store: ReadStore,
    pagination: Pagination,
    category: str | None = None,
) -> dict[str, Json]:
    items = await store.find(Skill)
    return page(
        [
            public(s)
            for s in items
            if category is None or s.category == category
        ],
        pagination,
    )


@router.get("/me/skills")
async def my_skills(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    items = await store.find(EmployeeSkill, employee_id=actor.employee_id)
    return page([public(s) for s in items], pagination)


@router.post("/me/skill-claims")
async def skill_claim(
    body: SkillClaim, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        "skill_claim",
        key,
        body,
        lambda store: submit_skill_claim(
            store,
            actor,
            body.skill_id,
            body.claimed_level,
            body.evidence,
            str(body.reference) if body.reference else None,
            body.draft,
        ),
    )


@router.post("/me/experience-claims")
async def experience_claim(
    body: ExperienceClaim, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        "experience_claim",
        key,
        body,
        lambda store: submit_experience_claim(
            store,
            actor,
            body.project,
            body.start_date,
            body.end_date,
            body.role,
            body.contribution,
            body.skill_ids,
            body.evidence,
        ),
    )


@router.get("/me/skill-claims")
async def skill_claims(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    items = await store.find(
        VerificationRequest, employee_id=actor.employee_id, kind="skill"
    )
    return page([public(i) for i in items], pagination)


@router.get("/me/experience-claims")
async def experience_claims(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    items = await store.find(
        VerificationRequest, employee_id=actor.employee_id, kind="experience"
    )
    return page([public(i) for i in items], pagination)


@router.get("/me/verification-requests")
async def verification_requests(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    items = await store.find(
        VerificationRequest, employee_id=actor.employee_id
    )
    return page([public(i) for i in items], pagination)


@router.get("/verification-requests/assigned")
async def assigned(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    assignments = await store.find(ReviewerAssignment, reviewer_id=actor.id)
    items: list[Json] = [
        public(await store.get(VerificationRequest, a.request_id))
        for a in assignments
    ]
    return page(items, pagination)


@router.get("/verification-requests/{request_id}")
async def detail(
    request_id: UUID, actor: Actor, store: ReadStore
) -> dict[str, Json]:
    return await request_detail(store, actor, request_id)


@router.post("/verification-requests/{request_id}/assignment")
async def assignment(
    request_id: UUID,
    body: Assignment,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"assignment:{request_id}",
        key,
        body,
        lambda store: assign_reviewer(
            store, actor, request_id, body.assignee_user_id
        ),
    )


@router.post("/verification-requests/{request_id}/reviews")
async def review(
    request_id: UUID,
    body: Review,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
    today: Today,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"review:{request_id}",
        key,
        body,
        lambda store: review_claim(
            store,
            actor,
            request_id,
            body.decision,
            body.observed_level,
            body.rubric,
            body.rationale,
            today,
        ),
    )


@router.post("/verification-requests/{request_id}/appeals")
async def appeal(
    request_id: UUID, body: Appeal, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"appeal:{request_id}",
        key,
        body,
        lambda store: revise_claim(
            store, actor, request_id, body.evidence, body.claimed_level
        ),
    )


@router.post("/verification-requests/{request_id}/submit")
async def submit(
    request_id: UUID,
    body: Command,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"submit:{request_id}",
        key,
        body,
        lambda store: submit_draft(store, actor, request_id),
    )
