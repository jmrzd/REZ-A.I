import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const HEADERS = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

function secretEquals(a: string | null, b: string): boolean {
 if(!a||a.length<32||a.length>256||b.length<32)return false;
 const x=Buffer.from(a), y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
function config():{url:string;shared:string;admin:string}|null {
 if(process.env.REZ_AGENT_ENABLED!=='true')return null;
 const origin=process.env.REZ_AGENT_URL,hostname=process.env.REZ_AGENT_ALLOWED_HOST;
 const shared=process.env.REZ_AGENT_SHARED_SECRET||'',admin=process.env.REZ_AGENT_ADMIN_KEY||'';
 if(!origin||!hostname||shared.length<32||admin.length<32||shared===admin)return null;
 try {
  const url=new URL(origin);
  if(url.protocol!=='https:'||url.hostname!==hostname||url.pathname!=='/'||
     url.search||url.hash||url.username||url.password||(url.port&&url.port!=='443'))return null;
  return {url:url.origin+'/internal/respond',shared,admin};
 }catch{return null}
}
function fail(status:number,error:string){return Response.json({error},{status,headers:HEADERS})}
export async function GET(){
 return Response.json({configured:config()!==null,engine:'REZ Avançado'},{headers:HEADERS});
}
export async function POST(request:Request):Promise<Response> {
 const c=config();
 if(!c)return fail(503,'REZ Avançado não configurado.');
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site' ||
    (origin&&origin!==new URL(request.url).origin))return fail(403,'Origem inválida.');
 if(!secretEquals(request.headers.get('x-rez-admin-key'),c.admin))
   return fail(403,'Chave de administrador inválida.');
 if(Number(request.headers.get('content-length')||0)>18000)return fail(413,'Mensagem grande demais.');
 let body:unknown;
 try{
   const raw=await request.text();if(raw.length>18000)return fail(413,'Mensagem grande demais.');
   body=JSON.parse(raw);
 }catch{return fail(400,'JSON inválido.')}
 if(!body||typeof body!=='object'||Array.isArray(body))return fail(400,'Formato inválido.');
 const mode=(body as {mode?:unknown}).mode;
 const messages=(body as {messages?:unknown}).messages;
 if(!['general','study','code','summary'].includes(String(mode))||
    !Array.isArray(messages)||messages.length<1||messages.length>10||
    !messages.every(m=>m&&typeof m==='object'&&!Array.isArray(m)&&
      (m.role==='user'||m.role==='assistant')&&typeof m.content==='string'&&
      m.content.trim()&&m.content.length<=2500)||messages.at(-1).role!=='user')
   return fail(400,'Mensagens inválidas.');
 let remote:Response;
 try{
  remote=await fetch(c.url,{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.shared},
   body:JSON.stringify({mode,messages}),cache:'no-store',
   signal:AbortSignal.any([request.signal,AbortSignal.timeout(95000)]),
  });
 }catch{return fail(502,'O servidor da REZ não respondeu.')}
 if(!remote.ok)return fail(remote.status===429?429:503,
  remote.status===429?'O servidor está ocupado.':'REZ Avançado temporariamente indisponível.');
 try{
  const result:unknown=await remote.json();
  if(!result||typeof result!=='object'||!('text'in result)||
     typeof result.text!=='string'||!result.text.trim()||result.text.length>18000)
    return fail(502,'Resposta inválida do servidor.');
  return Response.json({text:result.text},{headers:HEADERS});
 }catch{return fail(502,'Resposta inválida do servidor.')}
}
