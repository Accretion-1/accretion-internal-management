/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

const configParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: configParams.get('apiKey'),
  authDomain: configParams.get('authDomain'),
  projectId: configParams.get('projectId'),
  storageBucket: configParams.get('storageBucket'),
  messagingSenderId: configParams.get('messagingSenderId'),
  appId: configParams.get('appId'),
};

if (Object.values(firebaseConfig).every(Boolean) && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

if (firebase.apps.length) {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Notification';
    const options = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: payload.notification?.icon || payload.data?.icon || '/icons/pwa-192x192.png',
      badge: payload.data?.badge || '/icons/pwa-192x192.png',
      data: {
        url: payload.fcmOptions?.link || payload.data?.url || '/',
      },
    };

    self.registration.showNotification(title, options);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url.includes(self.location.origin));

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
