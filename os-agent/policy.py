"""Fail-closed authorization for the REZ OS Agent.

No OS-wide privileges, shell, network listener, arbitrary URL or filesystem access.
The LLM (when added) must NOT be able to construct/change a SecurityPolicy.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Final
from urllib.parse import urlsplit


class Action(str, Enum):
    OPEN_APPROVED_SITE = "open_approved_site"
    READ_FILE = "read_file"
    WRITE_FILE = "write_file"
    DELETE_FILE = "delete_file"
    INSTALL_APP = "install_app"
    RUN_COMMAND = "run_command"


# Catalog is code-owned, not populated from model responses or web pages.
APPROVED_URLS: Final[frozenset[str]] = frozenset({
    "https://mail.google.com/",
    "https://www.youtube.com/",
    "https://github.com/",
    "https://open.spotify.com/",
    "https://www.google.com/",
    "https://github.com/jmrzd/REZ-A.I",
})


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str


@dataclass(frozen=True)
class SecurityPolicy:
    """Immutable policy configured by trusted host code, never by user text or an LLM."""

    allowed_actions: frozenset[Action] = field(
        default_factory=lambda: frozenset({Action.OPEN_APPROVED_SITE})
    )
    approved_urls: frozenset[str] = field(default_factory=lambda: APPROVED_URLS)
    emergency_stop: bool = False

    def authorize(self, action: Action | str, target: str) -> Decision:
        if self.emergency_stop:
            return Decision(False, "Agente interrompido pelo controle de emergência.")
        # Reject unknown action types, even if a model invents an action string.
        try:
            parsed_action = Action(action)
        except (ValueError, TypeError):
            return Decision(False, "Ação desconhecida ou não suportada.")
        if parsed_action not in self.allowed_actions:
            return Decision(False, "Ação não autorizada nesta versão do agente.")
        if parsed_action == Action.OPEN_APPROVED_SITE:
            # Exact canonical URL equality: no redirects constructed by the model,
            # no userinfo, query, fragments, altered ports or lookalike hostnames.
            if not isinstance(target, str) or target not in self.approved_urls:
                return Decision(False, "URL fora do catálogo autorizado.")
            parsed = urlsplit(target)
            if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                return Decision(False, "URL inválida.")
            return Decision(True, "Abertura permitida pelo catálogo.")
        return Decision(False, "Executor não implementado para essa ação.")
