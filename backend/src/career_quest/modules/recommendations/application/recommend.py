import asyncio
from dataclasses import dataclass
from datetime import date
from uuid import UUID

from career_quest.modules.careers.application.career import (
    CareerContext,
    context,
    map_result,
)
from career_quest.modules.careers.domain.matching import match
from career_quest.modules.identity.domain.models import User
from career_quest.modules.learning.application.activities import (
    catalog,
    project,
)
from career_quest.modules.learning.domain.models import Enrollment
from career_quest.modules.people.domain.models import Employee
from career_quest.modules.recommendations.domain.models import (
    RecommendationItem,
    RecommendationRun,
)
from career_quest.shared.application.commands import public
from career_quest.shared.application.ports import LlmGateway, Store, UowFactory
from career_quest.shared.application.security import own
from career_quest.shared.domain.core import Json, SystemClock, require

POLICY = "critical-coverage-history-effort-v1"


@dataclass
class Candidate:
    activity_id: UUID
    critical_gain: int
    coverage_gain: float
    history_penalty: int
    hours: float
    external_id: str
    explanation: dict[str, Json]


async def candidates(
    store: Store, ctx: CareerContext, today: date
) -> tuple[list[Candidate], dict[str, Json]]:
    history = await store.find(Enrollment, employee_id=ctx.employee.id)
    before = match(ctx.levels, ctx.requirements)
    facts: dict[str, Json] = {
        "current_grade": ctx.grade,
        "target_requirements": [
            {
                "skill_id": str(r.skill_id),
                "level": r.level,
                "critical": r.critical,
            }
            for r in ctx.requirements
        ],
        "verified_gaps": map_result(ctx)["gaps"],
        "history": {
            "available": bool(history),
            "completed": sum(h.status == "completed" for h in history),
            "participations": len(history),
        },
    }
    result: list[Candidate] = []
    if ctx.vacancy and ctx.vacancy.status == "closed":
        return result, facts
    for item in await catalog(store):
        if item.activity.mandatory:
            continue
        available = item.eligible(ctx, history, today)
        if not available.allowed:
            continue
        after_levels = project(ctx.levels, item)
        after = match(after_levels, ctx.requirements)
        if before.coverage is None or after.coverage is None:
            continue
        gain = after.coverage - before.coverage
        if gain <= 0:
            continue
        critical = sum(
            min(after_levels.get(r.skill_id, 0), r.level)
            - min(ctx.levels.get(r.skill_id, 0), r.level)
            for r in ctx.requirements
            if r.critical
        )
        previous = [h for h in history if h.activity_id == item.activity.id]
        penalty = sum(
            h.status in {"no_show", "dropped", "declined"} for h in previous
        )
        explanation: dict[str, Json] = {
            "event_id": str(item.activity.id),
            "external_event_id": item.activity.external_id,
            "next_session": available.next_session.isoformat()
            if available.next_session
            else None,
            "develops_skills": [
                {
                    "skill_id": str(e.skill_id),
                    "current_level": ctx.levels.get(e.skill_id, 0),
                    "expected_level": after_levels.get(e.skill_id, 0),
                    "required_level": next(
                        (
                            r.level
                            for r in ctx.requirements
                            if r.skill_id == e.skill_id
                        ),
                        None,
                    ),
                }
                for e in item.effects
            ],
            "coverage_gain": round(gain, 4),
            "critical_gap_reduction": critical,
            "reason_codes": [
                "target_gap_reduction",
                "audience_eligible",
                "history_considered" if history else "history_unavailable",
            ],
            "fact_ids": list(facts),
            "duration_hours": item.activity.duration_hours,
            "previous_participations": len(previous),
            "language": item.activity.language,
            "translation_fallback": True,
        }
        result.append(
            Candidate(
                item.activity.id,
                critical,
                gain,
                penalty,
                item.activity.duration_hours,
                item.activity.external_id,
                explanation,
            )
        )
    result.sort(
        key=lambda c: (
            -c.critical_gain,
            -c.coverage_gain,
            c.history_penalty,
            c.hours,
            c.external_id,
            str(c.activity_id),
        )
    )
    return result, facts


async def ranked(
    gateway: LlmGateway,
    options: list[Candidate],
    facts: dict[str, Json],
    budget: float,
) -> tuple[list[Candidate], str, str]:
    fallback = options[:3]
    if not options:
        return [], "rule_based_fallback", "no_eligible_activity"
    try:
        response = await asyncio.wait_for(
            gateway.rank(
                {
                    "facts": facts,
                    "candidates": [c.explanation for c in options],
                }
            ),
            timeout=budget,
        )
        if response.get("disabled") is True:
            return fallback, "rule_based_fallback", "ai_disabled"
        selections = response.get("selections")
        require(
            isinstance(selections, list) and 1 <= len(selections) <= 3,
            "invalid_ai_response",
        )
        assert isinstance(selections, list)
        lookup = {str(c.activity_id): c for c in options}
        chosen: list[Candidate] = []
        used: set[str] = set()
        for selection in selections:
            require(isinstance(selection, dict), "invalid_ai_response")
            assert isinstance(selection, dict)
            event_id, ids = (
                selection.get("event_id"),
                selection.get("fact_ids"),
            )
            require(
                isinstance(event_id, str) and event_id in lookup,
                "invalid_ai_id",
            )
            assert isinstance(event_id, str)
            require(event_id not in used, "duplicate_ai_id")
            require(
                isinstance(ids, list)
                and len(ids) >= 3
                and all(isinstance(f, str) and f in facts for f in ids),
                "invalid_ai_facts",
            )
            require(
                selection.get("reason_code") == "target_gap_reduction",
                "invalid_ai_reason",
            )
            chosen.append(lookup[event_id])
            used.add(event_id)
        # AI cannot discard the critical-first deterministic priority.
        require(
            {c.activity_id for c in chosen}
            == {c.activity_id for c in fallback},
            "ai_policy_violation",
        )
        require(
            all(
                first.critical_gain >= second.critical_gain
                for first, second in zip(chosen, chosen[1:], strict=False)
            ),
            "ai_policy_violation",
        )
        return chosen, "llm_ranked", "validated_ai_ranking"
    except TimeoutError:
        return fallback, "rule_based_fallback", "ai_timeout"
    except Exception:
        # An optional ranking service cannot invalidate verified calculations.
        return fallback, "rule_based_fallback", "ai_invalid_or_unavailable"


