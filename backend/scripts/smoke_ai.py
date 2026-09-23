"""Opt-in live check. Sends synthetic facts only; never writes to the DB."""

import asyncio
import json
from time import perf_counter
from uuid import UUID

import httpx

from career_quest.infrastructure.settings import Settings
from career_quest.modules.recommendations.application.recommend import (
    Candidate,
    ranked,
)
from career_quest.modules.recommendations.infrastructure.llm import (
    HttpLlmGateway,
)
from career_quest.shared.domain.core import Json


async def run() -> None:
    settings = Settings()
    if not settings.llm_endpoint:
        raise ValueError("Set LLM_ENDPOINT and LLM_MODEL for the live check")
    candidate_id = UUID("00000000-0000-0000-0000-000000000001")
    facts: dict[str, Json] = {
        "current_grade": "Junior",
        "target_requirements": [{"skill_id": "SYNTHETIC", "level": 3}],
        "verified_gaps": [
            {"skill_id": "SYNTHETIC", "current": 1, "required": 3}
        ],
        "history": {"available": False, "completed": 0},
    }
    candidate = Candidate(
        candidate_id,
        1,
        20,
        0,
        2,
        "SYNTHETIC",
        {
            "event_id": str(candidate_id),
            "reason_codes": ["target_gap_reduction"],
            "fact_ids": list(facts),
        },
    )
    async with httpx.AsyncClient() as client:
        gateway = HttpLlmGateway(client, settings)
        start = perf_counter()
        try:
            reply = await gateway.rank(
                {
                    "facts": facts,
                    "candidates": [candidate.explanation],
                }
            )
            print(
                json.dumps(
                    {
                        "direct_reply": reply,
                        "elapsed_ms": round((perf_counter() - start) * 1000),
                    },
                    ensure_ascii=False,
                )
            )
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            print(
                json.dumps(
                    {
                        "direct_error": type(exc).__name__,
                        "elapsed_ms": round((perf_counter() - start) * 1000),
                    }
                )
            )
        start = perf_counter()
        chosen, mode, reason = await ranked(
            gateway, [candidate], facts, settings.llm_timeout_seconds
        )
        print(
            json.dumps(
                {
                    "model": settings.llm_model,
                    "mode": mode,
                    "reason_code": reason,
                    "items": len(chosen),
                    "elapsed_ms": round((perf_counter() - start) * 1000),
                }
            )
        )
        if mode != "llm_ranked":
            raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(run())
