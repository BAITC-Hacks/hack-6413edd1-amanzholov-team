from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class Requirement:
    skill_id: UUID
    level: int
    critical: bool = False


@dataclass(frozen=True)
class Match:
    coverage: float | None
    ready_for_review: bool
    reason_code: str
    gaps: tuple[tuple[UUID, int, int, bool], ...]


def match(levels: dict[UUID, int], requirements: list[Requirement]) -> Match:
    positive = [r for r in requirements if r.level > 0]
    if not positive:
        return Match(None, False, "requirements_not_configured", ())
    gaps = tuple(
        (r.skill_id, levels.get(r.skill_id, 0), r.level, r.critical)
        for r in positive
        if levels.get(r.skill_id, 0) < r.level
    )
    coverage = (
        100
        * sum(min(levels.get(r.skill_id, 0) / r.level, 1) for r in positive)
        / len(positive)
    )
    return Match(
        coverage, not gaps, "ready_for_review" if not gaps else "gaps", gaps
    )
