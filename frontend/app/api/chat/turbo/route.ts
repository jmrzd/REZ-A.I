/**
 * REZ Turbo: inference on a hosted free-price open-weight model.
 * Vercel AI Gateway uses deployment OIDC automatically (no client token).
 *
 * SECURITY:
 * - Restricted to a single audited $0-priced model ID.
 * - No automatic fallback to any paid model.
 * - Limits request/message size and output.
 * - Project deployment protection MUST remain enabled while there
 *   is no per-user authentication/rate limiter in the application.
 * - We do not log or persist user prompts.
 *
 * NOTE: the third-party model provider can retain prompts. The
 * frontend explicitly discloses this before the user sends messages.
 */
import { streamText } from 'ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FREE_MODEL_ID = 'nvidia/nemotron-3.5-lightning-free';
const MAX_BODY_CHARS = 24_000;
const MAX_MESSAGE_CHARS = 3_000;
const MAX_TURNS = 12;
const MAX_OUTPUT_TOKENS = 768;

type Turn = { role: 'user' | 'assistant'; content: string };

const SYSTEM = [
  'Você é REZ A.I Turbo, um assistente rápido e útil.',
  'Responda em português do Brasil por padrão; se o usuário pedir outro idioma, respeite.',
  'Seja direto e preciso, com exemplos de código quando solicitado.',
  'Não invente fatos, referências ou acesso a ferramentas. Se estiver incerto, diga.',
  'Nunca afirme ser o ChatGPT original. Você utiliza um modelo aberto da NVIDIA.',
].join(' ');

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  // This is only a CSRF defense; Vercel Authentication is the actual access boundary.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return jsonError(403, 'Origem não autorizada.');

  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_CHARS * 2)
    return jsonError(413, 'Mensagem muito grande.');

  let turns: Turn[];
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return jsonError(413, 'Mensagem muito grande.');
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('messages' in data))
      return jsonError(400, 'Formato inválido.');
    const messages = (data as { messages: unknown }).messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_TURNS)
      return jsonError(400, 'Envie de 1 a 12 mensagens.');
    if (!messages.every((m: unknown) =>
      m && typeof m === 'object' && 'role' in m && 'content' in m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length >= 1 && m.content.length <= MAX_MESSAGE_CHARS
    )) return jsonError(400, 'Mensagens inválidas ou muito grandes.');
    turns = messages.map((m: Turn) => ({ role: m.role, content: m.content }));
    if (turns[turns.length - 1].role !== 'user')
      return jsonError(400, 'A última mensagem deve ser do usuário.');
  } catch {
    return jsonError(400, 'Não foi possível interpretar a mensagem.');
  }

  // Locally, require a gateway key; on Vercel, AI SDK gets OIDC automatically.
  if (!process.env.VERCEL && !process.env.AI_GATEWAY_API_KEY)
    return jsonError(503, 'REZ Turbo precisa estar hospedado na Vercel com AI Gateway.');

  try {
    const result = streamText({
      model: FREE_MODEL_ID,
      system: SYSTEM,
      messages: turns,
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: request.signal,
      onError: () => {
        // Do not log prompts, tokens, upstream errors or bearer credentials.
        console.warn('REZ Turbo: generation failed.');
      },
    });
    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return jsonError(502, 'A nuvem gratuita não está disponível. Use um modelo local.');
  }
}
