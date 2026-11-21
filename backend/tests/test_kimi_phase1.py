"""Testes da Fase 1: contratos, Kimi K3 e SSE sem chamadas pagas."""
import asyncio
import json
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from providers import _request, stream_reply


class KimiPhase1Tests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_kimi_requires_server_key(self):
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": ""}):
            response = self.client.post("/chat/stream", json={
                "provider": "kimi", "messages": [{"role": "user", "content": "Oi"}]
            })
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("Bearer", response.text)

    def test_reasoning_effort_validated(self):
        response = self.client.post("/chat/stream", json={
            "provider": "kimi", "reasoning_effort": "ultra",
            "messages": [{"role": "user", "content": "Oi"}]
        })
        self.assertEqual(response.status_code, 422)

    def test_kimi_payload_preserves_thinking_and_key_stays_on_server(self):
        messages = [
            {"role": "user", "content": "Primeira pergunta"},
            {"role": "assistant", "content": "Resposta",
             "reasoning_content": "Contexto anterior"},
            {"role": "user", "content": "Continue"},
        ]
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "test-key"}):
            url, headers, data, is_ollama = _request(
                "kimi", messages, "max", stream=True
            )
        self.assertEqual(url, "https://api.moonshot.ai/v1/chat/completions")
        self.assertEqual(headers["Authorization"], "Bearer test-key")
        self.assertEqual(data["model"], "kimi-k3")
        self.assertEqual(data["reasoning_effort"], "max")
        self.assertEqual(data["messages"][1]["reasoning_content"], "Contexto anterior")
        self.assertTrue(data["stream"])
        self.assertFalse(is_ollama)
        self.assertNotIn("test-key", json.dumps(data))

    def test_ollama_strips_kimi_only_fields(self):
        _, _, data, _ = _request("local", [
            {"role": "assistant", "content": "Oi", "reasoning_content": "privado"}
        ], stream=True)
        self.assertNotIn("reasoning_content", data["messages"][0])

    def test_stream_sends_deltas_and_done(self):
        async def fake_stream(*args):
            yield {"type": "reasoning", "content": "ponderando"}
            yield {"type": "delta", "content": "Olá"}
            yield {"type": "delta", "content": " mundo"}

        with patch("main.stream_reply", fake_stream):
            response = self.client.post("/chat/stream", json={
                "provider": "local", "messages": [{"role": "user", "content": "Oi"}]
            })
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])
        events = [json.loads(line.removeprefix("data: "))
                  for line in response.text.splitlines() if line.startswith("data: ")]
        self.assertEqual([e["type"] for e in events],
                         ["reasoning", "delta", "delta", "done"])
        self.assertEqual(events[2]["content"], " mundo")

    def test_stream_failure_does_not_expose_secrets(self):
        from fastapi import HTTPException

        async def broken(*args):
            raise HTTPException(502, "Falha ao consultar o provedor de IA.")
            yield  # pragma: no cover
        with patch("main.stream_reply", broken):
            response = self.client.post("/chat/stream", json={
                "provider": "local", "messages": [{"role": "user", "content": "Oi"}]
            })
        self.assertIn('"type": "error"', response.text)
        self.assertNotIn("Traceback", response.text)
