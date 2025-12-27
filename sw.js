self.addEventListener("install", (event) => {
  // Optional: langsung aktif
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.title || "Pesan Harian";
  const options = {
    body: data.body || "Buka aplikasi untuk membaca.",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    data: { url: data.url || "/rekap.html" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || "/rekap.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(target);
          return w.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
