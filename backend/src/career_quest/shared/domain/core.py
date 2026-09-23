from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from typing import Protocol
from uuid import UUID, uuid4

type Json = None | bool | int | float | str | list[Json] | dict[str, Json]


@dataclass(kw_only=True)
class Entity:
    id: UUID = field(default_factory=uuid4)


@dataclass
class BusinessError(Exception):
    code: str
    status: int = 409
    details: dict[str, Json] = field(default_factory=dict)


class BusinessClock(Protocol):
    def today(self) -> date: ...


@dataclass(frozen=True)
class DatasetClock:
    as_of: date

    def today(self) -> date:
        return self.as_of


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


def require(condition: bool, code: str, status: int = 409) -> None:
    if not condition:
        raise BusinessError(code, status)
