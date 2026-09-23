from uuid import UUID

from fastapi import APIRouter

from career_quest.modules.learning.application.activities import (
    catalog,
    confirm_completion,
    enroll,
    request_completion,
)
from career_quest.modules.learning.domain.models import Activity, Enrollment
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
    Command,
    CompletionInput,
    EnrollmentInput,
)

router = APIRouter(tags=["learning"])


@router.get("/activities")
async def activities(
    actor: Actor,
    store: ReadStore,
    pagination: Pagination,
    format: str | None = None,
) -> dict[str, Json]:
    return page(
        [
            public(a)
            for a in await store.find(Activity)
            if format is None or a.format == format
        ],
        pagination,
    )


@router.get("/activities/{activity_id}")
async def activity(
    activity_id: UUID, actor: Actor, store: ReadStore
) -> dict[str, Json]:
    record = await store.get(Activity, activity_id)
    facts = next(
        a for a in await catalog(store) if a.activity.id == activity_id
    )
    return {
        **public(record),
        "sessions": [public(s) for s in facts.sessions],
        "effects": [public(e) for e in facts.effects],
        "prerequisites": {str(s): n for s, n in facts.prerequisites.items()},
        "translation_fallback": record.language != actor.locale,
    }


@router.get("/me/enrollments")
async def enrollments(
    actor: Actor, store: ReadStore, pagination: Pagination
) -> dict[str, Json]:
    return page(
        [
            public(e)
            for e in await store.find(
                Enrollment, employee_id=actor.employee_id
            )
        ],
        pagination,
    )


@router.post("/activities/{activity_id}/enrollments")
async def enrollment(
    activity_id: UUID,
    body: EnrollmentInput,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
    today: Today,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"enroll:{activity_id}",
        key,
        body,
        lambda store: enroll(
            store, actor, activity_id, body.session_id, today
        ),
    )


@router.post("/enrollments/{enrollment_id}/completion-requests")
async def completion_request(
    enrollment_id: UUID,
    body: CompletionInput,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
    today: Today,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"completion_request:{enrollment_id}",
        key,
        body,
        lambda store: request_completion(
            store, actor, enrollment_id, body.evidence, today
        ),
    )


@router.post("/completion-requests/{request_id}/confirm")
async def confirm(
    request_id: UUID,
    body: Command,
    actor: Actor,
    app: App,
    key: IdempotencyKey,
    today: Today,
) -> dict[str, Json]:
    return await command(
        app,
        actor,
        f"confirm:{request_id}",
        key,
        body,
        lambda store: confirm_completion(store, actor, request_id, today),
    )
