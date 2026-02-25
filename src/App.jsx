import React, { useState, useEffect } from 'react'
import { supabase, Auth } from './data/db'
import { loadAndApplyAppearance, saveAppearance, DEFAULT_PREFS } from './data/appearance'
import { unsubscribeAll } from './data/realtime'
import { ToastContainer, toast } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Partners from './pages/Partners'
import Inventory from './pages/Inventory'
import Suppliers from './pages/Suppliers'
import Accounting from './pages/Accounting'
import SettingsPage from './pages/Settings'
import Import from './pages/Import'
import Hayyak from './pages/Hayyak'
import AgentPage from './pages/AgentPage'
import MawjLogo from './components/Logo'
import CursorSpotlight from './components/CursorSpotlight'
import AIAssistant from './components/AIAssistant'

export default function App() {
  const [session, setSession]   = useState(undefined)
  const [user, setUser]         = useState(null)
  const [page, setPage]         = useState(() => localStorage.getItem('mawj-page') || 'dashboard')
  const [pageKey, setPageKey]   = useState(0)
  const [theme, setTheme]       = useState('dark')
  const [showAI, setShowAI]     = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)

  // ── Sync data-theme attribute ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

  // ── Cleanup realtime on unmount ──
  useEffect(() => () => unsubscribeAll(), [])

  // ── Load appearance from Supabase ──
  useEffect(() => {
    loadAndApplyAppearance().then(prefs => {
      window.__mawjPrefs = prefs || DEFAULT_PREFS
      setTheme(window.__mawjPrefs.mode || 'dark')
    })
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
    setPage(id)
    setPageKey(k => k + 1)
    localStorage.setItem('mawj-page', id)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    const prefs = { ...(window.__mawjPrefs || DEFAULT_PREFS), mode: next }
    window.__mawjPrefs = prefs
    setTheme(next)
    saveAppearance(prefs)
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
      <Login theme={theme} toggleTheme={toggleTheme} />
      <ToastContainer />
    </>
  )

  function renderPage() {
    const props = { user, onNavigate: navigate, theme, toggleTheme }
    switch (page) {
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
      case 'agent':       return <AgentPage    key={pageKey} {...props} />
      default:            return <Dashboard    key={pageKey} {...props} />
    }
  }

  return (
    <>
      {/* ── Offline banner ── */}
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'rgba(239,68,68,0.95)',
          padding: '10px 16px', textAlign: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 16px rgba(239,68,68,0.4)',
        }}>
          لا يوجد اتصال بالإنترنت — يعمل النظام في الوضع المحدود
        </div>
      )}

      {/* ── PWA install — compact square, bottom-left above AI btn ── */}
      {installPrompt && (
        <div style={{
          position: 'fixed', bottom: 136, left: 16, zIndex: 9999,
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
            position: 'absolute', top: 6, left: 6,
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
            borderRadius: 'var(--r-md)', color: '#031a13',
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
        theme={theme}
        toggleTheme={toggleTheme}
      >
        {renderPage()}
      </Layout>

      {/* ── Floating AI button ── */}
      <button
        onClick={() => setShowAI(p => !p)}
        title="موج AI"
        style={{
          position: 'fixed', bottom: 80, left: 16, zIndex: 700,
          width: 44, height: 44, borderRadius: '50%',
          background: showAI ? 'rgba(239,68,68,0.9)' : 'var(--action)',
          border: 'none', cursor: 'pointer',
          boxShadow: showAI ? '0 4px 20px rgba(239,68,68,0.5)' : '0 4px 20px var(--action-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showAI ? '#fff' : '#031a13'} strokeWidth="2.2" strokeLinecap="round">
          {showAI
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>
          }
        </svg>
      </button>

      {/* ── Globals ── */}
      <ToastContainer />
      {theme === 'dark' && <CursorSpotlight />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}

      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}
