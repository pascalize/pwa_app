const CACHE_NAME = 'workout-tracker-v1';
const STATIC_CACHE = 'workout-static-v1';

const urlsToCache = [
  './',
  './workout_tracker_pwa.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時にキャッシュを作成
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('Cache installation failed:', error);
      })
  );
});

// アクティブ時に古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// フェッチ時のキャッシュ戦略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュから見つかった場合はそれを返す
        if (response) {
          return response;
        }

        // キャッシュになければネットワークから取得
        return fetch(event.request).then(response => {
          // レスポンスが無効な場合は何もしない
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // レスポンスをキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // ネットワークもキャッシュも使えない場合のフォールバック
        if (event.request.destination === 'document') {
          return caches.match('./workout_tracker_pwa.html');
        }
      })
  );
});

// プッシュ通知のサポート（将来の拡張用）
self.addEventListener('push', event => {
  const options = {
    body: '今日の運動を記録しましょう！',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('運動記録アプリ', options)
  );
});