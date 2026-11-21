"""Adaptador exclusivamente local da REZ A.I.

Nenhuma chamada de inferência é enviada à OpenAI, Moonshot ou outros
provedores pagos. A API Python é opcional, para usuários com Ollama local.
O site hospedado usa WebLLM / Transformers.js dentro do navegador.
"""
from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Literal

import httpx
from fastapi import HTTPException

Provider = Literal["local"]
_TIMEOUT = httpx.Timeout(connect=10.0, read=120.0, write=20.0, pool=10.0)


def _request(
    provider: Provider, messages: list[dict], effort: str = "high", *, stream: bool
) -> tuple[str, dict[str, str], dict, bool]:
    """Mantém o contrato interno antigo, mas aceita somente Ollama local."""
    if provider != "local":
        raise HTTPException(422, "Somente o provedor Ollama local é permitido.")
    clean_messages = [
        {k: m[k] for k in ("role", "content") if k in m}
        for m in messages
    ]
    base = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
    # Evita configurar via ambiente uma URL remota não-intencional neste MVP.
    from urllib.parse import urlsplit
    parsed = urlsplit(base)
    if parsed.scheme != "http" or parsed.hostname not in ("localhost", "127.0.0.1"):
        raise HTTPException(400, "OLLAMA_URL deve apontar para o seu computador.")
    return (
        base + "/api/chat", {},
        {"model": os.getenv("OLLAMA_MODEL", "qwen3:1.7b"),
         "messages": clean_messages, "stream": stream},
        True,
    )


async def generate_reply(provider: Provider, messages: list[dict]) -> str:
    url, headers, payload, _ = _request(provider, messages, stream=False)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.is_error:
                raise HTTPException(502, "Ollama local retornou um erro.")
            reply = response.json()["message"]["content"]
            if not isinstance(reply, str):
                raise ValueError("Resposta inválida")
            return reply
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Ollama indisponível. Verifique o serviço local.") from exc
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(502, "Ollama retornou dados inválidos.") from exc


async def stream_reply(
    provider: Provider, messages: list[dict], effort: str = "high"
) -> AsyncIterator[dict[str, str]]:
    url, headers, payload, _ = _request(provider, messages, stream=True)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.is_error:
                    raise HTTPException(502, "Ollama local retornou um erro.")
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        item = json.loads(line)
                        fragment = item.get("message", {}).get("content", "")
                        if not isinstance(fragment, str):
                            raise ValueError("Fragmento inválido")
                    except (ValueError, TypeError, AttributeError) as exc:
                        raise HTTPException(502, "Fluxo Ollama inválido.") from exc
                    if fragment:
                        yield {"type": "delta", "content": fragment}
                    if item.get("done"):
                        break
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Conexão local com Ollama interrompida.") from exc
