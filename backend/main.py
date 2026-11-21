"""API local da REZ A.I — mantenha restrita a loopback até ter autenticação."""
import json
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from providers import _request, generate_reply, stream_reply

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
    # Metadado somente para preservar o contexto Kimi; não é exposto como resposta.
    reasoning_content: str | None = Field(default=None, max_length=100000)


class ChatRequest(BaseModel):
    provider: Literal["local", "cloud", "kimi"] = "local"
    messages: list[Message] = Field(min_length=1, max_length=30)
    reasoning_effort: Literal["low", "high", "max"] = "high"


def _messages(req: ChatRequest) -> list[dict]:
    return [m.model_dump(exclude_none=True) for m in req.messages]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    messages = _messages(request)
    if request.provider == "kimi":
        reply = await generate_reply("kimi", messages, request.reasoning_effort)
    else:
        # Mantém compatibilidade com integrações antigas.
        clean = [{"role": m["role"], "content": m["content"]} for m in messages]
        reply = await generate_reply(request.provider, clean)
    return {"reply": reply}


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    messages = _messages(request)
    # Valida a configuração ANTES de iniciar HTTP 200 streaming.
    _request(request.provider, messages, request.reasoning_effort, stream=True)

    async def events():
        try:
            async for item in stream_reply(
                request.provider, messages, request.reasoning_effort
            ):
                yield "data: " + json.dumps(item, ensure_ascii=False) + "\n\n"
            yield 'data: {"type":"done"}\n\n'
        except HTTPException as exc:
            yield "data: " + json.dumps(
                {"type": "error", "message": exc.detail}, ensure_ascii=False
            ) + "\n\n"
        except Exception:
            # Não vaze erros internos ou cabeçalhos de provedores.
            yield 'data: {"type":"error","message":"Erro interno no streaming."}\n\n'

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
