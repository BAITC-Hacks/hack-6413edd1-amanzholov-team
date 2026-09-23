import hashlib
import json
from collections.abc import Awaitable, Callable
from dataclasses import fields
from datetime import date, datetime
from enum import Enum
from uuid import UUID

from career_quest.modules.identity.domain.models import User
from career_quest.shared.application.ports import Store, UowFactory
from career_quest.shared.domain.audit import AuditEvent, IdempotencyRecord
from career_quest.shared.domain.core import Entity, Json, SystemClock, require


def json_value(value: object) -> Json:
    if value is None or isinstance(value, bool | int | float | str):
        return value
    if isinstance(value, UUID | date | datetime):
        return str(value)
    if isinstance(value, Enum):
        return str(value.value)
    if isinstance(value, Entity):
        return {
            f.name: json_value(getattr(value, f.name)) for f in fields(value)
        }
    if isinstance(value, dict):
        return {str(k): json_value(v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [json_value(v) for v in value]
    raise TypeError(f"Unsupported JSON value: {type(value).__name__}")


def public(entity: Entity) -> dict[str, Json]:
    result = json_value(entity)
    assert isinstance(result, dict)
    result.pop("password_hash", None)
    result.pop("token_hash", None)
    return result


async def audit(
    store: Store, actor: User, operation: str, entity: Entity
) -> None:
    await store.save(
        AuditEvent(
            actor_id=actor.id,
            operation=operation,
            object_id=entity.id,
            created_at=SystemClock().now(),
            details={},
        )
    )


async def execute(
    factory: UowFactory,
    actor: User,
    operation: str,
    key: str,
    payload: dict[str, Json],
    action: Callable[[Store], Awaitable[dict[str, Json]]],
) -> dict[str, Json]:
    require(1 <= len(key) <= 128, "invalid_idempotency_key", 422)
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    async with factory() as uow:
        await uow.store.lock(f"command:{actor.id}:{operation}:{key}")
        records = await uow.store.find(
            IdempotencyRecord, user_id=actor.id, operation=operation, key=key
        )
        if records:
            require(records[0].payload_hash == digest, "idempotency_conflict")
            return records[0].result
        result = await action(uow.store)
        await uow.store.save(
            IdempotencyRecord(
                user_id=actor.id,
                operation=operation,
                key=key,
                payload_hash=digest,
                result=result,
            )
        )
        await uow.commit()
        return result
