/**
 * REZ Avançado · serverless engine on the existing Vercel site.
 * Keeps the previous REZ Native/Cloudflare/local modes untouched.
 * No additional server, paid model, plugin, token or install required.
 *
 * Keep Vercel Authentication enabled; this function consumes hosting quotas.
 */
import {runRezAgent, type AgentRequest} from '../../rez-serverless-agent';
import type {NativeMode, NativeTurn} from '../../rez-native-core';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const HEADERS = {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
const MAX_BODY = 15000;
const MODES: NativeMode[] = ['general','study','code','summary'];
const fail = (code:number,error:string) => Response.json({error},{status:code,headers:HEADERS});

export async function GET():Promise<Response> {
  return Response.json({
    configured:true,
    online:true,
    engine:'REZ Avançado',
    execution:'vercel-serverless',
    generativeLLM:false,
    externalAI:false,
    requiresApiKey:false,
    usesVisitorGPU:false,
  },{headers:HEADERS});
}

export async function POST(request:Request):Promise<Response> {
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site' ||
    (origin && origin!==new URL(request.url).origin))
    return fail(403,'Origem não autorizada.');
  if(Number(request.headers.get('content-length')||'0')>MAX_BODY)
    return fail(413,'Mensagem muito grande.');
  let data:unknown;
  try {
    const raw=await request.text();
    if(raw.length>MAX_BODY) return fail(413,'Mensagem muito grande.');
    data=JSON.parse(raw);
  } catch {return fail(400,'JSON inválido.');}
  if(!data || typeof data!=='object' || Array.isArray(data))
    return fail(400,'Formato inválido.');
  const body=data as Record<string,unknown>;
  const mode=body.mode??'general',messages=body.messages,context=body.documentContext??'';
  if(!MODES.includes(mode as NativeMode) || !Array.isArray(messages) ||
    messages.length<1 || messages.length>12 ||
    !messages.every(row=>row && typeof row==='object' && !Array.isArray(row) &&
      (row.role==='user'||row.role==='assistant') && typeof row.content==='string' &&
      row.content.trim().length>0 && row.content.length<=2500) ||
    messages.at(-1).role!=='user' || typeof context!=='string' || context.length>1800)
    return fail(400,'Mensagens inválidas.');
  try {
    const result=await runRezAgent({
      mode: mode as NativeMode,
      messages: messages as NativeTurn[],
      documentContext: context,
      allowPublicResearch: body.allowPublicResearch===true,
    } satisfies AgentRequest,request.signal);
    return Response.json(result,{headers:HEADERS});
  } catch {
    return fail(503,'A REZ não concluiu a análise desta pergunta.');
  }
}
