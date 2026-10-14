"""REZ Permission Engine: one-use authorization receipts for future tools.

Independent implementation. Not connected to the MCP executor or HTTP API.
Approval must originate from trusted application code, never model output.
"""
from __future__ import annotations

from dataclasses import dataclass
from fnmatch import fnmatchcase
from hashlib import sha256
import json
from threading import RLock
from time import monotonic
from typing import Callable, Mapping


class PermissionDenied(Exception):
    """A tool invocation is not authorized."""


def _digest(arguments: Mapping[str, object]) -> str:
    try:
        payload = json.dumps(
            arguments, sort_keys=True, separators=(",", ":"),
            ensure_ascii=False, allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise ValueError("Tool arguments must be JSON-serializable") from exc
    return sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ToolCall:
    session_id: str
    call_id: str
    tool_name: str
    arguments: Mapping[str, object]

    def __post_init__(self) -> None:
        if not all(
            isinstance(value, str) and value.strip()
            for value in (self.session_id, self.call_id, self.tool_name)
        ):
            raise ValueError("Session, call and tool identifiers must be non-empty strings")


@dataclass
class _Receipt:
    fingerprint: str
    expires_at: float


class PermissionEngine:
    """Fail-closed permission receipts bound to one exact call.

    Deny rules override receipts. Consumption and revocation are synchronized.
    """

    def __init__(
        self,
        *,
        ttl_seconds: float = 120.0,
        denied_tools: tuple[str, ...] = (),
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        self._ttl = ttl_seconds
        self._denied = denied_tools
        self._clock = clock
        self._receipts: dict[tuple[str, str], _Receipt] = {}
        self._lock = RLock()

    @staticmethod
    def _fingerprint(call: ToolCall) -> str:
        parts = [call.session_id, call.call_id, call.tool_name, _digest(call.arguments)]
        return sha256(json.dumps(parts, separators=(",", ":")).encode()).hexdigest()

    def _blocked(self, tool_name: str) -> bool:
        return any(fnmatchcase(tool_name, pattern) for pattern in self._denied)

    def approve(self, call: ToolCall, *, human_confirmed: bool = False) -> None:
        """Record explicit approval only after confirmation by trusted UI.

        Never expose this operation as an unauthenticated public API.
        """
        if not human_confirmed:
            raise PermissionDenied("Explicit trusted approval is required")
        with self._lock:
            if self._blocked(call.tool_name):
                raise PermissionDenied("Tool is disallowed")
            key = (call.session_id, call.call_id)
            if key in self._receipts:
                raise PermissionDenied("Call ID already has an approval record")
            self._receipts[key] = _Receipt(
                self._fingerprint(call), self._clock() + self._ttl,
            )

    def consume(self, call: ToolCall) -> None:
        """Consume the receipt atomically, or refuse the invocation."""
        with self._lock:
            if self._blocked(call.tool_name):
                raise PermissionDenied("Tool is disallowed")
            key = (call.session_id, call.call_id)
            receipt = self._receipts.get(key)
            if receipt is None:
                raise PermissionDenied("No approval for this call")
            if self._clock() >= receipt.expires_at:
                del self._receipts[key]
                raise PermissionDenied("Approval expired")
            if receipt.fingerprint != self._fingerprint(call):
                raise PermissionDenied("Approved call does not match requested operation")
            del self._receipts[key]

    def revoke_session(self, session_id: str) -> None:
        """Discard pending approvals when a session terminates."""
        with self._lock:
            for key in list(self._receipts):
                if key[0] == session_id:
                    del self._receipts[key]
