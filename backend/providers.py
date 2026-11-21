"""Adaptadores Ollama, OpenAI e Moonshot/Kimi da REZ A.I.

Credenciais ficam exclusivamente no backend. O streaming é consumido via SSE
pela API REZ, sem retransmitir headers ou erros privados do provedor.
"""
from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Literal

import httpx
from fastapi import HTTPException

Provider = Literal["local", "cloud", "kimi"]
Effort = Literal["low", "high", "max"]

_TIMEOUT = httpx.Timeout(connect=15.0, read=120.0, write=30.0, pool=15.0)


def _request(
    provider: Provider, messages: list[dict], effort: Effort = "high", *, stream: bool
) -> tuple[str, dict[str, str], dict, bool]:
    """Constrói uma requisição sem enviar campos exclusivos do Kimi a outros modelos."""
    clean_messages = [
        {k: v for k, v in message.items() if k in ("role", "content")}
        for message in messages
    ]
    if provider == "local":
        base = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
        return (
            f"{base}/api/chat", {},
            {"model": os.getenv("OLLAMA_MODEL", "qwen3:1.7b"),
             "messages": clean_messages, "stream": stream},
            True,
        )

    if provider == "kimi":
        key = os.getenv("MOONSHOT_API_KEY", "").strip()
        if not key:
            raise HTTPException(400, "Configure MOONSHOT_API_KEY no backend/.env")
        # Preserved thinking: o campo reasoning_content da resposta anterior
        # precisa voltar na próxima requisição, sem ser descartado pelo adaptador.
        kimi_messages = []
        for message in messages:
            entry = {k: v for k, v in message.items() if k in ("role", "content")}
            if message["role"] == "assistant" and "reasoning_content" in message:
                entry["reasoning_content"] = message["reasoning_content"]
            kimi_messages.append(entry)
        return (
            "https://api.moonshot.ai/v1/chat/completions",
            {"Authorization": f"Bearer {key}"},
            {"model": os.getenv("MOONSHOT_MODEL", "kimi-k3"),
             "reasoning_effort": effort,
             "messages": kimi_messages, "stream": stream,
             "max_tokens": 4096},
            False,
        )

    if provider == "cloud":
        key = os.getenv("OPENAI_API_KEY", "").strip()
        if not key:
            raise HTTPException(400, "Configure OPENAI_API_KEY no backend/.env")
        return (
            "https://api.openai.com/v1/chat/completions",
            {"Authorization": f"Bearer {key}"},
            {"model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
             "messages": clean_messages, "stream": stream,
             "max_tokens": 4096},
            False,
        )

    raise HTTPException(422, "Provedor desconhecido")


def _upstream_error(status: int) -> HTTPException:
    """Nunca exponha o corpo bruto da API (pode conter detalhes sensíveis)."""
    if status in (401, 403):
        return HTTPException(502, "Credenciais ou permissão do provedor inválidas.")
    if status == 429:
        return HTTPException(503, "Limite de requisições do provedor atingido. Tente depois.")
    if status == 402:
        return HTTPException(503, "Saldo insuficiente no provedor de IA.")
    return HTTPException(502, "Falha ao consultar o provedor de IA.")


async def generate_reply(
    provider: Provider, messages: list[dict], reasoning_effort: Effort = "high"
) -> str:
    """Compatibilidade com POST /chat (resposta única)."""
    url, headers, payload, is_ollama = _request(
        provider, messages, reasoning_effort, stream=False
    )
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.is_error:
                raise _upstream_error(response.status_code)
            data = response.json()
            reply = (data["message"]["content"] if is_ollama
                     else data["choices"][0]["message"]["content"])
            if not isinstance(reply, str):
                raise ValueError("Conteúdo inválido")
            return reply
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Falha de conexão com o provedor de IA.") from exc
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(502, "O provedor retornou dados inválidos.") from exc


async def stream_reply(
    provider: Provider, messages: list[dict], reasoning_effort: Effort = "high"
) -> AsyncIterator[dict[str, str]]:
    """Converte NDJSON do Ollama ou SSE OpenAI/Moonshot em deltas REZ.

    O campo reasoning_content só é transmitido à aplicação para preservar
    a continuidade entre turnos; a interface não o apresenta como resposta.
    """
    url, headers, payload, is_ollama = _request(
        provider, messages, reasoning_effort, stream=True
    )
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.is_error:
                    raise _upstream_error(response.status_code)
                async for raw_line in response.aiter_lines():
                    line = raw_line.strip()
                    if not line:
                        continue
                    if is_ollama:
                        try:
                            item = json.loads(line)
                            chunk = item.get("message", {}).get("content")
                        except (ValueError, AttributeError) as exc:
                            raise HTTPException(502, "Fluxo Ollama inválido.") from exc
                        if isinstance(chunk, str) and chunk:
                            yield {"type": "delta", "content": chunk}
                        if item.get("done"):
                            break
                        continue

                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        item = json.loads(data)
                        if "error" in item:
                            raise HTTPException(502, "O provedor interrompeu a geração.")
                        delta = item["choices"][0]["delta"]
                    except (ValueError, KeyError, IndexError, TypeError) as exc:
                        raise HTTPException(502, "Fluxo do provedor inválido.") from exc
                    reasoning = delta.get("reasoning_content")
                    if isinstance(reasoning, str) and reasoning:
                        yield {"type": "reasoning", "content": reasoning}
                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        yield {"type": "delta", "content": content}
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Conexão com o provedor interrompida.") from exc
