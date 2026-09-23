from collections.abc import Callable
from types import TracebackType
from typing import Protocol, Self
from uuid import UUID

from career_quest.shared.domain.core import Entity, Json


class Store(Protocol):
    """Transaction-local persistence; never commits independently."""

    async def get[T: Entity](
        self, model: type[T], key: UUID, *, lock: bool = False
    ) -> T: ...

    async def find[T: Entity](
        self, model: type[T], **filters: object
    ) -> list[T]: ...

    async def save(self, entity: Entity) -> None: ...

    async def delete(self, entity: Entity) -> None: ...

    async def lock(self, namespace: str) -> None: ...


class UnitOfWork(Protocol):
    store: Store

    async def __aenter__(self) -> Self: ...

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None: ...

    async def commit(self) -> None: ...


type UowFactory = Callable[[], UnitOfWork]


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, hashed: str, password: str) -> bool: ...


class LlmGateway(Protocol):
    async def rank(self, facts: dict[str, Json]) -> dict[str, Json]: ...
