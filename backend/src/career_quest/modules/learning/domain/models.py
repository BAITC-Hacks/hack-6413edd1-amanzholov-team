from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity


@dataclass(kw_only=True)
class Activity(Entity):
    source: str
    external_id: str
    title: str
    description: str
    kind: str
    format: str
    duration_hours: float
    mandatory: bool = False
    repeatable: bool = False
    grants_verified: bool = False
    language: str = "en"


@dataclass(kw_only=True)
class ActivityAudience(Entity):
    activity_id: UUID
    role: str
    grade: str


@dataclass(kw_only=True)
class ActivityPrerequisite(Entity):
    activity_id: UUID
    skill_id: UUID
    required_level: int


@dataclass(kw_only=True)
class ActivitySession(Entity):
    activity_id: UUID
    starts_on: date


@dataclass(kw_only=True)
class ActivitySkillEffect(Entity):
    activity_id: UUID
    skill_id: UUID
    gain: int
    max_level: int


@dataclass(kw_only=True)
class Enrollment(Entity):
    employee_id: UUID
    activity_id: UUID
    participation_key: str
    enrolled_on: date
    status: str = "enrolled"
    session_id: UUID | None = None
    source: str | None = None
    external_id: str | None = None


@dataclass(kw_only=True)
class CompletionRequest(Entity):
    enrollment_id: UUID
    evidence: str
    status: str = "submitted"


@dataclass(kw_only=True)
class ActivityCompletion(Entity):
    enrollment_id: UUID
    completed_at: datetime
    completion_time_source: str
    confirmed_by: UUID | None = None
