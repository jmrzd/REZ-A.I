'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BookOpen, ExternalLink, Search, Upload, X, Trash2 } from 'lucide-react';
import {
  INITIAL_SOURCES, findSources, getBundledCatalog, readImportedSources, saveImportedSources,
  searchPublicKnowledge, type KnowledgeSource, type SearchResult, type FeedEntry,
} from './knowledge-web';

const STORAGE_KEY = 'rez-ai-network-sources-v1';

export default function NetworkKnowledgePanel({
  onClose, onUseQuestion, useSearchForChat, onSearchToggle,
}: {
  onClose: () => void;
  onUseQuestion: (text: string) => void;
  useSearchForChat: boolean;
  onSearchToggle: (enabled: boolean) => void;
}) {
  const [catalog, setCatalog] = useState<KnowledgeSource[]>([]);
  const [bundled, setBundled] = useState<KnowledgeSource[]>(INITIAL_SOURCES);
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setCatalog(readImportedSources());
    void getBundledCatalog(controller.signal)
      .then(data => { setBundled(data.sources); setFeeds(data.feeds); })
      .catch(() => {
        if (!controller.signal.aborted)
          setCatalogError('Não foi possível carregar as 440 fontes. Exibindo catálogo inicial.');
      });
    return () => controller.abort();
  }, []);

  const indexed = catalog.length ? catalog : bundled;
  const matches = findSources(indexed, query, 40);

  async function liveSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      setResults(await searchPublicKnowledge(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar a rede.');
    } finally {
      setLoading(false);
    }
  }

  async function importCatalog(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      if (file.size > 2_000_000 || !/\.json$/i.test(file.name))
        throw new Error('Selecione um JSON com até 2 MB. Extraia o arquivo JSON do ZIP antes.');
      const parsed: unknown = JSON.parse(await file.text());
      const sources = saveImportedSources(parsed);
      setCatalog(sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Catálogo inválido.');
    }
  }

  return (
    <section className="networkPanel" aria-label="Fontes de conhecimento na rede">
      <div className="networkHeader">
        <div>
          <strong><BookOpen size={17} /> Biblioteca de conhecimento da REZ</strong>
          <p>Portais confiáveis e busca de referências na Wikipédia e Crossref. Links não significam conteúdo já aprendido.</p>
        </div>
        <button type="button" aria-label="Fechar fontes" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="networkSearch">
        <input aria-label="Pesquisar assunto ou fonte" placeholder="Pesquise qualquer assunto educativo..."
          value={query} maxLength={140}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void liveSearch(); }} />
        <button type="button" onClick={() => void liveSearch()}
          disabled={query.trim().length < 3 || loading}>
          <Search size={16} /> {loading ? 'Buscando...' : 'Pesquisar'}
        </button>
      </div>
      <label className="networkConsent">
        <input type="checkbox" checked={useSearchForChat}
          onChange={e => onSearchToggle(e.target.checked)} />
        <span>Consultar Wikipédia e Crossref antes das respostas da REZ na nuvem.
          A pergunta será enviada aos serviços públicos. Desativado por padrão;
          pesquisar pode adicionar alguns segundos.</span>
      </label>
      <div className="networkImport">
        <span><strong>{indexed.length} fontes</strong> · {new Set(indexed.map(s => s.categoria)).size} áreas · {feeds.length} feeds · {catalog.length ? 'catálogo personalizado' : 'base do projeto'}</span>
        <button type="button" onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> Importar catálogo JSON
        </button>
        {catalog.length > 0 &&
          <button type="button" onClick={() => {
            localStorage.removeItem(STORAGE_KEY); setCatalog([]); setError('');
          }} title="Excluir catálogo importado e voltar à base incluída na REZ">
            <Trash2 size={14} /> Restaurar
          </button>}
        <input ref={fileRef} type="file" accept=".json,application/json" className="hiddenInput"
          aria-label="Importar arquivo JSON de fontes" onChange={e => void importCatalog(e)} />
      </div>
      <p className="networkDisclaimer">As 440 fontes e 23 feeds já estão incluídos na REZ; não é necessário importar arquivo. Você pode adicionar um catálogo personalizado acima.</p>
      {catalogError && <p className="networkError">{catalogError}</p>}
      {error && <p className="networkError" role="alert">{error}</p>}
      {results && (
        <div className="networkResults">
          <div className="networkResultsHeading">
            <strong>Fontes encontradas para “{results.query}”</strong>
            <button type="button" onClick={() => { onUseQuestion(results.query); onClose(); }}>
              Usar pergunta no chat
            </button>
          </div>
          {results.results.length ? results.results.map(r =>
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="networkResult">
              <span className="networkResultName">{r.title} <ExternalLink size={13}/></span>
              <span className="networkResultMeta">{r.provider}{r.date ? ' · ' + r.date : ''}</span>
              <span className="networkResultExcerpt">{r.excerpt}</span>
            </a>
          ) : <p>As fontes públicas consultadas não encontraram resultados. Isso não significa que o assunto não exista.</p>}
          {results.unavailable.length > 0 && <p className="networkDisclaimer">Fontes indisponíveis agora: {results.unavailable.join(', ')}.</p>}
        </div>
      )}
      <div className="networkCatalog">
        <strong>Biblioteca por assunto</strong>
        <div className="networkLinks">
          {matches.map(s => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" title={s.url}>
              <span>{s.nome}</span>
              <small>{s.categoria.replaceAll('_',' ')} · {s.idioma}</small>
            </a>
          ))}
          {!matches.length && <p>Nenhuma fonte cadastrada com esse termo. Experimente a pesquisa online acima.</p>}
        </div>
      </div>
      {feeds.length > 0 && (
        <details className="networkCatalog networkFeedGroup">
          <summary>Feeds de notícias cadastrados ({feeds.length})</summary>
          <div className="networkLinks">
            {feeds.map(feed =>
              <a key={feed.feed} href={feed.feed} target="_blank" rel="noopener noreferrer">
                <span>{feed.nome}</span>
                <small>{feed.categoria.replaceAll('_',' ')} · Feed externo, não monitorado automaticamente</small>
              </a>)}
          </div>
        </details>
      )}
      <p className="networkDisclaimer">Pesquisa sem chave de modelo, baseada em metadados e trechos. Fontes cadastradas não foram individualmente verificadas ao vivo. Confirme informações nas páginas originais.</p>
    </section>
  );
}
