/**
 * Same-origin Vercel bridge to the REZ Cloudflare Worker.
 *
 * The browser never learns the remote Worker URL or our private app-to-app
 * authorization secret. Cloudflare AI binding does not need a model API key.
 * Vercel Authentication MUST remain enabled; this endpoint has no app-level
 * per-user authentication or durable rate limiting.
 */
import { createHmac } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 24000;
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function config(): { url: string; secret: string } | null {
  const input = process.env.REZ_BRAIN_URL?.trim();
  const secret = process.env.REZ_BRAIN_SHARED_SECRET?.trim();
  if (!input || !secret || secret.length < 32) return null;
  try {
    const url = new URL(input);
    // Prevent SSRF: only the specific Cloudflare-hosted Worker is allowed.
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') ||
        !url.hostname.includes('.') || url.username || url.password || url.search ||
        url.hash || (url.port && url.port !== '443')) return null;
    return { url: url.origin + '/chat', secret };
  } catch {
    return null;
  }
}

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: HEADERS });
}

export async function GET(): Promise<Response> {
  // Distinguish environment variables being set from an ACTUALLY reachable
  // Worker with its required binding and quota gate configured.
  // The health endpoint makes no model call and consumes no Neurons.
  const settings = config();
  if (!settings) return Response.json({
    configured: false, online: false, status: 'not_configured',
    provider: 'Cloudflare Workers AI', engine: 'REZ Brain · GLM-4.7-Flash',
  }, { headers: HEADERS });
  try {
    const url = settings.url.replace(/\/chat$/, '/health');
    const response = await fetch(url, {
      method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    const payload: unknown = response.ok ? await response.json() : null;
    const available = response.ok && payload && typeof payload === 'object' &&
      'configured' in payload && payload.configured === true;
    return Response.json({
      configured: true, online: Boolean(available),
      status: available ? 'reachable' : 'worker_unavailable',
      provider: 'Cloudflare Workers AI', engine: 'REZ Brain · GLM-4.7-Flash',
    }, { headers: HEADERS });
  } catch {
    return Response.json({
      configured: true, online: false, status: 'worker_unavailable',
      provider: 'Cloudflare Workers AI', engine: 'REZ Brain · GLM-4.7-Flash',
    }, { headers: HEADERS });
  }
}

export async function POST(request: Request): Promise<Response> {
  const settings = config();
  if (!settings) {
    return fail(503, 'O cérebro na nuvem ainda não foi conectado. A configuração do Cloudflare Worker é necessária antes de usar a REZ no servidor.');
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return fail(403, 'Origem não autorizada.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return fail(403, 'Origem não autorizada.');
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY)
    return fail(413, 'Mensagem grande demais.');
  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > MAX_BODY) return fail(413, 'Mensagem grande demais.');
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || !('messages' in body))
      return fail(400, 'Formato inválido.');
    const messages = (body as { messages: unknown }).messages;
    const mode = 'mode' in body ? (body as { mode: unknown }).mode : 'general';
    if (!['general', 'study', 'code', 'summary'].includes(String(mode)) ||
        !Array.isArray(messages) || messages.length < 1 || messages.length > 12 ||
        !messages.every(m =>
          m && typeof m === 'object' &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' && m.content.trim() &&
          m.content.length <= 3000) ||
        messages.at(-1).role !== 'user')
      return fail(400, 'Mensagens inválidas.');
  } catch {
    return fail(400, 'Não foi possível interpretar a mensagem.');
  }

  // Vercel supplies the true client address in x-forwarded-for. Never forward
  // raw IPs: only an application-secret HMAC reaches the Cloudflare quota.
  // When absent, use a shared 'unknown' bucket (restrictive, fail-closed).
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const visitorHash = createHmac('sha256', settings.secret)
    .update(ip.slice(0, 128)).digest('hex');

  let remote: Response;
  try {
    remote = await fetch(settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': 'Bearer ' + settings.secret,
        'x-rez-visitor-id': visitorHash,
      },
      body: raw,
      signal: request.signal,
      cache: 'no-store',
    });
  } catch {
    return fail(502, 'A REZ não conseguiu se conectar ao cérebro na nuvem.');
  }
  if (!remote.ok) {
    // Never return provider internals or accidental sensitive error content.
    if (remote.status === 401)
      return fail(503, 'A autenticação interna entre Vercel e Cloudflare não está configurada corretamente.');
    if (remote.status === 429)
      return fail(429, 'O limite gratuito de IA na nuvem foi atingido. Tente novamente depois.');
    return fail(503, 'O cérebro da REZ está indisponível. Verifique o Worker e a cota gratuita.');
  }
  if (!remote.body) return fail(502, 'O serviço não enviou uma resposta.');
  return new Response(remote.body, {
    status: 200,
    headers: {
      ...HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
