import unittest
from credentials import CredentialError, hash_password, verify_password

class CredentialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.secret = "Example long local credential 2026"
        cls.stored = hash_password(cls.secret)

    def test_match(self):
        self.assertTrue(verify_password(self.secret, self.stored))

    def test_mismatch(self):
        self.assertFalse(verify_password("different input", self.stored))

    def test_salted(self):
        self.assertNotEqual(hash_password(self.secret), self.stored)

    def test_no_plaintext(self):
        self.assertNotIn(self.secret, self.stored)

    def test_empty_rejected(self):
        with self.assertRaises(CredentialError):
            hash_password("")

    def test_too_long_rejected(self):
        with self.assertRaises(CredentialError):
            hash_password("a" * 1025)

    def test_malformed_rejected(self):
        with self.assertRaises(CredentialError):
            verify_password(self.secret, "bad")

    def test_work_factor_rejected(self):
        with self.assertRaises(CredentialError):
            verify_password(self.secret, self.stored.replace("$600000$", "$1$", 1))

    def test_bad_salt_rejected(self):
        parts = self.stored.split("$")
        parts[2] = "!"
        with self.assertRaises(CredentialError):
            verify_password(self.secret, "$".join(parts))

    def test_bad_digest_rejected(self):
        parts = self.stored.split("$")
        parts[3] = "YQ=="
        with self.assertRaises(CredentialError):
            verify_password(self.secret, "$".join(parts))

if __name__ == "__main__":
    unittest.main()
