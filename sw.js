// Cache privata per questa applicazione e per il suo percorso di pubblicazione.
const SCOPE = self.registration.scope;
const PREFIX = `k9-template-studio|${SCOPE}|`;
const CACHE = `${PREFIX}4.7.2`;
const FILES = ["./", "./index.html", "./css/style.css", "./js/app.js", "./js/pdf-vector.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].map(path=>new URL(path,SCOPE).href);
const KNOWN = new Set(FILES);
self.addEventListener("install", event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(FILES.map(url=>new Request(url,{cache:"reload"})));}
  catch(error){await caches.delete(CACHE);throw error;}
  // Non forzare l'attivazione mentre una pagina della versione precedente è aperta.
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
  // Le cache storiche generiche non vengono eliminate: possono appartenere ad altre app.
})()));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url),canonical=new URL(url.href);canonical.search="";canonical.hash="";
  if(!KNOWN.has(canonical.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const saved=await cache.match(canonical.href);
    if(saved)return saved;
    // Se la cache è stata svuotata, non mescolare asset di versioni diverse in una nuova cache.
    return fetch(event.request);
  })());
});
