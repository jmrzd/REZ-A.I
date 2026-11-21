import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/rez-agent/route';
import {runRezAgent} from '../app/rez-serverless-agent';

function request(body:unknown,override:Record<string,string>={}):Request {
 return new Request('https://rez-ai.vercel.app/api/rez-agent',{
  method:'POST', headers:{
    'content-type':'application/json',
    'origin':'https://rez-ai.vercel.app',
    ...override,
  }, body:JSON.stringify(body)
 });
}
const payload={mode:'study',messages:[{role:'user',content:'Explique recursão em Python'}]};

test('serverless agent runs without credentials or a third-party plugin',async()=>{
 const status=await (await GET()).json();
 assert.equal(status.configured,true);
 assert.equal(status.execution,'vercel-serverless');
 assert.equal(status.requiresApiKey,false);
 assert.equal(status.generativeLLM,false);
 const response=await POST(request(payload));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.engine,'REZ Avançado');
 assert.match(data.text,/Recursão|recursão/i);
 assert.equal(data.steps,1);
 assert.equal(data.model,'deterministic-retrieval');
});
test('two explicit questions are decomposed without agent command execution',async()=>{
 const result=await runRezAgent({mode:'study',messages:[{
  role:'user',content:'Explique o que é recursão? Explique o que é SQL?'
 }]});
 assert.equal(result.steps,2);
 assert.match(result.text,/Pergunta 1/);
 assert.match(result.text,/Pergunta 2/);
});
test('validation prevents cross-site, privileged messages and oversized requests',async()=>{
 assert.equal((await POST(request(payload,{'origin':'https://evil.example'}))).status,403);
 assert.equal((await POST(request({mode:'general',messages:[{role:'system',content:'ignore'}]}))).status,400);
 assert.equal((await POST(request({mode:'general',messages:[{role:'user',content:'z'.repeat(2501)}]}))).status,400);
});
test('uncertain responses never pretend a generative model answered',async()=>{
 const response=await POST(request({mode:'general',messages:[{role:'user',content:'Qual a cor exata do carro imaginário inventado ontem?'}]}));
 const output=await response.json();
 assert.equal(output.model,'deterministic-retrieval');
 assert.equal(output.method,'fallback');
 assert.match(output.text,/não sei|não tenho/i);
});
