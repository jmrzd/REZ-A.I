"""Adaptadores de provedores do REZ Core.

Toda configuracao sensivel permanece no servidor.
"""
import os
from typing import Literal

import httpx
from fastapi import HTTPException

Provider = Literal["local", "cloud"]


async def generate_reply(provider: Provider, messages: list[dict[str, str]]) -> str:
    """Consulta Ollama ou OpenAI sem expor credenciais ao cliente."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            if provider == "local":
                base = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
                response = await client.post(
                    f"{base}/api/chat",
                    json={
                        "model": os.getenv("OLLAMA_MODEL", "qwen3:1.7b"),
                        "messages": messages,
                        "stream": False,
                    },
                )
                response.raise_for_status()
                return response.json()["message"]["content"]

            key = os.getenv("OPENAI_API_KEY")
            if not key:
                raise HTTPException(
                    status_code=400,
                    detail="Configure OPENAI_API_KEY no backend/.env",
                )
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                    "messages": messages,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail="Falha ao consultar o provedor de IA. Confira se o serviço está ativo e configurado.",
            ) from exc
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=502,
                detail="O provedor de IA retornou uma resposta inválida.",
            ) from exc
