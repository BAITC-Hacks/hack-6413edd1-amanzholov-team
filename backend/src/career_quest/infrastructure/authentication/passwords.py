from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError


class ArgonPasswords:
    def __init__(self) -> None:
        self.hasher = PasswordHasher()

    def hash(self, password: str) -> str:
        return self.hasher.hash(password)

    def verify(self, hashed: str, password: str) -> bool:
        try:
            return self.hasher.verify(hashed, password)
        except (VerificationError, InvalidHashError):
            return False
