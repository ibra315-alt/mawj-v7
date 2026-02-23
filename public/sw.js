/* ══════════════════════════════════════════════════
   MAWJ SERVICE WORKER v9 — Wave 3
   Strategy:
   - App shell (HTML/JS/CSS): Cache first, update in background
   - Fonts / static assets:   Cache forever (hashed filenames)
   - Supabase / Anthropic API: Network only (never cache)
   - Navigation fallback:     Serve /index.html offline
══════════════════════════════════════════════════ */

const CACHE_SHELL   = 'mawj-shell-v9'
const CACHE_ASSETS  = 'mawj-assets-v9'
const CACHE_FONTS   = 'mawj-fonts-v9'
const ALL_CACHES    = [CACHE_SHELL, CACHE_ASSETS, CACHE_FONTS]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(c => c.addAll(['/', '/index.html', '/manifest.json', '/logo.png', '/offline.html']))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.pathname.includes('/functions/') ||
    request.method !== 'GET'
  ) return

  if (url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) {
    e.respondWith(cacheFirst(request, CACHE_FONTS))
    return
  }

  if (url.pathname.includes('/assets/') || url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico)$/)) {
    e.respondWith(cacheFirst(request, CACHE_ASSETS))
    return
  }

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(r => {
          const clone = r.clone()
          caches.open(CACHE_SHELL).then(c => c.put(request, clone))
          return r
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/offline.html')))
    )
    return
  }

  e.respondWith(networkFirst(request, CACHE_SHELL))
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
    return response
  } catch { return new Response('Offline', { status: 503 }) }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || caches.match('/offline.html')
  }
}

self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'موج ERP', {
      body: data.body || '', icon: '/logo.png', badge: '/logo.png',
      tag: data.tag || 'mawj-notif', data: data.url || '/',
      dir: 'rtl', lang: 'ar', vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      const url = e.notification.data || '/'
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); return existing.navigate(url) }
      return clients.openWindow(url)
    })
  )
})
