"""Load synthetic data and grant the demo HR its departments."""

import asyncio
from pathlib import Path

from career_quest.demo import demo_id
from career_quest.modules.data_import.application.importer import ImportDataset
from career_quest.modules.data_import.infrastructure.parser import (
    read_directory,
)
from career_quest.modules.identity.domain.models import PermissionGrant
from career_quest.modules.people.domain.models import Department
from career_quest.shared.application.ports import UowFactory


async def initialize_hr(factory: UowFactory, path: Path) -> None:
    package = await asyncio.to_thread(read_directory, path)
    await ImportDataset(factory).execute(package, "canonical", None, False)
    async with factory() as uow:
        grants = await uow.store.find(
            PermissionGrant, user_id=demo_id("user:hr"), permission="hr"
        )
        existing = {g.department_id for g in grants}
        for department in await uow.store.find(Department, source="canonical"):
            if department.id not in existing:
                await uow.store.save(
                    PermissionGrant(
                        user_id=demo_id("user:hr"),
                        department_id=department.id,
                        permission="hr",
                        scope="*",
                    )
                )
        await uow.commit()
