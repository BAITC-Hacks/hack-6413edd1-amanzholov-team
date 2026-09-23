from datetime import date
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StrictInt,
    model_validator,
)

from career_quest.shared.domain.core import Json

type Level = Annotated[StrictInt, Field(ge=0, le=5)]
type Text = Annotated[str, Field(min_length=3, max_length=4000)]


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(Command):
    login: Annotated[str, Field(min_length=1, max_length=100)]
    password: Annotated[str, Field(min_length=1, max_length=200)]


class Preferences(Command):
    ui_mode: Literal["classic", "rpg"]
    locale: Literal["ru", "kk", "en"] = "ru"
    reduced_motion: bool = False


class SkillClaim(Command):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "skill_id": "00000000-0000-0000-0000-000000000001",
                    "claimed_level": 3,
                    "evidence": "Описание выполненного задания",
                }
            ]
        },
    )
    skill_id: UUID
    claimed_level: Level
    evidence: Text
    reference: HttpUrl | None = None
    draft: bool = False


class ExperienceClaim(Command):
    project: Annotated[str, Field(min_length=1, max_length=200)]
    start_date: date
    end_date: date
    role: Annotated[str, Field(min_length=1, max_length=200)]
    contribution: Text
    skill_ids: Annotated[list[UUID], Field(max_length=60)]
    evidence: Text

    @model_validator(mode="after")
    def dates_valid(self) -> Self:
        if self.start_date > self.end_date:
            raise ValueError("end_date must not precede start_date")
        return self


class Assignment(Command):
    assignee_user_id: UUID


class Review(Command):
    decision: Literal["approved", "rejected", "needs_changes"]
    observed_level: Level | None = None
    rubric: Text
    rationale: Text


class Appeal(Command):
    evidence: Text
    claimed_level: Level | None = None


class Goal(Command):
    role_level_id: UUID | None = None
    vacancy_id: UUID | None = None

    @model_validator(mode="after")
    def one_target(self) -> Self:
        if (self.role_level_id is None) == (self.vacancy_id is None):
            raise ValueError("Exactly one target is required")
        return self


class RequirementInput(Command):
    skill_id: UUID
    required_level: Level
    critical: bool = False


class VacancyInput(Command):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    role_level_id: UUID
    department_id: UUID
    status: Literal["open", "closed"] = "open"
    is_demo: bool = True
    requirements: Annotated[list[RequirementInput], Field(max_length=100)]


class VacancyPatch(Command):
    title: Annotated[str, Field(min_length=1, max_length=200)] | None = None
    status: Literal["open", "closed"] | None = None
    requirements: (
        Annotated[list[RequirementInput], Field(max_length=100)] | None
    ) = None


class PromotionInput(Command):
    role_level_id: UUID


class Decision(Command):
    approve: bool
    rationale: Text


class EnrollmentInput(Command):
    session_id: UUID | None = None


class CompletionInput(Command):
    evidence: Text


class SimulationInput(Command):
    activity_ids: Annotated[list[UUID], Field(min_length=1, max_length=10)]


class Page(BaseModel):
    offset: Annotated[int, Field(ge=0, le=100000)] = 0
    limit: Annotated[int, Field(ge=1, le=100)] = 50


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: dict[str, Json]
    request_id: str
