import asyncio
import hashlib
import secrets
from datetime import timedelta

from career_quest.modules.identity.domain.models import Session, User
from career_quest.shared.application.ports import PasswordHasher, UowFactory
from career_quest.shared.domain.core import Json, SystemClock, require


class Authentication:
    def __init__(
        self,
        factory: UowFactory,
        passwords: PasswordHasher,
        clock: SystemClock,
        enabled: bool,
        hours: int,
    ) -> None:
        self.factory = factory
        self.passwords = passwords
        self.clock = clock
        self.enabled = enabled
        self.hours = hours
        self.dummy_hash = passwords.hash(secrets.token_urlsafe(32))

    async def login(self, login: str, password: str) -> dict[str, Json]:
        require(self.enabled, "demo_auth_disabled", 403)
        async with self.factory() as uow:
            users = await uow.store.find(User, login=login)
            hashed = users[0].password_hash if users else self.dummy_hash
        valid = await asyncio.to_thread(
            self.passwords.verify, hashed, password
        )
        require(bool(users) and valid, "invalid_credentials", 401)
        token = secrets.token_urlsafe(48)
        expiry = self.clock.now() + timedelta(hours=self.hours)
        async with self.factory() as uow:
            await uow.store.save(
                Session(
                    user_id=users[0].id,
                    token_hash=hashlib.sha256(token.encode()).hexdigest(),
                    expires_at=expiry,
                )
            )
            await uow.commit()
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_at": expiry.isoformat(),
        }

    async def authenticate(self, token: str) -> User:
        require(self.enabled, "demo_auth_disabled", 401)
        async with self.factory() as uow:
            sessions = await uow.store.find(
                Session, token_hash=hashlib.sha256(token.encode()).hexdigest()
            )
            require(bool(sessions), "invalid_token", 401)
            session = sessions[0]
            require(
                not session.revoked and session.expires_at > self.clock.now(),
                "invalid_token",
                401,
            )
            return await uow.store.get(User, session.user_id)

    async def logout(self, token: str) -> None:
        async with self.factory() as uow:
            sessions = await uow.store.find(
                Session, token_hash=hashlib.sha256(token.encode()).hexdigest()
            )
            if sessions:
                sessions[0].revoked = True
                await uow.store.save(sessions[0])
            await uow.commit()
