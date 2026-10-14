"""Opt-in live PostgreSQL test.

Set REZ_TEST_DATABASE_ADMIN_URL for a dedicated database that already has
migration 001 applied. This test reads schema metadata only; no writes.
"""
import os
import unittest

from db_admin import check_schema


class PostgresIntegrationTests(unittest.TestCase):
    def test_live_schema_and_rls(self):
        url = os.getenv("REZ_TEST_DATABASE_ADMIN_URL")
        if not url:
            self.skipTest("Set REZ_TEST_DATABASE_ADMIN_URL for live PostgreSQL test")
        try:
            import psycopg
        except ImportError:
            self.fail("psycopg is required: pip install -r requirements.txt")
        with psycopg.connect(url, connect_timeout=5) as connection:
            check_schema(connection)


if __name__ == "__main__":
    unittest.main()
