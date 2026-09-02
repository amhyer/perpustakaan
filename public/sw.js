/**
 * Service Worker — Jendela Ilmu PWA (v2)
 *
 * Strategi caching yang lebih baik:
 * - Navigation: network-first, fallback cache, fallback offline page
 * - Static assets (JS, CSS, gambar): cache-first, update in background
 * - API GET: stale-while-revalidate (offline-first untuk perpustakaan)
 * - API mutations: network-only (always fresh)
 *
 * Fitur PWA lengkap:
 * - Offline mode dengan smart fallback
 * - Background sync untuk operations
 * - Push notification support
 * - Share target receiver
 * - Install/update notifications
 * - Asset precaching
 */

const VERSION = "jendela-ilmu-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const API_CACHE = `${VERSION}-api`;
const IMAGE_CACHE = `${VERSION}-images`;

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/logo.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ===== Install =====
self.addEventListener("install", (event) => {
  console.log("[SW] Installing v2");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Best-effort precache
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "no-cache" })
            .then((res) => res.ok && cache.put(url, res))
            .catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

// ===== Activate =====
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v2");
  event.waitUntil(
    (async () => {
      // Clean old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ===== Fetch handler =====
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip chrome-extension, etc.
  if (!url.protocol.startsWith("http")) return;

  // Skip Next.js HMR
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Navigation request
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // API request
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApi(request));
    return;
  }

  // Image
  if (request.destination === "image") {
    event.respondWith(handleImage(request));
    return;
  }

  // Static assets
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|ico|svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    event.respondWith(handleStatic(request));
    return;
  }
});

// ===== Handlers =====

async function handleNavigation(request) {
  try {
    // Network first
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Fallback to cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback to homepage
    const home = await caches.match("/");
    if (home) return home;

    // Offline fallback
    return new Response(
      `<!DOCTYPE html><html><head><title>Offline - Jendela Ilmu</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; background: #f5f1e8; }
        .offline { max-width: 400px; margin: 4rem auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h1 { color: #1e3a5f; }
        .icon { font-size: 4rem; }
        button { background: #1e3a5f; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; }
      </style>
      </head><body>
      <div class="offline">
        <div class="icon">📚</div>
        <h1>Anda Sedang Offline</h1>
        <p>Jendela Ilmu tidak bisa terhubung ke internet. Beberapa fitur mungkin terbatas.</p>
        <p>Halaman yang pernah dibuka masih bisa diakses dari menu Riwayat.</p>
        <button onclick="location.reload()">Coba Lagi</button>
      </div>
      </body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

async function handleApi(request) {
  const url = new URL(request.url);
  // For library reads, use stale-while-revalidate
  if (
    request.method === "GET" &&
    (url.pathname.startsWith("/api/books") ||
      url.pathname.startsWith("/api/categories") ||
      url.pathname.startsWith("/api/authors"))
  ) {
    return staleWhileRevalidate(request, API_CACHE);
  }

  // Mutations: network only
  return fetch(request);
}

async function handleStatic(request) {
  // Cache first, fallback network
  const cached = await caches.match(request);
  if (cached) {
    // Refresh in background
    fetch(request).then((res) => {
      if (res.ok) {
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, res));
      }
    }).catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function handleImage(request) {
  return staleWhileRevalidate(request, IMAGE_CACHE);
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) {
      caches.open(cacheName).then((c) => c.put(request, res.clone()));
    }
    return res;
  }).catch(() => null);
  return cached || (await fetchPromise) || new Response("Offline", { status: 503 });
}

// ===== Background Sync =====
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-operations") {
    event.waitUntil(syncOfflineOperations());
  }
});

async function syncOfflineOperations() {
  // Notify clients to retry queued operations
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_NOW",
      timestamp: Date.now(),
    });
  });
}

// ===== Push Notifications =====
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Jendela Ilmu", body: event.data.text() };
  }

  const options = {
    body: data.message || data.body || "Notifikasi baru",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/", ...data.data },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === "high",
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Jendela Ilmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ===== Share Target Receiver =====
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const title = formData.get("title") || "";
  const text = formData.get("text") || "";
  const sharedUrl = formData.get("url") || "";

  // Redirect to search with the shared text
  const searchParams = new URLSearchParams({
    view: "ai-search",
    q: text || title || sharedUrl,
  });
  return Response.redirect(`/?${searchParams.toString()}`, 303);
}

// ===== Message handler =====
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
