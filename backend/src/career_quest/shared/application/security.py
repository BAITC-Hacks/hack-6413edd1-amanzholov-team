from uuid import UUID

from career_quest.modules.identity.domain.models import PermissionGrant, User
from career_quest.modules.people.domain.models import Employee
from career_quest.shared.application.ports import Store
from career_quest.shared.domain.core import require


async def authorize(
    store: Store,
    actor: User,
    employee: Employee,
    permission: str,
    scope: str = "*",
) -> None:
    grants = await store.find(
        PermissionGrant,
        user_id=actor.id,
        department_id=employee.department_id,
        permission=permission,
    )
    require(any(g.scope in {scope, "*"} for g in grants), "forbidden", 403)


def admin(actor: User) -> None:
    require(actor.role == "admin", "forbidden", 403)


def own(actor: User, employee_id: UUID) -> None:
    require(actor.employee_id == employee_id, "forbidden", 403)
