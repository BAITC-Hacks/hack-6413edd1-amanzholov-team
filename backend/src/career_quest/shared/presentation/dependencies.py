from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import date
from typing import Annotated, cast

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from career_quest.bootstrap import Runtime
from career_quest.modules.identity.domain.models import User
from career_quest.shared.application.commands import execute, json_value
from career_quest.shared.application.ports import Store
from career_quest.shared.domain.core import Json, require
from career_quest.shared.presentation.schemas import Command, Page

bearer = HTTPBearer(auto_error=False)


def runtime(request: Request) -> Runtime:
    return cast(Runtime, request.app.state.runtime)


type App = Annotated[Runtime, Depends(runtime)]


async def current_user(
    app: App,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer)
    ],
) -> User:
    require(credentials is not None, "invalid_token", 401)
    assert credentials is not None
    return await app.auth.authenticate(credentials.credentials)


async def read_store(app: App) -> AsyncIterator[Store]:
    async with app.factory() as uow:
        yield uow.store


def today(app: App) -> date:
    return app.clock.today()


type Actor = Annotated[User, Depends(current_user)]
type ReadStore = Annotated[Store, Depends(read_store)]
type Today = Annotated[date, Depends(today)]
type Pagination = Annotated[Page, Depends()]
type IdempotencyKey = Annotated[
    str, Header(alias="Idempotency-Key", min_length=1, max_length=128)
]


def page(items: list[Json], pagination: Page) -> dict[str, Json]:
    return {
        "items": items[
            pagination.offset : pagination.offset + pagination.limit
        ],
        "total": len(items),
        "offset": pagination.offset,
        "limit": pagination.limit,
    }


async def command(
    app: Runtime,
    actor: User,
    operation: str,
    key: str,
    body: Command,
    action: Callable[[Store], Awaitable[dict[str, Json]]],
) -> dict[str, Json]:
    payload = json_value(body.model_dump(mode="json"))
    assert isinstance(payload, dict)
    return await execute(app.factory, actor, operation, key, payload, action)
