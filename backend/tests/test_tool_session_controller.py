"""Tests of the isolated controller. No network or real privileged handlers."""
import unittest

from permissions import PermissionDenied, PermissionEngine
from sessions import SessionDenied, SessionStore
from tool_reviews import ToolReviewQueue
from tool_session_controller import ToolSessionController
from tools_engine import ToolExecutor, build_demo_registry


class ToolSessionControllerTests(unittest.TestCase):
    def setUp(self):
        self.now = 100.0
        clock = lambda: self.now
        self.sessions = SessionStore(ttl_seconds=60, clock=clock)
        permissions = PermissionEngine(clock=clock)
        executor = ToolExecutor(build_demo_registry(), permissions)
        reviews = ToolReviewQueue(executor, clock=clock)
        self.controller = ToolSessionController(self.sessions, reviews)
        self.token, self.identity = self.sessions.issue("verified-user")

    def test_submit_requires_session(self):
        with self.assertRaises(SessionDenied):
            self.controller.request_demo("invalid", "oi")

    def test_pending_requires_session(self):
        with self.assertRaises(SessionDenied):
            self.controller.pending("invalid")

    def test_submit_does_not_execute(self):
        request = self.controller.request_demo(self.token, "oi")
        self.assertEqual(request.session_id, self.identity.session_id)
        self.assertEqual(len(self.controller.pending(self.token)), 1)

    def test_approval_executes_registered_demo_only(self):
        request = self.controller.request_demo(self.token, "oi")
        self.assertEqual(
            self.controller.decide(self.token, request.call_id, approved=True),
            {"message": "oi"},
        )
        self.assertEqual(self.controller.pending(self.token), [])

    def test_denial_never_executes(self):
        request = self.controller.request_demo(self.token, "oi")
        self.assertIsNone(self.controller.decide(self.token, request.call_id, approved=False))
        with self.assertRaises(PermissionDenied):
            self.controller.decide(self.token, request.call_id, approved=True)

    def test_other_session_cannot_decide(self):
        other_token, _ = self.sessions.issue("other-user")
        request = self.controller.request_demo(self.token, "oi")
        with self.assertRaises(PermissionDenied):
            self.controller.decide(other_token, request.call_id, approved=True)
        self.assertEqual(len(self.controller.pending(self.token)), 1)

    def test_same_subject_different_session_cannot_decide(self):
        other_token, _ = self.sessions.issue("verified-user")
        request = self.controller.request_demo(self.token, "oi")
        with self.assertRaises(PermissionDenied):
            self.controller.decide(other_token, request.call_id, approved=True)

    def test_expired_token_cannot_approve(self):
        request = self.controller.request_demo(self.token, "oi")
        self.now = 160.0
        with self.assertRaises(SessionDenied):
            self.controller.decide(self.token, request.call_id, approved=True)

    def test_session_end_revokes_pending(self):
        request = self.controller.request_demo(self.token, "oi")
        self.controller.end_session(self.token)
        with self.assertRaises(SessionDenied):
            self.controller.decide(self.token, request.call_id, approved=True)
        with self.assertRaises(SessionDenied):
            self.controller.request_demo(self.token, "again")
        self.assertEqual(self.controller.reviews.pending(self.identity.session_id), [])

    def test_bad_decision_type_does_not_consume_request(self):
        request = self.controller.request_demo(self.token, "oi")
        with self.assertRaises(PermissionDenied):
            self.controller.decide(self.token, request.call_id, approved="yes")
        self.assertEqual(len(self.controller.pending(self.token)), 1)

    def test_cannot_replay(self):
        request = self.controller.request_demo(self.token, "oi")
        self.controller.decide(self.token, request.call_id, approved=True)
        with self.assertRaises(PermissionDenied):
            self.controller.decide(self.token, request.call_id, approved=True)


if __name__ == "__main__":
    unittest.main()
