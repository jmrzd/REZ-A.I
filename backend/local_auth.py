"""In-process local-owner authentication service, not exposed over HTTP.

Only construct with a trusted, externally provisioned password hash. Tokens
must be kept out of browser storage and model context. Rate limiting here is
process-local and not a replacement for network-level throttling.
"""
from __future__ import annotations

from threading import RLock
from time import monotonic
from typing import Callable

from credentials import CredentialError, verify_password
from sessions import SessionIdentity, SessionStore


class LoginDenied(Exception):
    """Credentials invalid or login temporarily locked."""


class LocalOwnerAuth:
    def __init__(
        self, password_hash: str, sessions: SessionStore, *,
        subject_id: str = "local-owner",
        max_attempts: int = 5,
        lock_seconds: float = 300,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if not isinstance(password_hash, str) or not password_hash:
            raise ValueError("A provisioned password hash is required")
        if not isinstance(subject_id, str) or not subject_id.strip():
            raise ValueError("A nonempty owner identity is required")
        if max_attempts < 1 or lock_seconds <= 0:
            raise ValueError("Invalid lockout configuration")
        self._hash = password_hash
        self._sessions = sessions
        self._subject = subject_id
        self._max_attempts = max_attempts
        self._lock_seconds = lock_seconds
        self._clock = clock
        self._failures = 0
        self._locked_until = 0.0
        self._lock = RLock()

    def login(self, password: str) -> tuple[str, SessionIdentity]:
        """Authenticate owner and issue a session; never reveal failure reason."""
        with self._lock:
            now = self._clock()
            if now < self._locked_until:
                raise LoginDenied("Authentication unavailable")
            try:
                valid = verify_password(password, self._hash)
            except CredentialError:
                valid = False
            if not valid:
                self._failures += 1
                if self._failures >= self._max_attempts:
                    self._locked_until = now + self._lock_seconds
                    self._failures = 0
                raise LoginDenied("Authentication unavailable")
            self._failures = 0
            self._locked_until = 0.0
            return self._sessions.issue(self._subject)

    def logout(self, token: str) -> None:
        """Revoke one token; tool-review revocation belongs to the controller."""
        self._sessions.require_subject(token, self._subject)
        self._sessions.revoke(token)
