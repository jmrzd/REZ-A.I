'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  BrainCircuit, Send, Plus, PanelLeft, Bot, UserRound, Sparkles,
  Trash2, X, StopCircle, Cpu, Download, Copy, Check,
  ShieldCheck, Files, Upload, FileText, HardDrive, ChevronDown, BookOpen,
} from 'lucide-react';
import ToolApprovalDemo from './ToolApprovalDemo';
import { generateLocal, prepareLocal, hasWebGPU, type ChatTurn, type Progress } from './local-ai';
import { instantAnswer } from './instant-replies';
import { generateHosted, type AssistMode } from './cloud-ai';
import NetworkKnowledgePanel from './NetworkKnowledgePanel';
import { searchPublicKnowledge, sourcesAsPromptContext, getBundledCatalog, rankCatalogSources, catalogueLeadsAsEvidence, type PublicHit } from './knowledge-web';
import {
  buildLocalContext, readDocuments, removeDocument, saveDocument,
  type LocalDocument, MAX_DOC_BYTES, MAX_DOCS,
} from './knowledge';

type RezMessage = ChatTurn & { source?: 'instant' | 'model' };
type Conversation = { id: string; title: string; messages: RezMessage[]; sources?: string[]; webSources?: PublicHit[] };

const HISTORY_KEY = 'rez-ai-conversations-v1';

function friendlyError(error: unknown): string {
  // WebLLM sometimes rejects with a STRING rather than an Error object.
  // Do not hide it behind the old "Falha desconhecida" message.
  const raw = error instanceof Error ? error.message
    : typeof error === 'string' ? error
    : error && typeof error === 'object' && 'message' in error
      ? String(error.message) : String(error ?? '');
  const message = raw.toLowerCase();
  if (message.includes('out of memory') || message.includes('memory allocation') ||
      message.includes('allocation failed') || message.includes('not enough memory'))
    return 'O dispositivo não tem RAM/VRAM suficiente para iniciar a IA local. Feche outras abas ou use um computador com mais memória.';
  if (message.includes('network') || message.includes('failed to fetch'))
    return 'Não foi possível baixar os pesos públicos do modelo. Verifique a conexão e os bloqueadores do navegador.';
  if (message.includes('webgpu') || message.includes('gpu'))
    return raw.slice(0, 400) + ' Confira a disponibilidade da WebGPU; a REZ também tenta CPU automaticamente.';
  return raw.trim() ? raw.slice(0, 450) : 'O motor local não iniciou. Verifique WebGPU, armazenamento e RAM do navegador.';
}

