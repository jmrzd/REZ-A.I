/**
 * REZ Turbo: server-only access to the $0-listed NVIDIA Nemotron model.
 * Uses Vercel's auto-provided OIDC token (never sent to the client).
 *
 * The previous AI SDK text-only stream silently discarded provider errors,
 * returning HTTP 200 with zero bytes. We now inspect upstream HTTP status
 * before streaming and send explicit SSE events for failures in-stream.
 *
 * Keep Vercel Authentication enabled: no application-level per-user rate
 * limiting exists yet. This route never falls back to a paid model.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'nvidia/nemotron-3.5-lightning-free';
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const BODY_LIMIT = 24_000;
const TURN_LIMIT = 12;
const MESSAGE_LIMIT = 3_000;
const OUTPUT_TOKENS = 1024;

type Turn = { role: 'user' | 'assistant'; content: string };
type GatewayChunk = {
  error?: { code?: string; message?: string };
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
};

const SYSTEM = [
  'Você é REZ A.I Turbo, uma inteligência artificial baseada no modelo aberto NVIDIA Nemotron.',
  'Responda primeiro à pergunta, com clareza e objetividade, geralmente em português brasileiro.',
  'Para programação, forneça código funcional quando solicitado.',
  'Se não souber ou não tiver ferramentas conectadas, diga. Não invente fatos nem links.',
  'Não diga que é o ChatGPT original ou que possui seus modelos proprietários.',
].join(' ');

function errorJson(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function frame(data: object): Uint8Array {
  return new TextEncoder().encode('data: ' + JSON.stringify(data) + '\n\n');
}

/**
 * Only emit predefined, non-sensitive errors. Never surface provider response
 * bodies, credential values, headers, or stack traces to the visitor.
 */
