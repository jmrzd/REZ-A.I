import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { instantAnswer } from '../app/instant-replies';

test('single-word Oi gets a meaningful immediate answer', () => {
  for (const greeting of ['OI', 'oi', 'Oi!', 'olá', 'Olá!', 'oie', 'hey']) {
    const result = instantAnswer(greeting);
    assert.ok(result, 'Failed to greet: ' + greeting);
    assert.equal(result.kind, 'instant');
    assert.match(result.text, /REZ A\.I/);
  }
});

test('short courtesy and help use immediate offline rules', () => {
  assert.match(instantAnswer('Bom dia')?.text || '', /ajudar/);
  assert.match(instantAnswer('Obrigado')?.text || '', /Por nada/);
  assert.match(instantAnswer('o que você faz?')?.text || '', /aplicativo de chat local/);
});

test('meaningful questions are NOT replaced with scripted canned responses', () => {
  assert.equal(instantAnswer('Me ajude a criar um projeto em Python'), null);
  assert.equal(instantAnswer('Explique o algoritmo de Dijkstra'), null);
  assert.equal(instantAnswer('oi, preciso de ajuda com recursão'), null);
});

test('one REZ assistant displayed, no picker for external model brands', () => {
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  assert.equal(page.includes('<select aria-label="Modelo de IA local"'), false);
  assert.equal(page.includes('LOCAL_MODELS.map'), false);
  assert.equal(page.includes("instantAnswer(content)"), true);
  assert.match(page, /REZ A\.I <span>Automática<\/span>/);
  assert.equal(existsSync(join(process.cwd(), 'app', 'api', 'chat', 'turbo', 'route.ts')), false);
});

test('generative engine provides automatic CPU recovery and no cloud access', () => {
  const engine = readFileSync(join(process.cwd(), 'app', 'local-ai.ts'), 'utf8');
  assert.match(engine, /await runCPU\(/);
  assert.match(engine, /await runGPU\(/);
  assert.equal(engine.includes('api.groq.com'), false);
  assert.equal(engine.includes('api.moonshot.ai'), false);
  assert.equal(engine.includes('AI_GATEWAY_API_KEY'), false);
});
