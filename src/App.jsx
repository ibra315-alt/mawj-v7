import React, { useState, useEffect, Suspense, lazy } from 'react'
import { supabase, Auth } from './data/db'
import { loadAndApplyAppearance, DEFAULT_PREFS } from './data/appearance'
import { unsubscribeAll } from './data/realtime'
import { ToastContainer, toast, PageLoader } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import MawjLogo from './components/Logo'

// ── Lazy-loaded pages (code splitting) ──
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Orders = lazy(() => import('./pages/Orders'))
const Customers = lazy(() => import('./pages/Customers'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Reports = lazy(() => import('./pages/Reports'))
const Partners = lazy(() => import('./pages/Partners'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const Accounting = lazy(() => import('./pages/Accounting'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const Import = lazy(() => import('./pages/Import'))
const Hayyak = lazy(() => import('./pages/Hayyak'))
const AgentPage = lazy(() => import('./pages/AgentPage'))
const WhatsAppCenter = lazy(() => import('./pages/WhatsAppCenter'))
const AIAssistant = lazy(() => import('./components/AIAssistant'))

/* ══════════════════════════════════════════════════
   ROLE-BASED ACCESS CONTROL
   admin      = everything
   accountant = orders (CRUD), customers, expenses, suppliers,
                accounting (no profit split), inventory (view)
   sales      = orders (CRUD), customers
   viewer     = read-only dashboard + orders
══════════════════════════════════════════════════ */
const ROLE_ACCESS = {
  admin:      ['dashboard','orders','customers','inventory','suppliers','expenses','accounting','partners','reports','settings','import','hayyak','agent','whatsapp'],
  accountant: ['dashboard','orders','customers','inventory','suppliers','expenses','accounting','hayyak'],
  sales:      ['dashboard','orders','customers'],
  viewer:     ['dashboard','orders'],
}

function canAccess(role, page) {
  const pages = ROLE_ACCESS[role] || ROLE_ACCESS.viewer
  return pages.includes(page)
}

export default function App() {
  const [session, setSession]   = useState(undefined)
  const [user, setUser]         = useState(null)
  const [page, setPage]         = useState(() => localStorage.getItem('mawj-page') || 'dashboard')
  const [pageKey, setPageKey]   = useState(0)
  const [showAI, setShowAI]     = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [swWaiting, setSwWaiting] = useState(null)

  // ── Online / offline ──
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ── PWA install prompt ──
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ── Service worker update detection ──
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setSwWaiting(sw)
          }
        })
      })
    })
  }, [])

  function handleSwUpdate() {
    if (!swWaiting) return
    swWaiting.postMessage('SKIP_WAITING')
    setSwWaiting(null)
    window.location.reload()
  }

  // ── Cleanup realtime on unmount ──
  useEffect(() => () => unsubscribeAll(), [])

  // ── Load appearance from Supabase ──
  useEffect(() => {
    loadAndApplyAppearance().then(prefs => {
      window.__mawjPrefs = prefs || DEFAULT_PREFS
    })
  }, [])

  // ── Apply saved UI preferences (font size, accent color, animations) ──
  useEffect(() => {
    try {
      const r = document.documentElement
      // Font size
      const savedFontSize = localStorage.getItem('mawj_fontsize')
      if (savedFontSize === 'large') {
        r.style.setProperty('font-size', '19px')
        r.style.setProperty('--t-display', '48px')
        r.style.setProperty('--t-title', '30px')
        r.style.setProperty('--t-body', '19px')
        r.style.setProperty('--t-label', '14px')
        r.style.setProperty('--t-2xl', '40px')
      }
      // Accent color
      const savedAccent = localStorage.getItem('mawj_accent')
      const ACCENT_MAP = {
        '#5856D6':'88,86,214', '#00C9A7':'0,201,167', '#30D158':'48,209,88',
        '#FF9500':'255,149,0', '#FF375F':'255,55,95',
      }
      if (savedAccent && ACCENT_MAP[savedAccent]) {
        const rgb = ACCENT_MAP[savedAccent]
        r.style.setProperty('--action', savedAccent)
        r.style.setProperty('--action-rgb', rgb)
        r.style.setProperty('--action-glow', `rgba(${rgb},0.20)`)
        r.style.setProperty('--action-soft', `rgba(${rgb},0.10)`)
        r.style.setProperty('--action-faint', `rgba(${rgb},0.05)`)
      }
      // Animations
      if (localStorage.getItem('mawj_animations') === 'false') {
        r.style.setProperty('--dur-fast', '0ms')
        r.style.setProperty('--dur-base', '0ms')
        r.style.setProperty('--dur-slow', '0ms')
        r.style.setProperty('--dur-page', '0ms')
      }
    } catch {}
  }, [])

  // ── Auth ──
  useEffect(() => {
    Auth.getSession().then(s => { setSession(s); if (s?.user) loadUser(s.user.email) })
    const unsub = Auth.onAuthChange((_, s) => {
      setSession(s)
      if (s?.user) loadUser(s.user.email)
      else setUser(null)
    })
    return unsub
  }, [])

  async function loadUser(email) {
    try {
      const { data } = await supabase.from('users').select('*').eq('email', email).single()
      if (data) setUser(data)
    } catch {}
  }

  function navigate(id) {
    // Role-based guard
    if (user && !canAccess(user.role, id)) {
      toast('ليس لديك صلاحية للوصول لهذه الصفحة', 'error')
      return
    }
    // Only remount if navigating to a different page
    if (id !== page) setPageKey(k => k + 1)
    setPage(id)
    localStorage.setItem('mawj-page', id)
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  // ── Loading screen ──
  if (session === undefined) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 20,
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'var(--action-soft)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MawjLogo size={40} color="var(--action)" animated />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 28, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--action), var(--info-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 6,
        }}>مَوج</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>جاري التحميل...</div>
      </div>
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--action)" strokeWidth="2.5"
          strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Login ──
  if (!session) return (
    <>
      <Login />
      <ToastContainer />
    </>
  )

  function renderPage() {
    const props = { user, onNavigate: navigate }
    // Enforce role access — redirect to dashboard if no access
    const currentPage = (user && !canAccess(user.role, page)) ? 'dashboard' : page
    switch (currentPage) {
      case 'dashboard':   return <Dashboard    key={pageKey} {...props} />
      case 'orders':      return <Orders       key={pageKey} {...props} />
      case 'customers':   return <Customers    key={pageKey} {...props} />
      case 'inventory':   return <Inventory    key={pageKey} {...props} />
      case 'suppliers':   return <Suppliers    key={pageKey} {...props} />
      case 'expenses':    return <Expenses     key={pageKey} {...props} />
      case 'accounting':  return <Accounting   key={pageKey} {...props} />
      case 'partners':    return <Partners     key={pageKey} {...props} />
      case 'reports':     return <Reports      key={pageKey} {...props} />
      case 'settings':    return <SettingsPage key={pageKey} {...props} />
      case 'import':      return <Import       key={pageKey} {...props} />
      case 'hayyak':      return <Hayyak       key={pageKey} {...props} />
      case 'agent':       return <AgentPage      key={pageKey} {...props} />
      case 'whatsapp':    return <WhatsAppCenter key={pageKey} {...props} />
      default:            return <Dashboard      key={pageKey} {...props} />
    }
  }

  return (
    <>
      {/* ── Offline banner ── */}
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'rgba(var(--danger-rgb),0.95)',
          padding: '10px 16px', textAlign: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 16px rgba(var(--danger-rgb),0.4)',
        }}>
          لا يوجد اتصال بالإنترنت — يعمل النظام في الوضع المحدود
        </div>
      )}

      {/* ── SW update banner ── */}
      {swWaiting && (
        <div style={{
          position: 'fixed', top: isOnline ? 0 : 40, left: 0, right: 0, zIndex: 99998,
          background: 'linear-gradient(135deg, var(--action), var(--action-deep))',
          padding: '10px 16px', textAlign: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span>تحديث جديد متاح</span>
          <button onClick={handleSwUpdate} style={{
            background: '#fff', color: 'var(--action-deep)', border: 'none',
            borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>تحديث الآن</button>
        </div>
      )}

      {/* ── PWA install — compact square ── */}
      {installPrompt && (
        <div style={{
          position: 'fixed', bottom: 140, insetInlineEnd: 16, zIndex: 9999,
          width: 174,
          background: 'var(--bg-surface)',
          boxShadow: 'var(--float-shadow)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '12px',
          display: 'flex', flexDirection: 'column', gap: 10,
          animation: 'slideUp 0.3s var(--ease-out) both',
          direction: 'rtl',
        }}>
          <button onClick={() => setInstallPrompt(null)} style={{
            position: 'absolute', top: 6, insetInlineEnd: 6,
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 3,
            borderRadius: 'var(--r-sm)', WebkitTapHighlightColor: 'transparent',
          }}>×</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
              background: 'var(--action-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MawjLogo size={20} color="var(--action)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, lineHeight: 1.2 }}>تثبيت موج</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>أسرع · يعمل بدون نت</div>
            </div>
          </div>
          <button onClick={handleInstall} style={{
            background: 'var(--action)', border: 'none',
            borderRadius: 'var(--r-md)', color: '#fff',
            padding: '8px 0', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit', width: '100%',
            WebkitTapHighlightColor: 'transparent',
          }}>تثبيت الآن</button>
        </div>
      )}

      {/* ── Main layout ── */}
      <Layout
        page={page}
        onNavigate={navigate}
        user={user}
        onLogout={() => { Auth.signOut(); setPage('dashboard') }}
      >
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </Layout>

      {/* ── Floating AI button ── */}
      <button
        onClick={() => setShowAI(p => !p)}
        title="موج AI"
        className="ai-float-btn"
        style={{
          position: 'fixed', bottom: 80, insetInlineEnd: 16, zIndex: 700,
          width: 44, height: 44, borderRadius: '50%',
          background: showAI ? 'rgba(var(--danger-rgb),0.9)' : 'var(--action)',
          border: 'none', cursor: 'pointer',
          boxShadow: showAI ? '0 4px 20px rgba(var(--danger-rgb),0.5)' : '0 4px 20px var(--action-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          {showAI
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>
          }
        </svg>
      </button>

      {/* ── Globals ── */}
      <ToastContainer />
      {showAI && (
        <Suspense fallback={null}>
          <AIAssistant onClose={() => setShowAI(false)} />
        </Suspense>
      )}

      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}
