import React, { useState, useEffect, useRef } from 'react'
import { supabase, Auth } from './data/db'
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
import SettingsPage from './pages/Settings'
import Import from './pages/Import'
import MawjLogo from './components/Logo'
import CursorSpotlight from './components/CursorSpotlight'
import NotificationBell from './components/NotificationBell'
import AIAssistant from './components/AIAssistant'

const NAV_ITEMS = [
  { id:'dashboard',   label:'الرئيسية',        icon:'🏠' },
  { id:'orders',      label:'الطلبات',          icon:'📦' },
  { id:'customers',   label:'العملاء',          icon:'👥' },
  { id:'inventory',   label:'المخزون',          icon:'🗃️' },
  { id:'suppliers',   label:'الموردون',         icon:'🏭' },
  { id:'expenses',    label:'المصاريف',         icon:'💸' },
  { id:'settlements', label:'التسويات',         icon:'⏳' },
  { id:'accounting',  label:'المحاسبة',         icon:'📚' },
  { id:'partners',    label:'الشركاء',          icon:'🤝' },
  { id:'reports',     label:'التقارير',         icon:'📊' },
  { id:'settings',    label:'الإعدادات',        icon:'⚙️' },
  { id:'import',      label:'استيراد البيانات', icon:'📥' },
]

const MOBILE_NAV = [
  { id:'dashboard', label:'الرئيسية', icon:'🏠' },
  { id:'orders',    label:'الطلبات',  icon:'📦' },
  { id:'inventory', label:'المخزون',  icon:'🗃️' },
  { id:'reports',   label:'التقارير', icon:'📊' },
  { id:'settings',  label:'الإعدادات',icon:'⚙️' },
]

