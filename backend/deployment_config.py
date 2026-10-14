"""Strict configuration for future REZ public deployments.

This module does not start a server or enable auth endpoints. It prevents
accidental public configuration with permissive CORS or insecure cookies.
"""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlsplit


class DeploymentConfigError(ValueError):
    """Unsafe or invalid deployment configuration."""


def _origin(value: str, *, public: bool) -> str:
    if not isinstance(value, str) or not value or value != value.strip():
        raise DeploymentConfigError("Origin must be nonempty and trimmed")
    parsed = urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise DeploymentConfigError("Origin must use http or https")
    if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise DeploymentConfigError("Origin cannot contain credentials, paths or fragments")
    if "*" in value or parsed.hostname is None:
        raise DeploymentConfigError("Wildcard or invalid origin")
    try:
        parsed.port
    except ValueError as exc:
        raise DeploymentConfigError("Invalid origin port") from exc
    if public and parsed.scheme != "https":
        raise DeploymentConfigError("Public origins require HTTPS")
    if not public and parsed.hostname not in ("localhost", "127.0.0.1"):
        raise DeploymentConfigError("Development origins must be loopback")
    return value


@dataclass(frozen=True)
class DeploymentConfig:
    mode: str
    frontend_origin: str
    cookie_secure: bool
    cookie_httponly: bool = True
    cookie_samesite: str = "lax"

    def __post_init__(self) -> None:
        if self.mode not in ("development", "production"):
            raise DeploymentConfigError("Mode must be development or production")
        public = self.mode == "production"
        _origin(self.frontend_origin, public=public)
        if not isinstance(self.cookie_secure, bool) or not isinstance(self.cookie_httponly, bool):
            raise DeploymentConfigError("Cookie flags must be booleans")
        if not self.cookie_httponly:
            raise DeploymentConfigError("Session cookies must be HttpOnly")
        if self.cookie_samesite not in ("lax", "strict"):
            raise DeploymentConfigError("SameSite must be lax or strict")
        if public and not self.cookie_secure:
            raise DeploymentConfigError("Production session cookies must be Secure")

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_origin]
