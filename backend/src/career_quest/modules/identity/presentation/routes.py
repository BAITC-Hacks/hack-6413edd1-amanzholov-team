from fastapi import APIRouter, Request

from career_quest.modules.identity.domain.models import User
from career_quest.modules.people.domain.models import Employee
from career_quest.shared.application.commands import audit, public
from career_quest.shared.application.ports import Store
from career_quest.shared.domain.core import Json
from career_quest.shared.presentation.dependencies import (
    Actor,
    App,
    IdempotencyKey,
    ReadStore,
    command,
)
from career_quest.shared.presentation.schemas import (
    Command,
    Login,
    Preferences,
)

router = APIRouter(tags=["identity"])


@router.post("/auth/login")
async def login(body: Login, app: App, request: Request) -> dict[str, Json]:
    host = request.client.host if request.client else "unknown"
    app.limiter.check("login:" + host, 10)
    return await app.auth.login(body.login, body.password)


@router.post("/auth/logout")
async def logout(
    body: Command, actor: Actor, app: App, request: Request
) -> dict[str, Json]:
    await app.auth.logout(request.headers["authorization"].split(" ", 1)[1])
    return {"revoked": True}


@router.get("/me")
async def me(actor: Actor, store: ReadStore) -> dict[str, Json]:
    employee = await store.get(Employee, actor.employee_id)
    return {"user": public(actor), "employee": public(employee)}


@router.patch("/me/preferences")
async def preferences(
    body: Preferences, actor: Actor, app: App, key: IdempotencyKey
) -> dict[str, Json]:
    async def change(store: Store) -> dict[str, Json]:
        user = await store.get(User, actor.id, lock=True)
        user.ui_mode, user.locale = body.ui_mode, body.locale
        user.reduced_motion = body.reduced_motion
        await store.save(user)
        await audit(store, actor, "preferences", user)
        return public(user)

    return await command(app, actor, "preferences", key, body, change)