function classifyError(status: number, raw: string): string {
  const low = raw.toLowerCase();
  if (low.includes('customer_verification_required') || low.includes('payment method required') ||
      low.includes('verify your account')) {
    return 'O Vercel AI Gateway exige a verificação da conta para liberar o modelo gratuito. Abra AI Gateway no painel da Vercel para verificar o status. Não é um erro do seu computador.';
  }
  if (status === 401) return 'A autenticação do AI Gateway falhou. Verifique se o projeto possui OIDC ativo na Vercel.';
  if (status === 403) return 'A conta ou o projeto não tem permissão para usar o AI Gateway. Verifique o acesso no painel da Vercel.';
  if (status === 402) return 'O AI Gateway está bloqueando a solicitação por saldo, limite ou configuração da conta. A REZ não utilizará um modelo pago.';
  if (status === 429) return 'O modelo gratuito atingiu o limite de requisições. Tente novamente mais tarde.';
  if (status === 404) return 'O modelo gratuito não está disponível no AI Gateway neste momento.';
  if (status >= 500) return 'O provedor gratuito está indisponível no momento. Não é necessário baixar nenhum modelo para tentar depois.';
  return 'O AI Gateway recusou a solicitação. Confira o acesso ao AI Gateway no painel da Vercel.';
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return errorJson(403, 'Origem não autorizada.');
  }
  const reportedLength = Number(request.headers.get('content-length') || '0');
  if (reportedLength > BODY_LIMIT * 2) {
    return errorJson(413, 'Mensagem muito grande.');
  }

  let messages: Turn[];
  try {
    const raw = await request.text();
    if (raw.length > BODY_LIMIT) return errorJson(413, 'Mensagem muito grande.');
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || !('messages' in body))
      return errorJson(400, 'Formato de mensagem inválido.');
    const list = (body as { messages: unknown }).messages;
    if (!Array.isArray(list) || list.length < 1 || list.length > TURN_LIMIT)
      return errorJson(400, 'Envie de 1 a 12 mensagens.');
    if (!list.every((m: unknown) =>
      m && typeof m === 'object' && 'role' in m && 'content' in m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0 && m.content.length <= MESSAGE_LIMIT
    )) return errorJson(400, 'Formato ou tamanho de mensagem inválido.');
    messages = list.map((m: Turn) => ({ role: m.role, content: m.content }));
    if (messages[messages.length - 1].role !== 'user')
      return errorJson(400, 'A última mensagem deve ser do usuário.');
  } catch {
    return errorJson(400, 'Não foi possível interpretar a mensagem.');
  }

  // OIDC is injected automatically into Vercel deployments; an explicitly
  // configured Gateway key is only for development outside Vercel.
  const credential = process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
  if (!credential) {
    console.warn('REZ Turbo: missing server OIDC or AI Gateway credential.');
    return errorJson(503, 'O servidor não recebeu a autenticação OIDC da Vercel. Verifique a configuração do AI Gateway do projeto.');
  }

  let upstream: Response;
  try {
    upstream = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + credential,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM }, ...messages],
        stream: true,
        max_tokens: OUTPUT_TOKENS,
        temperature: 0.5,
        // The selected model lists 'none' as a supported reasoning effort.
        // Avoid spending the whole output budget on hidden reasoning.
        reasoning: { effort: 'none' },
      }),
      cache: 'no-store',
      signal: request.signal,
    });
  } catch {
    console.warn('REZ Turbo: connection to Gateway failed.');
    return errorJson(502, 'Não foi possível conectar ao provedor gratuito. Verifique sua internet ou tente novamente depois.');
  }

  if (!upstream.ok) {
    const status = upstream.status;
    const raw = (await upstream.text().catch(() => '')).slice(0, 3_000);
    // Status and boolean diagnosis are safe to log; no upstream bodies.
    console.warn('REZ Turbo: Gateway rejected request. HTTP status:', status,
      'accountVerification:', /customer_verification_required/i.test(raw));
    return errorJson(503, classifyError(status, raw));
  }
  if (!upstream.body) return errorJson(502, 'O provedor não enviou nenhum fluxo de resposta.');

  const source = upstream.body.getReader();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      let gotText = false;
      let done = false;
      let failed = false;
      const emitError = (message: string) => {
        if (!failed) {
          failed = true;
          controller.enqueue(frame({ type: 'error', message }));
        }
      };
      const handle = (part: string) => {
        const item = part.split('\n').filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim()).join('\n');
        if (!item) return;
        if (item === '[DONE]') { done = true; return; }
        let chunk: GatewayChunk;
        try { chunk = JSON.parse(item) as GatewayChunk; }
        catch { emitError('O provedor gratuito enviou dados inválidos.'); return; }
        if (chunk.error) {
          emitError(classifyError(502,
            String(chunk.error.code || '') + ' ' + String(chunk.error.message || '')));
          return;
        }
        const piece = chunk.choices?.[0]?.delta?.content;
        if (typeof piece === 'string' && piece.length) {
          gotText = true;
          controller.enqueue(frame({ type: 'delta', content: piece }));
        }
      };
      try {
        while (!done && !failed) {
          const { done: ended, value } = await source.read();
          if (ended) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let pos = buffer.indexOf('\n\n');
          while (pos !== -1 && !done && !failed) {
            handle(buffer.slice(0, pos));
            buffer = buffer.slice(pos + 2);
            pos = buffer.indexOf('\n\n');
          }
          if (buffer.length > 65_536) {
            emitError('O provedor enviou uma mensagem grande demais.');
          }
        }
        buffer += decoder.decode();
        if (!done && !failed && buffer.trim()) handle(buffer);
        if (!failed && !gotText)
          emitError('O provedor encerrou o fluxo sem gerar texto. O AI Gateway pode estar indisponível ou limitado.');
        if (!failed && !done)
          emitError('A conexão com a IA foi interrompida antes do término.');
        if (!failed) controller.enqueue(frame({ type: 'done' }));
      } catch {
        emitError('A conexão com o modelo foi interrompida.');
      } finally {
        await source.cancel().catch(() => undefined);
        controller.close();
      }
    },
    cancel() { void source.cancel().catch(() => undefined); },
  });
  return new Response(out, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
    },
  });
}
