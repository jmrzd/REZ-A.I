import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {DeepSeekHarness} from '@deepseek-ai/dsh-sdk-client';
import {authorized,validPayload,promptFromTurns} from './guard.mjs';

const secret=process.env.REZ_AGENT_SHARED_SECRET||'', modelKey=process.env.DEEPSEEK_API_KEY||'';
if(secret.length<32){console.error('REZ Agent: configure segredo do servidor.');process.exit(1)}
const dir=dirname(fileURLToPath(import.meta.url));
const agent=new DeepSeekHarness({
 profile:'sdk',provider:'deepseek-official',model:'deepseek-v4-flash',
 patches:[join(dir,'restricted.yml')],dshHome:process.env.DSH_HOME||join(dir,'data'),
 cwd:join(dir,'work'),processCwd:join(dir,'work'),maxTokens:1200,requestTimeoutMs:90000,
 env:{NODE_ENV:'production',HOME:'/srv/rez',PATH:process.env.PATH||'/usr/local/bin:/usr/bin:/bin',
 DSH_PERMISSION_MODE:'read-only',DSH_TELEMETRY_DISABLED:'1',
 ...(modelKey?{DEEPSEEK_API_KEY:modelKey}:{})}
});
let busy=false;
const rate=[];
function json(res,status,payload){
 const data=JSON.stringify(payload);
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff','content-length':Buffer.byteLength(data)});
 res.end(data);
}
async function run(req,res){
 if(req.method==='GET'&&req.url==='/health')
   return json(res,200,{service:'REZ A.I',online:true,modelConfigured:!!modelKey});
 if(req.method!=='POST'||req.url!=='/internal/respond')return json(res,404,{error:'Rota indisponível.'});
 if(!authorized(req.headers.authorization,secret))return json(res,401,{error:'Não autorizado.'});
 if(!modelKey)return json(res,503,{error:'Modelo não configurado.'});
 if(busy)return json(res,429,{error:'Serviço ocupado.'});
 const now=Date.now();
 while(rate.length&&rate[0]<now-60000)rate.shift();
 if(rate.length>=6)return json(res,429,{error:'Limite de uso temporário.'});
 let size=0;const chunks=[];
 for await(const chunk of req){
   size+=chunk.length;if(size>18000)return json(res,413,{error:'Mensagem grande demais.'});
   chunks.push(chunk);
 }
 let body;
 try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}
 catch{return json(res,400,{error:'JSON inválido.'})}
 if(!validPayload(body))return json(res,400,{error:'Mensagens inválidas.'});
 rate.push(now);busy=true;
 try{
   const result=await agent.run(promptFromTurns(body));
   if(!result.finalResponse?.trim()||result.finishReason==='error')
     return json(res,502,{error:'Sem resposta do modelo.'});
   return json(res,200,{text:result.finalResponse.slice(0,18000)});
 }catch{
   console.error('REZ Agent: falha na geração, sem registrar dados de conversa.');
   return json(res,503,{error:'REZ Avançado indisponível.'});
 }finally{busy=false}
}
const srv=createServer((req,res)=>void run(req,res).catch(()=>
 {if(!res.headersSent)json(res,500,{error:'Falha no servidor.'});else res.end()}));
const port=Number(process.env.PORT||'3080');
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT inválida');
srv.listen(port,'0.0.0.0',()=>console.log('REZ Avançado: serviço iniciado.'));
const stop=()=>{srv.close();void agent.close().finally(()=>process.exit(0));setTimeout(()=>process.exit(1),9000).unref()};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
