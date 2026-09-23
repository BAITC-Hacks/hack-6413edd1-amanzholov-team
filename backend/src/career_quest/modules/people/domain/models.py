from dataclasses import dataclass
from datetime import date
from uuid import UUID

from career_quest.shared.domain.core import Entity


@dataclass(kw_only=True)
class Department(Entity):
    source: str
    name: str


@dataclass(kw_only=True)
class Employee(Entity):
    source: str
    external_id: str
    full_name: str
    department_id: UUID
    role_level_id: UUID
    last_review_date: date
    hire_date: date
    manager_id: UUID | None = None
    preferred_language: str = "ru"
    work_format: str = "office"
    profile_version: int = 1
    history_version: int = 1


@dataclass(kw_only=True)
class CatalogState(Entity):
    name: str
    as_of_date: date
    catalog_version: int = 1
    policy_version: int = 1
