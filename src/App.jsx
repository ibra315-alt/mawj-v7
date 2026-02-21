import React, { useState, useEffect } from 'react'
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
import Settings from './pages/Settings'
import Import from './pages/Import'

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
  const [session, setSession] = useState(undefined)
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  // Loading
  if(session === undefined) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#060810',flexDirection:'column',gap:16}}>
      <div style={{fontSize:32,fontWeight:900,background:'linear-gradient(135deg,var(--teal),var(--violet))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>مَوج</div>
      <svg width="28" height="28" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite'}}><circle cx="12" cy="12" r="10" fill="none" stroke="#00e4b8" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/></svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if(!session) return <><Login/><ToastContainer/></>

  function renderPage() {
    const props = { user, onNavigate: navigate }
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
      case 'settings':    return <Settings {...props}/>
      case 'import':      return <Import {...props}/>
      default:            return <Dashboard {...props}/>
    }
  }

  const currentLabel = NAV_ITEMS.find(n=>n.id===page)?.label || ''
  const currentIcon  = NAV_ITEMS.find(n=>n.id===page)?.icon  || ''

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg)'}}>

      {/* ── DESKTOP SIDEBAR ─────────────────── */}
      <aside style={{
        width:240, background:'rgba(8,10,20,0.9)', backdropFilter:'blur(40px)',
        borderLeft:'1px solid rgba(255,255,255,0.06)',
        position:'fixed', top:0, right:0, bottom:0, zIndex:100,
        display:'flex', flexDirection:'column', overflowY:'auto',
      }} className="desktop-sidebar">
        <SidebarContent page={page} onNavigate={navigate} user={user} onLogout={()=>{ Auth.signOut(); setPage('dashboard') }} />
      </aside>

      {/* ── MOBILE OVERLAY ──────────────────── */}
      {drawerOpen && (
        <div onClick={()=>setDrawerOpen(false)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)',animation:'fadeIn 0.2s ease'}} />
      )}

      {/* ── MOBILE DRAWER ───────────────────── */}
      <aside style={{
        width:260, background:'rgba(8,10,20,0.97)', backdropFilter:'blur(40px)',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:'0 0 0 20px',
        position:'fixed', top:0, right: drawerOpen ? 0 : '-280px',
        bottom:0, zIndex:210,
        transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column', overflowY:'auto',
        boxShadow: drawerOpen ? '0 0 60px rgba(0,0,0,0.8)' : 'none',
      }}>
        <SidebarContent page={page} onNavigate={navigate} user={user}
          onLogout={()=>{ Auth.signOut(); setPage('dashboard') }}
          onClose={()=>setDrawerOpen(false)} />
      </aside>

      {/* ── MAIN ────────────────────────────── */}
      <main style={{flex:1, marginRight:240, minWidth:0, display:'flex', flexDirection:'column'}}>

        {/* Mobile Header */}
        <header style={{
          height:56, background:'rgba(8,10,20,0.9)', backdropFilter:'blur(20px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 16px', position:'sticky', top:0, zIndex:50,
        }} className="mobile-header">
          <button onClick={()=>setDrawerOpen(true)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,width:36,height:36,cursor:'pointer',color:'var(--text)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
            ☰
          </button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:14}}>{currentIcon}</span>
            <span style={{fontWeight:800,fontSize:14,color:'var(--teal)'}}>{currentLabel || 'مَوج'}</span>
          </div>
          <div style={{width:36}} />
        </header>

        <div style={{flex:1}}>{renderPage()}</div>
      </main>

      {/* ── MOBILE BOTTOM NAV ───────────────── */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        height:62, zIndex:100,
        background:'rgba(8,10,20,0.95)', backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center',
        paddingBottom:'env(safe-area-inset-bottom)',
      }} className="mobile-bottom-nav">
        {MOBILE_NAV.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={()=>navigate(item.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:3,
              background:'none', border:'none',
              color: active ? 'var(--teal)' : 'var(--text-muted)',
              cursor:'pointer', fontFamily:'var(--font)',
              transition:'color 0.2s ease', padding:'6px 0',
              position:'relative',
            }}>
              {active && <div style={{position:'absolute',top:0,left:'25%',right:'25%',height:2,background:'var(--teal)',borderRadius:'0 0 4px 4px',boxShadow:'0 0 8px rgba(0,228,184,0.7)'}} />}
              <span style={{fontSize:19}}>{item.icon}</span>
              <span style={{fontSize:10,fontWeight:active?700:500}}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <ToastContainer/>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @media(min-width:769px){
          .mobile-header{display:none!important}
          .mobile-bottom-nav{display:none!important}
          .desktop-sidebar{display:flex!important}
        }
        @media(max-width:768px){
          .desktop-sidebar{display:none!important}
          .mobile-header{display:flex!important}
          .mobile-bottom-nav{display:flex!important}
          main{margin-right:0!important}
          .page{padding-bottom:88px!important}
        }
      `}</style>
    </div>
  )
}

function SidebarContent({ page, onNavigate, user, onLogout, onClose }) {
  return (
    <>
      {/* Logo */}
      <div style={{padding:'22px 18px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:26,fontWeight:900,background:'linear-gradient(135deg,var(--teal),#ffffff,var(--violet))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.02em'}}>مَوج</div>
          <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,letterSpacing:'0.05em'}}>ERP v7.0</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:28,height:28,cursor:'pointer',color:'var(--text-sec)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:'10px 8px',display:'flex',flexDirection:'column',gap:2}}>
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={()=>onNavigate(item.id)} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:'var(--radius-sm)',
              border:`1px solid ${active?'rgba(0,228,184,0.2)':'transparent'}`,
              background: active ? 'rgba(0,228,184,0.08)' : 'transparent',
              color: active ? 'var(--teal)' : 'var(--text-sec)',
              fontWeight: active ? 700 : 500, fontSize:13,
              cursor:'pointer', transition:'all 0.18s ease',
              width:'100%', textAlign:'right', fontFamily:'var(--font)',
              boxShadow: active ? '0 0 12px rgba(0,228,184,0.08)' : 'none',
            }}
            onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='var(--text)' }}}
            onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-sec)' }}}
            >
              <span style={{fontSize:15,flexShrink:0}}>{item.icon}</span>
              <span>{item.label}</span>
              {active && <div style={{marginRight:'auto',width:5,height:5,borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 8px rgba(0,228,184,0.8)'}} />}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{padding:'10px 8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:4,background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-sm)'}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:15,color:'#060810',flexShrink:0,boxShadow:'0 0 12px rgba(0,228,184,0.3)'}}>
            {user?.name?.[0]||'؟'}
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||'مستخدم'}</div>
            <div style={{fontSize:10,color:'var(--text-muted)'}}>{user?.role==='admin'?'مدير النظام':user?.role||''}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
          borderRadius:'var(--radius-sm)',border:'none',
          background:'transparent',color:'var(--red)',fontSize:13,
          cursor:'pointer',width:'100%',fontFamily:'var(--font)',transition:'background 0.2s ease',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,71,87,0.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
        >
          🚪 <span>تسجيل الخروج</span>
        </button>
      </div>
    </>
  )
}
