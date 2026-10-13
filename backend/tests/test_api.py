"""Testes do contrato HTTP do REZ Core.

Execute em backend/: python -m unittest discover -s tests -v
"""
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app


class ChatApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_chat_local_uses_adapter(self):
        with patch("main.generate_reply", new_callable=AsyncMock) as generate:
            generate.return_value = "Olá!"
            response = self.client.post(
                "/chat", json={"provider": "local", "messages": [{"role": "user", "content": "Oi"}]}
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"reply": "Olá!"})
            generate.assert_awaited_once_with("local", [{"role": "user", "content": "Oi"}])

    def test_rejects_unknown_provider(self):
        response = self.client.post(
            "/chat", json={"provider": "invalid", "messages": [{"role": "user", "content": "Oi"}]}
        )
        self.assertEqual(response.status_code, 422)

    def test_rejects_empty_messages(self):
        response = self.client.post("/chat", json={"messages": []})
        self.assertEqual(response.status_code, 422)

    def test_rejects_oversized_message(self):
        response = self.client.post(
            "/chat", json={"messages": [{"role": "user", "content": "A" * 12001}]}
        )
        self.assertEqual(response.status_code, 422)

    def test_rejects_more_than_30_messages(self):
        response = self.client.post(
            "/chat", json={"messages": [{"role": "user", "content": "Oi"}] * 31}
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
