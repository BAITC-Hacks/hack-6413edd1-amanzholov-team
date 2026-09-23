from datetime import UTC, datetime, time
from uuid import UUID

from career_quest.modules.careers.domain.models import (
    CareerFramework,
    CareerTrack,
    CareerTransition,
    EmployeeCareerGoal,
    Grade,
    RoleLevel,
    RoleSkillRequirement,
)
from career_quest.modules.competencies.domain.models import (
    EmployeeSkill,
    Skill,
    SkillChange,
)
from career_quest.modules.data_import.domain.models import (
    ImportBatch,
    ImportIssue,
    ImportRecord,
)
from career_quest.modules.data_import.domain.package import (
    Package,
    day,
    digest,
    number,
    obj,
    seq,
    string,
)
from career_quest.modules.identity.domain.models import User
from career_quest.modules.learning.domain.models import (
    Activity,
    ActivityAudience,
    ActivityCompletion,
    ActivityPrerequisite,
    ActivitySession,
    ActivitySkillEffect,
    Enrollment,
)
from career_quest.modules.learning.domain.progression import apply_effect
from career_quest.modules.people.domain.models import (
    CatalogState,
    Department,
    Employee,
)
from career_quest.shared.application.commands import public
from career_quest.shared.application.ports import Store, UowFactory
from career_quest.shared.application.security import admin
from career_quest.shared.domain.audit import AuditEvent
from career_quest.shared.domain.core import (
    BusinessError,
    Json,
    SystemClock,
    require,
)


