import asyncio
import copy
from datetime import date
from pathlib import Path

import pytest

from career_quest.bootstrap import Runtime
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    Skill,
    SkillChange,
)
from career_quest.modules.data_import.application.importer import ImportDataset
from career_quest.modules.data_import.domain.package import Package
from career_quest.modules.data_import.infrastructure.parser import (
    read_directory,
)
from career_quest.modules.identity.domain.models import User
from career_quest.modules.learning.domain.models import (
    ActivityCompletion,
    Enrollment,
)
from career_quest.modules.people.domain.models import Employee
from career_quest.shared.domain.core import BusinessError, Json

pytestmark = pytest.mark.postgres
DATA_PATH = Path(__file__).resolve().parents[3] / "frontend/public/data"


def fixture_package() -> Package:
    employee: dict[str, Json] = {
        "employee_id": "EXTERNAL-9000",
        "full_name": "Synthetic imported person",
        "department": "Synthetic",
        "role": "Backend",
        "grade": "Junior",
        "manager_id": None,
        "hire_date": "2026-01-01",
        "tenure_months": 9,
        "work_format": "remote",
        "preferred_language": "en",
        "career_goal": None,
        "skills": {"SK_TEST": 1},
        "last_review_date": "2026-09-15",
    }

    def history(key: str, when: str, status: str) -> dict[str, Json]:
        return {
            "record_id": key,
            "employee_id": "EXTERNAL-9000",
            "event_id": "EV_036",
            "date": when,
            "due_date": None,
            "status": status,
            "completion_pct": "100",
            "score": None,
            "feedback_rating": None,
            "assigned_by": "self",
        }

    return Package(
        as_of_date=date(2026, 10, 1),
        skills=[
            {
                "skill_id": "SK_TEST",
                "name": "Synthetic skill",
                "type": "hard",
                "category": "engineering",
                "description": "Synthetic skill",
            }
        ],
        role_profiles=[
            {
                "role": "Backend",
                "grade": "Junior",
                "required_skills": {"SK_TEST": 3},
                "critical_skills": ["SK_TEST"],
            }
        ],
        employees=[employee],
        events=[
            {
                "event_id": "EV_036",
                "title": "Synthetic club",
                "description": "Synthetic",
                "type": "club",
                "format": "self_paced",
                "duration_hours": 1,
                "mandatory": False,
                "target_roles": ["Backend"],
                "target_grades": ["Junior"],
                "develops_skills": [
                    {"skill_id": "SK_TEST", "gain": 1, "max_level": 4}
                ],
                "prerequisites": {},
                "upcoming_sessions": [],
            }
        ],
        history=[
            history("R1", "2026-09-10", "completed"),
            history("R2", "2026-09-20", "completed"),
            history("R3", "2026-09-21", "in_progress"),
            history("R4", "2026-11-01", "completed"),
        ],
    )


async def test_import_idempotency_legacy_and_additional_profiles(
    runtime: Runtime,
) -> None:
    importer = ImportDataset(runtime.factory)
    package = fixture_package()
    preview = await importer.execute(package, "fixture", None, True)
    assert preview["dry_run"] is True
    async with runtime.factory() as uow:
        assert not await uow.store.find(Employee, source="fixture")
    first = await importer.execute(package, "fixture", None)
    assert first["report"]["warnings"] == [
        "future_history_excluded",
        "legacy_proxy",
    ]
    second = await importer.execute(package, "fixture", None)
    assert second["unchanged"] is True
    assert first["id"] == second["id"]
    async with runtime.factory() as uow:
        employee = (await uow.store.find(Employee, source="fixture"))[0]
        skills = await uow.store.find(EmployeeSkill, employee_id=employee.id)
        assert skills[0].verified_level == 2
        assert skills[0].provenance == "legacy_proxy"
        assert (
            len(await uow.store.find(Enrollment, employee_id=employee.id)) == 3
        )
        assert (
            len(await uow.store.find(SkillChange, employee_id=employee.id))
            == 1
        )
        assert all(
            c.completion_time_source == "legacy_proxy"
            for c in await uow.store.find(ActivityCompletion)
        )
        assert not await uow.store.find(User, employee_id=employee.id)
        version = employee.profile_version
    extra = copy.deepcopy(package.employees[0])
    extra["employee_id"] = "NEW-ANY-ID"
    extra["manager_id"] = "EXTERNAL-9000"
    await importer.execute(
        Package(package.as_of_date, employees=[extra]), "fixture", None
    )
    async with runtime.factory() as uow:
        assert len(await uow.store.find(Employee, source="fixture")) == 2
        assert (
            await uow.store.get(Employee, employee.id)
        ).profile_version == version


async def test_conflicts_and_bad_references_roll_back(
    runtime: Runtime,
) -> None:
    importer = ImportDataset(runtime.factory)
    package = fixture_package()
    await importer.execute(package, "fixture", None)
    conflicting = copy.deepcopy(package)
    conflicting.employees[0]["full_name"] = "Changed payload"
    with pytest.raises(BusinessError, match="import_conflict"):
        await importer.execute(conflicting, "fixture", None)
    broken = fixture_package()
    broken.employees[0]["skills"] = {"MISSING": 2}
    with pytest.raises(BusinessError, match="unknown_skill"):
        await importer.execute(broken, "broken", None)
    async with runtime.factory() as uow:
        assert not await uow.store.find(Skill, source="broken")
        assert not await uow.store.find(Employee, source="broken")


async def test_repository_source_dataset(runtime: Runtime) -> None:
    path = DATA_PATH
    if not await asyncio.to_thread(path.is_dir):
        pytest.skip("Canonical dataset is not present in this checkout")
    package = await asyncio.to_thread(read_directory, path)
    assert (
        len(package.employees),
        len(package.skills),
        len(package.events),
        len(package.role_profiles),
        len(package.history),
    ) == (200, 60, 40, 32, 2743)
    importer = ImportDataset(runtime.factory)
    result = await importer.execute(package, "canonical", None)
    assert result["report"]["employees"] == 200
    assert result["report"]["history_in_package"] == 2743
    again = await importer.execute(package, "canonical", None)
    assert again["unchanged"] is True
