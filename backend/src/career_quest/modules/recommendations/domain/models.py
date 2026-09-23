from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity, Json


@dataclass(kw_only=True)
class RecommendationRun(Entity):
    employee_id: UUID
    created_at: datetime
    business_date: date
    locale: str
    mode: str
    reason_code: str
    versions: dict[str, Json]
    snapshot: dict[str, Json]


@dataclass(kw_only=True)
class RecommendationItem(Entity):
    run_id: UUID
    activity_id: UUID
    position: int
    explanation: dict[str, Json]
