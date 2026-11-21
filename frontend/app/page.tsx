'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BrainCircuit, Send, Plus, PanelLeft, Bot, UserRound, Sparkles, Trash2, X, ShieldCheck, StopCircle } from 'lucide-react';
import ToolApprovalDemo from './ToolApprovalDemo';
type Msg = {role:'user'|'assistant';content:string;reasoning_content?:string};
type Conversation = {id:string; title:string; messages:Msg[]};
const KEY='rez-ai-conversations-v1';
export default function Home(){
 const [chats,setChats]=useState<Conversation[]>([]);
 const [active,setActive]=useState<string|null>(null);
 const [ready,setReady]=useState(false);
 const [draft,setDraft]=useState('');
 const [provider,setProvider]=useState<'local'|'cloud'|'kimi'>('kimi');
 const [effort,setEffort]=useState<'low'|'high'|'max'>('high');
 const abortRef=useRef<AbortController|null>(null);
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
 async function send(e:FormEvent){
  e.preventDefault();
  const content=draft.trim();
  if(!content||busy)return;
  const id=active??crypto.randomUUID();
  const next:Msg[]=[...messages,{role:'user',content}];
  const controller=new AbortController();
  abortRef.current=controller;
  setActive(id);
  setChats(prev=>{
   const exists=prev.some(c=>c.id===id);
   return exists?prev.map(c=>c.id===id?{...c,messages:next}:c):
    [{id,title:content.slice(0,48),messages:next},...prev];
  });
  setDraft('');setBusy(true);setError('');
  let reply='';let reasoning='';let completed=false;
  const renderPartial=()=>{
   setChats(prev=>prev.map(c=>c.id===id?{
    ...c,messages:reply?[...next,{role:'assistant',content:reply,reasoning_content:reasoning||undefined}]:next
   }:c));
  };
  const readFrame=(frame:string)=>{
   const dataLine=frame.split('\n').find(line=>line.startsWith('data:'));
   if(!dataLine)return;
   const event=JSON.parse(dataLine.slice(5).trim()) as {type:string;content?:string;message?:string};
   if(event.type==='error')throw Error(event.message||'Falha do modelo');
   if(event.type==='done'){completed=true;return;}
   if(event.type==='reasoning'&&typeof event.content==='string'){
    reasoning+=event.content;
    if(reply)renderPartial();
   }
   if(event.type==='delta'&&typeof event.content==='string'){
    reply+=event.content;renderPartial();
   }
  };
  try{
   const url=(process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000')+'/chat/stream';
   const res=await fetch(url,{
    method:'POST',signal:controller.signal,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({provider,reasoning_effort:effort,messages:next.slice(-30)})
   });
   if(!res.ok){
    const data=await res.json().catch(()=>({}));
    throw Error(typeof data.detail==='string'?data.detail:'Erro na API REZ');
   }
   if(!res.body)throw Error('Streaming não disponível neste navegador.');
   const reader=res.body.getReader();
   const decoder=new TextDecoder();
   let buffer='';
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');
    let boundary=buffer.indexOf('\n\n');
    while(boundary!==-1){
     readFrame(buffer.slice(0,boundary));
     buffer=buffer.slice(boundary+2);
     boundary=buffer.indexOf('\n\n');
    }
   }
   buffer+=decoder.decode();
   if(buffer.trim())readFrame(buffer);
   if(!completed)throw Error('Conexão interrompida antes do fim da resposta.');
   if(!reply)throw Error('O modelo não retornou texto.');
   renderPartial();
  }catch(err){
   if(controller.signal.aborted)setError('Geração interrompida.');
   else setError(err instanceof Error?err.message:'Falha de conexão. Verifique o backend.');
  }finally{
   if(abortRef.current===controller)abortRef.current=null;
   setBusy(false);
  }
 }
 function stop(){abortRef.current?.abort();}

 return <main className="shell">
  {menu&&<button className="overlay" aria-label="Fechar menu" onClick={()=>setMenu(false)}/>}
  <aside className={'sidebar'+(menu?' open':'')}>
   <div className="brand"><div className="brandmark"><BrainCircuit size={22}/></div><strong>REZ <span>A.I</span></strong><button className="closeMenu" aria-label="Fechar menu" onClick={()=>setMenu(false)}><X size={19}/></button></div>
   <button className="new" onClick={newChat}><Plus size={17}/> Nova conversa</button>
   <div className="sectionLabel">CONVERSAS RECENTES</div>
   <nav className="history" aria-label="Histórico de conversas">{chats.length===0?<p className="emptyHistory">Suas conversas aparecerão aqui.</p>:chats.map(c=><div key={c.id} className={'historyItem'+(active===c.id?' selected':'')}><button className="historyTitle" onClick={()=>openChat(c.id)} title={c.title}>{c.title}</button><button className="delete" aria-label={'Excluir '+c.title} onClick={()=>removeChat(c.id)}><Trash2 size={14}/></button></div>)}</nav>
   <div className="sidefoot"><span className="statusDot"/> REZ A.I <span>• Fase 1 Kimi K3</span><p>Histórico salvo neste navegador.</p></div>
  </aside>
  <section className="main">
   <header><div className="headerLeft"><button className="menu" onClick={()=>setMenu(!menu)} aria-label="Alternar menu"><PanelLeft size={21}/></button><div className="heading">Rez A.I <span>Seu espaço de inteligência</span></div></div><div className="headerControls"><button type="button" className="permissionsToggle" onClick={()=>setShowPermissions(v=>!v)} aria-expanded={showPermissions}><ShieldCheck size={16}/> <span>Permissões</span></button><select aria-label="Modelo de IA" value={provider} disabled={busy} onChange={e=>setProvider(e.target.value as 'local'|'cloud'|'kimi')}><option value="kimi">Kimi K3 · Nuvem</option><option value="local">Ollama · Local</option><option value="cloud">OpenAI · Nuvem</option></select>{provider==='kimi'&&<select aria-label="Esforço de raciocínio do Kimi" value={effort} disabled={busy} onChange={e=>setEffort(e.target.value as 'low'|'high'|'max')}><option value="low">Raciocínio · Low</option><option value="high">Raciocínio · High</option><option value="max">Raciocínio · Max</option></select>}</div></header>
   {showPermissions&&<ToolApprovalDemo onClose={()=>setShowPermissions(false)}/>}
   <div className="conversation">{messages.length===0?<div className="welcome"><div className="orb"><BrainCircuit size={36}/></div><div className="eyebrow"><Sparkles size={13}/> INTELIGÊNCIA À SUA MANEIRA</div><h1>O que vamos criar <em>hoje?</em></h1><p>Explore ideias, desenvolva projetos e transforme perguntas em possibilidades com a Rez A.I.</p><div className="chips"><button onClick={()=>setDraft('Me ajude a criar um projeto em Python')}>Criar com Python ↗</button><button onClick={()=>setDraft('Explique como funciona um modelo de linguagem')}>Explorar inteligência artificial ↗</button></div></div>:<div className="messages">{messages.map((m,i)=><div className={'message '+m.role} key={i}><div className="avatar">{m.role==='assistant'?<Bot size={18}/>:<UserRound size={18}/>}</div><div className="bubble">{m.content}</div></div>)}{busy&&<div className="waiting"><span className="statusDot"/> Rez A.I está pensando...</div>}</div>}</div>
   {error&&<div className="error" role="alert">{error}</div>}
   <form onSubmit={send} className="composer"><textarea aria-label="Sua mensagem" placeholder="Envie uma mensagem para Rez A.I..." value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} rows={2}/>{busy?<button className="stopButton" type="button" onClick={stop} aria-label="Parar geração"><StopCircle size={20}/></button>:<button disabled={!draft.trim()} aria-label="Enviar mensagem"><Send size={19}/></button>}</form>
   <footer>Rez A.I pode cometer erros. Verifique informações importantes.</footer>
  </section>
 </main>
}
