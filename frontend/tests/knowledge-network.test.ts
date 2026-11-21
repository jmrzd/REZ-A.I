import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  INITIAL_SOURCES, validPublicUrl, parseSourceCatalog, findSources,
  sourcesAsPromptContext, getBundledCatalog, rankCatalogSources, catalogueLeadsAsEvidence,
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


test('full user-provided knowledge pack is now included directly in the app', () => {
  const source = JSON.parse(readFileSync(join(process.cwd(), '..', 'knowledge', 'data', 'rez-knowledge-full.json'), 'utf8'));
  const published = JSON.parse(readFileSync(join(process.cwd(), 'public', 'rez-knowledge-catalog.json'), 'utf8'));
  assert.equal(source.fontes.length, 440);
  assert.equal(source.feeds.length, 23);
  assert.equal(source.perguntas_teste.length, 360);
  assert.equal(published.fontes.length, 440);
  assert.equal(published.feeds.length, 23);
  assert.ok(published.fontes.every((s: { url: string }) => validPublicUrl(s.url)));
  const fullUrls = new Set(source.fontes.map((x: {url:string}) => x.url));
  assert.ok(published.fontes.every((s: {url:string}) => fullUrls.has(s.url)));
  assert.ok(source.perguntas_teste.every((q: Record<string,unknown>) =>
    typeof q.pergunta === 'string' && !('resposta' in q) && !('answer' in q)));
});

test('website loads full bundled catalog and feeds without manual JSON upload', async () => {
  const original = globalThis.fetch;
  const bundled = JSON.parse(readFileSync(join(process.cwd(), 'public', 'rez-knowledge-catalog.json'), 'utf8'));
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    assert.equal(String(url), '/rez-knowledge-catalog.json');
    return Response.json(bundled);
  }) as typeof fetch;
  try {
    const { sources, feeds } = await getBundledCatalog();
    assert.equal(sources.length, 440);
    assert.equal(feeds.length, 23);
    assert.equal(new Set(sources.map(x => x.categoria)).size, 33);
  } finally { globalThis.fetch = original; }
});

test('training pipeline uses source metadata and unanswered prompts, not LLM answer labels', () => {
  const setup = readFileSync(join(process.cwd(), '..', 'training', 'prepare_hf_datasets.py'), 'utf8');
  const trainer = readFileSync(join(process.cwd(), '..', 'training', 'train_intent_router.py'), 'utf8');
  assert.match(setup, /from datasets import Dataset, DatasetDict/);
  assert.match(setup, /question.only_count|question_only_count/);
  assert.match(setup, /labelled_question_answer_pairs/);
  assert.match(trainer, /LogisticRegression/);
  assert.match(trainer, /NOT the LLM/);
});


test('catalog relevant links can reach REZ without pretending the site content was ingested', () => {
  const published = JSON.parse(readFileSync(join(process.cwd(), 'public', 'rez-knowledge-catalog.json'), 'utf8'));
  const links = rankCatalogSources(published.fontes, 'Quero aprender Python', 3);
  assert.ok(links.length > 0);
  assert.ok(links.some(x => /python/i.test(x.nome) || /python/i.test(x.url)));
  const text = catalogueLeadsAsEvidence(links);
  assert.match(text, /SUGESTÃO DE DIRETÓRIO/);
  assert.match(text, /página não lida/);
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  assert.match(page, /const directory = await getBundledCatalog\(controller\.signal\)/);
  assert.match(page, /let citations: PublicHit\[\] = \[\]/);
  assert.match(page, /if \(searchWebForAnswers\)/);
});
