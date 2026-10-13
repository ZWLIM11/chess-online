const PREFIX = 'arcane-chess-';
self.addEventListener('install',event=>{event.waitUntil((async()=>{const response=await fetch('/offline-assets.json',{cache:'no-store'});if(!response.ok)throw Error('Offline manifest unavailable');const manifest=await response.json();const cache=await caches.open(PREFIX+manifest.version);await cache.addAll(manifest.assets);await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/sw.js'||url.pathname==='/offline-assets.json')return;
 event.respondWith((async()=>{
  if(event.request.mode==='navigate'){
   try{return await fetch(event.request);}catch{return await caches.match('/')||new Response('Open Arcane Chess once while online to enable offline play.',{status:503});}
  }
  const cached=await caches.match(event.request);if(cached)return cached;
  return fetch(event.request);
 })());
});
