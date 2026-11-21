"""API opcional para Ollama local. A REZ Web executa IA no navegador."""
import json
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from providers import _request, generate_reply, stream_reply

load_dotenv()
app = FastAPI(title="Rez A.I Local API")
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
    provider: Literal["local"] = "local"
    messages: list[Message] = Field(min_length=1, max_length=30)


def _messages(request: ChatRequest) -> list[dict[str, str]]:
    return [m.model_dump() for m in request.messages]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    return {"reply": await generate_reply(request.provider, _messages(request))}


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    messages = _messages(request)
    _request(request.provider, messages, stream=True)

    async def events():
        try:
            async for item in stream_reply(request.provider, messages):
                yield "data: " + json.dumps(item, ensure_ascii=False) + "\n\n"
            yield 'data: {"type":"done"}\n\n'
        except HTTPException as exc:
            yield "data: " + json.dumps(
                {"type": "error", "message": exc.detail}, ensure_ascii=False
            ) + "\n\n"
        except Exception:
            yield 'data: {"type":"error","message":"Erro interno no streaming."}\n\n'

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
