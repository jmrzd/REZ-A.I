import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nativeAnswer } from '../app/rez-native-core';
import { extractTopic, researchOnWikipedia } from '../app/rez-native-research';
import { POST } from '../app/api/rez-native/route';

function nativeRequest(question: string, allowPublicResearch = false): Request {
  return new Request('https://rez-ai.example/api/rez-native', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://rez-ai.example' },
    body: JSON.stringify({
      mode: 'general',
      messages: [{ role: 'user', content: question }],
      documentContext: 'Meu documento privado: código=ABC-123. Nunca envie fora.',
      allowPublicResearch,
    }),
  });
}

test('topic extraction handles open questions without injecting new topics', () => {
  assert.equal(extractTopic('Quem foi Ada Lovelace?'), 'Ada Lovelace');
  assert.equal(extractTopic('O que é neuroplasticidade?'), 'neuroplasticidade');
  assert.equal(extractTopic('Oi, explique sobre energia solar!'), 'energia solar');
});

test('REZ no longer classifies “aprender” as DER or treats open questions prefixed with oi as greeting-only', () => {
  const learn = nativeAnswer([{ role:'user', content: 'Quero aprender algo novo e diferente hoje' }]);
  assert.notEqual(learn.topic, 'banco de dados');
  const greeting = nativeAnswer([{ role: 'user', content: 'Oi, me ajude com recursão' }]);
  assert.equal(greeting.topic, 'recursão');
  assert.match(greeting.text, /caso-base/);
});

test('a known answer never makes an external network call, even if external search is enabled', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; throw Error('Unexpected external call'); }) as typeof fetch;
  try {
    const response = await POST(nativeRequest('Explique recursão em Python', true));
    assert.equal(response.status, 200);
    const result = await response.json() as { topic: string; method: string };
    assert.equal(result.topic, 'recursão');
    assert.equal(result.method, 'guided');
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test('no external research without consent, no transmission of private documents', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; throw Error('Unauthorized fetch'); }) as typeof fetch;
  try {
    const response = await POST(nativeRequest('Quem foi Ada Lovelace?', false));
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { method:string }).method, 'fallback');
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test('opt-in researched answer contains attributed excerpt and a link, never a fabricated answer', async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith('https://pt.wikipedia.org/w/rest.php/v1/search/page')) {
      return Response.json({ pages: [
        {title:'Ada Lovelace',key:'Ada_Lovelace',excerpt:'Matemática britânica.'},
      ]});
    }
    if (url.startsWith('https://pt.wikipedia.org/api/rest_v1/page/summary/')) {
      return Response.json({
        title:'Ada Lovelace',
        extract:'Ada Lovelace foi uma matemática e escritora inglesa conhecida por seus trabalhos sobre a máquina analítica de Charles Babbage.',
        type:'standard',
      });
    }
    throw Error('Unexpected source: ' + url);
  }) as typeof fetch;
  try {
    const response = await POST(nativeRequest('Quem foi Ada Lovelace?', true));
    assert.equal(response.status, 200);
    const reply = await response.json() as {
      method:string; text:string; sources: Array<{url:string}>;
    };
    assert.equal(reply.method, 'reference');
    assert.match(reply.text, /máquina analítica/);
    assert.match(reply.text, /trecho enciclopédico atribuído/);
    assert.equal(reply.sources[0].url, 'https://pt.wikipedia.org/wiki/Ada_Lovelace');
    assert.equal(urls.length, 2);
    assert.ok(urls.every(x => x.startsWith('https://pt.wikipedia.org/')));
    assert.ok(!urls.some(url => url.includes('ABC-123')));
  } finally { globalThis.fetch = original; }
});

test('disambiguation and irrelevant search suggestions do not become fabricated references', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/search/page')) {
      return Response.json({ pages: [{ title: 'Ada Lovelace', key: 'Ada_Lovelace' }] });
    }
    return Response.json({ type:'disambiguation', extract:'Ada could mean many things.' });
  }) as typeof fetch;
  try {
    assert.equal(await researchOnWikipedia('Quem foi Ada Lovelace?'), null);
    assert.equal(await researchOnWikipedia('Quando se formou o universo?'), null);
  } finally { globalThis.fetch = original; }
});

test('Wikimedia timeout or failure returns the honest built-in fallback', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('Wikimedia unavailable'); }) as typeof fetch;
  try {
    const response = await POST(nativeRequest('Quem foi Ada Lovelace?', true));
    assert.equal(response.status, 200);
    const data = await response.json() as { method:string; text:string };
    assert.equal(data.method, 'fallback');
    assert.match(data.text, /não sei|não tenho|não li/i);
  } finally { globalThis.fetch = original; }
});

test('UI enables native research only after explicit opt-in', () => {
  const page = readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  const panel = readFileSync(join(process.cwd(), 'app', 'NetworkKnowledgePanel.tsx'), 'utf8');
  assert.match(page, /const \[searchWebForAnswers, setSearchWebForAnswers\] = useState\(false\)/);
  assert.match(page, /allowPublicResearch: searchWebForAnswers/);
  assert.match(page, /citedWiki \? 'Wikipédia'/);
  assert.match(panel, /somente a pergunta/i);
});
