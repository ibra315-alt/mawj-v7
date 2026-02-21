import React, { useState, useEffect } from 'react'
import { supabase, Auth, Settings } from './data/db'
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
  const [session, setSession]     = useState(undefined)
  const [user, setUser]           = useState(null)
  const [page, setPage]           = useState('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [theme, setTheme]         = useState(() => localStorage.getItem('mawj_theme') || 'dark')

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mawj_theme', theme)
  }, [theme])

  useEffect(() => {
    Auth.getSession().then(s => { setSession(s); if(s?.user) loadUser(s.user.email) })
    const unsub = Auth.onAuthChange((_, s) => {
      setSession(s)
      if(s?.user) loadUser(s.user.email)
      else setUser(null)
    })
    return unsub
  }, [])

  async function loadUser(email) {
    try {
      const { data } = await supabase.from('users').select('*').eq('email', email).single()
      if(data) setUser(data)
    } catch {}
  }

  function navigate(id) { setPage(id); setDrawerOpen(false) }
  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  if(session === undefined) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#060810',flexDirection:'column',gap:16}}>
      <MawjLogo size={56} color="#00e4b8" animated />
      <svg width="24" height="24" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite',marginTop:8}}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="#00e4b8" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if(!session) return <><Login theme={theme} toggleTheme={toggleTheme}/><ToastContainer/></>

  function renderPage() {
    const props = { user, onNavigate: navigate, theme, toggleTheme }
    switch(page) {
      case 'dashboard':   return <Dashboard {...props}/>
      case 'orders':      return <Orders {...props}/>
      case 'customers':   return <Customers {...props}/>
      case 'inventory':   return <Inventory {...props}/>
      case 'suppliers':   return <Suppliers {...props}/>
      case 'expenses':    return <Expenses {...props}/>
      case 'settlements': return <Settlements {...props}/>
      case 'accounting':  return <Accounting {...props}/>
      case 'partners':    return <Partners {...props}/>
      case 'reports':     return <Reports {...props}/>
      case 'settings':    return <SettingsPage {...props}/>
      case 'import':      return <Import {...props}/>
      default:            return <Dashboard {...props}/>
    }
  }

  const currentLabel = NAV_ITEMS.find(n=>n.id===page)?.label || ''
  const currentIcon  = NAV_ITEMS.find(n=>n.id===page)?.icon  || ''

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg)'}}>

      {/* DESKTOP SIDEBAR */}
      <aside className="desktop-sidebar" style={{
        width:240, background:'var(--sidebar-bg)', backdropFilter:'blur(40px)',
        borderLeft:'1px solid var(--bg-border)',
        position:'fixed', top:0, right:0, bottom:0, zIndex:100,
        display:'flex', flexDirection:'column', overflowY:'auto',
      }}>
        <SidebarContent page={page} onNavigate={navigate} user={user}
          onLogout={()=>{ Auth.signOut(); setPage('dashboard') }}
          theme={theme} toggleTheme={toggleTheme}
        />
      </aside>

      {/* MOBILE OVERLAY */}
      {drawerOpen && (
        <div onClick={()=>setDrawerOpen(false)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)'}} />
      )}

      {/* MOBILE DRAWER */}
      <aside style={{
        width:260, background:'var(--sidebar-bg)', backdropFilter:'blur(40px)',
        border:'1px solid var(--bg-border)',
        position:'fixed', top:0, right: drawerOpen ? 0 : '-280px',
        bottom:0, zIndex:210,
        transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column', overflowY:'auto',
        boxShadow: drawerOpen ? '0 0 60px rgba(0,0,0,0.6)' : 'none',
      }}>
        <SidebarContent page={page} onNavigate={navigate} user={user}
          onLogout={()=>{ Auth.signOut(); setPage('dashboard') }}
          onClose={()=>setDrawerOpen(false)}
          theme={theme} toggleTheme={toggleTheme}
        />
      </aside>

      {/* MAIN */}
      <main style={{flex:1, marginRight:240, minWidth:0, display:'flex', flexDirection:'column'}}>

        {/* Mobile Header */}
        <header className="mobile-header" style={{
          height:56, background:'var(--header-bg)', backdropFilter:'blur(20px)',
          borderBottom:'1px solid var(--bg-border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 14px', position:'sticky', top:0, zIndex:50,
        }}>
          <button onClick={()=>setDrawerOpen(true)} style={{background:'var(--bg-glass)',border:'1px solid var(--bg-border)',borderRadius:9,width:36,height:36,cursor:'pointer',color:'var(--text)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
            ☰
          </button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:14}}>{currentIcon}</span>
            <span style={{fontWeight:800,fontSize:14,color:'var(--teal)'}}>{currentLabel||'مَوج'}</span>
          </div>
          {/* Theme toggle in mobile header */}
          <ThemeToggle theme={theme} toggle={toggleTheme} size="sm" />
        </header>

        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          {renderPage()}
          <Footer />
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0,
        height:62, zIndex:100,
        background:'var(--header-bg)', backdropFilter:'blur(20px)',
        borderTop:'1px solid var(--bg-border)',
        display:'flex', alignItems:'stretch',
        paddingBottom:'env(safe-area-inset-bottom)',
      }}>
        {MOBILE_NAV.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={()=>navigate(item.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:2,
              background:'none', border:'none',
              color: active ? 'var(--teal)' : 'var(--text-muted)',
              cursor:'pointer', fontFamily:'inherit',
              transition:'color 0.2s ease', padding:'6px 4px',
              position:'relative',
            }}>
              {active && <div style={{position:'absolute',top:0,left:'20%',right:'20%',height:2,background:'var(--teal)',borderRadius:'0 0 4px 4px',boxShadow:'0 0 8px rgba(0,228,184,0.7)'}} />}
              <span style={{fontSize:19,lineHeight:1}}>{item.icon}</span>
              <span style={{fontSize:10,fontWeight:active?700:400}}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <ToastContainer/>

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
      `}</style>
    </div>
  )
}

/* ── THEME TOGGLE ─────────────────────────────────────────── */
function ThemeToggle({ theme, toggle, size='md' }) {
  const isLight = theme === 'light'
  const w = size==='sm' ? 44 : 52
  const h = size==='sm' ? 24 : 28
  const dot = size==='sm' ? 18 : 22
  return (
    <button onClick={toggle} title={isLight?'تفعيل الوضع الداكن':'تفعيل الوضع الفاتح'} style={{
      width:w, height:h, borderRadius:99,
      background: isLight
        ? 'linear-gradient(135deg, #f0f4ff, #dde4ff)'
        : 'linear-gradient(135deg, #1a1f3c, #0d1020)',
      border:`1px solid ${isLight?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.12)'}`,
      position:'relative', cursor:'pointer', transition:'all 0.3s ease',
      flexShrink:0,
      boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        position:'absolute', top:'50%', transform:'translateY(-50%)',
        right: isLight ? 4 : w - dot - 4,
        width:dot, height:dot, borderRadius:'50%',
        background: isLight
          ? 'linear-gradient(135deg, #f59e0b, #fcd34d)'
          : 'linear-gradient(135deg, #7c3aed, #a855f7)',
        transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: size==='sm'?10:12,
        boxShadow: isLight ? '0 2px 8px rgba(245,158,11,0.5)' : '0 2px 8px rgba(124,58,237,0.6)',
      }}>
        {isLight ? '☀️' : '🌙'}
      </div>
    </button>
  )
}

