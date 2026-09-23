from dataclasses import replace
from datetime import date
from uuid import UUID, uuid4

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
from career_quest.modules.identity.domain.models import User
from career_quest.modules.people.domain.models import Employee
from career_quest.shared.application.commands import audit, public
from career_quest.shared.application.ports import Store
from career_quest.shared.application.security import admin, authorize, own
from career_quest.shared.domain.core import Json, SystemClock, require


async def submit_skill_claim(
    store: Store,
    actor: User,
    skill_id: UUID,
    level: int,
    description: str,
    reference: str | None,
    draft: bool,
) -> dict[str, Json]:
    employee = await store.get(Employee, actor.employee_id, lock=True)
    await store.get(Skill, skill_id)
    claim = VerificationRequest(
        employee_id=employee.id,
        kind="skill",
        status="draft" if draft else "submitted",
        profile_version=employee.profile_version,
        skill_id=skill_id,
        claimed_level=level,
    )
    await store.save(claim)
    await store.save(
        Evidence(
            request_id=claim.id, description=description, reference=reference
        )
    )
    rows = await store.find(
        EmployeeSkill, employee_id=employee.id, skill_id=skill_id
    )
    skill = (
        rows[0]
        if rows
        else EmployeeSkill(
            employee_id=employee.id, skill_id=skill_id, verified_level=0
        )
    )
    skill.claimed_level = level
    await store.save(skill)
    employee.profile_version += 1
    claim.profile_version = employee.profile_version
    await store.save(employee)
    await store.save(claim)
    await audit(store, actor, "submit_skill_claim", claim)
    return public(claim)


async def submit_experience_claim(
    store: Store,
    actor: User,
    project: str,
    start: date,
    end: date,
    role: str,
    contribution: str,
    skills: list[UUID],
    evidence: str,
) -> dict[str, Json]:
    employee = await store.get(Employee, actor.employee_id, lock=True)
    require(end >= start, "invalid_period", 422)
    for skill in skills:
        await store.get(Skill, skill)
    claim = VerificationRequest(
        employee_id=employee.id,
        kind="experience",
        status="submitted",
        profile_version=employee.profile_version,
        project=project,
        start_date=start,
        end_date=end,
        project_role=role,
        contribution=contribution,
    )
    await store.save(claim)
    for skill in sorted(set(skills)):
        await store.save(ExperienceSkill(request_id=claim.id, skill_id=skill))
    await store.save(Evidence(request_id=claim.id, description=evidence))
    await audit(store, actor, "submit_experience_claim", claim)
    return public(claim)


async def assign_reviewer(
    store: Store, actor: User, request_id: UUID, reviewer_id: UUID
) -> dict[str, Json]:
    admin(actor)
    claim = await store.get(VerificationRequest, request_id, lock=True)
    require(claim.status == "submitted", "invalid_status")
    employee = await store.get(Employee, claim.employee_id)
    reviewer = await store.get(User, reviewer_id)
    require(reviewer.employee_id != employee.id, "self_review", 403)
    await authorize(
        store,
        reviewer,
        employee,
        "review",
        str(claim.skill_id) if claim.skill_id else "experience",
    )
    if claim.previous_id:
        previous = await store.find(
            ReviewerAssignment, request_id=claim.previous_id
        )
        require(
            not any(p.reviewer_id == reviewer_id for p in previous),
            "independent_reviewer_required",
            403,
        )
    assignment = ReviewerAssignment(
        request_id=claim.id, reviewer_id=reviewer.id, assigned_by=actor.id
    )
    await store.save(assignment)
    claim.status = "in_review"
    await store.save(claim)
    await audit(store, actor, "assign_reviewer", assignment)
    return public(assignment)


