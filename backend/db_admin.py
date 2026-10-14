"""Explicit PostgreSQL schema bootstrap and verification for development.

No network connection is made by importing this module. The migration command
requires --apply and an administrative URL set outside version control.
Never give the API process the migration credential.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

TABLES = ("rez_users", "rez_conversations", "rez_messages", "rez_sessions")
MIGRATION = Path(__file__).resolve().parent / "db" / "migrations" / "001_initial.sql"


class DatabaseSetupError(RuntimeError):
    """Schema is absent, partially installed, or unsafe."""


def table_status(connection) -> dict[str, bool]:
    """Read exact public schema presence with bound driver parameters."""
    with connection.cursor() as cursor:
        return {
            table: _table_exists(cursor, table)
            for table in TABLES
        }


def _table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT to_regclass(%s) IS NOT NULL", (f"public.{table}",))
    return bool(cursor.fetchone()[0])


def apply_initial_schema(connection) -> None:
    """Initialize empty tables once. Never silently modify existing schemas."""
    presence = table_status(connection)
    if any(presence.values()):
        raise DatabaseSetupError(
            "REZ tables already exist; refusing initial bootstrap. "
            "Use --check or a reviewed versioned migration."
        )
    # The migration includes explicit BEGIN/COMMIT; psycopg autocommit must
    # be enabled by the CLI so the SQL owns its transaction boundary.
    if not connection.autocommit:
        raise DatabaseSetupError("Migration connection must use autocommit=True")
    connection.execute(MIGRATION.read_text(encoding="utf-8"))
    check_schema(connection)


def check_schema(connection) -> None:
    """Verify required tables and default-deny RLS flags on real PostgreSQL."""
    presence = table_status(connection)
    missing = [t for t, present in presence.items() if not present]
    if missing:
        raise DatabaseSetupError("Missing REZ tables: " + ", ".join(missing))
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
            FROM pg_catalog.pg_class AS c
            JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = ANY(%s)
              AND c.relkind = 'r'
            """,
            (list(TABLES),),
        )
        flags = {name: (enabled, forced) for name, enabled, forced in cursor.fetchall()}
        cursor.execute(
            """
            SELECT tablename FROM pg_catalog.pg_policies
            WHERE schemaname = 'public' AND tablename = ANY(%s)
            """,
            (list(TABLES),),
        )
        policies = [row[0] for row in cursor.fetchall()]
    if set(flags) != set(TABLES) or any(flags[t] != (True, True) for t in TABLES):
        raise DatabaseSetupError("Missing tables or default-deny RLS flags")
    if policies:
        raise DatabaseSetupError(
            "RLS policies present; review access configuration separately"
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="REZ PostgreSQL setup (admin only)")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--check", action="store_true", help="Check existing schema")
    action.add_argument("--apply", action="store_true", help="Apply first migration to empty DB")
    args = parser.parse_args(argv)
    url = os.getenv("REZ_DATABASE_ADMIN_URL")
    if not url:
        parser.error("Set REZ_DATABASE_ADMIN_URL to an isolated development database")
    try:
        import psycopg
    except ImportError as exc:
        parser.error("Missing psycopg: python -m pip install -r requirements.txt")
        raise AssertionError("unreachable") from exc
    with psycopg.connect(url, autocommit=True, connect_timeout=5) as connection:
        if args.apply:
            apply_initial_schema(connection)
            print("REZ initial PostgreSQL migration applied and checked.")
        else:
            check_schema(connection)
            print("REZ PostgreSQL schema and default-deny RLS verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
