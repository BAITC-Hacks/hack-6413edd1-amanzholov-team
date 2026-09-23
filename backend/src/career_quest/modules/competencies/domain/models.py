from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity


@dataclass(kw_only=True)
class Skill(Entity):
    source: str
    external_id: str
    name: str
    category: str
    kind: str
    description: str = ""


@dataclass(kw_only=True)
class EmployeeSkill(Entity):
    employee_id: UUID
    skill_id: UUID
    verified_level: int
    claimed_level: int = 0
    provenance: str = "self_assessment"
    assessed_on: date | None = None


@dataclass(kw_only=True)
class VerificationRequest(Entity):
    employee_id: UUID
    kind: str
    status: str
    profile_version: int
    version: int = 1
    previous_id: UUID | None = None
    skill_id: UUID | None = None
    claimed_level: int | None = None
    project: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    project_role: str | None = None
    contribution: str | None = None


@dataclass(kw_only=True)
class ExperienceSkill(Entity):
    request_id: UUID
    skill_id: UUID


@dataclass(kw_only=True)
class Evidence(Entity):
    request_id: UUID
    description: str
    reference: str | None = None


@dataclass(kw_only=True)
class ReviewerAssignment(Entity):
    request_id: UUID
    reviewer_id: UUID
    assigned_by: UUID


@dataclass(kw_only=True)
class VerificationReview(Entity):
    request_id: UUID
    reviewer_id: UUID
    decision: str
    rubric: str
    rationale: str
    created_at: datetime
    observed_level: int | None = None


@dataclass(kw_only=True)
class SkillChange(Entity):
    employee_id: UUID
    skill_id: UUID
    before_level: int
    after_level: int
    origin: str
    origin_id: UUID
    created_at: datetime