async def review_claim(
    store: Store,
    actor: User,
    request_id: UUID,
    decision: str,
    observed_level: int | None,
    rubric: str,
    rationale: str,
    today: date,
) -> dict[str, Json]:
    initial = await store.get(VerificationRequest, request_id)
    employee = await store.get(Employee, initial.employee_id, lock=True)
    claim = await store.get(VerificationRequest, request_id, lock=True)
    require(employee.id != actor.employee_id, "self_review", 403)
    assignments = await store.find(
        ReviewerAssignment, request_id=claim.id, reviewer_id=actor.id
    )
    require(bool(assignments), "not_assigned", 403)
    await authorize(
        store,
        actor,
        employee,
        "review",
        str(claim.skill_id) if claim.skill_id else "experience",
    )
    require(claim.status == "in_review", "already_decided")
    require(
        decision in {"approved", "rejected", "needs_changes"},
        "invalid_decision",
        422,
    )
    if decision == "approved" and claim.kind == "skill":
        require(
            employee.profile_version == claim.profile_version,
            "profile_version_conflict",
        )
        require(observed_level is not None, "observed_level_required", 422)
        assert claim.skill_id is not None and observed_level is not None
        rows = await store.find(
            EmployeeSkill, employee_id=employee.id, skill_id=claim.skill_id
        )
        skill = rows[0]
        require(
            observed_level >= skill.verified_level, "reassessment_required"
        )
        await store.save(
            SkillChange(
                employee_id=employee.id,
                skill_id=skill.skill_id,
                before_level=skill.verified_level,
                after_level=observed_level,
                origin="review",
                origin_id=claim.id,
                created_at=SystemClock().now(),
            )
        )
        skill.verified_level = observed_level
        skill.provenance = "reviewed_assessment"
        skill.assessed_on = today
        await store.save(skill)
        employee.profile_version += 1
        await store.save(employee)
    if decision == "approved" and claim.kind == "experience":
        employee.history_version += 1
        await store.save(employee)
    review = VerificationReview(
        request_id=claim.id,
        reviewer_id=actor.id,
        decision=decision,
        observed_level=observed_level,
        rubric=rubric,
        rationale=rationale,
        created_at=SystemClock().now(),
    )
    await store.save(review)
    claim.status = decision
    await store.save(claim)
    await audit(store, actor, "review_claim", review)
    return public(claim)


async def revise_claim(
    store: Store,
    actor: User,
    request_id: UUID,
    description: str,
    level: int | None = None,
) -> dict[str, Json]:
    old = await store.get(VerificationRequest, request_id)
    own(actor, old.employee_id)
    employee = await store.get(Employee, old.employee_id, lock=True)
    require(
        old.status in {"rejected", "needs_changes", "approved"},
        "invalid_status",
    )
    require(
        not await store.find(VerificationRequest, previous_id=old.id),
        "revision_exists",
    )
    claim = replace(
        old,
        id=uuid4(),
        previous_id=old.id,
        version=old.version + 1,
        status="submitted",
        profile_version=employee.profile_version,
    )
    if level is not None:
        require(claim.kind == "skill", "invalid_claim_kind", 422)
        claim.claimed_level = level
        skills = await store.find(
            EmployeeSkill, employee_id=employee.id, skill_id=claim.skill_id
        )
        skills[0].claimed_level = level
        await store.save(skills[0])
        employee.profile_version += 1
        claim.profile_version = employee.profile_version
        await store.save(employee)
    await store.save(claim)
    await store.save(Evidence(request_id=claim.id, description=description))
    for link in await store.find(ExperienceSkill, request_id=old.id):
        await store.save(replace(link, id=uuid4(), request_id=claim.id))
    await audit(store, actor, "revise_claim", claim)
    return public(claim)


async def submit_draft(
    store: Store, actor: User, request_id: UUID
) -> dict[str, Json]:
    claim = await store.get(VerificationRequest, request_id, lock=True)
    own(actor, claim.employee_id)
    require(claim.status == "draft", "invalid_status")
    employee = await store.get(Employee, claim.employee_id)
    claim.profile_version = employee.profile_version
    claim.status = "submitted"
    await store.save(claim)
    await audit(store, actor, "submit_draft", claim)
    return public(claim)


async def request_detail(
    store: Store, actor: User, request_id: UUID
) -> dict[str, Json]:
    claim = await store.get(VerificationRequest, request_id)
    assignments = await store.find(
        ReviewerAssignment, request_id=claim.id, reviewer_id=actor.id
    )
    require(
        actor.employee_id == claim.employee_id or bool(assignments),
        "forbidden",
        403,
    )
    result = public(claim)
    result["evidence"] = [
        public(e) for e in await store.find(Evidence, request_id=claim.id)
    ]
    result["reviews"] = [
        public(r)
        for r in await store.find(VerificationReview, request_id=claim.id)
    ]
    return result
