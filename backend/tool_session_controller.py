"""Trusted in-process bridge for sessions and demo tool reviews.

This module exposes NO HTTP routes. An authenticated controller must establish
the subject identity before calling SessionStore.issue(), and must obtain an
actual user decision before calling decide(). Model output is never consent.
"""
from __future__ import annotations

from secrets import token_urlsafe

from permissions import PermissionDenied, ToolCall
from sessions import SessionDenied, SessionStore
from tool_reviews import PendingToolRequest, ToolReviewQueue


class ToolSessionController:
    """Bind a tool request and its review to one already-verified session."""

    def __init__(self, sessions: SessionStore, reviews: ToolReviewQueue) -> None:
        self.sessions = sessions
        self.reviews = reviews

    def request_demo(self, token: str, message: str) -> PendingToolRequest:
        """Only a trusted application controller should initiate demo requests."""
        identity = self.sessions.resolve(token)
        return self.reviews.submit(ToolCall(
            identity.session_id, token_urlsafe(24),
            "rez__demo__echo", {"message": message},
        ))

    def pending(self, token: str) -> list[PendingToolRequest]:
        identity = self.sessions.resolve(token)
        return self.reviews.pending(identity.session_id)

    def decide(self, token: str, call_id: str, *, approved: bool) -> dict[str, str] | None:
        """Trusted consent callback only; never map directly to arbitrary HTTP input."""
        identity = self.sessions.resolve(token)
        if not isinstance(approved, bool):
            raise PermissionDenied("Decision must be boolean")
        return self.reviews.review(identity.session_id, call_id, approved=approved)

    def end_session(self, token: str) -> None:
        identity = self.sessions.resolve(token)
        self.sessions.revoke(token)
        self.reviews.revoke_session(identity.session_id)
