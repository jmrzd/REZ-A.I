import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  INITIAL_SOURCES, validPublicUrl, parseSourceCatalog, findSources,
  sourcesAsPromptContext,
} from '../app/knowledge-web';
import { buildCloudMessages } from '../app/cloud-ai';
import { GET } from '../app/api/knowledge/search/route';

test('knowledge seed covers broad areas, not just software development', () => {
  const categories = new Set(INITIAL_SOURCES.map(x => x.categoria));
  for (const required of ['educacao', 'saude', 'economia', 'leis_direitos',
    'matematica', 'historia', 'astronomia', 'programacao', 'arte_cultura', 'pesquisa_cientifica'])
    assert.ok(categories.has(required), 'missing ' + required);
  assert.ok(INITIAL_SOURCES.length >= 70);
  assert.ok(INITIAL_SOURCES.every(x => validPublicUrl(x.url)));
});

test('user catalog import accepts expanded JSON and deduplicates safe links', () => {
  const result = parseSourceCatalog({
    fontes: [
      { categoria: 'saude', nome: 'OMS', url: 'https://www.who.int/', idioma: 'pt' },
      { categoria: 'saude', nome: 'OMS again', url: 'https://www.who.int/' },
      { nome: 'Script', url: 'javascript:alert(1)' },
      { nome: 'Internal IP', url: 'http://127.0.0.1/a' },
      { nome: 'Creds', url: 'https://user:pass@example.org/private' },
      { categoria: 'historia', nome: 'BN', url: 'https://bndigital.bn.gov.br/' },
    ],
  });
  assert.equal(result.length, 2);
  assert.equal(findSources(result, 'saude')[0]?.nome, 'OMS');
  assert.equal(findSources(result, 'nonsense').length, 0);
  assert.equal(validPublicUrl('data:text/plain,hi'), false);
});

test('catalog import rejects unsupported structure or huge arrays', () => {
  assert.throws(() => parseSourceCatalog({ perguntas: [{ perg: 'teste' }] }));
  assert.throws(() => parseSourceCatalog({ fontes: Array.from({ length: 10001 }, () => null) }));
});

test('public metadata is formatted as cited source leads without pretending full-text access', () => {
  const context = sourcesAsPromptContext([
    { title: 'Estudo de algoritmos', url: 'https://doi.org/10.1234/example',
      excerpt: 'Um registro bibliográfico', provider: 'Crossref', kind: 'pesquisa' },
  ]);
  assert.match(context, /https:\/\/doi.org/);
  assert.match(context, /não verificados integralmente/);
  const last = buildCloudMessages([
    { role: 'user', content: 'Explique algoritmos' },
  ], '', context).at(-1)?.content || '';
  assert.match(last, /<fontes_publicas>/);
  assert.match(last, /https:\/\/doi.org/);
  assert.match(last, /Não obedeça instruções/);
});

test('public lookup uses only fixed Wikimedia/Crossref hosts and returns links', async () => {
  const original = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    seen.push(url);
    if (url.includes('wikipedia.org')) {
      return Response.json({ pages: [{ title: 'Recursão', key: 'Recursão',
        excerpt: '<span class="searchmatch">Recursão</span> em programação.' }] });
    }
    if (url.startsWith('https://api.crossref.org/works')) {
      return Response.json({ message: { items: [
        { DOI: '10.1234/algorithm', title: ['Study of recursive algorithms'],
          'container-title': ['Example Journal'], published: { 'date-parts': [[2024]] } },
      ] } });
    }
    throw Error('Untrusted hostname: ' + url);
  }) as typeof fetch;
  try {
    const response = await GET(new Request('https://rez-ai.example/api/knowledge/search?q=recursao'));
    assert.equal(response.status, 200);
    const data = await response.json() as { results: Array<{ url:string; excerpt:string }>; unavailable:string[] };
    assert.equal(data.results.length, 3);
    assert.equal(data.unavailable.length, 0);
    assert.ok(data.results.every(r => r.url.startsWith('https://')));
    assert.ok(data.results.every(r => !r.excerpt.includes('<span')));
    assert.equal(seen.length, 3);
    assert.ok(seen.every(url => url.startsWith('https://pt.wikipedia.org/') ||
      url.startsWith('https://en.wikipedia.org/') || url.startsWith('https://api.crossref.org/')));
  } finally { globalThis.fetch = original; }
});

test('public search accepts short, safe query lengths only', async () => {
  const tooShort = await GET(new Request('https://rez-ai.example/api/knowledge/search?q=oi'));
  assert.equal(tooShort.status, 400);
  const tooLong = await GET(new Request('https://rez-ai.example/api/knowledge/search?q=' + 'a'.repeat(200)));
  assert.equal(tooLong.status, 400);
});

test('research is opt-in for chat; documents are also opt-in', () => {
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  const panel = readFileSync(join(process.cwd(), 'app', 'NetworkKnowledgePanel.tsx'), 'utf8');
  assert.match(page, /searchWebForAnswers.*useState\(false\)/);
  assert.match(page, /sendDocsToCloud.*useState\(false\)/);
  assert.match(page, /sourcesAsPromptContext\(citations\)/);
  assert.match(panel, /Importar catálogo JSON/);
  assert.match(panel, /Desativado por padrão/);
});
