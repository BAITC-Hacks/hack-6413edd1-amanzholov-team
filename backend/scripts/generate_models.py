"""Generate explicit ORM rows from the domain's scalar record contracts."""

import dataclasses
import importlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
MODULES = [
    "modules.identity.domain.models", "modules.careers.domain.models",
    "modules.people.domain.models", "modules.competencies.domain.models",
    "modules.learning.domain.models", "modules.recommendations.domain.models",
    "modules.data_import.domain.models", "shared.domain.audit",
]
FOREIGN = {
    "user_id": "user", "employee_id": "employee", "manager_id": "employee",
    "department_id": "department", "role_level_id": "role_level",
    "framework_id": "career_framework", "track_id": "career_track",
    "grade_id": "grade", "skill_id": "skill", "request_id": "verification_request",
    "previous_id": "verification_request", "reviewer_id": "user",
    "assigned_by": "user", "actor_id": "user", "created_by": "user",
    "decided_by": "user", "confirmed_by": "user", "vacancy_id": "vacancy",
    "from_level_id": "role_level", "to_level_id": "role_level",
    "activity_id": "activity", "session_id": "activity_session",
    "enrollment_id": "enrollment", "run_id": "recommendation_run",
    "batch_id": "import_batch",
}
UNIQUE = {
    "User": [("login",), ("employee_id",)],
    "Session": [("token_hash",)],
    "PermissionGrant": [("user_id", "department_id", "permission", "scope")],
    "Department": [("source", "name")],
    "Employee": [("source", "external_id")],
    "CatalogState": [("name",)],
    "Skill": [("source", "external_id")],
    "EmployeeSkill": [("employee_id", "skill_id")],
    "ExperienceSkill": [("request_id", "skill_id")],
    "ReviewerAssignment": [("request_id",)],
    "VerificationReview": [("request_id",)],
    "SkillChange": [("origin", "origin_id", "skill_id")],
    "CareerFramework": [("source", "name")],
    "CareerTrack": [("framework_id", "name")],
    "Grade": [("framework_id", "name")],
    "RoleLevel": [("track_id", "grade_id")],
    "RoleSkillRequirement": [("role_level_id", "skill_id")],
    "CareerTransition": [("from_level_id", "to_level_id")],
    "EmployeeCareerGoal": [("employee_id",)],
    "VacancyRequirement": [("vacancy_id", "skill_id")],
    "Activity": [("source", "external_id")],
    "ActivityAudience": [("activity_id", "role", "grade")],
    "ActivityPrerequisite": [("activity_id", "skill_id")],
    "ActivitySession": [("activity_id", "starts_on")],
    "ActivitySkillEffect": [("activity_id", "skill_id")],
    "Enrollment": [("employee_id", "activity_id", "participation_key"),
                   ("source", "external_id")],
    "CompletionRequest": [("enrollment_id",)],
    "ActivityCompletion": [("enrollment_id",)],
    "RecommendationItem": [("run_id", "activity_id"), ("run_id", "position")],
    "ImportRecord": [("source", "kind", "external_id")],
    "ImportBatch": [("source", "digest")],
    "IdempotencyRecord": [("user_id", "operation", "key")],
}
CHECKS = {
    "User": ["role IN ('employee','reviewer','hr','admin')",
             "ui_mode IN ('classic','rpg')", "locale IN ('ru','kk','en')"],
    "VerificationRequest": [
        "status IN ('draft','submitted','in_review','approved','rejected','needs_changes')",
        "kind IN ('skill','experience')",
        "(kind = 'skill' AND skill_id IS NOT NULL AND claimed_level IS NOT NULL) OR (kind = 'experience' AND start_date IS NOT NULL AND end_date >= start_date)",
    ],
    "VerificationReview": ["decision IN ('approved','rejected','needs_changes')"],
    "Vacancy": ["status IN ('open','closed')"],
    "Activity": ["duration_hours >= 0"],
    "ActivitySkillEffect": ["gain >= 0"],
    "CompletionRequest": ["status IN ('submitted','confirmed')"],
    "PromotionReview": ["status IN ('submitted','approved','rejected')"],
}


def main() -> None:
    output = [
        '"""Explicit ORM records. Domain records are never ORM-mapped."""',
        "from datetime import date, datetime", "from uuid import UUID",
        "from sqlalchemy import (Boolean, CheckConstraint, Date, DateTime,",
        "    Float, ForeignKey, Integer, MetaData, Text, UniqueConstraint, Uuid)",
        "from sqlalchemy.dialects.postgresql import JSONB",
        "from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column",
        "from career_quest.shared.domain.core import Entity, Json",
    ]
    entities = []
    for path in MODULES:
        module = importlib.import_module(f"career_quest.{path}")
        for name, cls in vars(module).items():
            if isinstance(cls, type) and cls.__module__ == module.__name__:
                entities.append(cls)
                output.append(f"from career_quest.{path} import {name}")
    output += [
        "class Base(DeclarativeBase):",
        "    id: Mapped[UUID]",
        "    metadata = MetaData(naming_convention={",
        "        'ix': 'ix_%(table_name)s_%(column_0_name)s',",
        "        'uq': 'uq_%(table_name)s_%(column_0_name)s',",
        "        'ck': 'ck_%(table_name)s_%(constraint_name)s',",
        "        'fk': 'fk_%(table_name)s_%(column_0_name)s',",
        "        'pk': 'pk_%(table_name)s',",
        "    })",
    ]
    for cls in entities:
        table = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        output += [f"class {cls.__name__}Row(Base):", f"    __tablename__ = '{table}'"]
        checks = CHECKS.get(cls.__name__, []).copy()
        for f in dataclasses.fields(cls):
            hint = str(f.type)
            if hint.startswith("<class '"):
                hint = hint[8:-2].split(".")[-1]
            hint = hint.replace("uuid.UUID", "UUID").replace("datetime.", "")
            nullable = "None" in hint
            plain = hint.split(" | ")[0]
            sql = {"UUID": "Uuid", "str": "Text", "int": "Integer",
                   "bool": "Boolean", "float": "Float", "date": "Date",
                   "datetime": "DateTime(timezone=True)"}.get(plain, "JSONB")
            args = [sql]
            if f.name == "id":
                args.append("primary_key=True")
            elif f.name in FOREIGN:
                args += [f"ForeignKey('{FOREIGN[f.name]}.id')", "index=True"]
            args.append(f"nullable={nullable}")
            output.append(f"    {f.name}: Mapped[{hint}] = mapped_column({', '.join(args)})")
            if f.name in {"verified_level", "claimed_level", "observed_level",
                          "required_level", "max_level", "before_level", "after_level"}:
                checks.append(f"{f.name} BETWEEN 0 AND 5")
            if f.name.endswith("version") or f.name == "version":
                checks.append(f"{f.name} >= 1")
        output.append("    __table_args__ = (")
        for columns in UNIQUE.get(cls.__name__, []):
            output.append(f"        UniqueConstraint({', '.join(repr(x) for x in columns)}),")
        for i, check in enumerate(checks):
            output.append(f"        CheckConstraint({check!r}, name='rule_{i}'),")
        output.append("    )")
    output.append("ROW_TYPES: dict[type[Entity], type[Base]] = {")
    output += [f"    {cls.__name__}: {cls.__name__}Row," for cls in entities]
    output.append("}")
    target = ROOT / "src/career_quest/infrastructure/database/models.py"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(output) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
