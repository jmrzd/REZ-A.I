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
  const [modelId, setModelId] = useState('turbo');
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
  const turbo = modelId === 'turbo';
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
    setProgress({ text: turbo ? 'Conectando à REZ Turbo na nuvem...' : 'Preparando a IA local...' });

    let reply = '';
    const showReply = () => setChats(prev => prev.map(c => c.id === id
      ? { ...c, messages: reply ? [...next, { role: 'assistant', content: reply }] : next }
      : c));
    try {
      if (turbo) {
        // Lightweight network streaming: no model weights downloaded to the device.
        const res = await fetch('/api/chat/turbo', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: next.slice(-12).map(m => ({
              role: m.role,
              content: m.content.slice(0, 3000),
            })),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message = typeof body.error === 'string'
            ? body.error : 'A nuvem gratuita está indisponível no momento.';
          throw Error(message);
        }
        if (!res.body) throw Error('Streaming não disponível neste navegador.');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completed = false;
        const consumeFrame = (raw: string) => {
          const line = raw.split('\n').find(l => l.startsWith('data:'));
          if (!line) return;
          const message = JSON.parse(line.slice(5).trim()) as {
            type?: string; content?: string; message?: string;
          };
          if (message.type === 'error')
            throw Error(message.message || 'Falha no provedor gratuito.');
          if (message.type === 'done') { completed = true; return; }
          if (message.type === 'delta' && typeof message.content === 'string') {
            setProgress(null);
            reply += message.content;
            showReply();
          }
        };
        try {
          while (!completed) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              consumeFrame(buffer.slice(0, boundary));
              buffer = buffer.slice(boundary + 2);
              boundary = buffer.indexOf('\n\n');
            }
          }
          buffer += decoder.decode();
          if (buffer.trim() && !completed) consumeFrame(buffer);
        } finally {
          await reader.cancel().catch(() => undefined);
        }
        if (!completed) throw Error('A conexão com a IA foi interrompida antes de terminar.');
      } else {
        await generateLocal({
          modelId, messages: next,
          signal: controller.signal,
          onProgress: setProgress,
          onDelta: part => { reply += part; showReply(); },
        });
      }
      if (!reply.trim()) throw Error('Nenhuma resposta recebida. Verifique a nuvem gratuita ou selecione um modelo local.');
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
          <p>Turbo: modelo hospedado com preço zero anunciado, sujeito a limites.</p>
          <p>Histórico salvo no navegador; mensagens Turbo são enviadas à NVIDIA.</p>
        </div>
      </aside>
      <section className="main">
        <header>
          <div className="headerLeft">
            <button className="menu" onClick={() => setMenu(!menu)} aria-label="Alternar menu"><PanelLeft size={21} /></button>
            <div className="heading">Rez A.I <span>{turbo ? "Seu espaço de inteligência na nuvem" : "Seu espaço de inteligência local"}</span></div>
          </div>
          <div className="headerControls">
            <span className="localBadge"><Zap size={13} /> {turbo ? "Turbo · sem downloads" : "Modo local"}</span>
            <button type="button" className="permissionsToggle" onClick={() => setShowPermissions(v => !v)} aria-expanded={showPermissions}>
              <ShieldCheck size={16} /> <span>Permissões</span>
            </button>
            <select aria-label="Modelo de IA" value={modelId} disabled={busy}
              onChange={e => { setModelId(e.target.value); setError(''); setProgress(null); }}>
              <option value="turbo">REZ Turbo · Nemotron 30B (Nuvem)</option>
              {LOCAL_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </header>
        {showPermissions && <ToolApprovalDemo onClose={() => setShowPermissions(false)} />}
        <div className="modelNotice" role="status">
          {turbo ? <Zap size={16} /> : <Cpu size={16} />}
          {turbo
            ? <span><strong>REZ Turbo · NVIDIA Nemotron 3.5 Lightning</strong> — modelo aberto de 30B executado na nuvem, sem baixar pesos ou exigir GPU. Oferta atualmente gratuita e sujeita a limites. Ao enviar, suas mensagens vão ao provedor NVIDIA, que pode retê-las para melhorias. Evite dados confidenciais.</span>
            : <span><strong>{selectedModel.label}</strong> · {selectedModel.memory}. {selectedModel.description}
              {hasGpu === false && selectedModel.engine === 'webgpu' && ' WebGPU indisponível: escolha o modelo CPU.'}
            </span>}
        </div>
        <div className="conversation">
          {messages.length === 0
            ? <div className="welcome">
              <div className="orb"><BrainCircuit size={36} /></div>
              <div className="eyebrow"><Sparkles size={13} /> {turbo ? "INTELIGÊNCIA RÁPIDA · SEM DOWNLOADS" : "INTELIGÊNCIA LIVRE · NO SEU DISPOSITIVO"}</div>
              <h1>O que vamos criar <em>hoje?</em></h1>
              <p>{turbo ? "Converse com um modelo aberto de 30 bilhões de parâmetros na nuvem. Sem downloads pesados ou GPU no seu PC. O serviço é oferecido gratuitamente no momento, sujeito a limites." : "Converse com modelos abertos no seu dispositivo. Na primeira utilização, o navegador precisa baixar os pesos do modelo escolhido."}</p>
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
          <textarea aria-label="Sua mensagem" placeholder={turbo ? "Pergunte à REZ Turbo..." : "Pergunte à REZ A.I local..."} value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            rows={2} />
          {busy
            ? <button className="stopButton" type="button" onClick={() => abortRef.current?.abort()} aria-label="Parar geração"><StopCircle size={20} /></button>
            : <button disabled={!draft.trim()} aria-label="Enviar mensagem"><Send size={19} /></button>}
        </form>
        <footer>{turbo ? "Modelo hospedado pela NVIDIA via Vercel. A promoção gratuita pode mudar; não envie dados confidenciais." : "Pesos baixados de fontes abertas. Sem cobrança por token. Modelos pequenos podem cometer erros."}</footer>
      </section>
    </main>
  );
}
