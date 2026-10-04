self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "Complete your tasks", {
    body: d.body || "You have pending tasks today.",
    icon: "/icon.svg", badge: "/icon.svg", tag: "tasks", renotify: true
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((l) => (l.length ? l[0].focus() : clients.openWindow("/"))));
});
