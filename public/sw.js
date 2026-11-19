/* Cache only this public offline page. Never cache documents, analytics or app HTML. */
const CACHE='formfino-offline-v1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('formfino-offline-')&&key!==CACHE).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).catch(async()=>{
    return await caches.match('/offline.html') || new Response('Connect to the internet to open FormFino.',{status:503,headers:{'Content-Type':'text/plain'}});
  }));
});
