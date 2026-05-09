/* ================================================================
   SERVICE WORKER — Kisah PWA
   Cache Strategies:
   - App Shell  → Cache First
   - API GET    → Stale-While-Revalidate  (dynamic data stays fresh)
   - Images     → Cache First with network fallback
================================================================ */

const APP_VERSION   = 'v3';
const CACHE_SHELL   = `kisah-shell-${APP_VERSION}`;
const CACHE_DYNAMIC = `kisah-dynamic-${APP_VERSION}`;
const CACHE_IMAGES  = `kisah-images-${APP_VERSION}`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/scripts/index.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

const API_BASE = 'https://story-api.dicoding.dev/v1';

/* ---- Install ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => cache.addAll(SHELL_URLS).catch((err) => console.warn('[SW] Shell partial:', err)))
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => ![CACHE_SHELL, CACHE_DYNAMIC, CACHE_IMAGES].includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- Fetch ---- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!['http:', 'https:'].includes(url.protocol)) return;

  /* API calls → Stale-While-Revalidate */
  if (url.href.startsWith(API_BASE)) {
    event.respondWith(staleWhileRevalidate(CACHE_DYNAMIC, request));
    return;
  }

  /* Images → Cache First */
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(CACHE_IMAGES, request));
    return;
  }

  /* Everything else (App Shell) → Cache First, fallback index.html */
  event.respondWith(cacheFirst(CACHE_SHELL, request, true));
});

async function cacheFirst(cacheName, request, fallbackIndex = false) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    if (fallbackIndex) {
      const index = await caches.match('/index.html') || await caches.match('/');
      if (index) return index;
    }
    return new Response('Offline — konten tidak tersedia', { status: 503 });
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached
    || await fetchPromise
    || new Response(
      JSON.stringify({ error: true, message: 'Data tidak tersedia secara offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
}

/* ================================================================
   PUSH NOTIFICATION
   The Dicoding Story API automatically sends a push event to all
   subscribed clients whenever POST /stories is called.
   The server sends a JSON payload with story details.
================================================================ */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  /* Default payload */
  let payload = {
    title:       'Kisah — Cerita Baru! 📖',
    options: {
      body:      'Ada cerita baru yang dibagikan. Yuk lihat!',
      icon:      '/icons/icon-192x192.png',
      badge:     '/icons/icon-96x96.png',
      tag:       'kisah-story',
      renotify:  true,
      vibrate:   [200, 100, 200],
      timestamp: Date.now(),
      data:      { url: '/' },
      actions: [
        { action: 'open',    title: '👁 Lihat Sekarang' },
        { action: 'dismiss', title: '✕ Tutup' },
      ],
    },
  };

  /* Parse server payload */
  if (event.data) {
    try {
      const serverData = event.data.json();
      console.log('[SW] Push data:', serverData);

      /*
       * The Dicoding API sends a push with the story data.
       * Typical shape: { title, options: { body, image, data: { storyId, ... } } }
       * We merge it with our defaults so any field can be dynamic.
       */
      if (serverData.title) payload.title = serverData.title;

      if (serverData.options) {
        payload.options = {
          ...payload.options,
          ...serverData.options,
          /* Always keep our icon/badge if server doesn't provide */
          icon:  serverData.options.icon  || payload.options.icon,
          badge: serverData.options.badge || payload.options.badge,
          actions: payload.options.actions,
        };

        /* If server provides a storyId, navigate to home (shows fresh list) */
        if (serverData.options.data?.storyId) {
          payload.options.data = {
            url: '/',
            storyId: serverData.options.data.storyId,
          };
        }
      }

    } catch (_) {
      /* Plain text fallback */
      payload.options.body = event.data.text() || payload.options.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, payload.options)
  );
});

/* ---- Notification click ---- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      /* Focus existing window if available */
      const match = wins.find((w) => w.url.includes(self.location.origin));
      if (match) {
        match.focus();
        return match.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    })
  );
});

/* ================================================================
   BACKGROUND SYNC — Offline story queue
================================================================ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-stories') {
    event.waitUntil(syncPendingStories());
  }
});

async function syncPendingStories() {
  const db  = await openKisahDB();
  const all = await dbGetAll(db, 'pending_stories');
  if (!all.length) return;

  console.log(`[SW Sync] Processing ${all.length} pending stories`);

  for (const item of all) {
    try {
      const fd = new FormData();
      fd.append('description', item.description);
      if (item.photoBlob) fd.append('photo', item.photoBlob, 'photo.jpg');
      if (item.lat)       fd.append('lat', item.lat);
      if (item.lon)       fd.append('lon', item.lon);

      const res = await fetch(`${API_BASE}/stories`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${item.token}` },
        body:    fd,
      });

      if (res.ok) {
        await dbDelete(db, 'pending_stories', item.localId);
        console.log('[SW Sync] Story synced, localId:', item.localId);

        /* Notify all open clients */
        const wins = await self.clients.matchAll({ includeUncontrolled: true });
        wins.forEach((w) => w.postMessage({ type: 'SYNC_DONE', localId: item.localId }));
      }
    } catch (err) {
      console.warn('[SW Sync] Failed for item', item.localId, err);
    }
  }
}

/* ================================================================
   MINI IDB HELPERS (used only inside SW for sync)
================================================================ */
function openKisahDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('kisah-db', 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('saved_stories')) {
        db.createObjectStore('saved_stories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_stories')) {
        db.createObjectStore('pending_stories', { keyPath: 'localId', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function dbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
