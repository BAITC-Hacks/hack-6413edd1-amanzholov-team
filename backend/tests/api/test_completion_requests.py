import httpx
import pytest
from conftest import login

from career_quest.bootstrap import Runtime
from career_quest.demo import demo_id
from career_quest.modules.learning.domain.models import (
    CompletionRequest,
    Enrollment,
)

pytestmark = pytest.mark.postgres

PATH = "/api/v1/me/completion-requests"


@pytest.fixture
async def completion_requests(
    runtime: Runtime,
) -> dict[str, list[CompletionRequest]]:
    requests: dict[str, list[CompletionRequest]] = {}
    async with runtime.factory() as uow:
        for name, count in [("employee", 3), ("reviewer", 1), ("outsider", 1)]:
            requests[name] = []
            for index in range(count):
                enrollment = Enrollment(
                    employee_id=demo_id("employee:" + name),
                    activity_id=demo_id("activity"),
                    participation_key=f"test:{index}",
                    enrolled_on=runtime.clock.today(),
                )
                await uow.store.save(enrollment)
                request = CompletionRequest(
                    enrollment_id=enrollment.id,
                    evidence=f"Private completion evidence for {name}:{index}",
                    status="confirmed" if index == 1 else "submitted",
                )
                await uow.store.save(request)
                requests[name].append(request)
        await uow.commit()
    return requests


async def test_completion_requests_require_authentication(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get(PATH)
    assert response.status_code == 401


@pytest.mark.parametrize("name", ["employee", "reviewer", "outsider"])
async def test_completion_requests_include_only_owned_enrollments(
    client: httpx.AsyncClient,
    completion_requests: dict[str, list[CompletionRequest]],
    name: str,
) -> None:
    response = await client.get(PATH, headers=await login(client, name))
    assert response.status_code == 200, response.text
    result = response.json()
    owned = completion_requests[name]
    assert result["total"] == len(owned)
    assert {item["id"] for item in result["items"]} == {
        str(request.id) for request in owned
    }
    expected = {
        str(request.id): {
            "id": str(request.id),
            "enrollment_id": str(request.enrollment_id),
            "evidence": request.evidence,
            "status": request.status,
        }
        for request in owned
    }
    for item in result["items"]:
        assert item == expected[item["id"]]


async def test_completion_requests_paginate_after_filtering_by_owner(
    client: httpx.AsyncClient,
    completion_requests: dict[str, list[CompletionRequest]],
) -> None:
    employee = await login(client)
    received: list[str] = []
    for offset, expected_count in [(0, 2), (2, 1), (3, 0)]:
        response = await client.get(
            PATH,
            headers=employee,
            params={"offset": offset, "limit": 2},
        )
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["total"] == 3
        assert result["offset"] == offset
        assert result["limit"] == 2
        assert len(result["items"]) == expected_count
        received.extend(item["id"] for item in result["items"])
    assert len(received) == len(set(received)) == 3
    assert set(received) == {
        str(request.id) for request in completion_requests["employee"]
    }
