"""Offline tests for the REZ Permission Engine."""
import unittest

from permissions import PermissionDenied, PermissionEngine, ToolCall


class PermissionEngineTests(unittest.TestCase):
    def setUp(self):
        self.now = 100.0
        self.engine = PermissionEngine(ttl_seconds=120, clock=lambda: self.now)
        self.call = ToolCall("session-1", "call-1", "mcp__files__read", {"path": "notes.txt"})

    def test_requires_explicit_human_confirmation(self):
        with self.assertRaises(PermissionDenied):
            self.engine.approve(self.call)

    def test_denies_without_approval(self):
        with self.assertRaises(PermissionDenied):
            self.engine.consume(self.call)

    def test_approval_is_single_use(self):
        self.engine.approve(self.call, human_confirmed=True)
        self.engine.consume(self.call)
        with self.assertRaises(PermissionDenied):
            self.engine.consume(self.call)

    def test_arguments_cannot_change(self):
        self.engine.approve(self.call, human_confirmed=True)
        altered = ToolCall("session-1", "call-1", "mcp__files__read", {"path": "secret.txt"})
        with self.assertRaises(PermissionDenied):
            self.engine.consume(altered)
        self.engine.consume(self.call)

    def test_session_cannot_change(self):
        self.engine.approve(self.call, human_confirmed=True)
        other = ToolCall("session-2", "call-1", "mcp__files__read", {"path": "notes.txt"})
        with self.assertRaises(PermissionDenied):
            self.engine.consume(other)

    def test_tool_cannot_change(self):
        self.engine.approve(self.call, human_confirmed=True)
        other = ToolCall("session-1", "call-1", "mcp__files__write", {"path": "notes.txt"})
        with self.assertRaises(PermissionDenied):
            self.engine.consume(other)

    def test_receipt_expires(self):
        self.engine.approve(self.call, human_confirmed=True)
        self.now = 220.0
        with self.assertRaises(PermissionDenied):
            self.engine.consume(self.call)

    def test_denylist_overrides_approval(self):
        engine = PermissionEngine(denied_tools=("mcp__files__*",))
        with self.assertRaises(PermissionDenied):
            engine.approve(self.call, human_confirmed=True)

    def test_session_revocation(self):
        self.engine.approve(self.call, human_confirmed=True)
        self.engine.revoke_session("session-1")
        with self.assertRaises(PermissionDenied):
            self.engine.consume(self.call)

    def test_duplicate_call_id_does_not_replace_approval(self):
        self.engine.approve(self.call, human_confirmed=True)
        with self.assertRaises(PermissionDenied):
            self.engine.approve(self.call, human_confirmed=True)

    def test_arguments_must_be_json(self):
        bad = ToolCall("session-1", "call-1", "tool", {"bad": object()})
        with self.assertRaises(ValueError):
            self.engine.approve(bad, human_confirmed=True)

    def test_empty_identifiers_fail(self):
        with self.assertRaises(ValueError):
            ToolCall("", "call", "tool", {})


if __name__ == "__main__":
    unittest.main()
