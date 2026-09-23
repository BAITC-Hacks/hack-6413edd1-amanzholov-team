from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity, Json


@dataclass(kw_only=True)
class AuditEvent(Entity):
    actor_id: UUID | None
    operation: str
    object_id: UUID
    created_at: datetime
    details: dict[str, Json]


@dataclass(kw_only=True)
class IdempotencyRecord(Entity):
    user_id: UUID
    operation: str
    key: str
    payload_hash: str
    result: dict[str, Json]
