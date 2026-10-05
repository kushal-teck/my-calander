self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch (_) {}
  e.waitUntil((async () => {
    const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: "play" }));
    await self.registration.showNotification(d.title || "Complete your tasks", {
      body: d.body || "You have pending tasks today.",
      icon: "/icon-192.png", badge: "/badge-96.png",
      tag: "tasks", renotify: true, vibrate: [200, 100, 200]
    });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((l) => (l.length ? l[0].focus() : clients.openWindow("/"))));
});
