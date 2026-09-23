from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity


@dataclass(kw_only=True)
class CareerFramework(Entity):
    source: str
    name: str
    is_demo: bool = False
    version: int = 1


@dataclass(kw_only=True)
class CareerTrack(Entity):
    framework_id: UUID
    name: str


@dataclass(kw_only=True)
class Grade(Entity):
    framework_id: UUID
    name: str
    audience_grade: str


@dataclass(kw_only=True)
class RoleLevel(Entity):
    track_id: UUID
    grade_id: UUID
    version: int = 1


@dataclass(kw_only=True)
class RoleSkillRequirement(Entity):
    role_level_id: UUID
    skill_id: UUID
    required_level: int
    critical: bool = False


@dataclass(kw_only=True)
class CareerTransition(Entity):
    from_level_id: UUID
    to_level_id: UUID
    kind: str


@dataclass(kw_only=True)
class EmployeeCareerGoal(Entity):
    employee_id: UUID
    role_level_id: UUID
    vacancy_id: UUID | None = None


@dataclass(kw_only=True)
class Vacancy(Entity):
    title: str
    role_level_id: UUID
    department_id: UUID
    status: str
    source: str
    is_demo: bool
    published_at: datetime
    updated_at: datetime
    version: int = 1


@dataclass(kw_only=True)
class VacancyRequirement(Entity):
    vacancy_id: UUID
    skill_id: UUID
    required_level: int
    critical: bool = False


@dataclass(kw_only=True)
class PromotionReview(Entity):
    employee_id: UUID
    role_level_id: UUID
    profile_version: int
    requirements_version: int
    status: str = "submitted"
    decided_by: UUID | None = None
    rationale: str | None = None
