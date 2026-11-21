"""Testes do parser de streaming usando um servidor HTTP simulado."""
import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException

import providers

REAL_ASYNC_CLIENT = httpx.AsyncClient


class ProviderStreamTests(unittest.IsolatedAsyncioTestCase):
    async def test_kimi_stream_parses_reasoning_and_answer(self):
        sent = []
        def handler(request):
            sent.append(json.loads(request.content.decode()))
            return httpx.Response(200, text=(
                'data: {"choices":[{"delta":{"reasoning_content":"Pensando"}}]}\n\n'
                'data: {"choices":[{"delta":{"content":"Olá "}}]}\n\n'
                'data: {"choices":[{"delta":{"content":"mundo"}}]}\n\n'
                'data: [DONE]\n\n'
            ))
        transport = httpx.MockTransport(handler)
        def client_factory(*args, **kwargs):
            return REAL_ASYNC_CLIENT(transport=transport, **kwargs)
        messages = [
            {"role": "user", "content": "Olá"},
            {"role": "assistant", "content": "Resposta",
             "reasoning_content": "Raciocínio preservado"},
            {"role": "user", "content": "Continue"},
        ]
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "fake-key"}), patch(
            "providers.httpx.AsyncClient", side_effect=client_factory
        ):
            events = [e async for e in providers.stream_reply("kimi", messages, "max")]
        self.assertEqual(events, [
            {"type": "reasoning", "content": "Pensando"},
            {"type": "delta", "content": "Olá "},
            {"type": "delta", "content": "mundo"},
        ])
        self.assertEqual(sent[0]["model"], "kimi-k3")
        self.assertEqual(sent[0]["reasoning_effort"], "max")
        self.assertEqual(sent[0]["messages"][1]["reasoning_content"], "Raciocínio preservado")

    async def test_ollama_ndjson_stream_parses(self):
        def handler(request):
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
                "local", [{"role":"user","content":"Olá"}]
            )]
        self.assertEqual(events, [
            {"type": "delta", "content": "Oi"},
            {"type": "delta", "content": "!"},
        ])

    async def test_provider_rate_limit_is_sanitized(self):
        transport = httpx.MockTransport(
            lambda request: httpx.Response(429, json={"error": "private upstream detail"})
        )
        def client_factory(*args, **kwargs):
            return REAL_ASYNC_CLIENT(transport=transport, **kwargs)
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "fake-key"}), patch(
            "providers.httpx.AsyncClient", side_effect=client_factory
        ):
            with self.assertRaises(HTTPException) as ctx:
                [e async for e in providers.stream_reply(
                    "kimi", [{"role":"user","content":"Olá"}]
                )]
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertNotIn("private upstream", str(ctx.exception.detail))
