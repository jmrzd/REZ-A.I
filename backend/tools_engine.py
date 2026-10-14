"""Small explicit registry for REZ's future tool system.

Only trusted Python code may register handlers. No shell, filesystem or MCP
connections are enabled here.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Mapping

from permissions import PermissionDenied, PermissionEngine, ToolCall

ToolHandler = Callable[[dict[str, str]], dict[str, str]]


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    required_strings: tuple[str, ...]
    handler: ToolHandler

    def __post_init__(self) -> None:
        if not self.name or not self.name.startswith("rez__"):
            raise ValueError("Tool names must use the rez__ prefix")
        if not callable(self.handler) or len(set(self.required_strings)) != len(self.required_strings):
            raise ValueError("Invalid tool specification")


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, tool: ToolSpec) -> None:
        if tool.name in self._tools:
            raise ValueError("Tool is already registered")
        self._tools[tool.name] = tool

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._tools))

    def get(self, name: str) -> ToolSpec:
        tool = self._tools.get(name)
        if tool is None:
            raise PermissionDenied("Unknown tool")
        return tool


def validate_arguments(spec: ToolSpec, raw: Mapping[str, object]) -> dict[str, str]:
    """Reject extra keys, missing keys and oversized/non-string values."""
    if not isinstance(raw, dict):
        raise ValueError("Tool arguments must be an object")
    if set(raw) != set(spec.required_strings):
        raise ValueError("Tool arguments do not match the registered schema")
    if any(not isinstance(value, str) or len(value) > 1000 for value in raw.values()):
        raise ValueError("Tool arguments must be strings up to 1000 characters")
    return dict(raw)


class ToolExecutor:
    def __init__(self, registry: ToolRegistry, permissions: PermissionEngine) -> None:
        self.registry = registry
        self.permissions = permissions

    def execute(self, call: ToolCall) -> dict[str, str]:
        """Validate and consume authorization *before* running trusted handler.

        Handler exceptions propagate. Once consumed, a receipt cannot be reused,
        including after a handler failure. Never register an unsafe handler.
        """
        spec = self.registry.get(call.tool_name)
        arguments = validate_arguments(spec, call.arguments)
        self.permissions.consume(call)
        return spec.handler(arguments)


def build_demo_registry() -> ToolRegistry:
    """Safe in-memory demo with no external side effects."""
    registry = ToolRegistry()
    registry.register(
        ToolSpec(
            name="rez__demo__echo",
            description="Return a short message for testing approval flow.",
            required_strings=("message",),
            handler=lambda args: {"message": args["message"]},
        )
    )
    return registry
