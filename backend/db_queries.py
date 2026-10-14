"""Parameterized, owner-scoped SQL statements for future PostgreSQL storage.

These are building blocks, not connected database operations or HTTP routes.
The caller must obtain user_id from an authenticated server-side session,
never a request body or LLM response. Pass parameters via the database driver.
"""
from __future__ import annotations

from uuid import UUID


class InvalidOwner(ValueError):
    """Unverified/malformed user identifier."""


def require_owner(user_id: UUID) -> UUID:
    if not isinstance(user_id, UUID):
        raise InvalidOwner("An authenticated UUID owner is required")
    return user_id


LIST_CONVERSATIONS = """
SELECT id, title, created_at, updated_at
FROM rez_conversations
WHERE user_id = %(user_id)s
ORDER BY updated_at DESC, id
LIMIT %(limit)s
"""

GET_CONVERSATION = """
SELECT id, title, created_at, updated_at
FROM rez_conversations
WHERE id = %(conversation_id)s AND user_id = %(user_id)s
"""

GET_MESSAGES = """
SELECT m.id, m.role, m.content, m.created_at
FROM rez_messages AS m
JOIN rez_conversations AS c
  ON c.id = m.conversation_id AND c.user_id = m.user_id
WHERE m.conversation_id = %(conversation_id)s
  AND m.user_id = %(user_id)s
  AND c.user_id = %(user_id)s
ORDER BY m.created_at, m.id
LIMIT %(limit)s
"""

DELETE_CONVERSATION = """
DELETE FROM rez_conversations
WHERE id = %(conversation_id)s AND user_id = %(user_id)s
RETURNING id
"""

INSERT_MESSAGE = """
INSERT INTO rez_messages (id, conversation_id, user_id, role, content)
SELECT %(message_id)s, c.id, c.user_id, %(role)s, %(content)s
FROM rez_conversations AS c
WHERE c.id = %(conversation_id)s AND c.user_id = %(user_id)s
RETURNING id
"""


def owner_params(user_id: UUID, **extra: object) -> dict[str, object]:
    """Build driver parameters, preventing a caller from overriding owner."""
    if "user_id" in extra:
        raise InvalidOwner("Owner cannot be overridden")
    return {**extra, "user_id": require_owner(user_id)}
