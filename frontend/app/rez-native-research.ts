/**
 * REZ Native public encyclopedia lookup.
 *
 * Only runs when explicitly enabled in the REZ UI and our own built-in
 * knowledge engine has no verified answer. The user query goes to Wikimedia.
 * Fixed Wikimedia hosts only; no arbitrary URL fetching, API key, GPU or LLM.
 *
 * A direct, attributed encyclopedia extract is NOT AI-generated reasoning.
 */
import type { NativeAnswer } from './rez-native-core';

const USER_AGENT = 'REZ-AI-Native/2.1 (https://github.com/jmrzd/REZ-A.I; educational knowledge lookup)';
const MAX_QUERY = 120;

export function extractTopic(question: string): string {
  let topic = question.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY);
  topic = topic.replace(/^(?:oi[,!.\s]+)?(?:por favor[,.\s]+)?/i, '');
  topic = topic.replace(/^(?:você pode |vc pode |pode )?(?:me )?(?:dizer|explicar|explique|falar|contar|ensinar)\s+(?:sobre\s+)?/i, '');
  topic = topic.replace(/^(?:o que (?:é|e|foi|significa)|quem (?:é|e|foi)|quando (?:foi|aconteceu)|como (?:funciona|surgiu)|qual (?:é|e|foi))\s+/i, '');
  topic = topic.replace(/^sobre\s+/i, '').replace(/[?!.,;:\s]+$/g, '');
  return topic.slice(0, MAX_QUERY);
}

type WikiPage = { title?: unknown; key?: unknown; description?: unknown; excerpt?: unknown };
type WikiSearch = { pages?: unknown };
type WikiSummary = { extract?: unknown; title?: unknown; type?: unknown };

function plain(value: unknown, limit = 600): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39);/g, ' ')
        .replace(/\s+/g, ' ').trim().slice(0, limit)
    : '';
}

function topicRelevance(query: string, title: string): boolean {
  const stop = new Set(['como', 'qual', 'quais', 'quem', 'porque', 'quando',
    'para', 'sobre', 'esse', 'essa', 'isso', 'entao', 'meu', 'minha', 'tem',
    'que', 'com', 'uma', 'dos', 'das', 'a', 'o', 'de', 'em', 'do', 'da', 'e']);
  const norm = (s: string) => s.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const terms = norm(query).split(' ').filter(x => x.length >= 3 && !stop.has(x));
  const titleNorm = norm(title);
  if (terms.length === 0) return false;
  // At least one distinct topic token must be present; avoid accepting
  // unrelated articles just because Wikimedia returned a search hit.
  const overlap = terms.filter(x => titleNorm.split(' ').some(w => w === x)).length;
  return overlap >= Math.min(2, terms.length);
}

export async function researchOnWikipedia(
  question: string, signal?: AbortSignal,
): Promise<NativeAnswer | null> {
  const query = extractTopic(question);
  if (query.length < 3 || query.length > MAX_QUERY) return null;

  // The browser UI explicitly controls this feature. Do not send private
  // document snippets or chat history; only this single query is forwarded.
  const combined = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
    : AbortSignal.timeout(5000);
  const headers = { 'Accept': 'application/json', 'User-Agent': USER_AGENT };
  for (const lang of ['pt', 'en'] as const) {
    try {
      const search = new URL('https://' + lang + '.wikipedia.org/w/rest.php/v1/search/page');
      search.searchParams.set('q', query);
      search.searchParams.set('limit', '3');
      const found = await fetch(search, { headers, signal: combined, cache: 'no-store' });
      if (!found.ok) continue;
      const payload = await found.json() as WikiSearch;
      const pages = Array.isArray(payload?.pages) ? payload.pages as WikiPage[] : [];
      const match = pages.find(page =>
        typeof page?.title === 'string' && topicRelevance(query, page.title));
      if (!match) continue;

      const title = plain(match.title, 160);
      const slug = plain(match.key ?? match.title, 180);
      if (!title || !slug) continue;
      const url = 'https://' + lang + '.wikipedia.org/wiki/' +
        encodeURIComponent(slug.replace(/ /g, '_'));

      // Public Wikipedia lead summary (a short, attributed extract).
      const summaryUrl = 'https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(slug.replace(/ /g, '_'));
      const summaryResponse = await fetch(summaryUrl, { headers, signal: combined, cache: 'no-store' });
      if (!summaryResponse.ok) continue;
      const summary = await summaryResponse.json() as WikiSummary;
      if (summary?.type === 'disambiguation') continue;
      const extract = plain(summary?.extract, 900);
      if (extract.length < 70) continue;

      return {
        text: '**Referência encontrada: ' + title + '**\n\n' +
          extract +
          '\n\nFonte: Wikipédia (' + lang.toUpperCase() + '). ' +
          'Este texto é um trecho enciclopédico atribuído, não uma explicação original gerada pela REZ. ' +
          'Consulte o artigo completo para contexto e referências: ' + url,
        topic: title,
        method: 'reference',
        sources: [{ name: 'Wikipédia — ' + title, url }],
        engine: 'REZ Native',
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      // An upstream outage must not create a made-up answer.
    }
  }
  return null;
}
