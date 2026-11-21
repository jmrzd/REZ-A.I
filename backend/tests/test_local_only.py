"""A API opcional não aceita provedores pagos."""
import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from providers import _request


class LocalOnlyTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_rejects_kimi_and_cloud(self):
        for provider in ("kimi", "cloud", "openai"):
            with self.subTest(provider=provider):
                r = self.client.post("/chat/stream", json={
                    "provider": provider,
                    "messages": [{"role": "user", "content": "Oi"}],
                })
                self.assertEqual(r.status_code, 422)

    def test_local_request_does_not_use_api_key(self):
        url, headers, body, is_local = _request(
            "local", [{"role": "user", "content": "Oi"}], stream=True
        )
        self.assertTrue(is_local)
        self.assertEqual(headers, {})
        self.assertTrue(url.startswith("http://localhost:11434/"))
        self.assertEqual(body["model"], "qwen3:1.7b")

    def test_stream_contract(self):
        async def fake_stream(*args):
            yield {"type": "delta", "content": "Olá"}
            yield {"type": "delta", "content": " mundo"}
        with patch("main.stream_reply", fake_stream):
            r = self.client.post("/chat/stream", json={
                "provider": "local",
                "messages": [{"role": "user", "content": "Oi"}],
            })
        self.assertEqual(r.status_code, 200)
        self.assertIn("text/event-stream", r.headers["content-type"])
        events = [json.loads(line.removeprefix("data: "))
                  for line in r.text.splitlines() if line.startswith("data: ")]
        self.assertEqual([e["type"] for e in events], ["delta", "delta", "done"])
        self.assertEqual(events[1]["content"], " mundo")
