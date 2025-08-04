const CACHE_NAME = 'calculadora-enlace-v1.1.0';
const CACHE_STATIC_NAME = 'calculadora-enlace-static-v1.1.0';
const CACHE_DYNAMIC_NAME = 'calculadora-enlace-dynamic-v1.1.0';

// Arquivos para cache estático
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles-ios.css', // CORRIGIDO
  '/script.js',
  '/register-sw.js', // ADICIONADO
  '/manifest.json',
  // ADICIONE AQUI os caminhos para seus ícones e favicon
  '/assets/favicon.ico',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

const DYNAMIC_CACHE_LIMIT = 50;

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Erro na instalação:', err))
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_STATIC_NAME && cacheName !== CACHE_DYNAMIC_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .catch((err) => console.error('[SW] Erro na ativação:', err))
  );
});

// Interceptação de requisições (Estratégia: Cache, caindo para Rede)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignora requisições não-HTTP
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Se encontrado no cache, retorna
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se não, busca na rede
        return fetch(request)
          .then(networkResponse => {
            // Se a resposta da rede for válida, armazena no cache dinâmico
            if (networkResponse.ok) {
              return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
                cache.put(request, networkResponse.clone());
                limitCacheSize(CACHE_DYNAMIC_NAME, DYNAMIC_CACHE_LIMIT);
                return networkResponse;
              });
            }
            return networkResponse;
          });
      })
      .catch(() => {
        // Fallback para quando tanto o cache quanto a rede falham
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

// Função para limitar o tamanho do cache
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
}