/**
 * REZ knowledge search v1.7.
 * Public reference METADATA only (short excerpts + citations).
 * No arbitrary URL fetching, no crawler, no model API token.
 *
 * Supported providers: Wikipedia PT-BR/EN and Crossref scholarly metadata.
 * All upstream hosts are hardcoded, which prevents SSRF.
 * Wikimedia and Crossref can rate-limit; failures are surfaced as unavailable.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SourceHit = {
  title: string;
  url: string;
  excerpt: string;
  provider: 'Wikipédia' | 'Crossref';
  kind: 'enciclopedia' | 'pesquisa';
  date?: string;
};

const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const AGENT = 'REZ-AI-Knowledge/1.7 (https://github.com/jmrzd/REZ-A.I; educational search)';
const clean = (text: unknown, max = 320): string => String(text ?? '')
  .replace(/<[^>]*>/g, ' ').replace(/&(?:lt|gt|amp|quot|#39);/g, ' ')
  .replace(/\s+/g, ' ').trim().slice(0, max);

async function wiki(q: string, lang: 'pt' | 'en'): Promise<SourceHit[]> {
  const url = new URL('https://' + lang + '.wikipedia.org/w/rest.php/v1/search/page');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '4');
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': AGENT },
    signal: AbortSignal.timeout(4800),
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error('Wikimedia temporariamente indisponível.');
  const data: unknown = await res.json();
  const pages = data && typeof data === 'object' && 'pages' in data
    ? (data as { pages: unknown }).pages : null;
  if (!Array.isArray(pages)) return [];
  return pages.slice(0, 4).flatMap(row => {
    if (!row || typeof row !== 'object') return [];
    const page = row as Record<string, unknown>;
    const title = clean(page.title, 160);
    const key = clean(page.key || page.title, 170);
    if (!title || !key) return [];
    return [{
      title,
      url: 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(key.replace(/ /g, '_')),
      excerpt: clean(page.excerpt || page.description, 280),
      provider: 'Wikipédia' as const,
      kind: 'enciclopedia' as const,
    }];
  });
}
async function crossref(q: string): Promise<SourceHit[]> {
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query', q);
  url.searchParams.set('rows', '3');
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': AGENT },
    signal: AbortSignal.timeout(4800),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Crossref indisponível.');
  const data: unknown = await res.json();
  const message = data && typeof data === 'object' && 'message' in data
    ? (data as { message: unknown }).message : null;
  const items = message && typeof message === 'object' && 'items' in message
    ? (message as { items: unknown }).items : null;
  if (!Array.isArray(items)) return [];
  return items.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const x = item as Record<string, unknown>;
    const doi = typeof x.DOI === 'string' ? x.DOI : '';
    if (!/^10\.[0-9]{4,9}\/[^\s]{1,180}$/.test(doi)) return [];
    const title = clean(Array.isArray(x.title) ? x.title[0] : x.title, 170);
    if (!title) return [];
    const journal = clean(Array.isArray(x['container-title']) ? x['container-title'][0] : '', 90);
    const yearParts = x.published && typeof x.published === 'object' && 'date-parts' in x.published
      ? (x.published as { 'date-parts': unknown })['date-parts'] : null;
    const year = Array.isArray(yearParts) && Array.isArray(yearParts[0])
      ? Number(yearParts[0][0]) : NaN;
    return [{
      title,
      url: 'https://doi.org/' + encodeURIComponent(doi),
      excerpt: (journal ? journal + '. ' : '') +
        (Number.isInteger(year) && year >= 1500 && year <= 2100 ? 'Publicado em ' + year + '.' : '') +
        ' Metadados bibliográficos; consulte o artigo original antes de afirmar resultados.',
      provider: 'Crossref' as const,
      kind: 'pesquisa' as const,
      ...(Number.isInteger(year) && year >= 1500 && year <= 2100 ? { date: String(year) } : {}),
    }];
  });
}
async function searchKnowledge(question: string): Promise<{
  results: SourceHit[];
  unavailable: string[];
}> {
  const [pt, en, papers] = await Promise.allSettled([
    wiki(question, 'pt'), wiki(question, 'en'), crossref(question),
  ]);
  const providers = [pt, en, papers];
  const unavailable = providers.map((x, i) =>
    x.status === 'rejected' ? ['Wikipédia PT', 'Wikipedia EN', 'Crossref'][i] : null
  ).filter((x): x is string => Boolean(x));
  const all = providers.flatMap(x => x.status === 'fulfilled' ? x.value : []);
  const seen = new Set<string>();
  const results = all.filter(x => {
    if (seen.has(x.url)) return false;
    seen.add(x.url); return true;
  }).slice(0, 10);
  return { results, unavailable };
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim().replace(/\s+/g, ' ') || '';
  if (q.length < 3 || q.length > 140)
    return Response.json({ error: 'Informe uma pesquisa entre 3 e 140 caracteres.' }, { status: 400, headers: HEADERS });
  const { results, unavailable } = await searchKnowledge(q);
  return Response.json({
    query: q,
    results,
    unavailable,
    searchedAt: new Date().toISOString(),
    notice: 'Fontes externas: metadados e pequenos trechos, não acesso integral a todos os conteúdos. Verifique o artigo original e sua data.',
  }, { headers: HEADERS });
}
