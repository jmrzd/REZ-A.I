"""Tool registry/executor tests; no network or filesystem access."""
import unittest

from permissions import PermissionDenied, PermissionEngine, ToolCall
from tools_engine import ToolExecutor, ToolRegistry, ToolSpec, build_demo_registry


class ToolEngineTests(unittest.TestCase):
    def setUp(self):
        self.registry = build_demo_registry()
        self.permissions = PermissionEngine()
        self.executor = ToolExecutor(self.registry, self.permissions)
        self.call = ToolCall("s1", "c1", "rez__demo__echo", {"message": "Olá"})

    def test_registry_only_exposes_demo(self):
        self.assertEqual(self.registry.names(), ("rez__demo__echo",))

    def test_unknown_tool_is_denied(self):
        unknown = ToolCall("s1", "c1", "rez__shell__run", {"command": "whoami"})
        with self.assertRaises(PermissionDenied):
            self.executor.execute(unknown)

    def test_valid_tool_requires_approval(self):
        with self.assertRaises(PermissionDenied):
            self.executor.execute(self.call)

    def test_approved_tool_returns_message(self):
        self.permissions.approve(self.call, human_confirmed=True)
        self.assertEqual(self.executor.execute(self.call), {"message": "Olá"})

    def test_replay_is_denied(self):
        self.permissions.approve(self.call, human_confirmed=True)
        self.executor.execute(self.call)
        with self.assertRaises(PermissionDenied):
            self.executor.execute(self.call)

    def test_rejects_unexpected_arguments_even_if_approved(self):
        bad = ToolCall("s1", "c1", "rez__demo__echo", {"message": "oi", "extra": "x"})
        self.permissions.approve(bad, human_confirmed=True)
        with self.assertRaises(ValueError):
            self.executor.execute(bad)

    def test_rejects_missing_argument(self):
        bad = ToolCall("s1", "c1", "rez__demo__echo", {})
        with self.assertRaises(ValueError):
            self.executor.execute(bad)

    def test_rejects_non_string_argument(self):
        bad = ToolCall("s1", "c1", "rez__demo__echo", {"message": 42})
        with self.assertRaises(ValueError):
            self.executor.execute(bad)

    def test_rejects_oversized_argument(self):
        bad = ToolCall("s1", "c1", "rez__demo__echo", {"message": "a" * 1001})
        with self.assertRaises(ValueError):
            self.executor.execute(bad)

    def test_duplicate_registration_is_rejected(self):
        with self.assertRaises(ValueError):
            self.registry.register(self.registry.get("rez__demo__echo"))

    def test_failed_handler_cannot_be_replayed(self):
        registry = ToolRegistry()
        counter = []
        def fail(_arguments):
            counter.append(1)
            raise RuntimeError("simulated failure")
        registry.register(ToolSpec("rez__demo__fail", "Test error path", (), fail))
        call = ToolCall("s1", "c2", "rez__demo__fail", {})
        engine = ToolExecutor(registry, self.permissions)
        self.permissions.approve(call, human_confirmed=True)
        with self.assertRaises(RuntimeError):
            engine.execute(call)
        with self.assertRaises(PermissionDenied):
            engine.execute(call)
        self.assertEqual(len(counter), 1)

    def test_invalid_tool_name_prefix(self):
        with self.assertRaises(ValueError):
            ToolSpec("mcp__unsafe", "Not REZ", (), lambda a: a)


if __name__ == "__main__":
    unittest.main()
