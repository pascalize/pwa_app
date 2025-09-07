const CACHE_NAME = 'zenspace-time-v1';
const urlsToCache = [
  './standalone_meditation_time.html',
  './manifest.json'
];

// インストール時のキャッシング
self.addEventListener('install', (event) => {
  console.log('Service Worker: インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: ファイルをキャッシュ中...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: インストール完了');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: インストール失敗', error);
      })
  );
});

// アクティベーション時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
  console.log('Service Worker: アクティベート中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: アクティベート完了');
      return self.clients.claim();
    })
  );
});

// フェッチイベント - キャッシュファーストストラテジー
self.addEventListener('fetch', (event) => {
  // HTMLファイルのみキャッシュから提供
  if (event.request.url.includes('.html') || event.request.url === self.registration.scope) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('Service Worker: キャッシュから提供:', event.request.url);
            return response;
          }
          
          console.log('Service Worker: ネットワークから取得:', event.request.url);
          return fetch(event.request)
            .then((response) => {
              // レスポンスが有効でない場合はそのまま返す
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // レスポンスをクローンしてキャッシュに保存
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // ネットワークが利用できない場合、HTMLファイルのリクエストには
              // キャッシュされたメインページを返す
              if (event.request.mode === 'navigate') {
                return caches.match('./standalone_meditation_time.html');
              }
            });
        })
    );
  } else {
    // その他のリソース（音楽ファイル、外部API等）はネットワーク優先
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // ネットワークエラーの場合、必要に応じてキャッシュから提供
          return caches.match(event.request);
        })
    );
  }
});

// プッシュ通知（将来の機能拡張用）
self.addEventListener('push', (event) => {
  console.log('Service Worker: プッシュ通知受信');
  
  const options = {
    body: event.data ? event.data.text() : '瞑想の時間です',
    icon: './manifest.json', // アイコンパス
    badge: './manifest.json', // バッジパス
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'start',
        title: '瞑想を始める',
        icon: './manifest.json'
      },
      {
        action: 'close',
        title: '後で',
        icon: './manifest.json'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ZenSpace', options)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: 通知クリック:', event.action);
  
  event.notification.close();
  
  if (event.action === 'start') {
    // アプリを開いて瞑想を開始
    event.waitUntil(
      clients.openWindow('./standalone_meditation_time.html')
    );
  }
});

// バックグラウンド同期（将来の機能拡張用）
self.addEventListener('sync', (event) => {
  console.log('Service Worker: バックグラウンド同期:', event.tag);
  
  if (event.tag === 'meditation-sync') {
    event.waitUntil(
      // 瞑想データの同期処理
      Promise.resolve()
    );
  }
});

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('Service Worker エラー:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker 未処理のPromise拒否:', event.reason);
});