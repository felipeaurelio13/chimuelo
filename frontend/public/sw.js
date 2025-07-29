// Service Worker para Chimuelo Health Tracker PWA
// Versión del cache - incrementar para forzar actualización
const CACHE_VERSION = 'chimuelo-v2.5.2';
const CACHE_NAME = `chimuelo-cache-${CACHE_VERSION}`;

// Archivos críticos a cachear
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/chimuelo/chimuelo-icon.svg',
  // Los archivos de build se añadirán dinámicamente
];

// Archivos dinámicos/rutas que necesitan estrategia de red primero
const NETWORK_FIRST_URLS = [
  '/api/',
  '/worker/'
];

// Archivos que son cache-first (recursos estáticos)
const CACHE_FIRST_URLS = [
  '.js',
  '.css',
  '.woff2',
  '.woff',
  '.ttf',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp'
];

// Páginas offline fallback
const OFFLINE_FALLBACKS = {
  '/': '/index.html',
  '/capture': '/index.html',
  '/timeline': '/index.html',
  '/chat': '/index.html',
  '/settings': '/index.html',
  '/profile': '/index.html'
};

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ])
  );
});

// Interceptar fetch requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Solo manejar requests HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Estrategia para diferentes tipos de requests
  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
  } else if (isCacheFirst(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Determinar si usar estrategia network-first
function isNetworkFirst(url) {
  return NETWORK_FIRST_URLS.some(pattern => url.pathname.startsWith(pattern));
}

// Determinar si usar estrategia cache-first
function isCacheFirst(url) {
  return CACHE_FIRST_URLS.some(extension => url.pathname.endsWith(extension));
}

// Estrategia Network First (API calls, datos dinámicos)
async function networkFirst(request) {
  try {
    console.log('[SW] Network first:', request.url);
    
    // Intentar network primero
    const networkResponse = await fetch(request);
    
    // Si es exitoso, cachear respuesta (solo para GET)
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Si falla la red, intentar cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si es navegación y no hay cache, mostrar página offline
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    // Para otros requests, retornar respuesta offline genérica
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No hay conexión y no hay datos en cache'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Estrategia Cache First (recursos estáticos)
async function cacheFirst(request) {
  console.log('[SW] Cache first:', request.url);
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', request.url);
    
    // Para imágenes, retornar placeholder
    if (request.destination === 'image') {
      return new Response(
        '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em">📱</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Estrategia Stale While Revalidate (balance)
async function staleWhileRevalidate(request) {
  console.log('[SW] Stale while revalidate:', request.url);
  
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch en background para actualizar cache
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Silently fail background update
    return null;
  });
  
  // Retornar cache inmediatamente si existe, si no esperar network
  return cachedResponse || fetchPromise || caches.match('/index.html');
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting();
      break;
      
    case 'CACHE_HEALTH_DATA':
      console.log('[SW] Caching health data');
      cacheHealthData(payload);
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAppCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Cachear datos de salud para uso offline
async function cacheHealthData(data) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/offline-health-data', response);
    console.log('[SW] Health data cached successfully');
  } catch (error) {
    console.error('[SW] Failed to cache health data:', error);
  }
}

// Obtener estado del cache
async function getCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    return {
      cacheVersion: CACHE_VERSION,
      cachedItems: keys.length,
      cacheSize: await getCacheSize(cache),
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    console.error('[SW] Failed to get cache status:', error);
    return { error: error.message };
  }
}

// Calcular tamaño aproximado del cache
async function getCacheSize(cache) {
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const request of keys.slice(0, 10)) { // Limitar para performance
    try {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    } catch (error) {
      // Ignorar errores individuales
    }
  }
  
  return totalSize;
}

// Limpiar cache de la app
async function clearAppCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

// Manejar errores no capturados
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

// Manejar promesas rechazadas
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

// Sync background para enviar datos cuando vuelva la conexión
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'health-data-sync') {
    event.waitUntil(syncHealthData());
  }
});

// Sincronizar datos de salud cuando vuelva la conexión
async function syncHealthData() {
  try {
    console.log('[SW] Starting health data sync');
    
    // Obtener datos pendientes de sync desde IndexedDB o cache
    const cache = await caches.open(CACHE_NAME);
    const pendingData = await cache.match('/pending-sync-data');
    
    if (pendingData) {
      const data = await pendingData.json();
      
      // Intentar enviar datos al servidor
      const response = await fetch('/api/sync-health-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Eliminar datos pendientes si el sync fue exitoso
        await cache.delete('/pending-sync-data');
        console.log('[SW] Health data sync completed');
        
        // Notificar a los clientes
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETED',
            payload: { success: true }
          });
        });
      }
    }
  } catch (error) {
    console.error('[SW] Health data sync failed:', error);
  }
}

// Push notifications (si están habilitadas)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'Tienes nuevos datos de salud disponibles',
    icon: '/icon-192x192.png',
    badge: '/chimuelo/chimuelo-icon.svg',
    tag: 'health-update',
    renotify: true,
    actions: [
      {
        action: 'view',
        title: 'Ver datos',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Chimuelo Health Tracker', options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker loaded successfully v' + CACHE_VERSION);