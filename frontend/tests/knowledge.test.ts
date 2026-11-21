import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokenize, searchDocuments, buildLocalContext, type LocalDocument } from '../app/knowledge';

const documents: LocalDocument[] = [
  { id: '1', name: 'python.txt', content: 'Python usa a instrução def para criar funções. return devolve o resultado da função.', createdAt: 10 },
  { id: '2', name: 'sql.md', content: 'SQL permite consultar dados com SELECT. JOIN combina tabelas relacionadas por chaves.', createdAt: 11 },
];

test('Portuguese diacritics are normalized and trivial stopwords ignored', () => {
  assert.deepEqual(tokenize('O que são FUNÇÕES e tabelas?'), ['sao', 'funcoes', 'tabelas']);
});

test('Private retrieval finds the relevant file instead of unrelated source', () => {
  const result = searchDocuments(documents, 'como criar funções em Python?');
  assert.ok(result.length);
  assert.equal(result[0].source, 'python.txt');
});

test('Question unrelated to memory does not fabricate retrieval context', () => {
  const result = buildLocalContext(documents, 'astronauta foguete planeta');
  assert.deepEqual(result.sources, []);
  assert.equal(result.context, '');
});

test('Document context includes file source names and remains length-bounded', () => {
  const large = [{
    id: '1', name: 'extenso.txt',
    content: ('algoritmo programação busca dados. ').repeat(1000),
    createdAt: 1,
  }];
  const result = buildLocalContext(large, 'programação algoritmo');
  assert.deepEqual(result.sources, ['extenso.txt']);
  assert.ok(result.context.includes('[Arquivo: extenso.txt]'));
  assert.ok(result.context.length <= 4000);
});

test('No hosted paid or free API proxy is deployed in this frontend', () => {
  const route = join(process.cwd(), 'app', 'api', 'chat', 'turbo', 'route.ts');
  assert.equal(existsSync(route), false);
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  assert.equal(page.includes('/api/chat/turbo'), false);
  assert.equal(page.includes('GROQ_API_KEY'), false);
  const engine = readFileSync(join(process.cwd(), 'app', 'local-ai.ts'), 'utf8');
  assert.equal(engine.includes('api.groq.com'), false);
  assert.equal(engine.includes('api.moonshot.ai'), false);
});
