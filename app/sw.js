// Service worker: aplikacja działa offline (np. w terenie bez zasięgu).
// Po zmianie plików aplikacji zwiększ wersję, żeby telefony pobrały nowe.
const CACHE = "sh-tests-v13";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "tests.js",
  "signals.js",
  "viewer.html",
  "viewer.js",
  "direction.js",
  "link.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
