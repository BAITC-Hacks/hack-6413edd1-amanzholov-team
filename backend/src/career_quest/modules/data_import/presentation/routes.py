from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Query, UploadFile

from career_quest.modules.data_import.application.importer import ImportDataset
from career_quest.modules.data_import.domain.models import (
    ImportBatch,
    ImportIssue,
)
from career_quest.modules.data_import.infrastructure.parser import (
    MAX_ZIP,
    read_zip,
)
from career_quest.shared.application.commands import public
from career_quest.shared.application.security import admin
from career_quest.shared.domain.core import DatasetClock, Json, require
from career_quest.shared.presentation.dependencies import Actor, App, ReadStore

router = APIRouter(tags=["imports"])


@router.post("/admin/imports")
async def import_dataset(
    actor: Actor,
    app: App,
    file: Annotated[UploadFile, File()],
    source: Annotated[
        str, Query(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    ] = "canonical",
    dry_run: bool = False,
) -> dict[str, Json]:
    admin(actor)
    app.limiter.check("import:" + str(actor.id), 3)
    content = await file.read(MAX_ZIP + 1)
    require(len(content) <= MAX_ZIP, "import_too_large", 422)
    package = read_zip(content)
    result = await ImportDataset(app.factory).execute(
        package, source, actor, dry_run
    )
    if not dry_run:
        app.clock = DatasetClock(package.as_of_date)
    return result


@router.get("/admin/imports/{batch_id}")
async def import_report(
    batch_id: UUID, actor: Actor, store: ReadStore
) -> dict[str, Json]:
    admin(actor)
    batch = await store.get(ImportBatch, batch_id)
    return {
        **public(batch),
        "issues": [
            public(i) for i in await store.find(ImportIssue, batch_id=batch.id)
        ],
    }
