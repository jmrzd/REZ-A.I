"""Offline verification of the trusted in-process approval workflow."""
import unittest

from permissions import PermissionDenied, PermissionEngine, ToolCall
from tool_reviews import ToolReviewQueue
from tools_engine import ToolExecutor, build_demo_registry


class ToolReviewTests(unittest.TestCase):
    def setUp(self):
        self.now = 100.0
        self.permissions = PermissionEngine(clock=lambda: self.now)
        self.executor = ToolExecutor(build_demo_registry(), self.permissions)
        self.queue = ToolReviewQueue(self.executor, clock=lambda: self.now)
        self.call = ToolCall("session-1", "call-1", "rez__demo__echo", {"message": "oi"})

    def test_submission_is_not_execution(self):
        request = self.queue.submit(self.call)
        self.assertEqual(request.tool_name, "rez__demo__echo")
        with self.assertRaises(PermissionDenied):
            self.executor.execute(self.call)

    def test_pending_shows_only_session_requests(self):
        self.queue.submit(self.call)
        self.assertEqual(len(self.queue.pending("session-1")), 1)
        self.assertEqual(self.queue.pending("session-2"), [])

    def test_approval_executes_demo(self):
        self.queue.submit(self.call)
        self.assertEqual(
            self.queue.review("session-1", "call-1", approved=True),
            {"message": "oi"},
        )

    def test_denial_never_executes(self):
        self.queue.submit(self.call)
        self.assertIsNone(self.queue.review("session-1", "call-1", approved=False))
        with self.assertRaises(PermissionDenied):
            self.executor.execute(self.call)

    def test_review_is_single_use(self):
        self.queue.submit(self.call)
        self.queue.review("session-1", "call-1", approved=True)
        with self.assertRaises(PermissionDenied):
            self.queue.review("session-1", "call-1", approved=True)

    def test_duplicate_call_id_rejected_after_denial(self):
        self.queue.submit(self.call)
        self.queue.review("session-1", "call-1", approved=False)
        with self.assertRaises(PermissionDenied):
            self.queue.submit(self.call)

    def test_wrong_session_cannot_approve(self):
        self.queue.submit(self.call)
        with self.assertRaises(PermissionDenied):
            self.queue.review("session-2", "call-1", approved=True)
        self.assertEqual(len(self.queue.pending("session-1")), 1)

    def test_expired_review_denied(self):
        self.queue.submit(self.call)
        self.now = 220
        self.assertEqual(self.queue.pending("session-1"), [])
        with self.assertRaises(PermissionDenied):
            self.queue.review("session-1", "call-1", approved=True)

    def test_unknown_tool_never_enqueued(self):
        bad = ToolCall("session-1", "call-1", "rez__shell__run", {"command": "dir"})
        with self.assertRaises(PermissionDenied):
            self.queue.submit(bad)

    def test_invalid_schema_never_enqueued(self):
        bad = ToolCall("session-1", "call-1", "rez__demo__echo", {"other": "bad"})
        with self.assertRaises(ValueError):
            self.queue.submit(bad)

    def test_submitted_arguments_are_frozen(self):
        raw = {"message": "original"}
        call = ToolCall("session-1", "call-1", "rez__demo__echo", raw)
        view = self.queue.submit(call)
        raw["message"] = "alterado"
        view.arguments["message"] = "tambem alterado"
        self.assertEqual(
            self.queue.review("session-1", "call-1", approved=True),
            {"message": "original"},
        )

    def test_revocation_clears_session(self):
        self.queue.submit(self.call)
        self.queue.revoke_session("session-1")
        self.assertEqual(self.queue.pending("session-1"), [])
        with self.assertRaises(PermissionDenied):
            self.queue.review("session-1", "call-1", approved=True)


    def test_revoked_session_cannot_submit_new_requests(self):
        self.queue.revoke_session("session-1")
        with self.assertRaises(PermissionDenied):
            self.queue.submit(self.call)

    def test_revoking_one_session_preserves_another(self):
        self.queue.revoke_session("session-1")
        other = ToolCall("session-2", "call-1", "rez__demo__echo", {"message": "ok"})
        self.queue.submit(other)
        self.assertEqual(
            self.queue.review("session-2", "call-1", approved=True),
            {"message": "ok"},
        )


if __name__ == "__main__":
    unittest.main()
