import React, { useState, useEffect } from 'react'
import { supabase, Auth, DB } from './data/db'
import { ToastContainer } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import Settlements from './pages/Settlements'
import Reports from './pages/Reports'
import Partners from './pages/Partners'
import Inventory from './pages/Inventory'
import Suppliers from './pages/Suppliers'
import Accounting from './pages/Accounting'
import Settings from './pages/Settings'

// ── NAV ITEMS ─────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'الرئيسية' },
  { id: 'orders', label: 'الطلبات' },
  { id: 'customers', label: 'العملاء' },
  { id: 'inventory', label: 'المخزون' },
  { id: 'suppliers', label: 'الموردون' },
  { id: 'expenses', label: 'المصاريف' },
  { id: 'settlements', label: 'التسويات' },
  { id: 'accounting', label: 'المحاسبة' },
  { id: 'partners', label: 'الشركاء' },
  { id: 'reports', label: 'التقارير' },
  { id: 'settings', label: 'الإعدادات' },
]

const MOBILE_NAV = [
  { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
  { id: 'orders', label: 'الطلبات', icon: '📦' },
  { id: 'inventory', label: 'المخزون', icon: '🗃️' },
  { id: 'reports', label: 'التقارير', icon: '📊' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── AUTH INIT ──────────────────────────────────────────────
  useEffect(() => {
    // First get existing session, then subscribe to changes
    Auth.getSession().then(sess => {
      setSession(sess)
      if (sess?.user) loadUser(sess.user.email)
    })

    const unsub = Auth.onAuthChange((event, sess) => {
      setSession(sess)
      if (sess?.user) loadUser(sess.user.email)
      else setUser(null)
    })

    return unsub
  }, [])

  async function loadUser(email) {
    try {
      const users = await supabase.from('users').select('*').eq('email', email).single()
      if (users.data) setUser(users.data)
    } catch {}
  }

  // ── LOADING STATE ─────────────────────────────────────────
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--teal)', marginBottom: 16 }}>مَوج</div>
          <svg width="32" height="32" viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    )
  }

  // ── NOT LOGGED IN ─────────────────────────────────────────
  if (!session) {
    return (
      <>
        <Login onLogin={() => {}} />
        <ToastContainer />
      </>
    )
  }

  // ── MAIN APP ──────────────────────────────────────────────
  function renderPage() {
    const props = { user, onNavigate: setPage }
    switch (page) {
      case 'dashboard':   return <Dashboard {...props} />
      case 'orders':      return <Orders {...props} />
      case 'customers':   return <Customers {...props} />
      case 'inventory':   return <Inventory {...props} />
      case 'suppliers':   return <Suppliers {...props} />
      case 'expenses':    return <Expenses {...props} />
      case 'settlements': return <Settlements {...props} />
      case 'accounting':  return <Accounting {...props} />
      case 'partners':    return <Partners {...props} />
      case 'reports':     return <Reports {...props} />
      case 'settings':    return <Settings {...props} />
      default:            return <Dashboard {...props} />
    }
  }

  async function handleLogout() {
    await Auth.signOut()
    setPage('dashboard')
  }

  const currentLabel = NAV_ITEMS.find(n => n.id === page)?.label || ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── DESKTOP SIDEBAR ─────────────────────────────── */}
      <aside className="desktop-sidebar" style={{
        width: 240,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        overflowY: 'auto',
      }}>
        <SidebarContent page={page} onNavigate={setPage} user={user} onLogout={handleLogout} />
      </aside>

      {/* ── MOBILE OVERLAY ──────────────────────────────── */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ───────────────────────────────── */}
      <aside style={{
        width: 260,
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        right: sidebarOpen ? 0 : '-100%',
        bottom: 0,
        zIndex: 210,
        transition: 'right 0.25s ease',
        overflowY: 'auto',
      }}>
        <SidebarContent
          page={page}
          onNavigate={id => { setPage(id); setSidebarOpen(false) }}
          user={user}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <main style={{ flex: 1, marginRight: 240, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Mobile Header */}
        <header style={{
          height: 56,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--bg-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }} className="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 4, fontSize: 22 }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--teal)' }}>مَوج</span>
          <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{currentLabel}</span>
        </header>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          {renderPage()}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--bg-border)',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} className="mobile-bottom-nav">
        {MOBILE_NAV.map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                color: active ? 'var(--teal)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                transition: 'color var(--transition)',
                padding: '4px 0',
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <ToastContainer />

      <style>{`
        @media (min-width: 769px) {
          .mobile-header { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
          .desktop-sidebar { display: flex !important; }
        }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          main { margin-right: 0 !important; }
          .page { padding-bottom: 80px !important; }
        }
      `}</style>
    </div>
  )
}

// ── SIDEBAR CONTENT ───────────────────────────────────────────
function SidebarContent({ page, onNavigate, user, onLogout, onClose }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--teal), var(--violet))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            مَوج
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>نظام إدارة المبيعات</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          const NAV_ICONS = {
            dashboard: '🏠', orders: '📦', customers: '👥', inventory: '🗃️', suppliers: '🏭',
            expenses: '💸', settlements: '⏰', accounting: '📚', partners: '🤝', reports: '📊', settings: '⚙️',
          }
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: active ? 'rgba(0,228,184,0.1)' : 'transparent',
                color: active ? 'var(--teal)' : 'var(--text-sec)',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all var(--transition)',
                width: '100%',
                textAlign: 'right',
                fontFamily: 'var(--font)',
                borderRight: `3px solid ${active ? 'var(--teal)' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-sec)' } }}
            >
              <span style={{ fontSize: 16 }}>{NAV_ICONS[item.id]}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--bg-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#fff',
            flexShrink: 0,
          }}>
            {user?.name?.[0] || '؟'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'مستخدم'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user?.role === 'admin' ? 'مدير' : user?.role || ''}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--red)',
            fontSize: 13,
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,71,87,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </>
  )
}
