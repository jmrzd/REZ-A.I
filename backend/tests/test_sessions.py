"""Offline unit tests; no HTTP login or privileges are exposed."""
import unittest

from sessions import SessionDenied, SessionStore


class SessionStoreTests(unittest.TestCase):
    def setUp(self):
        self.now = 10.0
        self.store = SessionStore(ttl_seconds=20, clock=lambda: self.now)

    def test_issue_and_resolve(self):
        token, session = self.store.issue("owner")
        self.assertEqual(self.store.resolve(token), session)
        self.assertEqual(session.subject_id, "owner")

    def test_tokens_are_unique(self):
        token_a, session_a = self.store.issue("owner")
        token_b, session_b = self.store.issue("owner")
        self.assertNotEqual(token_a, token_b)
        self.assertNotEqual(session_a.session_id, session_b.session_id)

    def test_rejects_invalid_identity(self):
        with self.assertRaises(ValueError):
            self.store.issue("  ")

    def test_rejects_unknown_token(self):
        with self.assertRaises(SessionDenied):
            self.store.resolve("unknown")

    def test_expires_on_boundary(self):
        token, _ = self.store.issue("owner")
        self.now = 30.0
        with self.assertRaises(SessionDenied):
            self.store.resolve(token)

    def test_revocation_is_immediate(self):
        token, _ = self.store.issue("owner")
        self.store.revoke(token)
        with self.assertRaises(SessionDenied):
            self.store.resolve(token)

    def test_subject_is_bound(self):
        token, _ = self.store.issue("owner")
        with self.assertRaises(SessionDenied):
            self.store.require_subject(token, "other")
        self.assertEqual(self.store.require_subject(token, "owner").subject_id, "owner")

    def test_cleanup_only_purges_expired(self):
        old, _ = self.store.issue("owner")
        self.now = 25.0
        fresh, _ = self.store.issue("owner")
        self.now = 31.0
        self.assertEqual(self.store.cleanup(), 1)
        with self.assertRaises(SessionDenied):
            self.store.resolve(old)
        self.assertEqual(self.store.resolve(fresh).subject_id, "owner")

    def test_expired_token_cannot_be_reused(self):
        token, _ = self.store.issue("owner")
        self.now = 31.0
        with self.assertRaises(SessionDenied):
            self.store.resolve(token)
        with self.assertRaises(SessionDenied):
            self.store.resolve(token)


if __name__ == "__main__":
    unittest.main()
