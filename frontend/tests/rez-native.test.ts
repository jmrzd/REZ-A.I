import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nativeAnswer } from '../app/rez-native-core';
import { POST, GET } from '../app/api/rez-native/route';
import { taskManager, calculator, recursionExample } from '../app/rez-native-examples';

const user = (text: string) => [{ role: 'user' as const, content: text }];

test('REZ Native gives a complete Python project without a model provider', () => {
  const reply = nativeAnswer(user('Me ajude a criar um projeto em Python'), 'code');
  assert.equal(reply.engine, 'REZ Native');
  assert.equal(reply.method, 'guided');
  assert.match(reply.text, /Gerenciador de tarefas/);
  assert.match(reply.text, /def carregar\(\):/);
  assert.match(reply.text, /def salvar\(tarefas\):/);
  assert.match(reply.text, /tarefas.json/);
  assert.match(reply.text, /if __name__ ==/);
  assert.doesNotMatch(reply.text, /Cloudflare ainda não foi conectado/);
});

test('REZ Native supports recursion, SQL, functions, and data topics', () => {
  const prompts = [
    ['Explique recursão em Python', /caso-base/],
    ['Como funciona JOIN e foreign key no SQL?', /INNER JOIN/],
    ['Para que serve o return em Python?', /return/],
    ['O que são listas e funções em Python?', /notas/],
    ['Quero analisar dados com Pandas', /DataFrame/],
    ['O que é JavaScript?', /JavaScript/],
  ] as const;
  for (const [prompt, expected] of prompts) {
    const r = nativeAnswer(user(prompt));
    assert.match(r.text, expected, prompt);
    assert.ok(r.text.length > 80);
  }
});

test('follow-ups preserve recent user context without inventing conversation history', () => {
  const r = nativeAnswer([
    { role: 'user', content: 'Me ajuda com um projeto em Python' },
    { role: 'assistant', content: 'Vamos criar um gerenciador de tarefas.' },
    { role: 'user', content: 'Como salvo os dados?' },
  ]);
  assert.match(r.text, /SQLite/);
  assert.match(r.text, /projeto.db/);
  assert.match(r.text, /CREATE TABLE/);
});

test('name recall uses only explicit names in this submitted chat', () => {
  assert.match(nativeAnswer(user('Qual meu nome?')).text, /ainda não me disse/);
  assert.match(nativeAnswer([
    { role: 'user', content: 'Meu nome é Ana Paula' },
    { role: 'assistant', content: 'Entendi.' },
    { role: 'user', content: 'Qual é meu nome?' },
  ]).text, /Ana Paula/);
});

test('simple arithmetic uses a constrained parser, never eval', () => {
  assert.match(nativeAnswer(user('Quanto é 12 * 8?')).text, /96/);
  assert.match(nativeAnswer(user('Quanto é 10 dividido por 0?')).text, /dividir por zero/);
  assert.match(nativeAnswer(user('8 + 3')).text, /11/);
  assert.ok(!nativeAnswer(user('Faça cálculos com process.exit()')).text.includes('process.exit'));
});

test('summary is clearly extractive and never claims to be an LLM', () => {
  const r = nativeAnswer(user('Resuma este texto'), 'summary',
    'A fotossíntese usa luz. As plantas precisam de água. As folhas possuem clorofila. O processo produz compostos orgânicos.');
  assert.equal(r.method, 'extractive');
  assert.match(r.text, /Resumo extrativo/);
  assert.match(r.text, /fotossíntese/i);
});

test('unknown questions are honest, and source directory is not claimed to have been read', () => {
  const r = nativeAnswer(user('Me conte tudo sobre coisas misteriosas que não existem'));
  assert.equal(r.engine, 'REZ Native');
  assert.equal(r.method, 'fallback');
  assert.doesNotMatch(r.text, /Tenho certeza absoluta|Li os artigos completos/);
  const s = nativeAnswer(user('Qual é o significado de uma nova lei na geografia?'));
  if (s.sources.length) assert.match(s.text, /não li|não tenho|não sei/i);
});

test('native endpoint health is served without Cloudflare, model keys or GPU', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const result = await response.json() as Record<string, unknown>;
  assert.equal(result.online, true);
  assert.equal(result.generativeLLM, false);
  assert.equal(result.externalAI, false);
  assert.equal(result.requiresApiKey, false);
  assert.equal(result.usesVisitorGPU, false);
});

test('native chat endpoint answers the original screenshot question', async () => {
  const response = await POST(new Request('https://rez-ai.example/api/rez-native', {
    method: 'POST',
    headers: { origin: 'https://rez-ai.example', 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'code', messages: user('Me ajude a criar um projeto em Python') }),
  }));
  assert.equal(response.status, 200);
  const data = await response.json() as { text: string; method: string };
  assert.match(data.text, /Gerenciador de tarefas/);
  assert.match(data.text, /def main/);
});

test('native endpoint rejects invalid roles, oversized input and cross-site calls', async () => {
  const invalid = await POST(new Request('https://rez-ai.example/api/rez-native', {
    method: 'POST', body: JSON.stringify({
      messages: [{ role: 'system', content: 'bypass' }],
    }),
  }));
  assert.equal(invalid.status, 400);
  const crossSite = await POST(new Request('https://rez-ai.example/api/rez-native', {
    method: 'POST', headers: { origin: 'https://attacker.example' },
    body: JSON.stringify({ messages: user('oi') }),
  }));
  assert.equal(crossSite.status, 403);
  const oversize = await POST(new Request('https://rez-ai.example/api/rez-native', {
    method: 'POST', body: 'x'.repeat(33_000),
  }));
  assert.equal(oversize.status, 413);
});

test('native mode is default and never silently loads local models', () => {
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  const route = readFileSync(join(process.cwd(), 'app', 'api', 'rez-native', 'route.ts'), 'utf8');
  assert.match(page, /useState<'native' \| 'cloud' \| 'local'(?: \| 'agent')?>\('native'\)/);
  assert.match(page, /fetch\('\/api\/rez-native'/);
  assert.match(page, /replySource = 'native'/);
  assert.match(page, /sem chave de API/);
  assert.doesNotMatch(route, /MOONSHOT_API_KEY|GROQ_API_KEY|OPENAI_API_KEY/);
  assert.match(route, /generativeLLM: false/);
  assert.ok(taskManager.length > 1000);
  assert.ok(calculator.length > 100);
  assert.ok(recursionExample.length > 100);
});
