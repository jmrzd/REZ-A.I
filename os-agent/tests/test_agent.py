import unittest
from unittest.mock import Mock
from agent import resolve, execute, normalize

class AgentTests(unittest.TestCase):
    def test_portuguese(self):
        self.assertEqual(resolve("Rez, abre meu Gmail"), "https://mail.google.com/")
    def test_english(self):
        self.assertEqual(resolve("Hey Rez, open my Gmail"), "https://mail.google.com/")
    def test_spanish(self):
        self.assertEqual(resolve("Rez, abre mi correo"), "https://mail.google.com/")
    def test_youtube(self):
        self.assertEqual(resolve("Rez, abre o YouTube"), "https://www.youtube.com/")
    def test_unknown_rejected(self):
        self.assertIsNone(resolve("Rez, apaga meus arquivos"))
    def test_no_arbitrary_url(self):
        self.assertIsNone(resolve("open https://example.com"))
    def test_normalize(self):
        self.assertEqual(normalize("OLÁ, REZ!"), "ola rez")
    def test_opener_called(self):
        fn = Mock(return_value=True)
        result = execute("Rez, abre Gmail", opener=fn)
        self.assertTrue(result.ok)
        fn.assert_called_once_with("https://mail.google.com/")
    def test_unknown_does_not_open(self):
        fn = Mock(return_value=True)
        result = execute("delete everything", opener=fn)
        self.assertFalse(result.ok)
        fn.assert_not_called()

if __name__ == "__main__":
    unittest.main()
