from dataclasses import dataclass
from datetime import date
from uuid import UUID

from career_quest.shared.domain.core import require


def apply_effect(current: int, gain: int, max_level: int) -> int:
    require(
        all(type(v) is int for v in (current, gain, max_level))
        and 0 <= current <= 5
        and gain >= 0
        and 0 <= max_level <= 5,
        "invalid_effect",
        422,
    )
    return max(current, min(current + gain, max_level, 5))


@dataclass(frozen=True)
class Eligibility:
    allowed: bool
    reason: str
    next_session: date | None = None


def eligibility(
    *,
    role: str,
    grade: str,
    audiences: set[tuple[str, str]],
    prerequisites: dict[UUID, int],
    levels: dict[UUID, int],
    sessions: list[date],
    today: date,
    self_paced: bool,
    completed: bool,
    repeatable: bool,
) -> Eligibility:
    if audiences and (role, grade) not in audiences:
        return Eligibility(False, "audience_mismatch")
    if any(levels.get(s, 0) < n for s, n in prerequisites.items()):
        return Eligibility(False, "prerequisites_not_met")
    if completed and not repeatable:
        return Eligibility(False, "already_completed")
    future = sorted(d for d in sessions if d >= today)
    if not self_paced and not future:
        return Eligibility(False, "no_available_session")
    return Eligibility(True, "eligible", future[0] if future else None)
