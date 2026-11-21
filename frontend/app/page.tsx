'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  BrainCircuit, Send, Plus, PanelLeft, Bot, UserRound, Sparkles,
  Trash2, X, StopCircle, Cpu, Download, Copy, Check,
  ShieldCheck, Files, Upload, FileText, HardDrive, ChevronDown,
} from 'lucide-react';
import ToolApprovalDemo from './ToolApprovalDemo';
import { generateLocal, hasWebGPU, type ChatTurn, type Progress } from './local-ai';
import { instantAnswer } from './instant-replies';
import {
  buildLocalContext, readDocuments, removeDocument, saveDocument,
  type LocalDocument, MAX_DOC_BYTES, MAX_DOCS,
} from './knowledge';

type RezMessage = ChatTurn & { source?: 'instant' | 'model' };
type Conversation = { id: string; title: string; messages: RezMessage[]; sources?: string[] };

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
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [engineStage, setEngineStage] = useState<'gpu' | 'cpu' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
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

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const id = active ?? crypto.randomUUID();
    const next: ChatTurn[] = [...messages, { role: 'user', content }];
    const controller = new AbortController();
    abortRef.current = controller;
    const retrieval = buildLocalContext(documents, content);

    setActive(id);
    setChats(previous => previous.some(chat => chat.id === id)
      ? previous.map(chat => chat.id === id ? { ...chat, messages: next, sources: retrieval.sources } : chat)
      : [{ id, title: content.slice(0, 50), messages: next, sources: retrieval.sources }, ...previous]);
    setDraft('');
    setBusy(true);
    setProgress({ text: 'Preparando resposta. Se for necessário baixar um modelo, a primeira vez será mais lenta...' });
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
      const instant = instantAnswer(content);
      if (instant) {
        // Explicitly labeled deterministic response: zero model download.
        replySource = 'instant';
        reply = instant.text;
        showReply();
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
          <p>Sem chave de API, sem provedor de inferência, sem cobrança por mensagem.</p>
          <p>Chat e arquivos permanecem neste navegador.</p>
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
            <span className="localBadge"><ShieldCheck size={13} /> 100% local</span>
            <button className="permissionsToggle" onClick={() => setDocsOpen(v => !v)}
              aria-expanded={docsOpen} type="button">
              <Files size={16} /> <span>Memória ({documents.length})</span>
            </button>
            <button className="permissionsToggle" type="button" onClick={() => setShowPermissions(v => !v)}
              aria-expanded={showPermissions}>
              <ShieldCheck size={16} /> <span>Permissões</span>
            </button>
            <span className="rezAutoLabel"><BrainCircuit size={16} /> REZ A.I <span>Automática</span></span>
          </div>
        </header>
        {showPermissions && <ToolApprovalDemo onClose={() => setShowPermissions(false)} />}
        <div className="modelNotice" role="status">
          <Cpu size={16} />
          <span><strong>REZ A.I · Modo automático.</strong> Aceleração pela GPU quando possível; a CPU funciona sem GPU, mas é mais lenta.
            {engineStage === 'cpu' && ' Processamento atual: CPU. Para mais velocidade, habilite a aceleração gráfica/WebGPU no navegador.'}
            {engineStage === 'gpu' && ' Processamento atual: WebGPU.'}
            {hasGpu === false && engineStage === null && ' WebGPU não detectada; perguntas abertas podem ser lentas.'}
          </span>
        </div>

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
            ) : <p className="knowledgeEmpty">Adicione documentos ou códigos para a REZ consultar sem enviar nada à nuvem.</p>}
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
              <p>Uma única REZ A.I para conversar, aprender programação e consultar documentos locais. Saudações são instantâneas; perguntas abertas usam um modelo de IA no seu dispositivo e podem exigir download inicial.</p>
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
          <textarea aria-label="Sua mensagem" placeholder="Pergunte à REZ A.I independente..."
            value={draft} onChange={e => setDraft(e.target.value)}
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
            : <button disabled={!draft.trim()} aria-label="Enviar mensagem"><Send size={19} /></button>}
        </form>
        <footer>Sem chave/API de inferência. Respostas rápidas são pré-programadas; IA generativa exige pesos públicos, RAM/CPU/GPU e download inicial.</footer>
      </section>
    </main>
  );
}
