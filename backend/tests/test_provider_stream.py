"""Testes de streaming e falhas do Ollama local com HTTPX MockTransport."""
import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException

import providers

REAL_ASYNC_CLIENT = httpx.AsyncClient


class ProviderStreamTests(unittest.IsolatedAsyncioTestCase):
    async def test_ollama_ndjson_stream_parses(self):
        calls = []
        def handler(request):
            calls.append(json.loads(request.content.decode()))
            return httpx.Response(200, text=(
                '{"message":{"content":"Oi"},"done":false}\n'
                '{"message":{"content":"!"},"done":false}\n'
                '{"done":true}\n'
            ))
        transport = httpx.MockTransport(handler)
        def client_factory(*args, **kwargs):
            return REAL_ASYNC_CLIENT(transport=transport, **kwargs)
        with patch("providers.httpx.AsyncClient", side_effect=client_factory):
            events = [e async for e in providers.stream_reply(
                "local", [{"role": "user", "content": "Olá"}]
            )]
        self.assertEqual(events, [
            {"type": "delta", "content": "Oi"},
            {"type": "delta", "content": "!"},
        ])
        self.assertTrue(calls[0]["stream"])
        self.assertEqual(calls[0]["model"], "qwen3:1.7b")
        self.assertNotIn("reasoning_effort", calls[0])

    async def test_ollama_http_error_is_sanitized(self):
        transport = httpx.MockTransport(
            lambda request: httpx.Response(429, json={"error": "private detail"})
        )
        def client_factory(*args, **kwargs):
            return REAL_ASYNC_CLIENT(transport=transport, **kwargs)
        with patch("providers.httpx.AsyncClient", side_effect=client_factory):
            with self.assertRaises(HTTPException) as ctx:
                [e async for e in providers.stream_reply(
                    "local", [{"role": "user", "content": "Oi"}]
                )]
        self.assertEqual(ctx.exception.status_code, 502)
        self.assertNotIn("private detail", str(ctx.exception.detail))

    async def test_ollama_rejects_remote_endpoint(self):
        with patch.dict(os.environ, {"OLLAMA_URL": "https://example.org"}):
            with self.assertRaises(HTTPException) as ctx:
                [e async for e in providers.stream_reply(
                    "local", [{"role": "user", "content": "Oi"}]
                )]
        self.assertEqual(ctx.exception.status_code, 400)
