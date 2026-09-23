// Service worker do Pixel Nova. Gerado no build (vite.config.ts troca os placeholders):
// pré-cacheia TODOS os arquivos na instalação, para o jogo abrir offline já depois da primeira visita.
const VERSION = '59edf80eff';
const CACHE = `pixelnova-${VERSION}`;
const PRECACHE = ["./","assets/index-Y1Rz05dL.js","apple-touch-icon.png","icon-192.png","icon-512.png","manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // versões antigas do jogo saem do cache
      for (const k of await caches.keys()) if (k.startsWith('pixelnova-') && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // a checagem de versão sempre vai à rede
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (req.mode === 'navigate') {
        // página: rede primeiro (pega versões novas), cache como reserva offline
        try {
          const res = await fetch(req);
          if (res.ok) cache.put('./', res.clone());
          return res;
        } catch {
          return (await cache.match('./', { ignoreVary: true })) ?? Response.error();
        }
      }
      // assets têm hash no nome: cache primeiro
      // ignoreVary: o <script type="module" crossorigin> pede com cabeçalhos diferentes dos do pré-cache;
      // sem isso, um servidor que responde "Vary: Origin" faz a busca falhar e o jogo não abre offline
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })(),
  );
});
