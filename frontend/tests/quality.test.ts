import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRunawayRepetition } from '../app/quality';

test('rejects repetitive nonsense in small-model streamed output', () => {
  assert.equal(hasRunawayRepetition(
    'Como! Eu sou a COMO VC TA. Para ajudar, precisar, ajudar, ajudar, ajudar, ajudar, ajudar, ajudar, ajudar.'
  ), true);
  assert.equal(hasRunawayRepetition('Vou ajudar com isso com isso com isso com isso'), false);
  assert.equal(hasRunawayRepetition(
    'O algoritmo faz a busca em profundidade na árvore, visitando cada nó uma vez e retornando o percurso corretamente.'
  ), false);
});

test('detects consecutive repetition of multiword phrases', () => {
  assert.equal(hasRunawayRepetition(
    'Este texto tem informações relevantes. por exemplo simples por exemplo simples por exemplo simples'
  ), true);
});

test('new CPU fallback selects Qwen 0.5B quantized rather than 135M', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const engine = fs.readFileSync(path.join(process.cwd(), 'app', 'local-ai.ts'), 'utf8');
  const worker = fs.readFileSync(path.join(process.cwd(), 'app', 'cpu.worker.ts'), 'utf8');
  assert.match(engine, /onnx-community\/Qwen2\.5-0\.5B-Instruct/);
  assert.match(worker, /repetition_penalty:\s*1\.17/);
  assert.match(worker, /no_repeat_ngram_size:\s*4/);
  assert.match(worker, /max_new_tokens:\s*wantsCode\s*\?\s*200\s*:\s*128/);
  assert.ok(!engine.includes('SmolLM2-135M'));
});

test('UI batches token updates instead of writing history on every fragment', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const page = fs.readFileSync(path.join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  assert.match(page, /const queueReply =/);
  assert.match(page, /setTimeout\(\(\) => \{ flushTimer = null; showReply\(\); \}, 100\)/);
});
