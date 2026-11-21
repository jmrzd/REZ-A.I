'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BrainCircuit, Send, Plus, PanelLeft, Bot, UserRound, Sparkles,
  Trash2, X, ShieldCheck, StopCircle, Cpu, Download, Copy, Check, Zap,
} from 'lucide-react';
import ToolApprovalDemo from './ToolApprovalDemo';
import { generateLocal, hasWebGPU, LOCAL_MODELS, type ChatTurn, type Progress } from './local-ai';

type Conversation = { id: string; title: string; messages: ChatTurn[] };
const KEY = 'rez-ai-conversations-v1';

export default function Home() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState('');
  const [modelId, setModelId] = useState('qwen-fast');
  const [hasGpu, setHasGpu] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [menu, setMenu] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((c): c is Conversation =>
            typeof c?.id === 'string' && typeof c?.title === 'string' &&
            Array.isArray(c?.messages) && c.messages.every((m: ChatTurn) =>
              (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'));
          setChats(valid.slice(0, 100));
        }
      }
    } catch { /* Corrupted local cache must not break the application. */ }
    const gpu = hasWebGPU();
    setHasGpu(gpu);
    if (!gpu) setModelId('smol-cpu');
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(chats)); }
    catch { setError('Espaço local cheio. Exclua conversas antigas para salvar novas.'); }
  }, [chats, ready]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [active, chats]);

  const current = chats.find(c => c.id === active);
  const messages = current?.messages ?? [];
  const selectedModel = LOCAL_MODELS.find(m => m.id === modelId) ?? LOCAL_MODELS[0];

  function newChat() {
    if (busy) return;
    setActive(null); setDraft(''); setError(''); setProgress(null); setMenu(false);
  }
  function openChat(id: string) {
    if (busy) return;
    setActive(id); setError(''); setProgress(null); setMenu(false);
  }
  function removeChat(id: string) {
    if (busy) return;
    setChats(prev => prev.filter(c => c.id !== id));
    if (active === id) setActive(null);
  }
  async function copyMessage(index: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(index);
    } catch { setError('Não foi possível copiar a mensagem.'); }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const id = active ?? crypto.randomUUID();
    const next: ChatTurn[] = [...messages, { role: 'user', content }];
    const controller = new AbortController();
    abortRef.current = controller;
    setActive(id);
    setChats(prev => prev.some(c => c.id === id)
      ? prev.map(c => c.id === id ? { ...c, messages: next } : c)
      : [{ id, title: content.slice(0, 50), messages: next }, ...prev]);
    setDraft(''); setBusy(true); setError(''); setCopied(null);
    setProgress({ text: 'Preparando a IA local...' });

    let reply = '';
    const showReply = () => setChats(prev => prev.map(c => c.id === id
      ? { ...c, messages: reply ? [...next, { role: 'assistant', content: reply }] : next }
      : c));
    try {
      await generateLocal({
        modelId, messages: next,
        signal: controller.signal,
        onProgress: setProgress,
        onDelta: part => {
          reply += part;
          showReply();
        },
      });
      if (!reply.trim()) throw Error('O modelo não gerou uma resposta. Tente novamente.');
    } catch (err) {
      if (controller.signal.aborted) setError('Geração interrompida.');
      else setError(err instanceof Error ? err.message : 'Falha ao iniciar IA local.');
    } finally {
      showReply();
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <main className="shell">
      {menu && <button className="overlay" aria-label="Fechar menu" onClick={() => setMenu(false)} />}
      <aside className={'sidebar' + (menu ? ' open' : '')}>
        <div className="brand">
          <div className="brandmark"><BrainCircuit size={22} /></div>
          <strong>REZ <span>A.I</span></strong>
          <button className="closeMenu" aria-label="Fechar menu" onClick={() => setMenu(false)}><X size={19} /></button>
        </div>
        <button className="new" onClick={newChat}><Plus size={17} /> Nova conversa</button>
        <div className="sectionLabel">CONVERSAS RECENTES</div>
        <nav className="history" aria-label="Histórico de conversas">
          {!chats.length
            ? <p className="emptyHistory">Suas conversas aparecerão aqui.</p>
            : chats.map(c => (
              <div key={c.id} className={'historyItem' + (active === c.id ? ' selected' : '')}>
                <button className="historyTitle" onClick={() => openChat(c.id)} title={c.title}>{c.title}</button>
                <button className="delete" aria-label={'Excluir ' + c.title} onClick={() => removeChat(c.id)}><Trash2 size={14} /></button>
              </div>
            ))}
        </nav>
        <div className="sidefoot">
          <span className="statusDot" /> REZ A.I <span>• Open Source</span>
          <p>Sem chave de API e sem cobranças por mensagem.</p>
          <p>As mensagens ficam neste navegador.</p>
        </div>
      </aside>
      <section className="main">
        <header>
          <div className="headerLeft">
            <button className="menu" onClick={() => setMenu(!menu)} aria-label="Alternar menu"><PanelLeft size={21} /></button>
            <div className="heading">Rez A.I <span>Seu espaço de inteligência local</span></div>
          </div>
          <div className="headerControls">
            <span className="localBadge"><Zap size={13} /> IA sem API paga</span>
            <button type="button" className="permissionsToggle" onClick={() => setShowPermissions(v => !v)} aria-expanded={showPermissions}>
              <ShieldCheck size={16} /> <span>Permissões</span>
            </button>
            <select aria-label="Modelo de IA local" value={modelId} disabled={busy}
              onChange={e => { setModelId(e.target.value); setError(''); setProgress(null); }}>
              {LOCAL_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </header>
        {showPermissions && <ToolApprovalDemo onClose={() => setShowPermissions(false)} />}
        <div className="modelNotice" role="status">
          <Cpu size={16} />
          <span><strong>{selectedModel.label}</strong> · {selectedModel.memory}. {selectedModel.description}
            {hasGpu === false && selectedModel.engine === 'webgpu' && ' WebGPU indisponível: escolha o modelo CPU.'}
          </span>
        </div>
        <div className="conversation">
          {messages.length === 0
            ? <div className="welcome">
              <div className="orb"><BrainCircuit size={36} /></div>
              <div className="eyebrow"><Sparkles size={13} /> INTELIGÊNCIA LIVRE · NO SEU DISPOSITIVO</div>
              <h1>O que vamos criar <em>hoje?</em></h1>
              <p>Converse com modelos abertos sem API paga. Na primeira utilização, o navegador baixa o modelo escolhido. O processamento acontece no seu dispositivo.</p>
              <div className="chips">
                <button onClick={() => setDraft('Me ajude a criar um projeto em Python')}>Criar com Python ↗</button>
                <button onClick={() => setDraft('Explique como funciona uma inteligência artificial')}>Explorar IA ↗</button>
              </div>
            </div>
            : <div className="messages">
              {messages.map((m, i) =>
                <div className={'message ' + m.role} key={i}>
                  <div className="avatar">{m.role === 'assistant' ? <Bot size={18} /> : <UserRound size={18} />}</div>
                  <div className="messageContent">
                    <div className="bubble">{m.content}</div>
                    {m.role === 'assistant' && (
                      <button type="button" className="copyMessage" onClick={() => void copyMessage(i, m.content)} aria-label="Copiar resposta">
                        {copied === i ? <Check size={14} /> : <Copy size={14} />} {copied === i ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>)}
              <div ref={bottomRef} />
            </div>}
        </div>
        {progress && <div className="localProgress" role="status" aria-live="polite">
          <Download size={16} />
          <span>{progress.text}{typeof progress.percent === 'number' ? ' (' + progress.percent + '%)' : ''}</span>
          {typeof progress.percent === 'number' && <progress max={100} value={progress.percent} aria-label="Progresso de carregamento" />}
        </div>}
        {error && <div className="error" role="alert">{error}</div>}
        <form onSubmit={send} className="composer">
          <textarea aria-label="Sua mensagem" placeholder="Pergunte à REZ A.I local..." value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            rows={2} />
          {busy
            ? <button className="stopButton" type="button" onClick={() => abortRef.current?.abort()} aria-label="Parar geração"><StopCircle size={20} /></button>
            : <button disabled={!draft.trim()} aria-label="Enviar mensagem"><Send size={19} /></button>}
        </form>
        <footer>Pesos baixados de fontes abertas. Sem cobrança por token. Modelos pequenos podem cometer erros.</footer>
      </section>
    </main>
  );
}
