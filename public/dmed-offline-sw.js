const SHELL = 'dmed-offline-shell-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(SHELL).then(cache => cache.add('/offline.html')).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
function clientPath(path) { return path === '/nazarov' || path === '/materials' || path.startsWith('/m/') || path.startsWith('/b/'); }
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/offline-media/')) {
    event.respondWith((async () => {
      const cache = await caches.open('dmed-offline-media-v1');
      const response = await cache.match(url.pathname);
      if (!response) return new Response('Not downloaded', {status:404});
      const range = request.headers.get('range');
      if (!range) return response;
      const blob = await response.blob(), match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${blob.size}`}});
      const start = match[1] ? Number(match[1]) : Math.max(0, blob.size-Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]),blob.size-1) : blob.size-1;
      if (start > end || start >= blob.size) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${blob.size}`}});
      return new Response(blob.slice(start,end+1),{status:206,headers:{'Content-Type':response.headers.get('content-type')||'application/octet-stream','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${blob.size}`,'Accept-Ranges':'bytes'}});
    })());
  } else if (request.mode === 'navigate' && clientPath(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => (await caches.open(SHELL)).match('/offline.html')));
  } else if (url.pathname === '/offline.html') {
    event.respondWith((async () => (await (await caches.open(SHELL)).match('/offline.html')) || fetch(request))());
  }
});
