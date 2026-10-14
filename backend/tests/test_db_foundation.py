"""Offline checks for PostgreSQL schema invariants and scoped query builders.

These tests cannot substitute for integration testing against PostgreSQL.
"""
from pathlib import Path
import unittest
from uuid import uuid4

from db_queries import (
    DELETE_CONVERSATION, GET_CONVERSATION, GET_MESSAGES, INSERT_MESSAGE,
    LIST_CONVERSATIONS, InvalidOwner, owner_params, require_owner,
)


class DbFoundationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.migration = (
            Path(__file__).resolve().parents[1] / "db" / "migrations" / "001_initial.sql"
        ).read_text(encoding="utf-8")

    def test_tables_present(self):
        for table in ("rez_users", "rez_conversations", "rez_messages", "rez_sessions"):
            with self.subTest(table=table):
                self.assertIn("CREATE TABLE " + table, self.migration)

    def test_default_deny_row_level_security(self):
        for table in ("rez_users", "rez_conversations", "rez_messages", "rez_sessions"):
            with self.subTest(table=table):
                self.assertIn("ALTER TABLE " + table + " ENABLE ROW LEVEL SECURITY", self.migration)
                self.assertIn("ALTER TABLE " + table + " FORCE ROW LEVEL SECURITY", self.migration)

    def test_messages_fk_includes_owner(self):
        self.assertIn("FOREIGN KEY (conversation_id, user_id)", self.migration)
        self.assertIn("REFERENCES rez_conversations(id, user_id)", self.migration)

    def test_session_token_is_hash_only(self):
        self.assertIn("token_hash CHAR(64) NOT NULL UNIQUE", self.migration)
        self.assertNotIn("token_plaintext", self.migration)

    def test_foreign_key_cascade(self):
        self.assertIn("REFERENCES rez_users(id) ON DELETE CASCADE", self.migration)

    def test_conversation_list_scoped(self):
        self.assertIn("WHERE user_id = %(user_id)s", LIST_CONVERSATIONS)
        self.assertIn("LIMIT %(limit)s", LIST_CONVERSATIONS)

    def test_single_conversation_scoped(self):
        self.assertIn("AND user_id = %(user_id)s", GET_CONVERSATION)

    def test_message_read_scoped(self):
        self.assertIn("m.user_id = %(user_id)s", GET_MESSAGES)
        self.assertIn("c.user_id = %(user_id)s", GET_MESSAGES)

    def test_insert_checks_conversation_owner(self):
        self.assertIn("c.user_id = %(user_id)s", INSERT_MESSAGE)
        self.assertIn("INSERT INTO rez_messages", INSERT_MESSAGE)

    def test_delete_checks_owner(self):
        self.assertIn("AND user_id = %(user_id)s", DELETE_CONVERSATION)

    def test_owner_params_are_uuid_only(self):
        uid = uuid4()
        self.assertEqual(owner_params(uid, limit=20), {"user_id": uid, "limit": 20})
        self.assertEqual(require_owner(uid), uid)
        with self.assertRaises(InvalidOwner):
            owner_params(str(uid))

    def test_owner_cannot_be_overridden(self):
        with self.assertRaises(InvalidOwner):
            owner_params(uuid4(), user_id=uuid4())


if __name__ == "__main__":
    unittest.main()
