/**
 * Public knowledge sources for REZ A.I.
 * A catalogue link is NOT evidence that its contents were read.
 * The network search retrieves only public titles/excerpts on demand.
 */
export type KnowledgeSource = {
  categoria: string; nome: string; url: string; idioma: string;
};
export type PublicHit = {
  title: string; url: string; excerpt: string;
  provider: 'Wikipédia' | 'Crossref'; kind: string; date?: string;
};
export type SearchResult = {
  query: string; results: PublicHit[]; unavailable: string[];
  searchedAt?: string; notice?: string;
};

const LOCAL_CATALOG = 'rez-ai-network-sources-v1';
const seed = String.raw`
enciclopedias|Wikipédia PT|https://pt.wikipedia.org/|pt
enciclopedias|Wikidata|https://www.wikidata.org/|mul
enciclopedias|Wikimedia Commons|https://commons.wikimedia.org/|mul
educacao|Khan Academy|https://pt.khanacademy.org/|pt
educacao|MIT OpenCourseWare|https://ocw.mit.edu/|en
educacao|OpenStax|https://openstax.org/|en
educacao|INEP|https://www.gov.br/inep/pt-br|pt
educacao|Escola Virtual Gov|https://www.escolavirtual.gov.br/|pt
educacao|SciELO|https://www.scielo.org/|mul
pesquisa_cientifica|PubMed|https://pubmed.ncbi.nlm.nih.gov/|en
pesquisa_cientifica|arXiv|https://arxiv.org/|en
pesquisa_cientifica|Crossref|https://www.crossref.org/|en
pesquisa_cientifica|DOAJ|https://doaj.org/|en
pesquisa_cientifica|OpenAlex|https://openalex.org/|en
pesquisa_cientifica|Semantic Scholar|https://www.semanticscholar.org/|en
matematica|Wolfram MathWorld|https://mathworld.wolfram.com/|en
matematica|GeoGebra|https://www.geogebra.org/|mul
matematica|Desmos|https://www.desmos.com/|mul
fisica|CERN|https://home.cern/|en
fisica|PhET|https://phet.colorado.edu/pt_BR/|pt
quimica|IUPAC|https://iupac.org/|en
quimica|PubChem|https://pubchem.ncbi.nlm.nih.gov/|en
biologia|NCBI|https://www.ncbi.nlm.nih.gov/|en
biologia|UniProt|https://www.uniprot.org/|en
saude|Organização Mundial da Saúde|https://www.who.int/|en
saude|OPAS|https://www.paho.org/pt|pt
saude|Ministério da Saúde|https://www.gov.br/saude/pt-br|pt
saude|Fiocruz|https://portal.fiocruz.br/|pt
saude|MedlinePlus|https://medlineplus.gov/|en
saude|ANVISA|https://www.gov.br/anvisa/pt-br|pt
historia|Biblioteca Nacional Digital|https://bndigital.bn.gov.br/|pt
historia|Library of Congress|https://www.loc.gov/|en
historia|Smithsonian|https://www.si.edu/|en
geografia|IBGE|https://www.ibge.gov.br/|pt
geografia|IBGE Cidades|https://cidades.ibge.gov.br/|pt
geografia|OpenStreetMap|https://www.openstreetmap.org/|mul
astronomia|NASA Science|https://science.nasa.gov/|en
astronomia|ESA|https://www.esa.int/|en
clima_ambiente|IPCC|https://www.ipcc.ch/|en
clima_ambiente|INPE|https://www.gov.br/inpe/pt-br|pt
clima_ambiente|NOAA Climate|https://www.climate.gov/|en
leis_direitos|Planalto Legislação|https://www.planalto.gov.br/ccivil_03/|pt
leis_direitos|Supremo Tribunal Federal|https://www.stf.jus.br/|pt
leis_direitos|Diário Oficial da União|https://www.in.gov.br/|pt
leis_direitos|Senado Federal|https://www12.senado.leg.br/|pt
economia|Banco Central do Brasil|https://www.bcb.gov.br/|pt
economia|IPEA|https://www.ipea.gov.br/|pt
economia|World Bank Data|https://data.worldbank.org/|en
economia|IMF Data|https://www.imf.org/en/Data|en
economia|Our World in Data|https://ourworldindata.org/|en
programacao|MDN Web Docs|https://developer.mozilla.org/pt-BR/|pt
programacao|Python Documentation|https://docs.python.org/pt-br/3/|pt
programacao|React|https://react.dev/|en
programacao|GitHub Docs|https://docs.github.com/|en
programacao|PostgreSQL|https://www.postgresql.org/docs/|en
programacao|Microsoft Learn|https://learn.microsoft.com/|en
tecnologia|IEEE|https://www.ieee.org/|en
tecnologia|NIST|https://www.nist.gov/|en
tecnologia|W3C Standards|https://www.w3.org/standards/|en
tecnologia|Linux Kernel Docs|https://docs.kernel.org/|en
ia|Hugging Face|https://huggingface.co/|en
ia|Cloudflare Workers AI|https://developers.cloudflare.com/workers-ai/|en
ia|PyTorch Docs|https://pytorch.org/docs/|en
bibliotecas|Project Gutenberg|https://www.gutenberg.org/|en
bibliotecas|Open Library|https://openlibrary.org/|en
bibliotecas|Internet Archive|https://archive.org/|mul
idiomas|Cambridge Dictionary|https://dictionary.cambridge.org/|en
idiomas|Priberam|https://dicionario.priberam.org/|pt
arte_cultura|Google Arts & Culture|https://artsandculture.google.com/|mul
arte_cultura|Metropolitan Museum|https://www.metmuseum.org/art/collection|en
esportes|Comitê Olímpico do Brasil|https://www.cob.org.br/|pt
esportes|FIBA|https://www.fiba.basketball/|en
esportes|World Athletics|https://worldathletics.org/|en
agricultura|Embrapa|https://www.embrapa.br/|pt
agricultura|FAO|https://www.fao.org/|en
jornalismo|Agência Brasil|https://agenciabrasil.ebc.com.br/|pt
jornalismo|Reuters|https://www.reuters.com/|en
jornalismo|Associated Press|https://apnews.com/|en
jornalismo|Agência Lupa|https://lupa.uol.com.br/|pt
dados_abertos|Dados Abertos Brasil|https://dados.gov.br/|pt
dados_abertos|Wikimedia Dumps|https://dumps.wikimedia.org/|en
dados_abertos|Common Crawl|https://commoncrawl.org/|en
dados_abertos|UN Data|https://data.un.org/|en
dados_abertos|Kaggle Datasets|https://www.kaggle.com/datasets|en
`;

