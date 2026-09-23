import hashlib
import json
from dataclasses import dataclass, field
from datetime import date

from career_quest.shared.domain.core import BusinessError, Json, require


def obj(value: Json) -> dict[str, Json]:
    require(isinstance(value, dict), "invalid_import_object", 422)
    assert isinstance(value, dict)
    return value


def seq(value: Json) -> list[Json]:
    require(isinstance(value, list), "invalid_import_array", 422)
    assert isinstance(value, list)
    return value


def string(value: Json) -> str:
    require(
        isinstance(value, str) and len(value) <= 10000,
        "invalid_import_string",
        422,
    )
    assert isinstance(value, str)
    return value


def number(value: Json, maximum: int = 5) -> int:
    require(
        type(value) is int and 0 <= value <= maximum,
        "invalid_import_level",
        422,
    )
    assert isinstance(value, int)
    return value


def day(value: Json) -> date:
    try:
        return date.fromisoformat(string(value))
    except ValueError as exc:
        raise BusinessError("invalid_import_date", 422) from exc


def digest(value: Json) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


@dataclass
class Package:
    as_of_date: date
    skills: list[dict[str, Json]] = field(default_factory=list)
    role_profiles: list[dict[str, Json]] = field(default_factory=list)
    events: list[dict[str, Json]] = field(default_factory=list)
    employees: list[dict[str, Json]] = field(default_factory=list)
    history: list[dict[str, Json]] = field(default_factory=list)

    def fingerprint(self) -> str:
        return digest(
            {
                "as_of_date": self.as_of_date.isoformat(),
                "skills": list(self.skills),
                "profiles": list(self.role_profiles),
                "events": list(self.events),
                "employees": list(self.employees),
                "history": list(self.history),
            }
        )
