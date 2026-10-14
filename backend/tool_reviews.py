"""In-process review workflow for future REZ tool approval UI.

This is *not* an HTTP endpoint or authenticated approval service. Call review()
only from a trusted, authenticated controller after an actual user decision.
"""
from __future__ import annotations

from dataclasses import dataclass
from threading import RLock
from time import monotonic
from typing import Callable

from permissions import PermissionDenied, PermissionEngine, ToolCall
from tools_engine import ToolExecutor, validate_arguments


@dataclass(frozen=True)
class PendingToolRequest:
    session_id: str
    call_id: str
    tool_name: str
    arguments: dict[str, str]
    description: str
    expires_at: float


class ToolReviewQueue:
    """Approve or reject one pending call, then execute only an approved call.

    The registry is checked before a request becomes visible. A final decision
    removes the pending entry. No public HTTP routes or privileged tools exist.
    """

    def __init__(
        self,
        executor: ToolExecutor,
        *,
        review_ttl_seconds: float = 120.0,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if review_ttl_seconds <= 0:
            raise ValueError("review_ttl_seconds must be positive")
        self.executor = executor
        self._clock = clock
        self._ttl = review_ttl_seconds
        self._pending: dict[tuple[str, str], tuple[ToolCall, PendingToolRequest]] = {}
        self._completed: set[tuple[str, str]] = set()
        self._closed_sessions: set[str] = set()
        self._lock = RLock()

    def submit(self, call: ToolCall) -> PendingToolRequest:
        """Store a validated request. Submission never grants approval."""
        with self._lock:
            if call.session_id in self._closed_sessions:
                raise PermissionDenied("Session has been revoked")
            key = (call.session_id, call.call_id)
            if key in self._pending or key in self._completed:
                raise PermissionDenied("Call identifier has already been used")
            spec = self.executor.registry.get(call.tool_name)
            arguments = validate_arguments(spec, call.arguments)
            # Freeze the arguments: mutations to the caller's dict cannot change
            # the operation reviewed by the user.
            frozen_call = ToolCall(call.session_id, call.call_id, call.tool_name, arguments)
            visible = PendingToolRequest(
                call.session_id, call.call_id, call.tool_name,
                arguments.copy(), spec.description, self._clock() + self._ttl,
            )
            self._pending[key] = (frozen_call, visible)
            return visible

    def pending(self, session_id: str) -> list[PendingToolRequest]:
        with self._lock:
            now = self._clock()
            return [
                PendingToolRequest(v.session_id, v.call_id, v.tool_name,
                                   v.arguments.copy(), v.description, v.expires_at)
                for (session, _), (_, v) in self._pending.items()
                if session == session_id and now < v.expires_at
            ]

    def review(self, session_id: str, call_id: str, *, approved: bool) -> dict[str, str] | None:
        """Resolve once; if approved, execute synchronously under permission gate.

        This method MUST be called only by trusted code following authenticated
        consent. A raw client/model-supplied approved=True is not proof.
        """
        with self._lock:
            key = (session_id, call_id)
            entry = self._pending.pop(key, None)
            if entry is None:
                raise PermissionDenied("No pending request")
            self._completed.add(key)
            call, visible = entry
            if self._clock() >= visible.expires_at:
                raise PermissionDenied("Review request expired")
            if not approved:
                return None
            self.executor.permissions.approve(call, human_confirmed=True)
            return self.executor.execute(call)

    def revoke_session(self, session_id: str) -> None:
        with self._lock:
            self._closed_sessions.add(session_id)
            for key in list(self._pending):
                if key[0] == session_id:
                    self._pending.pop(key)
                    self._completed.add(key)
            self.executor.permissions.revoke_session(session_id)
