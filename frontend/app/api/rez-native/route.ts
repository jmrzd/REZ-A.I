/**
 * REZ Native — first-party on-server deterministic knowledge engine.
 * No paid AI API, no Cloudflare account, no external inference and no
 * model weights. This is a rules/retrieval assistant, NOT a hosted LLM.
 *
 * Keep Vercel Authentication active: the free hosting plan still has quotas.
 */
import { nativeAnswer, type NativeMode, type NativeTurn } from '../../rez-native-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const MAX_BODY = 32_000;
const ALLOWED_MODES: NativeMode[] = ['general', 'study', 'code', 'summary'];

export async function GET(): Promise<Response> {
  return Response.json({
    online: true,
    engine: 'REZ Native',
    inference: 'first-party-rules-and-retrieval',
    generativeLLM: false,
    externalAI: false,
    requiresApiKey: false,
    usesVisitorGPU: false,
  }, { headers: HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      (origin && origin !== new URL(request.url).origin))
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: HEADERS });

  if (Number(request.headers.get('content-length') || '0') > MAX_BODY)
    return Response.json({ error: 'Mensagem muito grande.' }, { status: 413, headers: HEADERS });

  let data: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY)
      return Response.json({ error: 'Mensagem muito grande.' }, { status: 413, headers: HEADERS });
    data = JSON.parse(text);
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400, headers: HEADERS });
  }
  if (!data || typeof data !== 'object')
    return Response.json({ error: 'Formato inválido.' }, { status: 400, headers: HEADERS });

  const input = data as Record<string, unknown>;
  const mode = input.mode ?? 'general';
  const messages = input.messages;
  const context = input.documentContext ?? '';
  if (!ALLOWED_MODES.includes(mode as NativeMode) ||
      !Array.isArray(messages) || messages.length < 1 || messages.length > 14 ||
      !messages.every(row =>
        row && typeof row === 'object' &&
        (row.role === 'user' || row.role === 'assistant') &&
        typeof row.content === 'string' &&
        row.content.trim().length > 0 &&
        row.content.length <= 4000) ||
      messages.at(-1).role !== 'user' ||
      typeof context !== 'string' || context.length > 3000) {
    return Response.json({ error: 'Mensagens ou modo inválidos.' }, { status: 400, headers: HEADERS });
  }

  // No execution, network fetch, shell commands or model inference occur.
  const result = nativeAnswer(messages as NativeTurn[], mode as NativeMode, context);
  return Response.json(result, { headers: HEADERS });
}