export default function App() {
  const [session, setSession]       = useState(undefined)
  const [user, setUser]             = useState(null)
  const [page, setPage]             = useState('dashboard')
  const [prevPage, setPrevPage]     = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [theme, setTheme]           = useState(() => localStorage.getItem('mawj_theme') || 'dark')
  const [showAI, setShowAI]         = useState(false)
  const [pageKey, setPageKey]       = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mawj_theme', theme)
  }, [theme])

  // Restore ALL saved appearance settings on mount
  useEffect(() => {
    // Font
    const font = localStorage.getItem('mawj_font')
    if (font) {
      const s = document.getElementById('mawj-font-style') || document.createElement('style')
      s.id = 'mawj-font-style'
      s.textContent = `*, input, button, select, textarea { font-family: ${font} !important; }`
      document.head.appendChild(s)
    }
    // Accent color
    const accent = localStorage.getItem('mawj_accent')
    if (accent) {
      const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(accent)
      if (r) {
        const rgb = `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`
        document.documentElement.style.setProperty('--teal', accent)
        document.documentElement.style.setProperty('--teal-glow', `rgba(${rgb},0.18)`)
        document.documentElement.style.setProperty('--teal-soft', `rgba(${rgb},0.07)`)
      }
    }
    // Font size
    const fs = localStorage.getItem('mawj_fontsize')
    if (fs) { const map={small:13,medium:14,large:15}; document.documentElement.style.fontSize=(map[fs]||14)+'px' }
    // Border radius
    const rad = localStorage.getItem('mawj_radius')
    if (rad) {
      const map={sharp:'6px',rounded:'18px',pill:'28px'}
      const sm={sharp:'4px',rounded:'12px',pill:'18px'}
      document.documentElement.style.setProperty('--radius', map[rad]||'18px')
      document.documentElement.style.setProperty('--radius-sm', sm[rad]||'12px')
    }
    // Animations off
    if (localStorage.getItem('mawj_animations') === 'false') {
      const s = document.getElementById('mawj-anim-style') || document.createElement('style')
      s.id = 'mawj-anim-style'
      s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }'
      document.head.appendChild(s)
    }
    // Noise off
    if (localStorage.getItem('mawj_noise') === 'false') {
      document.documentElement.style.setProperty('--noise-opacity', '0')
    }
    // Compact mode
    if (localStorage.getItem('mawj_compact') === 'true') {
      const s = document.getElementById('mawj-compact-style') || document.createElement('style')
      s.id = 'mawj-compact-style'
      s.textContent = '.page { padding: 14px !important; }'
      document.head.appendChild(s)
    }
  }, [])

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
    setPrevPage(page)
    setPage(id)
    setPageKey(k => k + 1)
    setDrawerOpen(false)
  }

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  if (session === undefined) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#07090f', flexDirection:'column', gap:16 }}>
      <MawjLogo size={56} color="#00e4b8" animated />
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation:'spin 0.7s linear infinite', marginTop:8 }}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="#00e4b8" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!session) return <><Login theme={theme} toggleTheme={toggleTheme}/><ToastContainer/></>

  function renderPage() {
    const props = { user, onNavigate: navigate, theme, toggleTheme }
    switch (page) {
      case 'dashboard':   return <Dashboard   key={pageKey} {...props}/>
      case 'orders':      return <Orders      key={pageKey} {...props}/>
      case 'customers':   return <Customers   key={pageKey} {...props}/>
      case 'inventory':   return <Inventory   key={pageKey} {...props}/>
      case 'suppliers':   return <Suppliers   key={pageKey} {...props}/>
      case 'expenses':    return <Expenses    key={pageKey} {...props}/>
      case 'settlements': return <Settlements key={pageKey} {...props}/>
      case 'accounting':  return <Accounting  key={pageKey} {...props}/>
      case 'partners':    return <Partners    key={pageKey} {...props}/>
      case 'reports':     return <Reports     key={pageKey} {...props}/>
      case 'settings':    return <SettingsPage key={pageKey} {...props}/>
      case 'import':      return <Import      key={pageKey} {...props}/>
      default:            return <Dashboard   key={pageKey} {...props}/>
    }
  }

  const currentLabel = NAV_ITEMS.find(n => n.id === page)?.label || ''
  const currentIcon  = NAV_ITEMS.find(n => n.id === page)?.icon  || ''

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="desktop-sidebar" style={{
        width:240, background:'var(--sidebar-bg)',
        backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        borderLeft:'1px solid var(--bg-border)',
        position:'fixed', top:0, right:0, bottom:0, zIndex:100,
        display:'flex', flexDirection:'column',
      }}>
        <SidebarContent page={page} onNavigate={navigate} user={user}
          onLogout={() => { Auth.signOut(); setPage('dashboard') }}
          theme={theme} toggleTheme={toggleTheme}
        />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }} />
      )}

      {/* ── MOBILE DRAWER ── */}
      <aside style={{
        width:270, background:'var(--sidebar-bg)',
        backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        borderLeft:'1px solid var(--bg-border)',
        position:'fixed', top:0, right: drawerOpen ? 0 : '-290px',
        bottom:0, zIndex:210,
        transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column',
        boxShadow: drawerOpen ? '-8px 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>
        <SidebarContent page={page} onNavigate={navigate} user={user}
          onLogout={() => { Auth.signOut(); setPage('dashboard') }}
          onClose={() => setDrawerOpen(false)}
          theme={theme} toggleTheme={toggleTheme}
        />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex:1, marginRight:240, minWidth:0, display:'flex', flexDirection:'column', minHeight:'100vh' }}>

        {/* Mobile sticky header */}
        <header className="mobile-header" style={{
          height:56, background:'var(--header-bg)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          borderBottom:'1px solid var(--bg-border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 14px', position:'sticky', top:0, zIndex:50, flexShrink:0,
        }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:10, width:38, height:38, cursor:'pointer', color:'var(--text)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ☰
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:16 }}>{currentIcon}</span>
            <span style={{ fontWeight:800, fontSize:15, color:'var(--teal)' }}>{currentLabel || 'موج'}</span>
          </div>
          <ThemeToggle theme={theme} toggle={toggleTheme} size="sm" />
        </header>

        {/* Page content — scrollable, with bottom padding for nav */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
          <div style={{ flex:1 }}>
            {renderPage()}
          </div>
          <Footer />
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        height:60, background:'var(--header-bg)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderTop:'1px solid var(--bg-border)',
        display:'flex', alignItems:'stretch',
      }}>
        {MOBILE_NAV.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => navigate(item.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:2, background:'none', border:'none',
              color: active ? 'var(--teal)' : 'var(--text-muted)',
              cursor:'pointer', fontFamily:'inherit',
              transition:'color 0.2s ease', padding:'4px 2px', position:'relative',
            }}>
              {active && <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:2, background:'var(--teal)', borderRadius:'0 0 4px 4px', boxShadow:'0 0 8px rgba(0,228,184,0.8)' }} />}
              <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
              <span style={{ fontSize:9, fontWeight: active ? 700 : 400, letterSpacing:'0.02em' }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── GLOBAL EXTRAS ── */}
      <ToastContainer />
      {theme === 'dark' && <CursorSpotlight />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}

      {/* Floating AI button */}
      <button onClick={() => setShowAI(p => !p)} title="موج AI" style={{
        position:'fixed', bottom:76, left:16, zIndex:700,
        width:50, height:50, borderRadius:'50%',
        background: showAI ? 'rgba(255,71,87,0.9)' : 'linear-gradient(135deg,var(--teal),var(--violet))',
        border:'none', cursor:'pointer', fontSize:20,
        boxShadow: showAI ? '0 4px 20px rgba(255,71,87,0.5)' : '0 6px 24px rgba(0,228,184,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.25s ease',
        animation: showAI ? 'none' : 'pulseGlow 3s ease infinite',
      }}
        className="logo-btn"
      >
        {showAI ? '✕' : '🤖'}
      </button>

      <style>{`
        @media(min-width:769px){
          .mobile-header,.mobile-bottom-nav{display:none!important}
          .desktop-sidebar{display:flex!important}
        }
        @media(max-width:768px){
          .desktop-sidebar{display:none!important}
          .mobile-header,.mobile-bottom-nav{display:flex!important}
          main{margin-right:0!important}
        }
        @keyframes pulseGlow{
          0%,100%{box-shadow:0 6px 24px rgba(0,228,184,0.45)}
          50%{box-shadow:0 6px 36px rgba(0,228,184,0.75)}
        }
      `}</style>
    </div>
  )
}