export const INITIAL_SOURCES: KnowledgeSource[] = seed.trim().split('\n')
  .map(x => x.trim().split('|'))
  .filter(x => x.length === 4)
  .map(([categoria,nome,url,idioma]) => ({ categoria,nome,url,idioma }));

export function validPublicUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (!['https:', 'http:'].includes(u.protocol) || !u.hostname ||
        u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return !(/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|::1|\[::1\])/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.endsWith('.local') ||
      host.endsWith('.internal'));
  } catch { return false; }
}

export function parseSourceCatalog(input: unknown): KnowledgeSource[] {
  const obj = input && typeof input === 'object' ? input as Record<string, unknown> : null;
  const sources = Array.isArray(obj?.fontes) ? obj.fontes :
    Array.isArray(obj?.links) ? obj.links : Array.isArray(input) ? input : null;
  if (!sources) throw new Error('Esse JSON não contém uma lista de fontes/links.');
  if (sources.length > 10000) throw new Error('Catálogo muito grande. Máximo de 10 mil links.');
  const seen = new Set<string>();
  const result: KnowledgeSource[] = [];
  for (const value of sources) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    if (typeof row.url !== 'string' || !validPublicUrl(row.url)) continue;
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    result.push({
      categoria: String(row.categoria || 'geral').slice(0, 70),
      nome: String(row.nome || new URL(row.url).hostname).slice(0, 120),
      url: row.url.slice(0, 1000),
      idioma: String(row.idioma || 'mul').slice(0, 8),
    });
  }
  if (!result.length) throw new Error('Nenhuma URL pública válida encontrada.');
  return result;
}

/** The full curated catalog is bundled with the website.
 * Users should not need to import the 440 links manually.
 */
export type FeedEntry = { categoria: string; nome: string; feed: string; idioma: string };

export async function getBundledCatalog(signal?: AbortSignal): Promise<{
  sources: KnowledgeSource[]; feeds: FeedEntry[];
}> {
  const response = await fetch('/rez-knowledge-catalog.json', {
    cache: 'force-cache', signal,
  });
  if (!response.ok) throw new Error('Não foi possível carregar o catálogo incluído no site.');
  const data: unknown = await response.json();
  const sources = parseSourceCatalog(data);
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const rawFeeds = Array.isArray(root.feeds) ? root.feeds : [];
  const feeds: FeedEntry[] = rawFeeds.slice(0, 100).flatMap(row => {
    if (!row || typeof row !== 'object') return [];
    const x = row as Record<string, unknown>;
    if (typeof x.feed !== 'string' || !validPublicUrl(x.feed)) return [];
    return [{
      categoria: String(x.categoria || 'noticias').slice(0, 70),
      nome: String(x.nome || new URL(x.feed).hostname).slice(0, 120),
      feed: x.feed.slice(0, 1000),
      idioma: String(x.idioma || 'mul').slice(0, 8),
    }];
  });
  return { sources, feeds };
}

export function readImportedSources(): KnowledgeSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const text = localStorage.getItem(LOCAL_CATALOG);
    return text ? parseSourceCatalog(JSON.parse(text)) : [];
  } catch { return []; }
}

export function saveImportedSources(input: unknown): KnowledgeSource[] {
  const sources = parseSourceCatalog(input);
  localStorage.setItem(LOCAL_CATALOG, JSON.stringify(sources));
  return sources;
}

export function findSources(
  sources: KnowledgeSource[], query: string, limit = 35,
): KnowledgeSource[] {
  const text = query.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!text) return sources.slice(0, limit);
  const terms = text.split(/\s+/).slice(0, 8);
  return sources.filter(source => {
    const haystack = (source.categoria+' '+source.nome+' '+source.url).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return terms.every(t => haystack.includes(t));
  }).slice(0, limit);
}

export async function searchPublicKnowledge(q: string, signal?: AbortSignal): Promise<SearchResult> {
  const text = q.trim().slice(0, 140);
  if (text.length < 3) throw new Error('Digite pelo menos três caracteres.');
  const response = await fetch('/api/knowledge/search?q=' + encodeURIComponent(text), {
    cache: 'no-store', signal,
  });
  const data: unknown = await response.json();
  if (!response.ok || !data || typeof data !== 'object' || !('results' in data))
    throw new Error('Não foi possível consultar as fontes públicas agora.');
  return data as SearchResult;
}

export function sourcesAsPromptContext(hits: PublicHit[]): string {
  return hits.slice(0, 5).map((h, i) =>
    '[' + (i+1) + '] ' + h.title.slice(0, 140) + '\n' +
    'URL: ' + h.url.slice(0, 300) + '\n' +
    'Metadados/trecho não verificados integralmente: ' + h.excerpt.slice(0, 240)
  ).join('\n\n').slice(0, 2500);
}
