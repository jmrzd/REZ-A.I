"""Local-owner login behavior; no HTTP exposure or browser tokens."""
import unittest

from credentials import hash_password
from local_auth import LocalOwnerAuth, LoginDenied
from sessions import SessionDenied, SessionStore


class LocalOwnerAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.encoded = hash_password("example unique local owner phrase")

    def setUp(self):
        self.now = 10.0
        clock = lambda: self.now
        self.sessions = SessionStore(clock=clock)
        self.auth = LocalOwnerAuth(
            self.encoded, self.sessions, max_attempts=3,
            lock_seconds=20, clock=clock,
        )

    def test_login_creates_valid_session(self):
        token, identity = self.auth.login("example unique local owner phrase")
        self.assertEqual(self.sessions.resolve(token), identity)
        self.assertEqual(identity.subject_id, "local-owner")

    def test_wrong_password_denied(self):
        with self.assertRaises(LoginDenied):
            self.auth.login("incorrect")

    def test_empty_password_denied(self):
        with self.assertRaises(LoginDenied):
            self.auth.login("")

    def test_non_string_password_denied(self):
        with self.assertRaises(LoginDenied):
            self.auth.login(None)

    def test_three_failures_lock_login(self):
        for _ in range(3):
            with self.assertRaises(LoginDenied):
                self.auth.login("incorrect")
        with self.assertRaises(LoginDenied):
            self.auth.login("example unique local owner phrase")

    def test_lock_expires(self):
        for _ in range(3):
            with self.assertRaises(LoginDenied):
                self.auth.login("incorrect")
        self.now = 30.0
        token, _ = self.auth.login("example unique local owner phrase")
        self.assertEqual(self.sessions.resolve(token).subject_id, "local-owner")

    def test_success_resets_failure_counter(self):
        for _ in range(2):
            with self.assertRaises(LoginDenied):
                self.auth.login("incorrect")
        self.auth.login("example unique local owner phrase")
        with self.assertRaises(LoginDenied):
            self.auth.login("incorrect")
        token, _ = self.auth.login("example unique local owner phrase")
        self.assertEqual(self.sessions.resolve(token).subject_id, "local-owner")

    def test_logout_revokes_token(self):
        token, _ = self.auth.login("example unique local owner phrase")
        self.auth.logout(token)
        with self.assertRaises(SessionDenied):
            self.sessions.resolve(token)

    def test_logout_does_not_revoke_other_session(self):
        first, _ = self.auth.login("example unique local owner phrase")
        second, _ = self.auth.login("example unique local owner phrase")
        self.auth.logout(first)
        self.assertEqual(self.sessions.resolve(second).subject_id, "local-owner")

    def test_invalid_logout_denied(self):
        with self.assertRaises(SessionDenied):
            self.auth.logout("invalid")

    def test_configuration_rejects_empty_hash(self):
        with self.assertRaises(ValueError):
            LocalOwnerAuth("", self.sessions)

    def test_configuration_rejects_invalid_limits(self):
        with self.assertRaises(ValueError):
            LocalOwnerAuth(self.encoded, self.sessions, max_attempts=0)


if __name__ == "__main__":
    unittest.main()
