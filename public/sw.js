const CACHE_NAME = "drinkme-public-v2";
const STATIC_URLS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/drinkme-192.png",
  "/icons/drinkme-512.png",
  "/icons/drinkme-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("drinkme-public-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/aluno") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/reset-password") ||
    url.pathname.startsWith("/supabase") ||
    url.pathname.includes("/storage/") ||
    url.pathname.includes("signed") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/@")
  ) {
    return;
  }

  const isPublicStatic =
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/");

  if (!isPublicStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