/* ── THEME TOGGLE ──────────────────────────────────────────── */
function ThemeToggle({ theme, toggle, size = 'md' }) {
  const isLight = theme === 'light'
  const w = size === 'sm' ? 44 : 50
  const h = size === 'sm' ? 24 : 28
  const dot = size === 'sm' ? 18 : 22
  return (
    <button onClick={toggle} style={{
      width:w, height:h, borderRadius:99, position:'relative',
      background: isLight ? '#e8ecff' : '#1a1f3c',
      border:`1.5px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
      cursor:'pointer', transition:'all 0.3s ease', flexShrink:0,
    }}>
      <div style={{
        position:'absolute', top:'50%', transform:'translateY(-50%)',
        right: isLight ? 3 : w - dot - 3,
        width:dot, height:dot, borderRadius:'50%',
        background: isLight ? 'linear-gradient(135deg,#f59e0b,#fcd34d)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
        transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: size === 'sm' ? 10 : 12,
        boxShadow: isLight ? '0 2px 8px rgba(245,158,11,0.5)' : '0 2px 8px rgba(124,58,237,0.6)',
      }}>
        {isLight ? '☀️' : '🌙'}
      </div>
    </button>
  )
}

/* ── SIDEBAR CONTENT ───────────────────────────────────────── */
function SidebarContent({ page, onNavigate, user, onLogout, onClose, theme, toggleTheme }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Logo row */}
      <div style={{ padding:'18px 14px', borderBottom:'1px solid var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <MawjLogo size={36} color="var(--teal)" animated />
          <div>
            <div style={{ fontSize:17, fontWeight:900, background:'linear-gradient(135deg,var(--teal),var(--text))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.02em', lineHeight:1 }}>موج</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'0.06em', marginTop:2 }}>ERP v7.0</div>
          </div>
        </div>
        {/* Controls — notification + theme toggle + close */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <NotificationBell />
          <ThemeToggle theme={theme} toggle={toggleTheme} size="sm" />
          {onClose && (
            <button onClick={onClose} style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'var(--text-sec)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
          )}
        </div>
      </div>

      {/* Nav — scrollable */}
      <nav style={{ flex:1, padding:'8px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              display:'flex', alignItems:'center', gap:9,
              padding:'9px 11px', borderRadius:10,
              border:`1px solid ${active ? 'rgba(0,228,184,0.2)' : 'transparent'}`,
              background: active ? 'rgba(0,228,184,0.08)' : 'transparent',
              color: active ? 'var(--teal)' : 'var(--text-sec)',
              fontWeight: active ? 700 : 400, fontSize:13,
              cursor:'pointer', transition:'all 0.15s ease',
              width:'100%', textAlign:'right', fontFamily:'inherit',
              flexShrink:0,
            }}
              className={active ? 'nav-item nav-active' : 'nav-item'}
            >
              <span style={{ fontSize:14, flexShrink:0, width:18, textAlign:'center' }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {active && <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--teal)', boxShadow:'0 0 6px var(--teal)', flexShrink:0 }} />}
            </button>
          )
        })}
      </nav>

      {/* User + logout — fixed at bottom */}
      <div style={{ padding:'8px', borderTop:'1px solid var(--bg-border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', marginBottom:4, background:'var(--bg-surface)', borderRadius:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--violet))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:'#fff', flexShrink:0 }}>
            {user?.name?.[0] || '؟'}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{user?.name || 'مستخدم'}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>{user?.role === 'admin' ? 'مدير النظام' : user?.role || ''}</div>
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 11px', borderRadius:10, border:'none', background:'transparent', color:'var(--red)', fontSize:13, cursor:'pointer', width:'100%', fontFamily:'inherit' }}>
          🚪 <span>تسجيل الخروج</span>
        </button>
        {/* Footer credit — always visible */}
        <div style={{ textAlign:'center', padding:'8px 4px 4px', fontSize:10, color:'var(--text-muted)', borderTop:'1px solid var(--bg-border)', marginTop:6, lineHeight:1.6 }}>
          تم التصميم بواسطة{' '}
          <span style={{ color:'var(--teal)', fontWeight:700 }}>إبراهيم كنعي</span>
        </div>
      </div>
    </div>
  )
}

/* ── FOOTER — shows below page content on desktop ─────────── */
function Footer() {
  return (
    <footer style={{
      padding:'14px 28px',
      borderTop:'1px solid var(--bg-border)',
      textAlign:'center',
      flexShrink:0,
    }}>
      <span style={{ fontSize:11, color:'var(--text-muted)' }}>
        تم التصميم بواسطة{' '}
        <span style={{ color:'var(--teal)', fontWeight:700 }}>إبراهيم كنعي</span>
        {' '}· Mawj ERP v7.0
      </span>
    </footer>
  )
}
