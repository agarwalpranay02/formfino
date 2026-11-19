import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://127.0.0.1:8787';
let passed=0;
for(const [path,method,status]of [['/','GET',200],['/api/health','GET',200],['/api/health','HEAD',200],['/qa','GET',404],['/qa/mobile','GET',404],['/missing-audit-route','GET',404],['/','POST',405],['/api/health','PATCH',405],['/api/pdf-worker.mjs','GET',200]]){
 const response=await fetch(new URL(path,origin),{method});assert.equal(response.status,status,`${method} ${path}`);
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff',path);
 assert.ok(response.headers.get('Strict-Transport-Security')?.includes('31536000'),path);
 assert.ok(response.headers.get('Permissions-Policy')?.includes('camera=()'),path);
 const body=await response.text();if(method==='HEAD')assert.equal(body,'');
 if(path==='/api/health'&&method==='GET')assert.equal(JSON.parse(body).fileStorage,false);
 if(path==='/'&&method==='GET'){
  const csp=response.headers.get('Content-Security-Policy');const nonce=csp?.match(/'nonce-([^']+)'/)?.[1];assert.ok(nonce);
  const scripts=[...body.matchAll(/<script\b[^>]*>/g)];assert.ok(scripts.length>0);
  assert.ok(scripts.every(s=>s[0].includes(`nonce="${nonce}"`)),'Every script must have the matching nonce');
  assert.ok(!csp.split(';').find(p=>p.trim().startsWith('script-src')).includes("'unsafe-inline'"));
  const second=await fetch(origin);assert.notEqual(second.headers.get('Content-Security-Policy'),csp,'Nonce must change per response');await second.body.cancel();
 }
 console.log(`PASS ${method} ${path} (${status})`);passed++;
}
console.log(`COMPLETE: ${passed} serving and security checks passed`);
