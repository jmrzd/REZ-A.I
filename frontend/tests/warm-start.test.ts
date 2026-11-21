import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const file = (name: string) =>
  readFileSync(join(process.cwd(), 'app', name), 'utf8');

test('local inference offers explicit warmup that loads models without generating messages', () => {
  const engine = file('local-ai.ts');
  assert.match(engine, /export async function prepareLocal\(/);
  assert.match(engine, /runGPU\(gpu, \[\], SYSTEM, signal, onProgress, \(\) => undefined, true\)/);
  assert.match(engine, /runCPU\(\[\], SYSTEM, signal, onProgress, \(\) => undefined, true\)/);
  assert.match(engine, /if \(preparation\) \{/);
});

test('CPU worker can initialize without responding and remains available for chat', () => {
  const code = file('cpu.worker.ts');
  assert.match(code, /'generate' \| 'prepare'/);
  assert.match(code, /if \(cmd\.type === 'prepare'\)/);
  assert.match(code, /emit\(\{ type: 'ready', id \}\)/);
  assert.match(code, /env\.useBrowserCache = true/);
  assert.match(code, /env\.useWasmCache = true/);
});

test('UI uses user-initiated preparation, no involuntary downloads on page load', () => {
  const page = file('page.tsx');
  assert.match(page, /Preparar IA/);
  assert.match(page, /await prepareLocal\(controller\.signal/);
  assert.match(page, /setModelReady\(true\)/);
  const firstEffect = page.slice(page.indexOf('useEffect(() => {'),page.indexOf('useEffect(() => {',page.indexOf('useEffect(() => {')+1));
  assert.equal(firstEffect.includes('prepareLocal('), false);
});

test('time question is answered locally without model load or remote API', async () => {
  const { instantAnswer } = await import('../app/instant-replies');
  const answer = instantAnswer('que horas são?', new Date(2026, 10, 21, 20, 21));
  assert.match(answer?.text || '', /20:21/);
  assert.equal(answer?.kind, 'instant');
  assert.equal(file('page.tsx').includes('/api/chat/turbo'), false);
});
