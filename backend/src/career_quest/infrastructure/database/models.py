"""Explicit ORM records. Domain records are never ORM-mapped."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from career_quest.modules.careers.domain.models import (
    CareerFramework,
    CareerTrack,
    CareerTransition,
    EmployeeCareerGoal,
    Grade,
    PromotionReview,
    RoleLevel,
    RoleSkillRequirement,
    Vacancy,
    VacancyRequirement,
)
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    Evidence,
    ExperienceSkill,
    ReviewerAssignment,
    Skill,
    SkillChange,
    VerificationRequest,
    VerificationReview,
)
from career_quest.modules.data_import.domain.models import (
    ImportBatch,
    ImportIssue,
    ImportRecord,
)
from career_quest.modules.identity.domain.models import (
    PermissionGrant,
    Session,
    User,
)
from career_quest.modules.learning.domain.models import (
    Activity,
    ActivityAudience,
    ActivityCompletion,
    ActivityPrerequisite,
    ActivitySession,
    ActivitySkillEffect,
    CompletionRequest,
    Enrollment,
)
from career_quest.modules.people.domain.models import (
    CatalogState,
    Department,
    Employee,
)
from career_quest.modules.recommendations.domain.models import (
    RecommendationItem,
    RecommendationRun,
)
from career_quest.shared.domain.audit import AuditEvent, IdempotencyRecord
from career_quest.shared.domain.core import Entity, Json


class Base(DeclarativeBase):
    id: Mapped[UUID]
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class UserRow(Base):
    __tablename__ = "user"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    login: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    ui_mode: Mapped[str] = mapped_column(Text, nullable=False)
    locale: Mapped[str] = mapped_column(Text, nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, nullable=False)
    __table_args__ = (
        UniqueConstraint("login"),
        UniqueConstraint("employee_id"),
        CheckConstraint(
            "role IN ('employee','reviewer','hr','admin')", name="rule_0"
        ),
        CheckConstraint("ui_mode IN ('classic','rpg')", name="rule_1"),
        CheckConstraint("locale IN ('ru','kk','en')", name="rule_2"),
    )


class SessionRow(Base):
    __tablename__ = "session"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False)
    __table_args__ = (UniqueConstraint("token_hash"),)


class PermissionGrantRow(Base):
    __tablename__ = "permission_grant"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=False
    )
    department_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("department.id"), index=True, nullable=False
    )
    permission: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (
        UniqueConstraint("user_id", "department_id", "permission", "scope"),
    )


class CareerFrameworkRow(Base):
    __tablename__ = "career_framework"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("source", "name"),
        CheckConstraint("version >= 1", name="rule_0"),
    )


class CareerTrackRow(Base):
    __tablename__ = "career_track"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    framework_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("career_framework.id"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("framework_id", "name"),)


class GradeRow(Base):
    __tablename__ = "grade"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    framework_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("career_framework.id"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    audience_grade: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("framework_id", "name"),)


class RoleLevelRow(Base):
    __tablename__ = "role_level"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    track_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("career_track.id"), index=True, nullable=False
    )
    grade_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("grade.id"), index=True, nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("track_id", "grade_id"),
        CheckConstraint("version >= 1", name="rule_0"),
    )


class RoleSkillRequirementRow(Base):
    __tablename__ = "role_skill_requirement"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    role_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    required_level: Mapped[int] = mapped_column(Integer, nullable=False)
    critical: Mapped[bool] = mapped_column(Boolean, nullable=False)
    __table_args__ = (
        UniqueConstraint("role_level_id", "skill_id"),
        CheckConstraint("required_level BETWEEN 0 AND 5", name="rule_0"),
    )


class CareerTransitionRow(Base):
    __tablename__ = "career_transition"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    from_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    to_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("from_level_id", "to_level_id"),)


class EmployeeCareerGoalRow(Base):
    __tablename__ = "employee_career_goal"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    role_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    vacancy_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("vacancy.id"), index=True, nullable=True
    )
    __table_args__ = (UniqueConstraint("employee_id"),)


class VacancyRow(Base):
    __tablename__ = "vacancy"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    role_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    department_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("department.id"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        CheckConstraint("status IN ('open','closed')", name="rule_0"),
        CheckConstraint("version >= 1", name="rule_1"),
    )


class VacancyRequirementRow(Base):
    __tablename__ = "vacancy_requirement"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    vacancy_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("vacancy.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    required_level: Mapped[int] = mapped_column(Integer, nullable=False)
    critical: Mapped[bool] = mapped_column(Boolean, nullable=False)
    __table_args__ = (
        UniqueConstraint("vacancy_id", "skill_id"),
        CheckConstraint("required_level BETWEEN 0 AND 5", name="rule_0"),
    )


class PromotionReviewRow(Base):
    __tablename__ = "promotion_review"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    role_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    profile_version: Mapped[int] = mapped_column(Integer, nullable=False)
    requirements_version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    decided_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=True
    )
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    __table_args__ = (
        CheckConstraint(
            "status IN ('submitted','approved','rejected')", name="rule_0"
        ),
        CheckConstraint("profile_version >= 1", name="rule_1"),
        CheckConstraint("requirements_version >= 1", name="rule_2"),
    )


class DepartmentRow(Base):
    __tablename__ = "department"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("source", "name"),)


class EmployeeRow(Base):
    __tablename__ = "employee"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    department_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("department.id"), index=True, nullable=False
    )
    role_level_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("role_level.id"), index=True, nullable=False
    )
    last_review_date: Mapped[date] = mapped_column(Date, nullable=False)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    manager_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=True
    )
    preferred_language: Mapped[str] = mapped_column(Text, nullable=False)
    work_format: Mapped[str] = mapped_column(Text, nullable=False)
    profile_version: Mapped[int] = mapped_column(Integer, nullable=False)
    history_version: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("source", "external_id"),
        CheckConstraint("profile_version >= 1", name="rule_0"),
        CheckConstraint("history_version >= 1", name="rule_1"),
    )


class CatalogStateRow(Base):
    __tablename__ = "catalog_state"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    catalog_version: Mapped[int] = mapped_column(Integer, nullable=False)
    policy_version: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("name"),
        CheckConstraint("catalog_version >= 1", name="rule_0"),
        CheckConstraint("policy_version >= 1", name="rule_1"),
    )


class SkillRow(Base):
    __tablename__ = "skill"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("source", "external_id"),)


class EmployeeSkillRow(Base):
    __tablename__ = "employee_skill"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    verified_level: Mapped[int] = mapped_column(Integer, nullable=False)
    claimed_level: Mapped[int] = mapped_column(Integer, nullable=False)
    provenance: Mapped[str] = mapped_column(Text, nullable=False)
    assessed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    __table_args__ = (
        UniqueConstraint("employee_id", "skill_id"),
        CheckConstraint("verified_level BETWEEN 0 AND 5", name="rule_0"),
        CheckConstraint("claimed_level BETWEEN 0 AND 5", name="rule_1"),
    )


class VerificationRequestRow(Base):
    __tablename__ = "verification_request"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    profile_version: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("verification_request.id"), index=True, nullable=True
    )
    skill_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=True
    )
    claimed_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    project: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    project_role: Mapped[str | None] = mapped_column(Text, nullable=True)
    contribution: Mapped[str | None] = mapped_column(Text, nullable=True)
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','submitted','in_review',"
            "'approved','rejected','needs_changes')",
            name="rule_0",
        ),
        CheckConstraint("kind IN ('skill','experience')", name="rule_1"),
        CheckConstraint(
            "(kind = 'skill' AND skill_id IS NOT NULL "
            "AND claimed_level IS NOT NULL) OR (kind = 'experience' "
            "AND start_date IS NOT NULL AND end_date >= start_date)",
            name="rule_2",
        ),
        CheckConstraint("profile_version >= 1", name="rule_3"),
        CheckConstraint("version >= 1", name="rule_4"),
        CheckConstraint("claimed_level BETWEEN 0 AND 5", name="rule_5"),
    )


class ExperienceSkillRow(Base):
    __tablename__ = "experience_skill"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    request_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("verification_request.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    __table_args__ = (UniqueConstraint("request_id", "skill_id"),)


class EvidenceRow(Base):
    __tablename__ = "evidence"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    request_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("verification_request.id"), index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    __table_args__ = ()


class ReviewerAssignmentRow(Base):
    __tablename__ = "reviewer_assignment"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    request_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("verification_request.id"), index=True, nullable=False
    )
    reviewer_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=False
    )
    assigned_by: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=False
    )
    __table_args__ = (UniqueConstraint("request_id"),)


class VerificationReviewRow(Base):
    __tablename__ = "verification_review"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    request_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("verification_request.id"), index=True, nullable=False
    )
    reviewer_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=False
    )
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    rubric: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    observed_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    __table_args__ = (
        UniqueConstraint("request_id"),
        CheckConstraint(
            "decision IN ('approved','rejected','needs_changes')",
            name="rule_0",
        ),
        CheckConstraint("observed_level BETWEEN 0 AND 5", name="rule_1"),
    )


class SkillChangeRow(Base):
    __tablename__ = "skill_change"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    before_level: Mapped[int] = mapped_column(Integer, nullable=False)
    after_level: Mapped[int] = mapped_column(Integer, nullable=False)
    origin: Mapped[str] = mapped_column(Text, nullable=False)
    origin_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    __table_args__ = (
        UniqueConstraint("origin", "origin_id", "skill_id"),
        CheckConstraint("before_level BETWEEN 0 AND 5", name="rule_0"),
        CheckConstraint("after_level BETWEEN 0 AND 5", name="rule_1"),
    )


class ActivityRow(Base):
    __tablename__ = "activity"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(Text, nullable=False)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False)
    mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False)
    repeatable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    grants_verified: Mapped[bool] = mapped_column(Boolean, nullable=False)
    language: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (
        UniqueConstraint("source", "external_id"),
        CheckConstraint("duration_hours >= 0", name="rule_0"),
    )


class ActivityAudienceRow(Base):
    __tablename__ = "activity_audience"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    activity_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("activity.id"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    grade: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("activity_id", "role", "grade"),)


class ActivityPrerequisiteRow(Base):
    __tablename__ = "activity_prerequisite"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    activity_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("activity.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    required_level: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("activity_id", "skill_id"),
        CheckConstraint("required_level BETWEEN 0 AND 5", name="rule_0"),
    )


class ActivitySessionRow(Base):
    __tablename__ = "activity_session"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    activity_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("activity.id"), index=True, nullable=False
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    __table_args__ = (UniqueConstraint("activity_id", "starts_on"),)


class ActivitySkillEffectRow(Base):
    __tablename__ = "activity_skill_effect"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    activity_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("activity.id"), index=True, nullable=False
    )
    skill_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("skill.id"), index=True, nullable=False
    )
    gain: Mapped[int] = mapped_column(Integer, nullable=False)
    max_level: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("activity_id", "skill_id"),
        CheckConstraint("gain >= 0", name="rule_0"),
        CheckConstraint("max_level BETWEEN 0 AND 5", name="rule_1"),
    )


class EnrollmentRow(Base):
    __tablename__ = "enrollment"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    activity_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("activity.id"), index=True, nullable=False
    )
    participation_key: Mapped[str] = mapped_column(Text, nullable=False)
    enrolled_on: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    session_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("activity_session.id"), index=True, nullable=True
    )
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    __table_args__ = (
        UniqueConstraint("employee_id", "activity_id", "participation_key"),
        UniqueConstraint("source", "external_id"),
    )


class CompletionRequestRow(Base):
    __tablename__ = "completion_request"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("enrollment.id"), index=True, nullable=False
    )
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (
        UniqueConstraint("enrollment_id"),
        CheckConstraint("status IN ('submitted','confirmed')", name="rule_0"),
    )


class ActivityCompletionRow(Base):
    __tablename__ = "activity_completion"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("enrollment.id"), index=True, nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completion_time_source: Mapped[str] = mapped_column(Text, nullable=False)
    confirmed_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=True
    )
    __table_args__ = (UniqueConstraint("enrollment_id"),)


class RecommendationRunRow(Base):
    __tablename__ = "recommendation_run"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    employee_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("employee.id"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    locale: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(Text, nullable=False)
    reason_code: Mapped[str] = mapped_column(Text, nullable=False)
    versions: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    snapshot: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    __table_args__ = ()


class RecommendationItemRow(Base):
    __tablename__ = "recommendation_item"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    run_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("recommendation_run.id"), index=True, nullable=False
    )
    activity_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("activity.id"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    __table_args__ = (
        UniqueConstraint("run_id", "activity_id"),
        UniqueConstraint("run_id", "position", name="uq_run_position"),
    )


class ImportBatchRow(Base):
    __tablename__ = "import_batch"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    digest: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=True
    )
    report: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    __table_args__ = (UniqueConstraint("source", "digest"),)


class ImportRecordRow(Base):
    __tablename__ = "import_record"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    digest: Mapped[str] = mapped_column(Text, nullable=False)
    __table_args__ = (UniqueConstraint("source", "kind", "external_id"),)


class ImportIssueRow(Base):
    __tablename__ = "import_issue"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    batch_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("import_batch.id"), index=True, nullable=False
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    __table_args__ = ()


class AuditEventRow(Base):
    __tablename__ = "audit_event"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    actor_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=True
    )
    operation: Mapped[str] = mapped_column(Text, nullable=False)
    object_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    details: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    __table_args__ = ()


class IdempotencyRecordRow(Base):
    __tablename__ = "idempotency_record"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, nullable=False)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user.id"), index=True, nullable=False
    )
    operation: Mapped[str] = mapped_column(Text, nullable=False)
    key: Mapped[str] = mapped_column(Text, nullable=False)
    payload_hash: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[dict[str, Json]] = mapped_column(JSONB, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "operation", "key"),)


ROW_TYPES: dict[type[Entity], type[Base]] = {
    User: UserRow,
    Session: SessionRow,
    PermissionGrant: PermissionGrantRow,
    CareerFramework: CareerFrameworkRow,
    CareerTrack: CareerTrackRow,
    Grade: GradeRow,
    RoleLevel: RoleLevelRow,
    RoleSkillRequirement: RoleSkillRequirementRow,
    CareerTransition: CareerTransitionRow,
    EmployeeCareerGoal: EmployeeCareerGoalRow,
    Vacancy: VacancyRow,
    VacancyRequirement: VacancyRequirementRow,
    PromotionReview: PromotionReviewRow,
    Department: DepartmentRow,
    Employee: EmployeeRow,
    CatalogState: CatalogStateRow,
    Skill: SkillRow,
    EmployeeSkill: EmployeeSkillRow,
    VerificationRequest: VerificationRequestRow,
    ExperienceSkill: ExperienceSkillRow,
    Evidence: EvidenceRow,
    ReviewerAssignment: ReviewerAssignmentRow,
    VerificationReview: VerificationReviewRow,
    SkillChange: SkillChangeRow,
    Activity: ActivityRow,
    ActivityAudience: ActivityAudienceRow,
    ActivityPrerequisite: ActivityPrerequisiteRow,
    ActivitySession: ActivitySessionRow,
    ActivitySkillEffect: ActivitySkillEffectRow,
    Enrollment: EnrollmentRow,
    CompletionRequest: CompletionRequestRow,
    ActivityCompletion: ActivityCompletionRow,
    RecommendationRun: RecommendationRunRow,
    RecommendationItem: RecommendationItemRow,
    ImportBatch: ImportBatchRow,
    ImportRecord: ImportRecordRow,
    ImportIssue: ImportIssueRow,
    AuditEvent: AuditEventRow,
    IdempotencyRecord: IdempotencyRecordRow,
}
