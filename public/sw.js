/**
 * Service Worker — Jendela Ilmu PWA
 *
 * Strategi caching:
 * - Halaman utama & navigasi: network-first, fallback ke cache
 * - Static assets (JS, CSS, gambar): stale-while-revalidate
 * - API responses: tidak di-cache (selalu fresh dari server)
 *
 * Fitur:
 * - Offline mode untuk halaman yang sudah pernah dibuka
 * - Install prompt support
 * - Push notification support (akan diaktifkan kemudian)
 */

const CACHE_NAME = "jendela-ilmu-v1";
const STATIC_CACHE = "jendela-ilmu-static-v1";
const PAGE_CACHE = "jendela-ilmu-pages-v1";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// ===== Install =====
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ===== Activate =====
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CACHE_NAME, STATIC_CACHE, PAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ===== Fetch =====
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip API — selalu fresh
  if (url.pathname.startsWith("/api/")) return;

  // Skip chrome extensions & external
  if (!url.origin.includes(self.location.origin)) return;

  // Halaman navigasi: network-first, fallback cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Simpan ke page cache
          const clone = res.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});

// ===== Push notification (Tahap 23 — siap diintegrasikan) =====
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.message || "Notifikasi baru",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    tag: data.tag || "default",
    data: { url: data.url || "/" },
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(data.title || "Jendela Ilmu", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
