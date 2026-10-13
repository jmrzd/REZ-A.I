import os
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
app = FastAPI(title="Rez A.I API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)

class ChatRequest(BaseModel):
    provider: Literal["local", "cloud"] = "local"
    messages: list[Message] = Field(min_length=1, max_length=30)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
async def chat(request: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            if request.provider == "local":
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
                return {"reply": response.json()["message"]["content"]}
            key = os.getenv("OPENAI_API_KEY")
            if not key:
                raise HTTPException(status_code=400, detail="Configure OPENAI_API_KEY no backend/.env")
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={"model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), "messages": messages},
            )
            response.raise_for_status()
            return {"reply": response.json()["choices"][0]["message"]["content"]}
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Falha ao consultar o provedor de IA. Confira se o serviço está ativo e configurado.",
        ) from exc
