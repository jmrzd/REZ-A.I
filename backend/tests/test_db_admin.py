"""Unit tests for DB bootstrap checks, without requiring a server."""
import unittest
from unittest.mock import MagicMock, patch

from db_admin import (
    DatabaseSetupError, TABLES, apply_initial_schema, check_schema, main, table_status,
)


def fake_connection(*, present=False, flags=None, policies=()):
    conn = MagicMock()
    conn.autocommit = True
    cursor = conn.cursor.return_value.__enter__.return_value
    cursor.fetchone.side_effect = [(present,)] * len(TABLES)
    if flags is None:
        flags = [(t, True, True) for t in TABLES]
    cursor.fetchall.side_effect = [flags, [(p,) for p in policies]]
    return conn, cursor


class DatabaseAdminTests(unittest.TestCase):
    def test_table_lookup_uses_bound_parameter(self):
        conn, cursor = fake_connection()
        self.assertEqual(table_status(conn), dict.fromkeys(TABLES, False))
        self.assertEqual(cursor.execute.call_count, 4)
        for call in cursor.execute.call_args_list:
            self.assertEqual(call.args[0], "SELECT to_regclass(%s) IS NOT NULL")
            self.assertTrue(call.args[1][0].startswith("public."))

    def test_bootstrap_rejects_existing_tables(self):
        conn, _ = fake_connection(present=True)
        with self.assertRaises(DatabaseSetupError):
            apply_initial_schema(conn)
        conn.execute.assert_not_called()

    def test_bootstrap_requires_autocommit(self):
        conn, _ = fake_connection()
        conn.autocommit = False
        with self.assertRaises(DatabaseSetupError):
            apply_initial_schema(conn)
        conn.execute.assert_not_called()

    def test_missing_tables_fail_check(self):
        conn, _ = fake_connection()
        with self.assertRaises(DatabaseSetupError):
            check_schema(conn)

    def test_default_deny_flags_pass(self):
        conn, _ = fake_connection(present=True)
        check_schema(conn)

    def test_missing_rls_rejected(self):
        flags = [(t, True, False) for t in TABLES]
        conn, _ = fake_connection(present=True, flags=flags)
        with self.assertRaises(DatabaseSetupError):
            check_schema(conn)

    def test_policy_requires_separate_review(self):
        conn, _ = fake_connection(present=True, policies=["rez_messages"])
        with self.assertRaises(DatabaseSetupError):
            check_schema(conn)

    def test_missing_admin_url_does_not_connect(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(SystemExit) as captured:
                main(["--check"])
        self.assertEqual(captured.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
