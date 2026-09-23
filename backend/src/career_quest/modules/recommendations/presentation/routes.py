from uuid import UUID

from fastapi import APIRouter

from career_quest.modules.recommendations.application.recommend import (
    get_run,
    simulate,
)
from career_quest.shared.domain.core import Json
from career_quest.shared.presentation.dependencies import (
    Actor,
    App,
    ReadStore,
    Today,
)
from career_quest.shared.presentation.localization import localize_run
from career_quest.shared.presentation.schemas import Command, SimulationInput

router = APIRouter(tags=["recommendations"])


@router.post("/recommendations")
async def recommendations(
    body: Command, actor: Actor, app: App, today: Today
) -> dict[str, Json]:
    app.limiter.check("recommend:" + str(actor.id), 20)
    return localize_run(
        await app.recommendations.execute(actor, today), actor.locale
    )


@router.get("/recommendations/current")
async def current(
    actor: Actor, store: ReadStore, today: Today
) -> dict[str, Json]:
    return localize_run(await get_run(store, actor, today), actor.locale)


@router.get("/recommendations/{run_id}")
async def saved(
    run_id: UUID, actor: Actor, store: ReadStore, today: Today
) -> dict[str, Json]:
    return localize_run(
        await get_run(store, actor, today, run_id), actor.locale
    )


@router.post("/simulations")
async def simulation(
    body: SimulationInput,
    actor: Actor,
    app: App,
    store: ReadStore,
    today: Today,
) -> dict[str, Json]:
    app.limiter.check("simulate:" + str(actor.id), 20)
    return await simulate(store, actor, body.activity_ids, today)
