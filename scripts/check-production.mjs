import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8787';
const home=await fetch(base);
assert.equal(home.status,200,'Home page must render');
assert.equal(home.headers.get('x-content-type-options'),'nosniff');
assert.ok(home.headers.get('content-security-policy')?.includes("object-src 'none'"),'CSP must block plugin content');
assert.ok(home.headers.get('strict-transport-security')?.includes('max-age='));
const html = await home.text();
assert.ok(html.includes('FormFino'));
assert.ok(html.includes('Get your files'));
assert.ok(!html.includes('Exam specifications'));
for(const name of ['source-sans-3-latin-v20.woff2','spectral-latin-italic-v15.woff2']) {
 const font=await fetch(new URL('/fonts/'+name,base));assert.equal(font.status,200);
 const bytes=Buffer.from(await font.arrayBuffer());assert.equal(bytes.toString('ascii',0,4),'wOF2');
}

assert.ok(html.includes('mailto:formfino@gmail.com'));
const contact = await fetch(new URL('/.well-known/security.txt', base));
assert.equal(contact.status, 200);
assert.ok((await contact.text()).includes('Contact: mailto:formfino@gmail.com'));
const health=await fetch(`${base}/api/health`);
assert.equal(health.status,200);assert.equal((await health.json()).fileStorage,false);
const post=await fetch(base,{method:'POST',body:'test'});assert.equal(post.status,405,'Write requests must be rejected');
for(const path of ['/qa','/qa/mobile'])assert.equal((await fetch(base+path)).status,404,'Development QA routes must be inaccessible');
for(const path of ['/api/pdf-worker.mjs','/vendor/ocr/worker.min.js','/vendor/ocr/eng.traineddata.gz','/THIRD_PARTY_NOTICES.txt']){
 const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,`Missing asset ${path}`);assert.ok((await r.arrayBuffer()).byteLength>0,`Empty asset ${path}`);
}
console.log('PASS production HTML, CSP, HSTS, nosniff, health, method restrictions, disabled QA routes, and local processing assets.');
assert.ok(html.includes('/manifest.webmanifest'));
assert.ok(html.includes('/icons/apple-touch-icon.png'));
const manifest=await(await fetch(base+'/manifest.webmanifest')).json();
assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
for(const icon of manifest.icons){const response=await fetch(base+icon.src);assert.equal(response.status,200);const data=Buffer.from(await response.arrayBuffer());assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`,icon.sizes)}
const worker=await fetch(base+'/sw.js');assert.equal(worker.status,200);assert.equal(worker.headers.get('service-worker-allowed'),'/');assert.equal(worker.headers.get('cache-control'),'no-cache');assert.match(worker.headers.get('content-type')||'',/javascript/);
assert.equal((await fetch(base+'/offline.html')).status,200);
console.log('PASS install manifest, icon dimensions, Apple metadata, service worker scope and offline page.');
