from datetime import date
from uuid import UUID

from fastapi import APIRouter

from career_quest.modules.hr.application.analytics import employee_view, report
from career_quest.modules.hr.application.dataset import workspace
from career_quest.shared.domain.core import Json
from career_quest.shared.presentation.dependencies import (
    Actor,
    Pagination,
    ReadStore,
    Today,
    page,
)

router = APIRouter(tags=["hr"])


@router.get("/hr/workspace")
async def hr_workspace(
    actor: Actor, store: ReadStore, today: Today
) -> dict[str, Json]:
    return await workspace(store, actor, today)


@router.get("/hr/employees/{employee_id}")
async def employee(
    employee_id: UUID, actor: Actor, store: ReadStore
) -> dict[str, Json]:
    return await employee_view(store, actor, employee_id)


@router.get("/hr/overview")
async def overview(
    actor: Actor, store: ReadStore, today: Today, since: date | None = None
) -> dict[str, Json]:
    return await report(store, actor, "overview", today, since)


@router.get("/hr/skill-gaps")
async def gaps(
    actor: Actor, store: ReadStore, today: Today, pagination: Pagination
) -> dict[str, Json]:
    result = await report(store, actor, "skill-gaps", today)
    items = result["items"]
    assert isinstance(items, list)
    return {**result, **page(items, pagination)}


@router.get("/hr/employees-without-next-step")
async def no_step(
    actor: Actor, store: ReadStore, today: Today, pagination: Pagination
) -> dict[str, Json]:
    result = await report(store, actor, "employees-without-next-step", today)
    items = result["items"]
    assert isinstance(items, list)
    return {**result, **page(items, pagination)}


@router.get("/hr/activity-participation")
async def participation(
    actor: Actor, store: ReadStore, today: Today, since: date | None = None
) -> dict[str, Json]:
    return await report(store, actor, "activity-participation", today, since)
