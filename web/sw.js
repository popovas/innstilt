/* Offline support: every same-origin GET goes to the network first (so updates arrive right away) and
   falls back to the last cached copy when offline. Cross-origin requests (Entur's API) are not touched.
   Personal data never passes through here: it lives in localStorage. */
const CACHE = 'innstilt';
const SHELL = ['./', 'index.html', 'personvern.html', 'style.css', 'manifest.webmanifest', 'js/app.js', 'js/core.js', 'js/store.js',
  'js/data.js', 'js/i18n.js', 'js/about.js', 'js/stats.js', 'js/intro.js', 'js/game.js', 'js/bookmarklet-href.js', 'icons/ghost-32.png', 'icons/ghost-64.png',
  'icons/ghost-180.png', 'icons/ghost-192.png', 'icons/ghost-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  /* cache: 'no-cache' = always ask the server whether the file changed, so after an update the browser
     never mixes old and new app files from its HTTP cache */
  /* (a page navigation can't be copied with new options, so it is fetched by its address instead) */
  const fresh = e.request.mode === 'navigate' ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request, { cache: 'no-cache' });
  e.respondWith(fresh.then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
