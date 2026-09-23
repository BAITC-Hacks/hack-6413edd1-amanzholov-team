from dataclasses import fields
from types import TracebackType
from typing import Self
from uuid import UUID

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from career_quest.infrastructure.database.models import ROW_TYPES
from career_quest.shared.application.ports import Store
from career_quest.shared.domain.core import BusinessError, Entity


class PostgresStore:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get[T: Entity](
        self, model: type[T], key: UUID, *, lock: bool = False
    ) -> T:
        row_type = ROW_TYPES[model]
        statement = select(row_type).where(row_type.id == key)
        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )
        row = (await self.session.execute(statement)).scalar_one_or_none()
        if row is None:
            raise BusinessError("not_found", 404)
        return model(**{f.name: getattr(row, f.name) for f in fields(model)})

    async def find[T: Entity](
        self, model: type[T], **filters: object
    ) -> list[T]:
        row_type = ROW_TYPES[model]
        statement = select(row_type)
        for key, value in filters.items():
            statement = statement.where(getattr(row_type, key) == value)
        statement = statement.order_by(row_type.id)
        rows = (await self.session.execute(statement)).scalars().all()
        return [
            model(**{f.name: getattr(row, f.name) for f in fields(model)})
            for row in rows
        ]

    async def save(self, entity: Entity) -> None:
        row_type = ROW_TYPES[type(entity)]
        row = row_type(
            **{f.name: getattr(entity, f.name) for f in fields(entity)}
        )
        await self.session.merge(row)
        await self.session.flush()

    async def delete(self, entity: Entity) -> None:
        row_type = ROW_TYPES[type(entity)]
        await self.session.execute(
            delete(row_type).where(row_type.id == entity.id)
        )

    async def lock(self, namespace: str) -> None:
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": namespace},
        )


class PostgresUnitOfWork:
    def __init__(self, sessions: async_sessionmaker[AsyncSession]) -> None:
        self.session = sessions()
        self.store: Store = PostgresStore(self.session)

    async def __aenter__(self) -> Self:
        await self.session.begin()
        return self

    async def commit(self) -> None:
        await self.session.commit()

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self.session.rollback()
        await self.session.close()
