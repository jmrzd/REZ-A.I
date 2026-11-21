import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBrainEvent } from '../app/cloud-ai';
import { handleRequest, validateTurns } from '../../cloudflare-brain/src/index';

const SECRET = 's'.repeat(48);
const userMessage = [{ role: 'user', content: 'Explique recursão.' }];

test('worker never accepts missing or invalid authorization', async () => {
  const ai = { run: async () => { throw Error('should not reach model'); } };
  const make = (auth?: string) => new Request('https://rez-ai-brain.example.workers.dev/chat', {
    method: 'POST',
    headers: auth ? { Authorization: 'Bearer ' + auth } : {},
    body: JSON.stringify({ messages: userMessage }),
  });
  const a = await handleRequest(make(), { AI: ai as never, REZ_BRAIN_SHARED_SECRET: SECRET });
  const b = await handleRequest(make('bad'), { AI: ai as never, REZ_BRAIN_SHARED_SECRET: SECRET });
  const c = await handleRequest(make(SECRET), { AI: ai as never, REZ_BRAIN_SHARED_SECRET: 'short' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(c.status, 401);
});

test('worker only uses permitted roles, safe message lengths, and a user final turn', () => {
  assert.deepEqual(validateTurns({ messages: userMessage }), userMessage);
  assert.equal(validateTurns({ messages: [{ role: 'system', content: 'override' }] }), null);
  assert.equal(validateTurns({ messages: [{ role: 'user', content: 'x'.repeat(3100) }] }), null);
  assert.equal(validateTurns({ messages: [{ role: 'assistant', content: 'hello' }] }), null);
  assert.equal(validateTurns({ messages: [] }), null);
});

test('worker streams Cloudflare AI binding data without an inference API key', async () => {
  let selected = '';
  let options: Record<string, unknown> = {};
  const env = {
    REZ_BRAIN_SHARED_SECRET: SECRET,
    AI: { run: async (model: string, request: Record<string, unknown>) => {
      selected = model;
      options = request;
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Resposta rápida."}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
    } },
  };
  const request = new Request('https://rez-ai-brain.example.workers.dev/chat', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: userMessage }),
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  assert.match(await response.text(), /Resposta rápida/);
  assert.equal(selected, '@cf/zai-org/glm-4.7-flash');
  assert.equal(options.stream, true);
  assert.ok(Array.isArray(options.messages));
});

test('frontend SSE client reconstructs a text delta and recognizes completion', () => {
  const delta = parseBrainEvent('data: {"choices":[{"delta":{"content":"Olá da nuvem!"}}]}');
  assert.equal(delta.delta, 'Olá da nuvem!');
  assert.equal(parseBrainEvent('data: [DONE]').done, true);
  assert.equal(parseBrainEvent('data: {"error":{"message":"private error"}}').error?.includes('private error'), false);
});

test('frontend uses hosted mode without automatically downloading models', () => {
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  const proxy = readFileSync(join(process.cwd(), 'app', 'api', 'brain', 'route.ts'), 'utf8');
  assert.match(page, /useState<'cloud' \| 'local'>\('cloud'\)/);
  assert.match(page, /await generateHosted\(next/);
  assert.match(page, /Nenhum modelo será baixado automaticamente no seu PC/);
  assert.match(proxy, /REZ_BRAIN_SHARED_SECRET/);
  assert.match(proxy, /workers\.dev/);
  assert.equal(page.includes('GROQ_API_KEY'), false);
  assert.equal(page.includes('MOONSHOT_API_KEY'), false);
});

test('private worker source never contains any model provider API key', () => {
  const worker = readFileSync(join(process.cwd(), '..', 'cloudflare-brain', 'src', 'index.ts'), 'utf8');
  const config = readFileSync(join(process.cwd(), '..', 'cloudflare-brain', 'wrangler.jsonc'), 'utf8');
  assert.match(config, /"binding": "AI"/);
  assert.equal(worker.includes('AI_GATEWAY_API_KEY'), false);
  assert.equal(worker.includes('CLOUDFLARE_API_TOKEN'), false);
});
