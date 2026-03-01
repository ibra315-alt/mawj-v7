import React, { useState, useEffect, useRef, Suspense, lazy } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, Auth } from './data/db'
import { loadAndApplyAppearance, DEFAULT_PREFS } from './data/appearance'
import { unsubscribeAll } from './data/realtime'
import { ToastContainer, toast, PageLoader } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import MawjLogo from './components/Logo'
import type { User, UserRole } from './types'

// ── Lazy-loaded pages (code splitting) ──
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Orders        = lazy(() => import('./pages/Orders'))
const Customers     = lazy(() => import('./pages/Customers'))
const Expenses      = lazy(() => import('./pages/Expenses'))
const Reports       = lazy(() => import('./pages/Reports'))
const Partners      = lazy(() => import('./pages/Partners'))
const Inventory     = lazy(() => import('./pages/Inventory'))
const Suppliers     = lazy(() => import('./pages/Suppliers'))
const Accounting    = lazy(() => import('./pages/Accounting'))
const SettingsPage  = lazy(() => import('./pages/Settings'))
const Import        = lazy(() => import('./pages/Import'))
const Hayyak        = lazy(() => import('./pages/Hayyak'))
const AgentPage     = lazy(() => import('./pages/AgentPage'))
const WhatsAppCenter     = lazy(() => import('./pages/WhatsAppCenter'))
const ReceiptCustomizer  = lazy(() => import('./pages/ReceiptCustomizer'))
const AIAssistant        = lazy(() => import('./components/AIAssistant'))

/* ══════════════════════════════════════════════════
   ROLE-BASED ACCESS CONTROL
   admin      = everything
   accountant = orders (CRUD), customers, expenses, suppliers,
                accounting (no profit split), inventory (view)
   sales      = orders (CRUD), customers
   viewer     = read-only dashboard + orders
══════════════════════════════════════════════════ */
const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin:      ['dashboard','orders','customers','inventory','suppliers','expenses','accounting','partners','reports','settings','import','hayyak','agent','whatsapp','receipt'],
  accountant: ['dashboard','orders','customers','inventory','suppliers','expenses','accounting','hayyak'],
  sales:      ['dashboard','orders','customers'],
  viewer:     ['dashboard','orders'],
}

function canAccess(role: UserRole | undefined, page: string): boolean {
  const pages = role ? (ROLE_ACCESS[role] ?? ROLE_ACCESS.viewer) : ROLE_ACCESS.viewer
  return pages.includes(page)
}

