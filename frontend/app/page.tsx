'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { BrainCircuit, Send, Plus, PanelLeft, Bot, UserRound, Sparkles, Trash2, X, ShieldCheck } from 'lucide-react';
import ToolApprovalDemo from './ToolApprovalDemo';
type Msg = {role:'user'|'assistant';content:string};
type Conversation = {id:string; title:string; messages:Msg[]};
const KEY='rez-ai-conversations-v1';
export default function Home(){
 const [chats,setChats]=useState<Conversation[]>([]);
 const [active,setActive]=useState<string|null>(null);
 const [ready,setReady]=useState(false);
 const [draft,setDraft]=useState('');
 const [provider,setProvider]=useState<'local'|'cloud'>('local');
 const [busy,setBusy]=useState(false);
 const [menu,setMenu]=useState(false);
 const [showPermissions,setShowPermissions]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))setChats(parsed.filter(c=>typeof c.id==='string'&&Array.isArray(c.messages)));}}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(chats))},[chats,ready]);
 const current=chats.find(c=>c.id===active);
 const messages=current?.messages??[];
 function newChat(){if(busy)return;setActive(null);setDraft('');setError('');setMenu(false)}
 function openChat(id:string){if(busy)return;setActive(id);setError('');setMenu(false)}
 function removeChat(id:string){if(busy)return;setChats(prev=>prev.filter(c=>c.id!==id));if(active===id)setActive(null)}
 async function send(e:FormEvent){e.preventDefault();const content=draft.trim();if(!content||busy)return;
  const id=active??crypto.randomUUID();const next:Msg[]=[...messages,{role:'user',content}];
  setActive(id);setChats(prev=>{const exists=prev.some(c=>c.id===id);return exists?prev.map(c=>c.id===id?{...c,messages:next}:c):[{id,title:content.slice(0,48),messages:next},...prev]});
  setDraft('');setBusy(true);setError('');
  try{const res=await fetch((process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000')+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,messages:next.slice(-30)})});
   const data=await res.json();if(!res.ok)throw Error(typeof data.detail==='string'?data.detail:'Erro no servidor');
   if(typeof data.reply!=='string')throw Error('Resposta inválida do servidor');
   setChats(prev=>prev.map(c=>c.id===id?{...c,messages:[...next,{role:'assistant',content:data.reply}]}:c));
  }catch(err){setError(err instanceof Error?err.message:'Falha de conexão. Verifique o backend.')}finally{setBusy(false)}
 }
 return <main className="shell">
  {menu&&<button className="overlay" aria-label="Fechar menu" onClick={()=>setMenu(false)}/>}
  <aside className={'sidebar'+(menu?' open':'')}>
   <div className="brand"><div className="brandmark"><BrainCircuit size={22}/></div><strong>REZ <span>A.I</span></strong><button className="closeMenu" aria-label="Fechar menu" onClick={()=>setMenu(false)}><X size={19}/></button></div>
   <button className="new" onClick={newChat}><Plus size={17}/> Nova conversa</button>
   <div className="sectionLabel">CONVERSAS RECENTES</div>
   <nav className="history" aria-label="Histórico de conversas">{chats.length===0?<p className="emptyHistory">Suas conversas aparecerão aqui.</p>:chats.map(c=><div key={c.id} className={'historyItem'+(active===c.id?' selected':'')}><button className="historyTitle" onClick={()=>openChat(c.id)} title={c.title}>{c.title}</button><button className="delete" aria-label={'Excluir '+c.title} onClick={()=>removeChat(c.id)}><Trash2 size={14}/></button></div>)}</nav>
   <div className="sidefoot"><span className="statusDot"/> REZ A.I <span>• versão 0.1</span><p>Histórico salvo neste navegador.</p></div>
  </aside>
  <section className="main">
   <header><div className="headerLeft"><button className="menu" onClick={()=>setMenu(!menu)} aria-label="Alternar menu"><PanelLeft size={21}/></button><div className="heading">Rez A.I <span>Seu espaço de inteligência</span></div></div><div className="headerControls"><button type="button" className="permissionsToggle" onClick={()=>setShowPermissions(v=>!v)} aria-expanded={showPermissions}><ShieldCheck size={16}/> <span>Permissões</span></button><select aria-label="Modelo de IA" value={provider} disabled={busy} onChange={e=>setProvider(e.target.value as 'local'|'cloud')}><option value="local">Local · Ollama</option><option value="cloud">Nuvem · API</option></select></div></header>
   {showPermissions&&<ToolApprovalDemo onClose={()=>setShowPermissions(false)}/>}
   <div className="conversation">{messages.length===0?<div className="welcome"><div className="orb"><BrainCircuit size={36}/></div><div className="eyebrow"><Sparkles size={13}/> INTELIGÊNCIA À SUA MANEIRA</div><h1>O que vamos criar <em>hoje?</em></h1><p>Explore ideias, desenvolva projetos e transforme perguntas em possibilidades com a Rez A.I.</p><div className="chips"><button onClick={()=>setDraft('Me ajude a criar um projeto em Python')}>Criar com Python ↗</button><button onClick={()=>setDraft('Explique como funciona um modelo de linguagem')}>Explorar inteligência artificial ↗</button></div></div>:<div className="messages">{messages.map((m,i)=><div className={'message '+m.role} key={i}><div className="avatar">{m.role==='assistant'?<Bot size={18}/>:<UserRound size={18}/>}</div><div className="bubble">{m.content}</div></div>)}{busy&&<div className="waiting"><span className="statusDot"/> Rez A.I está pensando...</div>}</div>}</div>
   {error&&<div className="error" role="alert">{error}</div>}
   <form onSubmit={send} className="composer"><textarea aria-label="Sua mensagem" placeholder="Envie uma mensagem para Rez A.I..." value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} rows={2}/><button disabled={!draft.trim()||busy} aria-label="Enviar mensagem"><Send size={19}/></button></form>
   <footer>Rez A.I pode cometer erros. Verifique informações importantes.</footer>
  </section>
 </main>
}
