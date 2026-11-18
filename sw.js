// Cache privata per questa applicazione e per il suo percorso di pubblicazione.
const VERSION = "4.9.18-clean-studio";
const FRAME_VERSION = "4.9.17-a4-personal";
const SCOPE = self.registration.scope;
const PREFIX = `k9-template-studio|${SCOPE}|`;
const CACHE = `${PREFIX}${VERSION}`;
const urlFor = path => new URL(path,SCOPE).href;
const versioned = path => `${path}?v=${VERSION}`;
const FILES = ["./", "./index.html", versioned("./css/style.css"), versioned("./js/app.js"), "./js/realistic-backgrounds.js?v=4.9.4", `./js/premium-frames.js?v=${FRAME_VERSION}`, versioned("./js/pdf-vector.js"), "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].map(urlFor);
const KNOWN = new Set(FILES);
const A4_BLOCKS = new Set(["frames-detection-a4-01.js","frames-detection-a4-02.js","frames-detection-a4-03.js","frames-detection-a4-04.js","frames-hrdd-a4-01.js","frames-hrdd-a4-02.js","frames-mantrailing-a4-01.js","frames-mantrailing-a4-02.js","frames-mantrailing-a4-03.js"].map(name=>urlFor(`${name}?v=${FRAME_VERSION}`)));
const NAV = new Set([urlFor("./"),urlFor("./index.html")]);
self.addEventListener("install", event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try {
    await cache.addAll(FILES.map(url=>new Request(url,{cache:"reload"})));
    // Non attivare una release pubblicata solo in parte.
    for (const address of NAV) {
      const html=await (await cache.match(address)).text();
      if (!html.includes(`js/app.js?v=${VERSION}`) || !html.includes(`css/style.css?v=${VERSION}`) || !html.includes(`js/pdf-vector.js?v=${VERSION}`) || !html.includes(`js/premium-frames.js?v=${FRAME_VERSION}`) || !html.includes(`js/realistic-backgrounds.js?v=4.9.4`)) throw new Error("HTML non aggiornato");
    }
    const app=await (await cache.match(urlFor(versioned("./js/app.js")))).text();
    if (!app.includes(`const STUDIO_VERSION = "${VERSION}";`)) throw new Error("JavaScript non aggiornato");
    const frames=await (await cache.match(urlFor(`./js/premium-frames.js?v=${FRAME_VERSION}`))).text();
    if(!frames.includes(`K9_FRAME_VERSION = "${FRAME_VERSION}"`) || (frames.match(/"src":"data:image\//g)||[]).length!==260)throw new Error("Archivio cornici Ultra incompleto");
    if ((frames.match(/"a4Block":/g)||[]).length!==43) throw new Error("Archivio cornici A4 incompleto");
    const photos=await (await cache.match(urlFor("./js/realistic-backgrounds.js?v=4.9.4"))).text();
    if(!photos.includes(`K9_REALISTIC_VERSION = "4.9.4";`) || (photos.match(/data:image\/jpeg;base64,/g)||[]).length!==120) throw new Error("Archivio fondali incompleto");
  } catch(error) {await caches.delete(CACHE);throw error;}
  // Attivazione dopo precache completo; nessun reload automatico di pagine con modifiche.
  await self.skipWaiting();
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
  // Non toccare le cache di altre app, IndexedDB o localStorage.
  await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);url.hash="";
  const canonical=new URL(url.href);canonical.search="";
  const key=event.request.mode==="navigate" && NAV.has(canonical.href)?canonical.href:url.href;
  const frameAsset = A4_BLOCKS.has(url.href);
  if(!KNOWN.has(key)&&!frameAsset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const saved=await cache.match(key);
    if(saved)return saved;
    const response=await fetch(event.request);
    if(frameAsset&&response.ok&&/javascript|ecmascript/i.test(response.headers.get("content-type")||"")){
      try{await cache.put(key,response.clone());}catch(error){console.warn("Cache cornice non disponibile",error);}
    }
    return response;
  })());
});
