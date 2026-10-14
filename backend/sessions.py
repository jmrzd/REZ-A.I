"""In-memory, capability-limited session primitives for a future trusted controller.

Not wired to public HTTP routes, chat, or tool approval. Possession of a token
is not proof of human consent. Production auth requires an identity provider,
secure cookie/CSRF design, persistent revocation and distributed storage.
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from hmac import compare_digest
from secrets import token_urlsafe
from threading import RLock
from time import monotonic
from typing import Callable


class SessionDenied(Exception):
    """The presented session is invalid, expired, or revoked."""


@dataclass(frozen=True)
class SessionIdentity:
    session_id: str
    subject_id: str
    expires_at: float


class SessionStore:
    """Issue opaque bearer tokens and validate them without storing raw tokens."""

    def __init__(
        self, *, ttl_seconds: float = 900.0,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        self._ttl = ttl_seconds
        self._clock = clock
        self._sessions: dict[str, SessionIdentity] = {}
        self._lock = RLock()

    @staticmethod
    def _key(token: str) -> str:
        if not isinstance(token, str) or not token:
            raise SessionDenied("Invalid session token")
        return sha256(token.encode("utf-8")).hexdigest()

    def issue(self, subject_id: str) -> tuple[str, SessionIdentity]:
        """Only trusted, authenticated code may call issue()."""
        if not isinstance(subject_id, str) or not subject_id.strip():
            raise ValueError("A verified subject identity is required")
        token = token_urlsafe(32)
        session = SessionIdentity(token_urlsafe(24), subject_id, self._clock() + self._ttl)
        with self._lock:
            self._sessions[self._key(token)] = session
        return token, session

    def resolve(self, token: str) -> SessionIdentity:
        key = self._key(token)
        with self._lock:
            session = self._sessions.get(key)
            if session is None:
                raise SessionDenied("Unknown or revoked session")
            if self._clock() >= session.expires_at:
                del self._sessions[key]
                raise SessionDenied("Session expired")
            return session

    def require_subject(self, token: str, subject_id: str) -> SessionIdentity:
        session = self.resolve(token)
        if not isinstance(subject_id, str) or not compare_digest(
            session.subject_id.encode("utf-8"), subject_id.encode("utf-8")
        ):
            raise SessionDenied("Session is not owned by this subject")
        return session

    def revoke(self, token: str) -> None:
        key = self._key(token)
        with self._lock:
            self._sessions.pop(key, None)

    def cleanup(self) -> int:
        """Purge expired sessions; no background scheduler is implied."""
        with self._lock:
            now = self._clock()
            expired = [key for key, session in self._sessions.items()
                       if now >= session.expires_at]
            for key in expired:
                del self._sessions[key]
            return len(expired)
