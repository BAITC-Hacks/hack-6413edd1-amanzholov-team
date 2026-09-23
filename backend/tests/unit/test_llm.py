import asyncio
from uuid import uuid4

import httpx
import pytest

from career_quest.infrastructure.settings import Settings
from career_quest.modules.recommendations.application.recommend import (
    Candidate,
    ranked,
)
from career_quest.modules.recommendations.infrastructure.llm import (
    HttpLlmGateway,
)
from career_quest.shared.domain.core import Json


class FakeLlm:
    def __init__(self, reply: dict[str, Json], delay: bool = False) -> None:
        self.reply, self.delay = reply, delay

    async def rank(self, facts: dict[str, Json]) -> dict[str, Json]:
        if self.delay:
            await asyncio.Event().wait()
        return self.reply


@pytest.mark.parametrize(
    "bad",
    [
        {
            "selections": [
                {
                    "event_id": "invented",
                    "fact_ids": ["a", "b", "c"],
                    "reason_code": "target_gap_reduction",
                }
            ]
        },
        {"selections": []},
        {"unexpected": True},
    ],
)
async def test_ai_invalid_fallback(bad: dict[str, Json]) -> None:
    candidate = Candidate(uuid4(), 1, 10, 0, 2, "DEMO", {})
    chosen, mode, reason = await ranked(
        FakeLlm(bad), [candidate], {"a": 1, "b": 2, "c": 3}, 0.1
    )
    assert chosen == [candidate]
    assert mode == "rule_based_fallback"
    assert reason == "ai_invalid_or_unavailable"


async def test_timeout_and_unknown_fact_fallback() -> None:
    candidate = Candidate(uuid4(), 1, 10, 0, 2, "DEMO", {})
    _, mode, reason = await ranked(FakeLlm({}, True), [candidate], {}, 0.001)
    assert (mode, reason) == ("rule_based_fallback", "ai_timeout")
    reply: dict[str, Json] = {
        "selections": [
            {
                "event_id": str(candidate.activity_id),
                "fact_ids": ["a", "b", "invented"],
                "reason_code": "target_gap_reduction",
            }
        ]
    }
    assert (await ranked(FakeLlm(reply), [candidate], {"a": 1, "b": 2}, 0.1))[
        1
    ] == "rule_based_fallback"


async def test_real_http_adapter_contract() -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/chat/completions"
        assert b"response_format" in request.content
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": '{"selections": []}'}}]},
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(respond)
    ) as client:
        gateway = HttpLlmGateway(
            client, Settings(llm_endpoint="http://localhost:1234/v1")
        )
        assert await gateway.rank({"facts": {}}) == {"selections": []}


def test_external_ai_requires_opt_in_and_demo_production_is_rejected() -> None:
    with pytest.raises(ValueError):
        Settings(llm_endpoint="https://external.example/v1")
    with pytest.raises(ValueError):
        Settings(environment="production", demo_auth=True)
