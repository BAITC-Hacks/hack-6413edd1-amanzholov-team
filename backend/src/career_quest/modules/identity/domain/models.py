from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from career_quest.shared.domain.core import Entity


@dataclass(kw_only=True)
class User(Entity):
    login: str
    password_hash: str
    employee_id: UUID
    role: str = "employee"
    ui_mode: str = "classic"
    locale: str = "ru"
    reduced_motion: bool = False


@dataclass(kw_only=True)
class Session(Entity):
    user_id: UUID
    token_hash: str
    expires_at: datetime
    revoked: bool = False


@dataclass(kw_only=True)
class PermissionGrant(Entity):
    user_id: UUID
    department_id: UUID
    permission: str
    scope: str