export default function Home() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasGpu, setHasGpu] = useState<boolean | null>(null);
  const [chatMode, setChatMode] = useState<'cloud' | 'local'>('cloud');
  const [assistantMode, setAssistantMode] = useState<AssistMode>('general');
  // Explicit consent: do not send document excerpts to the Cloudflare model by default.
  const [sendDocsToCloud, setSendDocsToCloud] = useState(false);
  const [cloudConfigured, setCloudConfigured] = useState<boolean | null>(null);
  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null);
  const [checkingCloud, setCheckingCloud] = useState(false);
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [searchWebForAnswers, setSearchWebForAnswers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [engineStage, setEngineStage] = useState<'gpu' | 'cpu' | 'cloud' | null>(null);
  const [warmBusy, setWarmBusy] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const warmAbortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((c): c is Conversation =>
            typeof c?.id === 'string' && typeof c?.title === 'string' &&
            Array.isArray(c?.messages) &&
            c.messages.every((m: ChatTurn) =>
              (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'));
          setChats(valid.slice(0, 100));
        }
      }
    } catch {
      // A damaged local cache should never make the whole application unusable.
    }
    const supported = hasWebGPU();
    setHasGpu(supported);
    void readDocuments().then(setDocuments).catch(() => {
      setError('Não foi possível acessar a memória de documentos do navegador.');
    });
    setReady(true);
  }, []);

  async function checkCloud() {
    setCheckingCloud(true);
    try {
      const response = await fetch('/api/brain', {
        cache: 'no-store', signal: AbortSignal.timeout(7000),
      });
      const health = await response.json() as { configured?: boolean; online?: boolean };
      setCloudConfigured(response.ok && health.configured === true);
      setCloudOnline(response.ok && health.online === true);
    } catch {
      setCloudConfigured(false);
      setCloudOnline(false);
    } finally {
      setCheckingCloud(false);
    }
  }

  useEffect(() => {
    void checkCloud();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(chats));
    } catch {
      setError('Seu navegador ficou sem espaço para salvar o histórico. Exclua conversas antigas.');
    }
  }, [chats, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [active, chats]);

  const current = chats.find(c => c.id === active);
  const messages = current?.messages ?? [];

  function newChat() {
    if (busy) return;
    setActive(null);
    setDraft('');
    setProgress(null);
    setEngineStage(null);
    setError('');
    setCopied(null);
    setMenuOpen(false);
  }

  function openChat(id: string) {
    if (busy) return;
    setActive(id);
    setError('');
    setProgress(null);
    setMenuOpen(false);
  }

  function removeChat(id: string) {
    if (busy) return;
    setChats(prev => prev.filter(c => c.id !== id));
    if (active === id) setActive(null);
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    setError('');
    try {
      for (const file of files) await saveDocument(file);
      setDocuments(await readDocuments());
    } catch (err) {
      setError(friendlyError(err));
      setDocuments(await readDocuments().catch(() => []));
    }
  }

  async function deleteDocument(id: string) {
    try {
      await removeDocument(id);
      setDocuments(await readDocuments());
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  function exportHistory() {
    const content = JSON.stringify({
      format: 'rez-ai-history-v1',
      exportedAt: new Date().toISOString(),
      conversations: chats,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rez-ai-conversas.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyMessage(index: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(index);
    } catch {
      setError('Não foi possível copiar a mensagem.');
    }
  }

  async function prepare() {
    if (busy || warmBusy || modelReady || chatMode !== 'local') return;
    const controller = new AbortController();
    warmAbortRef.current = controller;
    setWarmBusy(true);
    setError('');
    setProgress({ text: 'Preparando modelo local com sua autorização. Pesos podem ser grandes na primeira vez...' });
    try {
      await prepareLocal(controller.signal, update => {
        setProgress(update);
        if (update.stage) setEngineStage(update.stage);
      });
      setModelReady(true);
    } catch (error) {
      setError(controller.signal.aborted
        ? 'Preparação cancelada. Você pode tentar novamente quando quiser.'
        : friendlyError(error));
    } finally {
      if (warmAbortRef.current === controller) warmAbortRef.current = null;
      setWarmBusy(false);
      setProgress(null);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy || warmBusy) return;
    const id = active ?? crypto.randomUUID();
    const next: ChatTurn[] = [...messages, { role: 'user', content }];
    const controller = new AbortController();
    abortRef.current = controller;
    const retrieval = buildLocalContext(documents, content);
    const sharedSources = chatMode === 'local' || sendDocsToCloud ? retrieval.sources : [];

    setActive(id);
    setChats(previous => previous.some(chat => chat.id === id)
      ? previous.map(chat => chat.id === id ? { ...chat, messages: next, sources: sharedSources } : chat)
      : [{ id, title: content.slice(0, 50), messages: next, sources: sharedSources }, ...previous]);
    setDraft('');
    setBusy(true);
    setProgress({ text: chatMode === 'cloud'
      ? 'Consultando o cérebro da REZ no servidor, sem carregar modelos no seu computador...'
      : 'Preparando o modelo no seu dispositivo (primeiro download pode demorar)...' });
    setError('');
    setCopied(null);

    let reply = '';
    let replySource: 'instant' | 'model' = 'model';
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const showReply = () => setChats(previous => previous.map(chat => chat.id === id
      ? { ...chat, messages: reply ? [...next, { role: 'assistant', content: reply, source: replySource }] : next }
      : chat));
    // React previously re-rendered and persisted the entire chat for EVERY
    // tiny generated fragment. Batch UI commits for smoother CPU/GPU streaming.
    const flushReply = () => {
      if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null; }
      showReply();
    };
    const queueReply = () => {
      if (flushTimer === null)
        flushTimer = setTimeout(() => { flushTimer = null; showReply(); }, 100);
    };

    try {
      const instant = instantAnswer(content, new Date(), chatMode);
      if (instant) {
        // Explicitly labeled deterministic response: zero model download.
        replySource = 'instant';
        reply = instant.text;
        showReply();
      } else if (chatMode === 'cloud') {
        if (cloudConfigured !== true) {
          throw Error('O cérebro em servidor ainda não foi conectado. É preciso publicar o Worker na Cloudflare e configurar a ligação segura à Vercel. Nenhum modelo será baixado automaticamente no seu PC.');
        }
        if (cloudOnline === false) {
          throw Error('O Worker da Cloudflare está cadastrado, mas não responde à verificação de saúde. Confira a implantação e as vinculações de IA e limites antes de enviar mensagens.');
        }
        setEngineStage('cloud');
        // Bundled reference metadata is safe to retrieve by default:
        // it comes from REZ itself and does not contact third-party sites.
        // This does NOT mean the model has read any linked pages.
        let publicEvidence = '';
        let directoryLeads: PublicHit[] = [];
        try {
          const directory = await getBundledCatalog(controller.signal);
          const leads = rankCatalogSources(directory.sources, content, 3);
          directoryLeads = leads.map(source => ({
            title: source.nome, url: source.url, excerpt: 'Diretório: página não consultada',
            provider: 'Diretório REZ' as const, kind: 'diretorio',
          }));
          publicEvidence = catalogueLeadsAsEvidence(leads);
        } catch {
          if (controller.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
        }
        // Network lookups still require explicit opt-in. They send the
        // question to the Wikimedia and Crossref public research services.
        let citations: PublicHit[] = [];
        if (searchWebForAnswers) {
          setProgress({ text: 'Buscando títulos e trechos em fontes públicas...' });
          try {
            const research = await searchPublicKnowledge(content,
              AbortSignal.any([controller.signal, AbortSignal.timeout(5200)]));
            citations = research.results.slice(0, 5);
            publicEvidence = [publicEvidence, sourcesAsPromptContext(citations)]
              .filter(Boolean).join('\n\n').slice(0, 1800);
          } catch {
            if (controller.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
          }
        }
        if (directoryLeads.length || citations.length) {
          setChats(previous => previous.map(chat => chat.id === id
            ? { ...chat, webSources: [...citations, ...directoryLeads] } : chat));
        }
        setProgress({ text: 'Gerando resposta no cérebro da REZ na nuvem...' });
        await generateHosted(next, sendDocsToCloud ? retrieval.context : '', controller.signal, text => {
          reply += text;
          queueReply();
        }, assistantMode, publicEvidence);
        if (!reply.trim()) throw Error('A IA hospedada terminou sem produzir texto.');
      } else {
        await generateLocal({
          messages: next, context: retrieval.context,
          signal: controller.signal,
          onProgress: update => {
            setProgress(update);
            if (update.stage) setEngineStage(update.stage);
          },
          onDelta: text => {
            reply += text;
            queueReply();
          },
        });
        if (!reply.trim())
          throw Error('Nenhum texto foi gerado. Confira RAM, GPU e o download dos pesos.');
        setModelReady(true);
      }
    } catch (err) {
      setError(controller.signal.aborted ? 'Resposta interrompida.' : friendlyError(err));
    } finally {
      flushReply();
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <main className="shell">
      {menuOpen && <button className="overlay" aria-label="Fechar menu"
        onClick={() => setMenuOpen(false)} />}
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="brand">
          <div className="brandmark"><BrainCircuit size={22} /></div>
          <strong>REZ <span>A.I</span></strong>
          <button className="closeMenu" aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>
        <button className="new" onClick={newChat}><Plus size={17} /> Nova conversa</button>
        <div className="sectionLabel">CONVERSAS RECENTES</div>
        <nav className="history" aria-label="Histórico de conversas">
          {!chats.length
            ? <p className="emptyHistory">Suas conversas aparecerão aqui.</p>
            : chats.map(chat => (
              <div key={chat.id} className={'historyItem' + (active === chat.id ? ' selected' : '')}>
                <button className="historyTitle" onClick={() => openChat(chat.id)}
                  title={chat.title}>{chat.title}</button>
                <button className="delete" aria-label={'Excluir ' + chat.title}
                  onClick={() => removeChat(chat.id)}><Trash2 size={14} /></button>
              </div>
            ))}
        </nav>
        <div className="sidefoot">
          <span className="statusDot" /> REZ A.I <span>• Independente</span>
          <p>Modo Nuvem: processamento no servidor Cloudflare, sujeito a uma cota gratuita diária.</p>
          <p>Histórico permanece no navegador; mensagens e trechos relevantes enviados ao servidor no modo Nuvem.</p>
          <button className="historyExport" onClick={exportHistory}
            disabled={!chats.length}>Exportar conversas JSON</button>
        </div>
      </aside>

      <section className="main">
        <header>
          <div className="headerLeft">
            <button className="menu" onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Alternar menu"><PanelLeft size={21} /></button>
            <div className="heading">Rez A.I <span>Seu espaço de inteligência independente</span></div>
          </div>
          <div className="headerControls">
            <span className="localBadge"><ShieldCheck size={13} /> {chatMode === 'cloud' ? 'IA no servidor' : '100% local'}</span>
            <div className="rezModeSwitch" role="group" aria-label="Onde a REZ executa a IA">
              <button type="button" disabled={busy || warmBusy} aria-pressed={chatMode === 'cloud'}
                className={chatMode === 'cloud' ? 'selected' : ''}
                onClick={() => { setChatMode('cloud'); setError(''); setProgress(null); setEngineStage(null); }}>
                Nuvem
              </button>
              <button type="button" disabled={busy || warmBusy} aria-pressed={chatMode === 'local'}
                className={chatMode === 'local' ? 'selected' : ''}
                onClick={() => { setChatMode('local'); setError(''); setProgress(null); setEngineStage(null); }}>
                Local
              </button>
            </div>
            {chatMode === 'local' && <button className="permissionsToggle warmButton" type="button"
              onClick={() => warmBusy ? warmAbortRef.current?.abort() : void prepare()}
              disabled={busy || (modelReady && !warmBusy)}
              title={warmBusy ? 'Cancelar a preparação' : modelReady ? 'Modelo pronto nesta aba' : 'Carregar o modelo antes de perguntar; opcional'}>
              {modelReady ? <Check size={16} /> : <Download size={16} />}
              <span>{warmBusy ? 'Cancelar preparo' : modelReady ? 'IA pronta' : 'Preparar IA'}</span>
            </button>}
            <button className="permissionsToggle knowledgeNetworkButton" type="button"
              aria-expanded={networkOpen} onClick={() => { setNetworkOpen(v => !v); setDocsOpen(false); }}>
              <BookOpen size={16} /> <span>Fontes</span>
            </button>
            <button className="permissionsToggle" onClick={() => { setDocsOpen(v => !v); setNetworkOpen(false); }}
              aria-expanded={docsOpen} type="button">
              <Files size={16} /> <span>Memória ({documents.length})</span>
            </button>
            <button className="permissionsToggle" type="button" onClick={() => setShowPermissions(v => !v)}
              aria-expanded={showPermissions}>
              <ShieldCheck size={16} /> <span>Permissões</span>
            </button>
            {chatMode === 'cloud' && (
              <select className="rezTaskMode" aria-label="Modo da REZ" value={assistantMode}
                disabled={busy || warmBusy}
                onChange={e => setAssistantMode(e.target.value as AssistMode)}>
                <option value="general">Conversa</option>
                <option value="study">Estudos</option>
                <option value="code">Código</option>
                <option value="summary">Resumo</option>
              </select>
            )}
            <span className="rezAutoLabel"><BrainCircuit size={16} /> REZ A.I <span>{chatMode === 'cloud' ? 'Servidor' : 'Local'}</span></span>
          </div>
        </header>
        {showPermissions && <ToolApprovalDemo onClose={() => setShowPermissions(false)} />}
        <div className="modelNotice" role="status">
          <Cpu size={16} />
          {chatMode === 'cloud'
            ? <span><strong>REZ A.I · Cérebro no servidor.</strong> A geração será feita pela Cloudflare, não pela CPU/GPU do seu PC. {cloudConfigured === true
                ? (cloudOnline === true
                    ? 'Worker acessível e vinculações detectadas. As mensagens serão processadas na nuvem, sujeitas à cota gratuita.'
                    : 'O endereço do Worker está configurado, mas ele não está acessível ou não tem as vinculações necessárias.')
                : cloudConfigured === false
                  ? 'O servidor Cloudflare ainda não foi conectado. A REZ não fará downloads locais automaticamente.'
                  : 'Verificando conexão do servidor...'}
                <button className="cloudHealthButton" type="button"
                  disabled={checkingCloud || busy} onClick={() => void checkCloud()}>
                  {checkingCloud ? 'Verificando...' : 'Testar conexão'}
                </button>
              </span>
            : <span><strong>REZ A.I · Modo local opcional.</strong> Aceleração pela GPU quando possível; CPU é mais lenta.
                {engineStage === 'cpu' && ' Processamento atual: CPU.'}
                {engineStage === 'gpu' && ' Processamento atual: WebGPU.'}
                {modelReady && ' Modelo já carregado nesta aba.'}
                {hasGpu === false && engineStage === null && ' WebGPU não detectada.'}
              </span>}
        </div>

        {networkOpen && (
          <NetworkKnowledgePanel
            onClose={() => setNetworkOpen(false)}
            onUseQuestion={text => setDraft(text)}
            useSearchForChat={searchWebForAnswers}
            onSearchToggle={setSearchWebForAnswers}
          />
        )}
        {docsOpen && (
          <section className="knowledgePanel" aria-label="Memória local">
            <div className="knowledgeHeader">
              <div><strong><HardDrive size={16} /> Memória particular da REZ</strong>
                <p>Textos salvos apenas neste navegador. A busca seleciona trechos relevantes para suas perguntas.</p>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} className="knowledgeAdd">
                <Upload size={15} /> Adicionar arquivo
              </button>
              <button type="button" className="knowledgeClose" aria-label="Fechar memória"
                onClick={() => setDocsOpen(false)}><ChevronDown size={18} /></button>
            </div>
            <p className="knowledgeMeta">{documents.length}/{MAX_DOCS} documentos · até {Math.round(MAX_DOC_BYTES / 1000)} KB cada · TXT, MD, CSV, JSON, JS, TS, PY, SQL</p>
            {chatMode === 'cloud' && (
              <label className="cloudDocsConsent">
                <input type="checkbox" checked={sendDocsToCloud}
                  onChange={e => setSendDocsToCloud(e.target.checked)} />
                <span>Permitir enviar trechos relevantes dos meus documentos à Cloudflare para responder.
                  Desativado por padrão; os arquivos completos continuam neste navegador.</span>
              </label>
            )}
            {documents.length ? (
              <div className="knowledgeFiles">
                {documents.map(doc => (
                  <div className="knowledgeFile" key={doc.id}>
                    <FileText size={15} />
                    <span title={doc.name}>{doc.name}</span>
                    <button type="button" aria-label={'Excluir documento ' + doc.name}
                      onClick={() => void deleteDocument(doc.id)}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="knowledgeEmpty">Adicione documentos. Trechos só serão enviados à nuvem se você autorizar.</p>}
          </section>
        )}

        <input ref={fileRef} className="hiddenInput" type="file" multiple
          accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.py,.sql,.log"
          onChange={e => void uploadFiles(e)} aria-label="Importar documentos locais" />

        <div className="conversation">
          {messages.length === 0
            ? <div className="welcome">
              <div className="orb"><BrainCircuit size={36} /></div>
              <div className="eyebrow"><Sparkles size={13} /> IA INDEPENDENTE · SEM CHAVES DE API</div>
              <h1>O que vamos criar <em>hoje?</em></h1>
              <p>{chatMode === 'cloud'
                ? 'Nossa interface conectada a um modelo aberto em servidor. Sem downloads pesados no computador e sem depender da GPU local. O serviço precisa estar configurado e possui cota diária.'
                : 'Modo alternativo no dispositivo: clique em Preparar IA para antecipar o carregamento. O primeiro download e a geração podem ser lentos.'}</p>
              <div className="chips">
                <button onClick={() => setDraft('Me ajude a criar um projeto em Python')}>Criar com Python ↗</button>
                <button onClick={() => setDraft('Explique como modelos de linguagem funcionam')}>Aprender IA ↗</button>
                <button onClick={() => setDocsOpen(true)}>Adicionar documentos ↗</button>
              </div>
            </div>
            : <div className="messages">
              {messages.map((message, index) => (
                <div className={'message ' + message.role} key={index}>
                  <div className="avatar">{message.role === 'assistant'
                    ? <Bot size={18} /> : <UserRound size={18} />}</div>
                  <div className="messageContent">
                    <div className="bubble">{message.content}</div>
                    {message.role === 'assistant' && message.source === 'instant' &&
                      <span className="quickReplyNote">Resposta rápida do aplicativo · sem geração por modelo</span>}
                    {message.role === 'assistant' && (
                      <button type="button" className="copyMessage"
                        onClick={() => void copyMessage(index, message.content)}
                        aria-label="Copiar resposta">
                        {copied === index ? <Check size={14} /> : <Copy size={14} />}
                        {copied === index ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {current?.sources?.length ? (
                <div className="knowledgeSources">Documentos consultados: {current.sources.join(', ')}</div>
              ) : null}
              {current?.webSources?.length ? (
                <section className="webCitations" aria-label="Referências públicas consultadas ou sugeridas">
                  <strong>Referências públicas: metadados consultados e links sugeridos pelo diretório REZ (páginas não lidas)</strong>
                  {current.webSources.map(source =>
                    <a key={source.url} href={source.url} rel="noopener noreferrer" target="_blank">
                      {source.title} · {source.provider}
                    </a>
                  )}
                </section>
              ) : null}
              <div ref={bottomRef} />
            </div>}
        </div>

        {progress && <div className="localProgress" role="status" aria-live="polite">
          <Download size={16} />
          <span>{progress.text}{typeof progress.percent === 'number'
            ? ' (' + progress.percent + '%)' : ''}</span>
          {typeof progress.percent === 'number' &&
            <progress max={100} value={progress.percent} aria-label="Progresso de carregamento" />}
        </div>}
        {error && <div className="error" role="alert">{error}</div>}

        <form onSubmit={send} className="composer">
          <textarea aria-label="Sua mensagem" placeholder={warmBusy ? 'Preparando IA. Você poderá perguntar quando terminar...' : 'Pergunte à REZ A.I independente...'}
            value={draft} disabled={warmBusy} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2} />
          {busy
            ? <button type="button" className="stopButton"
              onClick={() => abortRef.current?.abort()}
              aria-label="Parar geração"><StopCircle size={20} /></button>
            : <button disabled={!draft.trim() || warmBusy} aria-label="Enviar mensagem"><Send size={19} /></button>}
        </form>
        <footer>{chatMode === 'cloud'
          ? 'Nuvem: mensagens seguem para Cloudflare. Documentos e pesquisa pública exigem sua autorização no painel. Fontes públicas não substituem verificação.'
          : 'Local: sem enviar prompts a servidores de inferência. Modelos abertos exigem RAM/CPU/GPU e cache de pesos.'}</footer>
      </section>
    </main>
  );
}