/* ── SIDEBAR CONTENT ─────────────────────────────────────── */
function SidebarContent({ page, onNavigate, user, onLogout, onClose, theme, toggleTheme }) {
  return (
    <>
      {/* Logo area */}
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid var(--bg-border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <MawjLogo size={40} color="var(--teal)" animated />
          <div>
            <div style={{fontSize:18,fontWeight:900,background:'linear-gradient(135deg,var(--teal),var(--text))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.02em'}}>موج</div>
            <div style={{fontSize:9,color:'var(--text-muted)',letterSpacing:'0.06em'}}>ERP v7.0</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <ThemeToggle theme={theme} toggle={toggleTheme} />
          {onClose && (
            <button onClick={onClose} style={{background:'var(--bg-glass)',border:'1px solid var(--bg-border)',borderRadius:8,width:28,height:28,cursor:'pointer',color:'var(--text-sec)',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{flex:1,padding:'10px 8px',display:'flex',flexDirection:'column',gap:1,overflowY:'auto'}}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={()=>onNavigate(item.id)} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:9,
              border:`1px solid ${active?'rgba(0,228,184,0.18)':'transparent'}`,
              background: active ? 'rgba(0,228,184,0.08)' : 'transparent',
              color: active ? 'var(--teal)' : 'var(--text-sec)',
              fontWeight: active ? 700 : 400, fontSize:13,
              cursor:'pointer', transition:'all 0.15s ease',
              width:'100%', textAlign:'right', fontFamily:'inherit',
            }}
            onMouseEnter={e=>{ if(!active){e.currentTarget.style.background='var(--bg-hover)';e.currentTarget.style.color='var(--text)'}}}
            onMouseLeave={e=>{ if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-sec)'}}}
            >
              <span style={{fontSize:14,flexShrink:0,width:20,textAlign:'center'}}>{item.icon}</span>
              <span style={{flex:1}}>{item.label}</span>
              {active && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 8px var(--teal)',flexShrink:0}} />}
            </button>
          )
        })}
      </nav>

      {/* User + logout */}
      <div style={{padding:'10px 8px',borderTop:'1px solid var(--bg-border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:6,background:'var(--bg-surface)',borderRadius:9}}>
          <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:'#fff',flexShrink:0}}>
            {user?.name?.[0]||'؟'}
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)'}}>{user?.name||'مستخدم'}</div>
            <div style={{fontSize:10,color:'var(--text-muted)'}}>{user?.role==='admin'?'مدير النظام':user?.role||''}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:9,border:'none',background:'transparent',color:'var(--red)',fontSize:13,cursor:'pointer',width:'100%',fontFamily:'inherit',transition:'background 0.15s ease'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,71,87,0.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
        >
          🚪 <span>تسجيل الخروج</span>
        </button>
      </div>
    </>
  )
}

/* ── FOOTER ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{
      padding:'16px 28px',
      borderTop:'1px solid var(--bg-border)',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      marginTop:'auto',
    }}>
      <span style={{fontSize:12,color:'var(--text-muted)',letterSpacing:'0.02em'}}>
        تم التصميم بواسطة{' '}
        <span style={{color:'var(--teal)',fontWeight:700}}>إبراهيم كنعي</span>
        {' '}· Mawj ERP v7.0
      </span>
    </footer>
  )
}
