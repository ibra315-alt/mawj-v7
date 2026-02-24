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
  const [pwaPrompt, setPwaPrompt]   = useState(null)
  const [showPwaBanner, setShowPwaBanner] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mawj_theme', theme)
  }, [theme])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); setShowPwaBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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
      s.textContent = `
        .page { animation: none !important; }
        .stagger > * { animation: none !important; }
        @keyframes pageIn { from{} to{} }
        @keyframes cardEntrance { from{} to{} }
        @keyframes fadeInUp { from{} to{} }
        @keyframes shimmerSlide { from{} to{} }
        @keyframes toastIn { from{} to{} }
        @keyframes sheetUp { from{} to{} }
        @keyframes modalIn { from{} to{} }
      `
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

  async function handlePwaInstall() {
    if (!pwaPrompt) return
    pwaPrompt.prompt()
    await pwaPrompt.userChoice
    setPwaPrompt(null)
    setShowPwaBanner(false)
  }

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  if (session === undefined) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#070c1a', flexDirection:'column', gap:20, position:'relative', overflow:'hidden' }}>
      {/* Same orbs as main app */}
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,228,184,0.16) 0%, transparent 68%)', animation:'float 8s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 68%)', animation:'float 11s ease-in-out infinite reverse', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'40%', left:'30%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,168,228,0.08) 0%, transparent 68%)', animation:'float 15s ease-in-out infinite', animationDelay:'-5s', pointerEvents:'none' }} />
      {/* Grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)', backgroundSize:'64px 64px', pointerEvents:'none' }} />
      {/* Logo */}
      <div style={{ position:'relative', width:72, height:72, borderRadius:22, background:'rgba(0,228,184,0.08)', border:'1px solid rgba(0,228,184,0.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 40px rgba(0,228,184,0.15)' }}>
        <MawjLogo size={48} color="#00e4b8" animated />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:30, fontWeight:900, letterSpacing:'-0.03em', background:'linear-gradient(135deg,#00e4b8,#ffffff,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>مَوج</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>جاري التحميل...</div>
      </div>
      {/* Wave spinner */}
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ animation:'spin 1s linear infinite' }}>
        <circle cx="14" cy="14" r="11" fill="none" stroke="url(#lg)" strokeWidth="2" strokeDasharray="24 46" strokeLinecap="round"/>
        <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00e4b8"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}`}</style>
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
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', position:'relative' }}>

      {/* ── ANIMATED WAVE BACKGROUND — موج brand ── */}
      <div className="wave-bg">
        <div className="wave-orb-1" />
        <div className="wave-orb-2" />
        <div className="wave-orb-3" />
        <div className="wave-grid" />
      </div>

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
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
          borderBottom:'1px solid var(--bg-border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 14px', position:'sticky', top:0, zIndex:50, flexShrink:0,
          position:'relative',
        }}>
          {/* Wave bottom accent */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg, transparent, rgba(0,228,184,0.3), transparent)', pointerEvents:'none' }} />
          <button onClick={() => setDrawerOpen(true)} className="icon-btn" style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:10, width:38, height:38, cursor:'pointer', color:'var(--text)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ☰
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:15 }}>{currentIcon}</span>
            <span style={{ fontWeight:900, fontSize:15, letterSpacing:'-0.01em' }}>{currentLabel || 'مَوج'}</span>
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
        height:64, background:'rgba(5,7,18,0.97)',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        borderTop:'1px solid rgba(0,228,184,0.08)',
        boxShadow:'0 -8px 32px rgba(0,0,0,0.4)',
        display:'flex', alignItems:'stretch',
      }}>
        {MOBILE_NAV.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => navigate(item.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:3, background:'none', border:'none',
              color: active ? 'var(--teal)' : 'var(--text-muted)',
              cursor:'pointer', fontFamily:'inherit',
              transition:'color 0.2s ease', padding:'6px 2px', position:'relative',
              WebkitTapHighlightColor:'transparent',
            }}>
              {/* Top glow bar */}
              {active && <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:2, background:'var(--teal)', borderRadius:'0 0 6px 6px', boxShadow:'0 0 12px rgba(0,228,184,0.9)' }} />}
              {/* Icon bubble when active */}
              <div style={{
                width:36, height:28, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                background: active ? 'rgba(0,228,184,0.1)' : 'transparent',
                transition:'background 0.2s ease',
              }}>
                <span style={{ fontSize:18, lineHeight:1, filter: active ? 'none' : 'grayscale(0.5)' }}>{item.icon}</span>
              </div>
              <span style={{ fontSize:9, fontWeight: active ? 700 : 400, letterSpacing:'0.03em' }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── GLOBAL EXTRAS ── */}
      <ToastContainer />
      {theme === 'dark' && <CursorSpotlight />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}

      {/* ── PWA INSTALL — compact corner ── */}
      {showPwaBanner && (
        <div style={{
          position:'fixed', bottom:76, right:16, zIndex:800,
          background:'rgba(10,15,38,0.97)',
          backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          border:'1px solid rgba(0,228,184,0.22)',
          borderRadius:16, padding:'12px 14px',
          boxShadow:'0 12px 40px rgba(0,0,0,0.5)',
          display:'flex', flexDirection:'column', gap:10,
          width:200, animation:'toastIn 0.3s cubic-bezier(0.4,0,0.2,1) both',
        }}>
          <button onClick={() => setShowPwaBanner(false)} style={{ position:'absolute', top:8, left:8, background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1, padding:2 }}>✕</button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <MawjLogo size={28} color="#00e4b8" animated />
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--text)', lineHeight:1.2 }}>تثبيت موج</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>تثبيت كتطبيق</div>
            </div>
          </div>
          <button onClick={handlePwaInstall} style={{ background:'linear-gradient(135deg,var(--teal),var(--violet))', border:'none', borderRadius:10, padding:'8px 0', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
            تثبيت الآن
          </button>
        </div>
      )}

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
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', position:'relative' }}>

      {/* ── Logo area ── */}
      <div style={{ padding:'16px 14px 14px', borderBottom:'1px solid var(--bg-border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Brand mark */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ position:'relative', width:38, height:38, borderRadius:12, background:'var(--teal-soft)', border:'1px solid rgba(0,228,184,0.2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(0,228,184,0.15)', animation:'pulseGlow 4s ease-in-out infinite', flexShrink:0 }}>
              <MawjLogo size={26} color="var(--teal)" animated />
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1, background:'linear-gradient(135deg,var(--teal) 0%,#fff 60%,rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>مَوج</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'0.08em', marginTop:2, textTransform:'uppercase' }}>v7 · نظام المبيعات</div>
            </div>
          </div>
          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <NotificationBell />
            <ThemeToggle theme={theme} toggle={toggleTheme} size="sm" />
            {onClose && (
              <button onClick={onClose} className="icon-btn" style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'var(--text-sec)', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav — scrollable ── */}
      <nav style={{ flex:1, padding:'6px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={active ? 'nav-item nav-active' : 'nav-item'}
              style={{
                display:'flex', alignItems:'center', gap:9,
                padding:'9px 10px', borderRadius:10,
                border:`1px solid ${active ? 'rgba(0,228,184,0.16)' : 'transparent'}`,
                background: active ? 'rgba(0,228,184,0.07)' : 'transparent',
                color: active ? 'var(--teal)' : 'var(--text-sec)',
                fontWeight: active ? 700 : 400, fontSize:13,
                cursor:'pointer', width:'100%', textAlign:'right',
                fontFamily:'inherit', flexShrink:0, position:'relative',
              }}
            >
              {/* Active: glowing left bar + wave trail */}
              {active && (
                <div style={{ position:'absolute', top:'18%', bottom:'18%', left:0, width:2.5, borderRadius:'0 3px 3px 0', background:'var(--teal)', boxShadow:'0 0 10px rgba(0,228,184,0.9), 0 0 20px rgba(0,228,184,0.4)' }} />
              )}
              <span style={{ fontSize:15, flexShrink:0, width:20, textAlign:'center', lineHeight:1 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {/* Active dot */}
              {active && <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--teal)', boxShadow:'0 0 6px var(--teal)', flexShrink:0 }} />}
            </button>
          )
        })}
      </nav>

      {/* ── User card + logout ── */}
      <div style={{ padding:'8px', borderTop:'1px solid var(--bg-border)', flexShrink:0, position:'relative', zIndex:1 }}>
        {/* User row */}
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', marginBottom:4, background:'var(--bg-surface)', borderRadius:10, border:'1px solid var(--bg-border)' }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,var(--teal),var(--violet))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:'#fff', flexShrink:0, boxShadow:'0 3px 10px rgba(0,228,184,0.2)' }}>
            {user?.name?.[0] || '؟'}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{user?.name || 'مستخدم'}</div>
            <div style={{ fontSize:9, color:'var(--teal)', fontWeight:600, marginTop:1, letterSpacing:'0.03em' }}>{user?.role === 'admin' ? '● مدير النظام' : user?.role || ''}</div>
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, border:'none', background:'transparent', color:'var(--red)', fontSize:12, cursor:'pointer', width:'100%', fontFamily:'inherit' }}>
          🚪 <span>تسجيل الخروج</span>
        </button>
        <div style={{ textAlign:'center', padding:'8px 4px 2px', fontSize:10, color:'var(--text-muted)', borderTop:'1px solid var(--bg-border)', marginTop:4, lineHeight:1.7 }}>
          تم التصميم بواسطة <span style={{ color:'var(--teal)', fontWeight:700 }}>إبراهيم كنعي</span>
        </div>
      </div>

      {/* ── Animated wave at sidebar bottom ── */}
      <div className="sidebar-waves">
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" fill="var(--teal)">
          <path d="M0,40 C20,20 40,60 60,40 C80,20 100,60 120,40 C140,20 160,60 180,40 C200,20 220,60 240,40 C260,20 280,60 300,40 C320,20 340,60 360,40 C380,20 400,60 400,40 L400,80 L0,80 Z"/>
          <path d="M0,40 C20,20 40,60 60,40 C80,20 100,60 120,40 C140,20 160,60 180,40 C200,20 220,60 240,40 C260,20 280,60 300,40 C320,20 340,60 360,40 C380,20 400,60 400,40 L400,80 L0,80 Z" transform="translate(200,0)"/>
        </svg>
      </div>
      <div className="sidebar-waves-2">
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" fill="var(--violet)" style={{opacity:0.6}}>
          <path d="M0,30 C25,10 50,50 75,30 C100,10 125,50 150,30 C175,10 200,50 225,30 C250,10 275,50 300,30 C325,10 350,50 375,30 L400,30 L400,60 L0,60 Z"/>
          <path d="M0,30 C25,10 50,50 75,30 C100,10 125,50 150,30 C175,10 200,50 225,30 C250,10 275,50 300,30 C325,10 350,50 375,30 L400,30 L400,60 L0,60 Z" transform="translate(200,0)"/>
        </svg>
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
