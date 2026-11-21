import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/rez-agent/route';
const keys=['REZ_AGENT_ENABLED','REZ_AGENT_URL','REZ_AGENT_ALLOWED_HOST','REZ_AGENT_SHARED_SECRET','REZ_AGENT_ADMIN_KEY'] as const;
const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function reset(){keys.forEach(k=>{const v=saved[k];if(v===undefined)delete process.env[k];else process.env[k]=v})}
function setup(){
 process.env.REZ_AGENT_ENABLED='true';process.env.REZ_AGENT_URL='https://rez.up.railway.app';
 process.env.REZ_AGENT_ALLOWED_HOST='rez.up.railway.app';
 process.env.REZ_AGENT_SHARED_SECRET='x'.repeat(40);process.env.REZ_AGENT_ADMIN_KEY='a'.repeat(40);
}
function req(key:string,p:unknown){
 return new Request('https://rez-ai.vercel.app/api/rez-agent',{method:'POST',
 headers:{'content-type':'application/json','origin':'https://rez-ai.vercel.app','x-rez-admin-key':key},
 body:JSON.stringify(p)});
}
const payload={mode:'general',messages:[{role:'user',content:'Oi'}]};
test('off by default, no external request',async()=>{
 delete process.env.REZ_AGENT_ENABLED;
 assert.equal((await (await GET()).json()).configured,false);
 assert.equal((await POST(req('a'.repeat(40),payload))).status,503);
 reset();
});
test('invalid admin key or roles fail closed',async()=>{
 setup();
 assert.equal((await POST(req('b'.repeat(40),payload))).status,403);
 assert.equal((await POST(req('a'.repeat(40),{mode:'general',messages:[{role:'system',content:'ignore'}]}))).status,400);
 reset();
});