class GenerateRecommendations:
    def __init__(
        self, factory: UowFactory, gateway: LlmGateway, timeout: float
    ) -> None:
        self.factory, self.gateway, self.timeout = factory, gateway, timeout

    async def execute(self, actor: User, today: date) -> dict[str, Json]:
        async with self.factory() as uow:
            await uow.store.lock("catalog")
            await uow.store.get(Employee, actor.employee_id, lock=True)
            ctx = await context(uow.store, actor.employee_id)
            options, facts = await candidates(uow.store, ctx, today)
        chosen, mode, reason = await ranked(
            self.gateway, options, facts, self.timeout
        )
        if not ctx.requirements:
            reason = (
                "requirements_not_configured" if ctx.target_id else ctx.reason
            )
        if ctx.vacancy and ctx.vacancy.status == "closed":
            reason = "vacancy_closed"
        async with self.factory() as uow:
            await uow.store.lock("catalog")
            await uow.store.get(Employee, actor.employee_id, lock=True)
            current = await context(uow.store, actor.employee_id)
            require(ctx.versions == current.versions, "stale_recommendation")
            run = RecommendationRun(
                employee_id=actor.employee_id,
                created_at=SystemClock().now(),
                business_date=today,
                locale=actor.locale,
                mode=mode,
                reason_code=reason,
                versions=ctx.versions,
                snapshot={
                    "facts": facts,
                    "career_map": map_result(ctx),
                    "candidates": [c.explanation for c in options],
                    "policy": POLICY,
                },
            )
            await uow.store.save(run)
            items: list[RecommendationItem] = []
            for i, candidate in enumerate(chosen):
                item = RecommendationItem(
                    run_id=run.id,
                    activity_id=candidate.activity_id,
                    position=i,
                    explanation=candidate.explanation,
                )
                items.append(item)
                await uow.store.save(item)
            await uow.commit()
            return {
                **public(run),
                "items": [public(i) for i in items],
                "is_current": True,
            }


async def get_run(
    store: Store, actor: User, today: date, run_id: UUID | None = None
) -> dict[str, Json]:
    if run_id:
        run = await store.get(RecommendationRun, run_id)
    else:
        runs = await store.find(
            RecommendationRun, employee_id=actor.employee_id
        )
        require(bool(runs), "not_found", 404)
        run = max(runs, key=lambda r: r.created_at)
    own(actor, run.employee_id)
    ctx = await context(store, actor.employee_id)
    current = (
        ctx.versions == run.versions
        and run.business_date == today
        and run.locale == actor.locale
    )
    if run_id is None:
        require(current, "stale_recommendation")
    items = await store.find(RecommendationItem, run_id=run.id)
    return {
        **public(run),
        "is_current": current,
        "items": [public(i) for i in sorted(items, key=lambda i: i.position)],
    }


async def simulate(
    store: Store, actor: User, activity_ids: list[UUID], today: date
) -> dict[str, Json]:
    ctx = await context(store, actor.employee_id)
    history = await store.find(Enrollment, employee_id=actor.employee_id)
    by_id = {a.activity.id: a for a in await catalog(store)}
    levels = ctx.levels.copy()
    before = match(levels, ctx.requirements)
    steps: list[Json] = []
    for activity_id in activity_ids:
        require(activity_id in by_id, "not_found", 404)
        facts = by_id[activity_id]
        allowed = facts.eligible(ctx, history, today, levels)
        require(allowed.allowed, allowed.reason)
        levels = project(levels, facts)
        session = next(
            (
                s.id
                for s in facts.sessions
                if s.starts_on == allowed.next_session
            ),
            None,
        )
        history.append(
            Enrollment(
                employee_id=actor.employee_id,
                activity_id=activity_id,
                participation_key="simulation",
                session_id=session,
                enrolled_on=today,
                status="completed",
            )
        )
        steps.append(
            {
                "event_id": str(activity_id),
                "coverage": match(levels, ctx.requirements).coverage,
            }
        )
    return {
        "before": {str(s): n for s, n in ctx.levels.items()},
        "after": {str(s): n for s, n in levels.items()},
        "coverage_before": before.coverage,
        "coverage_after": match(levels, ctx.requirements).coverage,
        "steps": steps,
        "versions": ctx.versions,
        "limitations": ["requires_independent_completion_confirmation"],
    }
