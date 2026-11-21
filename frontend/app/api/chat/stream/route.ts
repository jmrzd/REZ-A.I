import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string; reasoning_content?: string };
type Provider = 'kimi' | 'cloud' | 'local';
type Effort = 'low' | 'high' | 'max';

const encode = (data: Record<string, string>) =>
  new TextEncoder().encode('data: ' + JSON.stringify(data) + '\n\n');
const fail = (message: string, status: number) =>
  Response.json({ detail: message }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Hosted adapter. This route deliberately does NOT support Ollama:
 * a Vercel server cannot access the visitor's localhost.
 * Deployment protection must be enabled before providing a paid API key.
 */
export async function POST(request: NextRequest) {
  if (process.env.REZ_HOSTED_CHAT_ENABLED !== 'true') {
    return fail('Chat online ainda não habilitado. Configure o acesso protegido na hospedagem.', 503);
  }
  if (Number(request.headers.get('content-length') || 0) > 450_000) {
    return fail('Requisição muito grande.', 413);
  }

  let input: { provider?: Provider; reasoning_effort?: Effort; messages?: Message[] };
  try {
    input = await request.json();
  } catch {
    return fail('JSON inválido.', 400);
  }
  const provider = input.provider;
  const effort = input.reasoning_effort ?? 'high';
  if (provider !== 'kimi' && provider !== 'cloud') {
    return fail('No site hospedado, selecione Kimi K3 ou OpenAI. Ollama funciona apenas localmente.', 400);
  }
  if (!['low', 'high', 'max'].includes(effort)) return fail('Nível de raciocínio inválido.', 400);
  const messages = input.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 30 ||
      messages.some(m => !m || !['user', 'assistant'].includes(m.role) ||
        typeof m.content !== 'string' || !m.content.length || m.content.length > 12000 ||
        (m.reasoning_content !== undefined &&
          (typeof m.reasoning_content !== 'string' || m.reasoning_content.length > 100000)))) {
    return fail('Mensagens inválidas ou acima dos limites.', 422);
  }

  const key = provider === 'kimi' ? process.env.MOONSHOT_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) return fail('Chave do provedor não configurada na hospedagem.', 503);
  const url = provider === 'kimi'
    ? 'https://api.moonshot.ai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const outboundMessages = messages.map(m => {
    const entry: Message = { role: m.role, content: m.content };
    if (provider === 'kimi' && m.role === 'assistant' && m.reasoning_content)
      entry.reasoning_content = m.reasoning_content;
    return entry;
  });
  const payload: Record<string, unknown> = {
    model: provider === 'kimi' ? (process.env.MOONSHOT_MODEL || 'kimi-k3')
      : (process.env.OPENAI_MODEL || 'gpt-4.1-mini'),
    messages: outboundMessages, stream: true, max_tokens: 4096,
  };
  if (provider === 'kimi') payload.reasoning_effort = effort;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(55000)]),
      cache: 'no-store',
    });
  } catch {
    return fail('Não foi possível conectar ao provedor de IA.', 502);
  }
  if (!upstream.ok) {
    if (upstream.status === 429) return fail('Limite do provedor atingido.', 503);
    if (upstream.status === 402) return fail('Saldo insuficiente no provedor.', 503);
    return fail('Provedor indisponível ou credenciais inválidas.', 502);
  }
  if (!upstream.body) return fail('Provedor não retornou streaming.', 502);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let ended = false;
      const processFrame = (frame: string) => {
        const line = frame.split('\n').find(s => s.startsWith('data:'));
        if (!line) return;
        const raw = line.slice(5).trim();
        if (raw === '[DONE]') { ended = true; return; }
        try {
          const item = JSON.parse(raw);
          if (item.error) throw Error('provider error');
          const delta = item.choices?.[0]?.delta;
          if (typeof delta?.reasoning_content === 'string' && delta.reasoning_content)
            controller.enqueue(encode({ type: 'reasoning', content: delta.reasoning_content }));
          if (typeof delta?.content === 'string' && delta.content)
            controller.enqueue(encode({ type: 'delta', content: delta.content }));
        } catch {
          // A provider error is not a user-facing detail.
          controller.enqueue(encode({ type: 'error', message: 'Fluxo de IA inválido ou interrompido.' }));
          ended = true;
        }
      };
      try {
        while (!ended) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let pos = buffer.indexOf('\n\n');
          while (pos !== -1) {
            processFrame(buffer.slice(0, pos));
            buffer = buffer.slice(pos + 2);
            pos = buffer.indexOf('\n\n');
          }
        }
        if (ended) controller.enqueue(encode({ type: 'done' }));
        else controller.enqueue(encode({ type: 'error', message: 'A conexão foi encerrada antes do fim.' }));
      } catch {
        controller.enqueue(encode({ type: 'error', message: 'Streaming interrompido.' }));
      } finally {
        await reader.cancel().catch(() => undefined);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