export default function App() {
  const [session, setSession]     = useState<Session | null | undefined>(undefined)
  const [user, setUser]           = useState<User | null>(null)
  const [page, setPage]           = useState<string>(() => localStorage.getItem('mawj-page') || 'dashboard')
  const [pageKey, setPageKey]     = useState<number>(0)
  const [showAI, setShowAI]       = useState<boolean>(false)
  const [isOnline, setIsOnline]   = useState<boolean>(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [swWaiting, setSwWaiting] = useState<ServiceWorker | null>(null)

  // ── Online / offline ──
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ── PWA install prompt — notify header via custom event ──
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      window.dispatchEvent(new CustomEvent('mawj-pwa-ready', { detail: { prompt: e } }))
    }
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
      (window as any).__mawjPrefs = prefs || DEFAULT_PREFS
    })
  }, [])

  // ── Auth ──
  useEffect(() => {
    Auth.getSession().then(s => { setSession(s); if (s?.user) loadUser(s.user.email!) })
    const unsub = Auth.onAuthChange((_: string, s: Session | null) => {
      setSession(s)
      if (s?.user) loadUser(s.user.email!)
      else setUser(null)
    })
    return unsub
  }, [])

  async function loadUser(email: string) {
    try {
      const { data } = await supabase.from('users').select('*').eq('email', email).single()
      if (data) setUser(data as User)
    } catch {}
  }

  function navigate(id: string) {
    if (user && !canAccess(user.role, id)) {
      toast('ليس لديك صلاحية للوصول لهذه الصفحة', 'error')
      return
    }
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
          background: 'linear-gradient(135deg, var(--action), var(--info))',
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
    const props = { user: user!, onNavigate: navigate }
    const currentPage = (user && !canAccess(user.role, page)) ? 'dashboard' : page
    switch (currentPage) {
      case 'dashboard':  return <Dashboard    key={pageKey} {...props} />
      case 'orders':     return <Orders       key={pageKey} {...props} />
      case 'customers':  return <Customers    key={pageKey} {...props} />
      case 'inventory':  return <Inventory    key={pageKey} {...props} />
      case 'suppliers':  return <Suppliers    key={pageKey} {...props} />
      case 'expenses':   return <Expenses     key={pageKey} {...props} />
      case 'accounting': return <Accounting   key={pageKey} {...props} />
      case 'partners':   return <Partners     key={pageKey} {...props} />
      case 'reports':    return <Reports      key={pageKey} {...props} />
      case 'settings':   return <SettingsPage key={pageKey} {...props} />
      case 'import':     return <Import       key={pageKey} {...props} />
      case 'hayyak':     return <Hayyak       key={pageKey} {...props} />
      case 'agent':      return <AgentPage    key={pageKey} {...props} />
      case 'whatsapp':   return <WhatsAppCenter    key={pageKey} {...props} />
      case 'receipt':    return <ReceiptCustomizer key={pageKey} {...props} />
      default:           return <Dashboard         key={pageKey} {...props} />
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

      {/* PWA install handled via header button — see Layout.tsx */}

      {/* ── SW update — smart auto-dismiss toast ── */}
      {swWaiting && <SWUpdateToast onUpdate={handleSwUpdate} onDismiss={() => setSwWaiting(null)} isOnline={isOnline} />}

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

      {/* ── Floating AI Orb ── */}
      <FloatingAI showAI={showAI} setShowAI={setShowAI} />

      {/* ── Globals ── */}
      <ToastContainer />
      {showAI && (
        <Suspense fallback={null}>
          <AIAssistant onClose={() => setShowAI(false)} />
        </Suspense>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════
   FLOATING AI ORB — breathing gradient + prompt chips
══════════════════════════════════════════════════ */
function FloatingAI({ showAI, setShowAI }: { showAI: boolean; setShowAI: (v: any) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, insetInlineEnd: 18, zIndex: 700,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
    }}>
      {/* Main AI orb */}
      <button
        onClick={() => setShowAI((p: boolean) => !p)}
        title="موج AI"
        aria-label={showAI ? 'إغلاق موج AI' : 'فتح موج AI'}
        style={{
          width: 54, height: 54, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.35s ease, box-shadow 0.35s ease, transform 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
          background: showAI
            ? 'linear-gradient(135deg, rgba(239,68,68,0.92), rgba(220,38,38,0.92))'
            : 'linear-gradient(135deg, #1a6ec4, #318CE7, #38BDF8)',
          boxShadow: showAI
            ? '0 0 0 0 rgba(239,68,68,0), 0 6px 24px rgba(239,68,68,0.45)'
            : '0 0 0 0 rgba(49,140,231,0.5), 0 6px 28px rgba(49,140,231,0.4)',
          animation: showAI ? 'none' : 'orbPulse 2.8s ease-in-out infinite',
          position: 'relative',
        }}
      >
        {/* Ripple ring — only when closed */}
        {!showAI && (
          <span style={{
            position: 'absolute', inset: -2, borderRadius: '50%',
            border: '2px solid rgba(49,140,231,0.35)',
            animation: 'ringPulse 2.8s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
        <svg
          width="22" height="22" viewBox="0 0 24 24"
          fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"
          style={{ transition: 'transform 0.3s ease', transform: showAI ? 'rotate(45deg)' : 'none' }}
        >
          {showAI
            ? <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
            : <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>
          }
        </svg>
      </button>

      <style>{`
        @keyframes orbPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(49,140,231,0.45), 0 6px 28px rgba(49,140,231,0.38); transform: scale(1); }
          50%      { box-shadow: 0 0 0 14px rgba(49,140,231,0), 0 6px 28px rgba(49,140,231,0.55); transform: scale(1.07); }
        }
        @keyframes ringPulse {
          0%,100% { transform: scale(1);    opacity: 0.6; }
          50%      { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PWA BOTTOM SHEET — native iOS/Android style
══════════════════════════════════════════════════ */
function PWABottomSheet({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.25s ease both',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-surface)',
        borderRadius: '24px 24px 0 0',
        padding: '16px 24px 40px',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.3)',
        direction: 'rtl',
        animation: 'sheetUp 0.4s cubic-bezier(0.34,1.4,0.64,1) both',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 44, height: 4, borderRadius: 999,
          background: 'var(--border-strong)',
          margin: '0 auto 20px',
        }} />

        {/* App identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--action-soft), rgba(56,189,248,0.15))',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--action-glow)',
          }}>
            <MawjLogo size={36} color="var(--action)" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)' }}>موج ERP</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>نظام إدارة المبيعات</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              {'★★★★★'.split('').map((s, i) => (
                <span key={i} style={{ fontSize: 12, color: '#F59E0B' }}>{s}</span>
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}>4.9</span>
            </div>
          </div>
        </div>

        {/* Benefits pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            ['⚡', 'Faster 3×'],
            ['📶', 'Works offline'],
            ['🔔', 'Push notifications'],
            ['💾', 'Saves storage'],
          ].map(([icon, label]) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: 12, fontWeight: 700, color: 'var(--text)',
            }}>{icon} {label}</div>
          ))}
        </div>

        {/* Install button */}
        <button onClick={onInstall} style={{
          width: '100%', padding: '15px',
          background: 'linear-gradient(135deg, var(--action-deep, #1a6ec4), var(--action))',
          color: '#fff', border: 'none',
          borderRadius: 14, fontWeight: 900, fontSize: 16,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(49,140,231,0.4)',
          marginBottom: 10,
          WebkitTapHighlightColor: 'transparent',
        }}>
          تثبيت الآن — Install
        </button>

        {/* Dismiss */}
        <button onClick={onDismiss} style={{
          width: '100%', padding: '12px',
          background: 'none', color: 'var(--text-muted)',
          border: 'none', borderRadius: 14,
          fontWeight: 600, fontSize: 14,
          cursor: 'pointer', fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}>
          Maybe later
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SW UPDATE TOAST — glass card, auto-dismiss 10s
══════════════════════════════════════════════════ */
function SWUpdateToast({ onUpdate, onDismiss, isOnline }: {
  onUpdate: () => void; onDismiss: () => void; isOnline: boolean
}) {
  // Auto-update after 10 seconds
  useEffect(() => {
    const t = setTimeout(onUpdate, 10_000)
    return () => clearTimeout(t)
  }, [onUpdate])

  return (
    <div style={{
      position: 'fixed',
      top: isOnline ? 74 : 114,
      insetInlineEnd: 16,
      zIndex: 99998,
      width: 300,
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--r-lg)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      overflow: 'hidden',
      direction: 'rtl',
      animation: 'toastSlide 0.38s cubic-bezier(0.34,1.3,0.64,1) both',
    }}>
      {/* Auto-dismiss progress bar */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, var(--action), #38BDF8)',
        transformOrigin: 'right',
        animation: 'drainProgress 10s linear both',
      }} />

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🔄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
              New update available
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Auto-refreshes in 10 s
            </div>
          </div>
          <button onClick={onDismiss} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0,
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onUpdate} style={{
            flex: 1, padding: '8px', borderRadius: 'var(--r-md)',
            background: 'var(--action)', color: '#fff', border: 'none',
            fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Update now
          </button>
          <button onClick={onDismiss} style={{
            padding: '8px 12px', borderRadius: 'var(--r-md)',
            background: 'var(--bg-hover)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Skip
          </button>
        </div>
      </div>

      <style>{`
        @keyframes toastSlide {
          from { opacity: 0; transform: translateX(320px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes drainProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
