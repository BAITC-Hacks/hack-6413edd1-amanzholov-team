from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity, Json


@dataclass(kw_only=True)
class ImportBatch(Entity):
    source: str
    digest: str
    created_at: datetime
    created_by: UUID | None
    report: dict[str, Json]


@dataclass(kw_only=True)
class ImportRecord(Entity):
    source: str
    kind: str
    external_id: str
    digest: str


@dataclass(kw_only=True)
class ImportIssue(Entity):
    batch_id: UUID
    code: str
    details: dict[str, Json]
