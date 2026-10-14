"""Credential verification primitive for a future local-owner login.

No login endpoint is exposed. Never place passwords or hashes in client code,
model prompts, logs, or version-controlled configuration.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

ITERATIONS = 600_000
SALT_BYTES = 16
MAX_PASSWORD_BYTES = 1024


class CredentialError(ValueError):
    """Invalid password input or encoded credential."""


def _password_bytes(password: str) -> bytes:
    if not isinstance(password, str):
        raise CredentialError("Password must be a string")
    encoded = password.encode("utf-8")
    if not encoded or len(encoded) > MAX_PASSWORD_BYTES:
        raise CredentialError("Password must be nonempty and at most 1024 bytes")
    return encoded


def hash_password(password: str) -> str:
    """Generate a versioned PBKDF2-SHA256 hash with a fresh random salt."""
    raw = _password_bytes(password)
    salt = secrets.token_bytes(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", raw, salt, ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        ITERATIONS,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, encoded_hash: str) -> bool:
    """Verify with a constant-time digest comparison; reject invalid formats."""
    raw = _password_bytes(password)
    if not isinstance(encoded_hash, str):
        raise CredentialError("Credential hash must be a string")
    try:
        algorithm, iterations_str, salt_str, digest_str = encoded_hash.split("$")
        if algorithm != "pbkdf2_sha256" or not iterations_str.isdecimal():
            raise ValueError("Unsupported hash format")
        iterations = int(iterations_str)
        if iterations != ITERATIONS:
            raise ValueError("Unsupported work factor")
        salt = base64.b64decode(salt_str, validate=True)
        expected = base64.b64decode(digest_str, validate=True)
        if len(salt) != SALT_BYTES or len(expected) != 32:
            raise ValueError("Invalid hash lengths")
    except (ValueError, OverflowError) as exc:
        raise CredentialError("Malformed or unsupported credential hash") from exc
    candidate = hashlib.pbkdf2_hmac("sha256", raw, salt, iterations)
    return hmac.compare_digest(candidate, expected)
