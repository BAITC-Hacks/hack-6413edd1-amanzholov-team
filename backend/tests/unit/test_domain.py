from datetime import date
from uuid import uuid4

import pytest
from pydantic import ValidationError

from career_quest.modules.careers.domain.matching import Requirement, match
from career_quest.modules.competencies.domain.experience import experience_days
from career_quest.modules.learning.domain.progression import (
    apply_effect,
    eligibility,
)
from career_quest.shared.domain.core import BusinessError
from career_quest.shared.presentation.schemas import (
    ExperienceClaim,
    SkillClaim,
)


@pytest.mark.parametrize(
    "current,gain,cap,result",
    [
        (4, 1, 3, 4),
        (2, 9, 5, 5),
        (0, 2, 3, 2),
        (5, 0, 5, 5),
        (2, 1, 2, 2),
    ],
)
def test_effect_caps(current: int, gain: int, cap: int, result: int) -> None:
    assert apply_effect(current, gain, cap) == result


@pytest.mark.parametrize(
    "current,gain,cap", [(True, 1, 5), (1, -1, 5), (6, 1, 5)]
)
def test_invalid_effect(current: int, gain: int, cap: int) -> None:
    with pytest.raises(BusinessError):
        apply_effect(current, gain, cap)


def test_exact_matching_and_empty_requirements() -> None:
    one, two = uuid4(), uuid4()
    requirements = [Requirement(one, 3, True), Requirement(two, 2)]
    result = match({one: 2, two: 5}, requirements)
    assert result.coverage == pytest.approx(83.33333333)
    assert not result.ready_for_review
    assert result.gaps == ((one, 2, 3, True),)
    assert match({}, []).coverage is None
    assert not match({}, []).ready_for_review
    assert match({one: 3, two: 2}, requirements).ready_for_review


def test_union_of_experience() -> None:
    assert (
        experience_days(
            [
                (date(2026, 1, 1), date(2026, 1, 10)),
                (date(2026, 1, 5), date(2026, 1, 15)),
            ]
        )
        == 15
    )


def test_eligibility() -> None:
    skill = uuid4()
    args = dict(
        role="Backend",
        grade="Junior",
        audiences={("Backend", "Junior")},
        prerequisites={skill: 2},
        levels={skill: 2},
        sessions=[],
        today=date(2026, 10, 1),
        self_paced=True,
        completed=False,
        repeatable=False,
    )
    assert eligibility(**args).allowed
    assert not eligibility(**{**args, "levels": {skill: 1}}).allowed
    assert not eligibility(**{**args, "grade": "Senior"}).allowed
    assert not eligibility(**{**args, "completed": True}).allowed
    assert not eligibility(
        **{**args, "self_paced": False, "sessions": [date(2026, 9, 1)]}
    ).allowed


def test_commands_reject_unknown_and_bool_levels() -> None:
    base = {
        "skill_id": str(uuid4()),
        "claimed_level": 3,
        "evidence": "Portfolio",
    }
    assert SkillClaim.model_validate(base).claimed_level == 3
    for invalid in [
        {**base, "employee_id": str(uuid4())},
        {**base, "claimed_level": True},
        {**base, "claimed_level": 6},
    ]:
        with pytest.raises(ValidationError):
            SkillClaim.model_validate(invalid)
    claim = ExperienceClaim.model_validate(
        {
            "project": "Synthetic",
            "role": "Dev",
            "start_date": "2026-01-01",
            "end_date": "2026-02-01",
            "contribution": "Built tests",
            "skill_ids": [],
            "evidence": "Test report",
        }
    )
    assert claim.start_date == date(2026, 1, 1)
