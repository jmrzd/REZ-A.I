/**
 * REZ Turbo v0.4: Groq Free tier, GPT-OSS 120B.
 *
 * Generation happens on Groq's servers, not the visitor's device.
 * No Vercel AI Gateway/OIDC, no Moonshot, and no paid model fallback.
 *
 * SECURITY: Groq credentials only exist in Vercel server environment.
 * Keep Vercel Authentication/Deployment Protection ENABLED until
 * independent login, persistent per-user quotas, and abuse controls exist.
 * The free-tier organization request/token limits are shared by all visitors.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';
const MAX_BODY_CHARS = 24_000;
const MAX_MESSAGE_CHARS = 3_000;
const MAX_TURNS = 12;
const MAX_OUTPUT_TOKENS = 1024;

type Turn = { role: 'user' | 'assistant'; content: string };
type GroqChunk = {
  error?: { code?: string; message?: string };
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
};

const SYSTEM = [
  'Você é REZ A.I Turbo, um assistente independente que utiliza o modelo de pesos abertos GPT-OSS 120B.',
  'Responda em português brasileiro por padrão, de forma precisa, natural e direta.',
  'Para problemas de programação, entregue exemplos corretos e código completo quando solicitado.',
  'Se não souber algo ou não puder acessar ferramentas, deixe isso claro. Nunca invente fatos ou fontes.',
  'Não afirme ser o ChatGPT original nem possuir acesso aos modelos proprietários da OpenAI.',
].join(' ');

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function errorJson(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

function frame(obj: Record<string, string>): Uint8Array {
  return new TextEncoder().encode('data: ' + JSON.stringify(obj) + '\n\n');
}

function classifyUpstream(status: number, raw: string, retryAfter: string | null): string {
  const low = raw.toLowerCase();
  if (status === 401)
    return 'A chave gratuita GROQ_API_KEY não foi aceita pelo GroqCloud. Confira a chave nas variáveis da Vercel.';
  if (status === 403)
    return 'O GroqCloud recusou o acesso ao modelo para esta conta. Verifique seu plano Free e as permissões.';
  if (status === 429) {
    const hint = retryAfter && /^\d+$/.test(retryAfter) ? ' Aguarde cerca de ' + retryAfter + ' segundos.' : '';
    return 'A cota gratuita da Groq foi atingida.' + hint + ' Não é necessário cadastrar cartão.';
  }
  if (status === 404)
    return 'O modelo GPT-OSS 120B não está disponível para a conta GroqCloud neste momento.';
  if (status === 413)
    return 'A Groq recusou o tamanho da conversa. Inicie uma nova conversa mais curta.';
  if (status >= 500)
    return 'Os servidores gratuitos da Groq estão indisponíveis. Tente novamente depois.';
  if (low.includes('model_decommissioned') || low.includes('model_not_found'))
    return 'Este modelo deixou de estar disponível na Groq. A configuração precisa ser atualizada.';
  return 'A Groq recusou a solicitação. Confira o modelo, a chave gratuita e os limites da conta.';
}

// Readiness is *configuration*, not a claim that a real inference request succeeded.
// Never return the key, its prefix, or any sensitive environment variables.
export async function GET(): Promise<Response> {
  return Response.json({
    provider: 'GroqCloud',
    model: 'GPT-OSS 120B',
    configured: !!process.env.GROQ_API_KEY?.trim(),
  }, { headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return errorJson(403, 'Origem não autorizada.');

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_CHARS * 2)
    return errorJson(413, 'A conversa é grande demais.');

  let messages: Turn[];
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return errorJson(413, 'A conversa é grande demais.');
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || !('messages' in body))
      return errorJson(400, 'Formato de solicitação inválido.');
    const list = (body as { messages: unknown }).messages;
    if (!Array.isArray(list) || list.length < 1 || list.length > MAX_TURNS)
      return errorJson(400, 'Envie de 1 a 12 mensagens.');
    if (!list.every((m: unknown) =>
      m && typeof m === 'object' && 'role' in m && 'content' in m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' && m.content.trim().length > 0 &&
      m.content.length <= MAX_MESSAGE_CHARS
    )) return errorJson(400, 'Mensagem inválida ou muito grande.');
    messages = list.map((m: Turn) => ({ role: m.role, content: m.content }));
    if (messages[messages.length - 1].role !== 'user')
      return errorJson(400, 'A última mensagem deve ser do usuário.');
  } catch {
    return errorJson(400, 'Não foi possível interpretar a mensagem.');
  }

  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    return errorJson(503,
      'REZ Turbo está preparada para a Groq, mas falta cadastrar GROQ_API_KEY nas variáveis de ambiente Production da Vercel. Gere uma chave gratuita em console.groq.com/keys. Não compartilhe a chave no chat.');
  }

  let upstream: Response;
  try {
    upstream = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM }, ...messages],
        stream: true,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.5,
        reasoning_effort: 'low',
        include_reasoning: false,
      }),
      cache: 'no-store',
      signal: request.signal,
    });
  } catch {
    console.warn('REZ Turbo: Groq connection failed.');
    return errorJson(502, 'Não foi possível conectar ao GroqCloud. Tente novamente mais tarde.');
  }

  if (!upstream.ok) {
    const raw = (await upstream.text().catch(() => '')).slice(0, 2_000);
    // Only log the status code; avoid logging user input or secrets.
    console.warn('REZ Turbo: Groq HTTP status:', upstream.status);
    return errorJson(503, classifyUpstream(
      upstream.status, raw, upstream.headers.get('retry-after')
    ));
  }

  if (!upstream.body)
    return errorJson(502, 'GroqCloud não enviou um fluxo de resposta.');

  const source = upstream.body.getReader();
  const output = new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      let gotText = false;
      let ended = false;
      let failed = false;
      const emitError = (message: string) => {
        if (!failed) {
          failed = true;
          controller.enqueue(frame({ type: 'error', message }));
        }
      };
      const parseEvent = (raw: string) => {
        const data = raw.split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim()).join('\n');
        if (!data) return;
        if (data === '[DONE]') { ended = true; return; }
        let chunk: GroqChunk;
        try { chunk = JSON.parse(data) as GroqChunk; }
        catch { emitError('A Groq enviou dados inválidos.'); return; }
        if (chunk.error) {
          emitError('O serviço gratuito encontrou um erro durante a geração. Tente novamente.');
          return;
        }
        const part = chunk.choices?.[0]?.delta?.content;
        if (typeof part === 'string' && part) {
          gotText = true;
          controller.enqueue(frame({ type: 'delta', content: part }));
        }
      };
      try {
        while (!ended && !failed) {
          const part = await source.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true }).replace(/\r\n/g, '\n');
          let at = buffer.indexOf('\n\n');
          while (at !== -1 && !ended && !failed) {
            parseEvent(buffer.slice(0, at));
            buffer = buffer.slice(at + 2);
            at = buffer.indexOf('\n\n');
          }
          if (buffer.length > 65_536)
            emitError('O fluxo gerado excedeu o limite permitido.');
        }
        buffer += decoder.decode();
        if (buffer.trim() && !ended && !failed) parseEvent(buffer);
        if (!failed && !gotText)
          emitError('O GroqCloud encerrou a resposta sem texto. Confira os limites gratuitos e tente novamente.');
        if (!failed && !ended)
          emitError('A conexão com a Groq foi interrompida.');
        if (!failed) controller.enqueue(frame({ type: 'done', provider: 'GroqCloud' }));
      } catch {
        emitError('A conexão foi interrompida durante a resposta.');
      } finally {
        await source.cancel().catch(() => undefined);
        controller.close();
      }
    },
    cancel() { void source.cancel().catch(() => undefined); },
  });
  return new Response(output, {
    headers: {
      ...NO_STORE,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