class ImportDataset:
    def __init__(self, factory: UowFactory) -> None:
        self.factory = factory

    async def execute(
        self,
        package: Package,
        source: str,
        actor: User | None,
        dry_run: bool = False,
    ) -> dict[str, Json]:
        if actor:
            admin(actor)
        async with self.factory() as uow:
            await uow.store.lock("catalog")
            require(
                all(
                    s.as_of_date == package.as_of_date
                    for s in await uow.store.find(CatalogState)
                ),
                "snapshot_date_conflict",
            )
            existing = await uow.store.find(
                ImportBatch, source=source, digest=package.fingerprint()
            )
            if existing:
                return {
                    **public(existing[0]),
                    "unchanged": True,
                    "dry_run": dry_run,
                }
            try:
                report = await self.apply(uow.store, package, source)
            except (KeyError, ValueError, TypeError) as exc:
                raise BusinessError("invalid_import", 422) from exc
            batch = ImportBatch(
                source=source,
                digest=package.fingerprint(),
                created_at=SystemClock().now(),
                created_by=actor.id if actor else None,
                report=report,
            )
            if not dry_run:
                await uow.store.save(batch)
                for warning in seq(report["warnings"]):
                    await uow.store.save(
                        ImportIssue(
                            batch_id=batch.id, code=string(warning), details={}
                        )
                    )
                await uow.store.save(
                    AuditEvent(
                        actor_id=actor.id if actor else None,
                        operation="import",
                        object_id=batch.id,
                        created_at=SystemClock().now(),
                        details={"source": source},
                    )
                )
                await uow.commit()
            return {**public(batch), "dry_run": dry_run, "unchanged": False}

    async def apply(
        self, store: Store, package: Package, source: str
    ) -> dict[str, Json]:
        ledger = {
            (r.kind, r.external_id): r
            for r in await store.find(ImportRecord, source=source)
        }
        pending: list[ImportRecord] = []

        def fresh(kind: str, key: str, payload: dict[str, Json]) -> bool:
            fingerprint = digest(payload)
            prior = ledger.get((kind, key))
            if prior:
                require(prior.digest == fingerprint, "import_conflict")
                return False
            record = ImportRecord(
                source=source, kind=kind, external_id=key, digest=fingerprint
            )
            ledger[(kind, key)] = record
            pending.append(record)
            return True

        states = await store.find(CatalogState, name=source)
        state = (
            states[0]
            if states
            else CatalogState(name=source, as_of_date=package.as_of_date)
        )
        require(
            state.as_of_date == package.as_of_date, "snapshot_date_conflict"
        )
        skills = {
            s.external_id: s for s in await store.find(Skill, source=source)
        }
        for raw in package.skills:
            key = string(raw["skill_id"])
            if fresh("skill", key, raw):
                skill = Skill(
                    source=source,
                    external_id=key,
                    name=string(raw["name"]),
                    kind=string(raw["type"]),
                    category=string(raw["category"]),
                    description=string(raw["description"]),
                )
                await store.save(skill)
                skills[key] = skill

        def skill_id(key: str) -> UUID:
            require(key in skills, "unknown_skill", 422)
            return skills[key].id

        frameworks = await store.find(CareerFramework, source=source)
        framework = (
            frameworks[0]
            if frameworks
            else CareerFramework(
                source=source, name="Canonical", is_demo=False
            )
        )
        await store.save(framework)
        tracks = {
            t.name: t
            for t in await store.find(CareerTrack, framework_id=framework.id)
        }
        grades = {
            g.name: g
            for g in await store.find(Grade, framework_id=framework.id)
        }
        roles: dict[tuple[str, str], RoleLevel] = {}
        for role in await store.find(RoleLevel):
            track = next(
                (t for t in tracks.values() if t.id == role.track_id), None
            )
            grade = next(
                (g for g in grades.values() if g.id == role.grade_id), None
            )
            if track and grade:
                roles[(track.name, grade.name)] = role
        for raw in package.role_profiles:
            role_name, grade_name = string(raw["role"]), string(raw["grade"])
            if not fresh("role", role_name + ":" + grade_name, raw):
                continue
            if role_name not in tracks:
                tracks[role_name] = CareerTrack(
                    framework_id=framework.id, name=role_name
                )
                await store.save(tracks[role_name])
            if grade_name not in grades:
                grades[grade_name] = Grade(
                    framework_id=framework.id,
                    name=grade_name,
                    audience_grade=grade_name,
                )
                await store.save(grades[grade_name])
            role = RoleLevel(
                track_id=tracks[role_name].id, grade_id=grades[grade_name].id
            )
            await store.save(role)
            roles[(role_name, grade_name)] = role
            critical = [string(s) for s in seq(raw["critical_skills"])]
            required = obj(raw["required_skills"])
            require(
                set(critical) <= set(required), "invalid_critical_skills", 422
            )
            for key, value in required.items():
                await store.save(
                    RoleSkillRequirement(
                        role_level_id=role.id,
                        skill_id=skill_id(key),
                        required_level=number(value),
                        critical=key in critical,
                    )
                )
        transitions = {
            (t.from_level_id, t.to_level_id)
            for t in await store.find(CareerTransition)
        }
        # This adapter preserves the source's original four-grade ladder.
        for name in tracks:
            ladder = [
                roles[(name, g)]
                for g in ["Junior", "Middle", "Senior", "Lead"]
                if (name, g) in roles
            ]
            for first, second in zip(ladder, ladder[1:], strict=False):
                if (first.id, second.id) not in transitions:
                    await store.save(
                        CareerTransition(
                            from_level_id=first.id,
                            to_level_id=second.id,
                            kind="vertical",
                        )
                    )
        activities = {
            a.external_id: a for a in await store.find(Activity, source=source)
        }
        for raw in package.events:
            key = string(raw["event_id"])
            if not fresh("event", key, raw):
                continue
            require(type(raw["mandatory"]) is bool, "invalid_mandatory", 422)
            duration = raw["duration_hours"]
            require(type(duration) in {int, float}, "invalid_duration", 422)
            assert isinstance(duration, int | float)
            require(duration >= 0, "invalid_duration", 422)
            activity = Activity(
                source=source,
                external_id=key,
                title=string(raw["title"]),
                description=string(raw["description"]),
                kind=string(raw["type"]),
                format=string(raw["format"]),
                duration_hours=float(duration),
                mandatory=bool(raw["mandatory"]),
                repeatable=key == "EV_036",
                grants_verified=True,
            )
            await store.save(activity)
            activities[key] = activity
            for audience_role in seq(raw["target_roles"]):
                for audience_grade in seq(raw["target_grades"]):
                    await store.save(
                        ActivityAudience(
                            activity_id=activity.id,
                            role=string(audience_role),
                            grade=string(audience_grade),
                        )
                    )
            for key_skill, value in obj(raw["prerequisites"]).items():
                await store.save(
                    ActivityPrerequisite(
                        activity_id=activity.id,
                        skill_id=skill_id(key_skill),
                        required_level=number(value),
                    )
                )
            seen_effects: set[str] = set()
            for value in seq(raw["develops_skills"]):
                effect = obj(value)
                key_skill = string(effect["skill_id"])
                require(key_skill not in seen_effects, "duplicate_effect", 422)
                seen_effects.add(key_skill)
                await store.save(
                    ActivitySkillEffect(
                        activity_id=activity.id,
                        skill_id=skill_id(key_skill),
                        gain=number(effect["gain"], 100),
                        max_level=number(effect["max_level"]),
                    )
                )
            for session_date in sorted(
                {day(v) for v in seq(raw["upcoming_sessions"])}
            ):
                await store.save(
                    ActivitySession(
                        activity_id=activity.id, starts_on=session_date
                    )
                )
        departments = {
            d.name: d for d in await store.find(Department, source=source)
        }
        employees = {
            e.external_id: e for e in await store.find(Employee, source=source)
        }
        managers: list[tuple[Employee, str]] = []
        for raw in package.employees:
            key = string(raw["employee_id"])
            if not fresh("employee", key, raw):
                continue
            role_key = (string(raw["role"]), string(raw["grade"]))
            require(role_key in roles, "unknown_role", 422)
            department_name = string(raw["department"])
            if department_name not in departments:
                department = Department(source=source, name=department_name)
                await store.save(department)
                departments[department_name] = department
            employee = Employee(
                source=source,
                external_id=key,
                full_name=string(raw["full_name"]),
                department_id=departments[department_name].id,
                role_level_id=roles[role_key].id,
                last_review_date=day(raw["last_review_date"]),
                hire_date=day(raw["hire_date"]),
                preferred_language=string(raw["preferred_language"]),
                work_format=string(raw["work_format"]),
            )
            require(
                employee.hire_date <= package.as_of_date
                and employee.last_review_date <= package.as_of_date,
                "future_assessment",
                422,
            )
            await store.save(employee)
            employees[key] = employee
            if raw.get("manager_id"):
                managers.append((employee, string(raw["manager_id"])))
            for key_skill, value in obj(raw["skills"]).items():
                await store.save(
                    EmployeeSkill(
                        employee_id=employee.id,
                        skill_id=skill_id(key_skill),
                        verified_level=number(value),
                        assessed_on=employee.last_review_date,
                        provenance="imported_assessment",
                    )
                )
            if raw.get("career_goal"):
                goal = obj(raw["career_goal"])
                target = (
                    string(goal["target_role"]),
                    string(goal["target_grade"]),
                )
                require(target in roles, "unknown_goal", 422)
                await store.save(
                    EmployeeCareerGoal(
                        employee_id=employee.id, role_level_id=roles[target].id
                    )
                )
        for employee, manager in managers:
            require(
                manager in employees and manager != employee.external_id,
                "unknown_or_self_manager",
                422,
            )
            employee.manager_id = employees[manager].id
            await store.save(employee)
        # Lock affected profiles before reading their current assessments.
        affected = {
            employees[string(r["employee_id"])].id
            for r in package.history
            if string(r["employee_id"]) in employees
        }
        for employee_id in sorted(affected):
            await store.get(Employee, employee_id, lock=True)
        effects = await store.find(ActivitySkillEffect)
        prior_history = await store.find(Enrollment, source=source)
        assessments = {
            (s.employee_id, s.skill_id): s
            for s in await store.find(EmployeeSkill)
        }
        warnings: set[str] = set()
        for raw in sorted(
            package.history,
            key=lambda r: (string(r["date"]), string(r["record_id"])),
        ):
            key = string(raw["record_id"])
            if not fresh("history", key, raw):
                continue
            employee_key, event_key = (
                string(raw["employee_id"]),
                string(raw["event_id"]),
            )
            require(
                employee_key in employees and event_key in activities,
                "unknown_history_reference",
                422,
            )
            employee = await store.get(
                Employee, employees[employee_key].id, lock=True
            )
            activity = activities[event_key]
            record_date, status = day(raw["date"]), string(raw["status"])
            require(
                status
                in {
                    "completed",
                    "in_progress",
                    "dropped",
                    "no_show",
                    "declined",
                    "overdue",
                },
                "invalid_history_status",
                422,
            )
            for numeric in ["completion_pct", "score", "feedback_rating"]:
                if raw.get(numeric) is not None:
                    number(
                        int(string(raw[numeric])),
                        5 if numeric == "feedback_rating" else 100,
                    )
            if raw.get("due_date"):
                day(raw["due_date"])
            if record_date > package.as_of_date:
                warnings.add("future_history_excluded")
                # Preserve the source, excluding future participation.
                continue
            enrollment = Enrollment(
                employee_id=employee.id,
                activity_id=activity.id,
                participation_key="legacy:" + key,
                enrolled_on=record_date,
                status=status,
                source=source,
                external_id=key,
            )
            await store.save(enrollment)
            employee.history_version += 1
            if status == "completed":
                warnings.add("legacy_proxy")
                completion = ActivityCompletion(
                    enrollment_id=enrollment.id,
                    completed_at=datetime.combine(record_date, time(), UTC),
                    completion_time_source="legacy_proxy",
                )
                await store.save(completion)
                if record_date > employee.last_review_date:
                    require(
                        not any(
                            h.employee_id == employee.id
                            and h.status == "completed"
                            and h.enrolled_on > record_date
                            for h in prior_history
                        ),
                        "out_of_order_history_requires_reconstruction",
                    )
                    for history_effect in [
                        e for e in effects if e.activity_id == activity.id
                    ]:
                        pair = employee.id, history_effect.skill_id
                        assessment = assessments.get(pair) or EmployeeSkill(
                            employee_id=employee.id,
                            skill_id=history_effect.skill_id,
                            verified_level=0,
                        )
                        require(
                            assessment.provenance
                            in {
                                "self_assessment",
                                "imported_assessment",
                                "legacy_proxy",
                            },
                            "history_conflicts_with_new_assessment",
                        )
                        before = assessment.verified_level
                        assessment.verified_level = apply_effect(
                            before,
                            history_effect.gain,
                            history_effect.max_level,
                        )
                        assessment.provenance = "legacy_proxy"
                        assessment.assessed_on = record_date
                        await store.save(assessment)
                        assessments[pair] = assessment
                        await store.save(
                            SkillChange(
                                employee_id=employee.id,
                                skill_id=assessment.skill_id,
                                before_level=before,
                                after_level=assessment.verified_level,
                                origin="legacy_proxy",
                                origin_id=completion.id,
                                created_at=SystemClock().now(),
                            )
                        )
                    employee.profile_version += 1
            await store.save(employee)
        for record in pending:
            await store.save(record)
        if pending:
            state.catalog_version += 1
        await store.save(state)
        return {
            "new_records": len(pending),
            "employees": len(employees),
            "skills": len(skills),
            "events": len(activities),
            "role_profiles": len(roles),
            "history_in_package": len(package.history),
            "warnings": [w for w in sorted(warnings)],
            "business_date": package.as_of_date.isoformat(),
        }
