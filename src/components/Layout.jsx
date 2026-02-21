import React, { useState } from 'react'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses, IcSettlements,
  IcReports, IcPartners, IcInventory, IcSuppliers, IcAccounting,
  IcSettings, IcLogout, IcMenu, IcClose, IcNotif,
} from './Icons'

/* ══════════════════════════════════════════════════
   LAYOUT v8.5 — Indigo-violet glass sidebar
══════════════════════════════════════════════════ */

const NAV_SECTIONS = [
  {
    label: 'الرئيسية',
    items: [
      { id: 'dashboard',  label: 'الرئيسية',   icon: IcDashboard },
      { id: 'orders',     label: 'الطلبات',     icon: IcOrders },
      { id: 'customers',  label: 'العملاء',      icon: IcCustomers },
    ],
  },
  {
    label: 'العمليات',
    items: [
      { id: 'inventory',   label: 'المخزون',    icon: IcInventory },
      { id: 'suppliers',   label: 'الموردون',   icon: IcSuppliers },
      { id: 'expenses',    label: 'المصاريف',   icon: IcExpenses },
      { id: 'settlements', label: 'التسويات',   icon: IcSettlements },
    ],
  },
  {
    label: 'المالية',
    items: [
      { id: 'accounting', label: 'المحاسبة', icon: IcAccounting },
      { id: 'partners',   label: 'الشركاء',  icon: IcPartners },
      { id: 'reports',    label: 'التقارير', icon: IcReports },
    ],
  },
  {
    label: null,
    items: [
      { id: 'settings', label: 'الإعدادات', icon: IcSettings },
    ],
  },
]

const MOBILE_NAV = [
  { id: 'dashboard', label: 'الرئيسية', icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',  icon: IcOrders },
  { id: 'inventory', label: 'المخزون',  icon: IcInventory },
  { id: 'reports',   label: 'التقارير', icon: IcReports },
  { id: 'settings',  label: 'الإعدادات', icon: IcSettings },
]

export default function Layout({ page, onNavigate, user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        width: 220,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'var(--blur-lg)',
        WebkitBackdropFilter: 'var(--blur-lg)',
        borderLeft: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
      }} className="desktop-only">
        <SidebarContent page={page} onNavigate={onNavigate} user={user} onLogout={onLogout} />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:200,
            background:'rgba(7,5,28,0.75)',
            backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <aside style={{
        width: 260,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'var(--blur-lg)',
        WebkitBackdropFilter: 'var(--blur-lg)',
        borderLeft: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        right: sidebarOpen ? 0 : '-100%',
        bottom: 0,
        zIndex: 210,
        transition: 'right 0.28s var(--ease-smooth)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }} className="mobile-only">
        <SidebarContent
          page={page}
          onNavigate={id => { onNavigate(id); setSidebarOpen(false) }}
          user={user}
          onLogout={onLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{
        flex: 1,
        marginRight: 220,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mobile Header */}
        <header style={{
          height: 56,
          background: 'var(--header-bg)',
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
          borderBottom: '1px solid var(--glass-border)',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }} className="mobile-flex">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background:'var(--bg-glass)',border:'1.5px solid var(--glass-border)',
              borderRadius:10,color:'var(--text)',cursor:'pointer',
              padding:'6px 8px',display:'flex',alignItems:'center',
              WebkitTapHighlightColor:'transparent',
            }}
          >
            <IcMenu size={20} />
          </button>
          {/* Center logo */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="mhLogo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00e4b8"/><stop offset="0.5" stopColor="#a78bfa"/><stop offset="1" stopColor="#ec4899"/>
                </linearGradient>
              </defs>
              <path d="M4 20c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2" stroke="url(#mhLogo)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M4 14c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2" stroke="url(#mhLogo)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45"/>
            </svg>
            <span style={{
              fontWeight:900, fontSize:18,
              background:'linear-gradient(135deg,var(--teal),var(--violet-light))',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>مَوج</span>
          </div>
          <div style={{width:36}} />
        </header>

        {/* Page */}
        <div style={{flex:1}}>
          {children}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        height:64,
        background:'var(--sidebar-bg)',
        backdropFilter:'var(--blur-lg)',WebkitBackdropFilter:'var(--blur-lg)',
        borderTop:'1px solid var(--glass-border)',
        display:'none',
        zIndex:100,
        paddingBottom:'env(safe-area-inset-bottom)',
      }} className="mobile-flex">
        {MOBILE_NAV.map(item => {
          const Icon = item.icon
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                flex:1,
                display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',
                gap:3,
                background:'none',border:'none',
                color: active ? 'var(--teal)' : 'var(--text-muted)',
                cursor:'pointer',
                fontFamily:'inherit',
                WebkitTapHighlightColor:'transparent',
                transition:'color 0.15s ease',
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <div style={{
                  position:'absolute',
                  width:20,height:2,borderRadius:999,
                  background:'var(--teal)',
                  top:0,
                  boxShadow:'0 0 8px var(--teal-glow)',
                }} />
              )}
              <Icon size={20} />
              <span style={{fontSize:10,fontWeight:active?700:500}}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <style>{`
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
          .mobile-flex { display: none !important; }
          .desktop-only { display: flex !important; }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
          .mobile-flex { display: flex !important; }
          main { margin-right: 0 !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          aside.desktop-only { width: 200px !important; }
          main { margin-right: 200px !important; }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SIDEBAR CONTENT — sections, gradient logo, violet glass
══════════════════════════════════════════════════ */
function SidebarContent({ page, onNavigate, user, onLogout, onClose }) {
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',position:'relative',overflow:'hidden'}}>

      {/* ── Atmospheric orb behind sidebar ── */}
      <div style={{
        position:'absolute',top:-80,right:-80,
        width:240,height:240,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 70%)',
        pointerEvents:'none',zIndex:0,
      }} />
      <div style={{
        position:'absolute',bottom:-60,left:-60,
        width:180,height:180,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(0,228,184,0.07) 0%,transparent 70%)',
        pointerEvents:'none',zIndex:0,
      }} />

      {/* ── Logo ── */}
      <div style={{
        padding:'20px 16px 16px',
        borderBottom:'1px solid var(--glass-border)',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        position:'relative',zIndex:1,flexShrink:0,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {/* Wave SVG mark */}
          <div style={{
            width:38,height:38,borderRadius:'var(--radius-sm)',
            background:'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(124,58,237,0.15))',
            border:'1.5px solid var(--glass-border-strong)',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 4px 16px rgba(124,58,237,0.18)',
            flexShrink:0,
          }}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="sLogo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00e4b8"/>
                  <stop offset="0.5" stopColor="#a78bfa"/>
                  <stop offset="1" stopColor="#ec4899"/>
                </linearGradient>
              </defs>
              <path d="M4 20c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
                stroke="url(#sLogo)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M4 14c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
                stroke="url(#sLogo)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontSize:20,fontWeight:900,letterSpacing:'-0.5px',
              background:'linear-gradient(135deg,var(--teal),var(--violet-light))',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            }}>مَوج</div>
            <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,letterSpacing:'0.04em'}}>
              نظام إدارة المبيعات
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background:'var(--bg-glass)',border:'1.5px solid var(--glass-border)',
            borderRadius:8,color:'var(--text-sec)',cursor:'pointer',
            padding:'4px 6px',display:'flex',alignItems:'center',
          }}>
            <IcClose size={16} />
          </button>
        )}
      </div>

      {/* ── Nav sections ── */}
      <nav style={{flex:1,padding:'10px 8px',display:'flex',flexDirection:'column',gap:0,overflowY:'auto',overflowX:'hidden',position:'relative',zIndex:1}}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{marginBottom:si < NAV_SECTIONS.length-1 ? 4 : 0}}>
            {/* Section label */}
            {section.label && (
              <div style={{
                fontSize:9,fontWeight:700,color:'var(--text-muted)',
                letterSpacing:'0.10em',textTransform:'uppercase',
                padding:'8px 12px 4px',
              }}>{section.label}</div>
            )}
            {/* Section items */}
            {section.items.map(item => {
              const Icon = item.icon
              const active = page === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="nav-item"
                  style={{
                    display:'flex',alignItems:'center',gap:9,
                    padding:'9px 12px',
                    borderRadius:'var(--radius-sm)',
                    border:'1.5px solid',
                    borderColor: active ? 'var(--glass-border-strong)' : 'transparent',
                    background: active
                      ? 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(0,228,184,0.08))'
                      : 'transparent',
                    color: active ? 'var(--text)' : 'var(--text-sec)',
                    fontWeight: active ? 700 : 500,
                    fontSize:13,cursor:'pointer',
                    width:'100%',textAlign:'right',
                    fontFamily:'inherit',
                    position:'relative',
                    boxShadow: active ? 'var(--shadow-card)' : 'none',
                    marginBottom:1,
                    WebkitTapHighlightColor:'transparent',
                  }}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <div style={{
                      position:'absolute',right:0,top:'20%',bottom:'20%',
                      width:2.5,borderRadius:999,
                      background:'linear-gradient(180deg,var(--teal),var(--violet-light))',
                      boxShadow:'0 0 8px var(--teal-glow)',
                    }} />
                  )}
                  <span style={{
                    color: active ? 'var(--teal)' : 'var(--text-muted)',
                    display:'flex',flexShrink:0,
                    transition:'color 0.15s ease',
                  }}>
                    <Icon size={17} />
                  </span>
                  {item.label}
                </button>
              )
            })}
            {/* Section separator */}
            {si < NAV_SECTIONS.length-1 && section.items.length > 0 && (
              <div style={{height:1,background:'var(--glass-border)',margin:'6px 12px'}} />
            )}
          </div>
        ))}
      </nav>

      {/* ── User area ── */}
      <div style={{
        padding:'10px 8px',
        borderTop:'1px solid var(--glass-border)',
        position:'relative',zIndex:1,flexShrink:0,
      }}>
        {/* User card */}
        <div style={{
          display:'flex',alignItems:'center',gap:10,
          padding:'8px 12px',marginBottom:4,
          background:'var(--bg-glass)',
          backdropFilter:'var(--blur-sm)',WebkitBackdropFilter:'var(--blur-sm)',
          border:'1.5px solid var(--glass-border)',
          borderRadius:'var(--radius-sm)',
        }}>
          {/* Avatar */}
          <div style={{
            width:34,height:34,borderRadius:'50%',flexShrink:0,
            background:'linear-gradient(135deg,var(--teal),var(--violet-light),var(--pink))',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontWeight:800,fontSize:15,color:'#07051c',
            boxShadow:'0 0 12px rgba(124,58,237,0.3)',
          }}>
            {user?.name?.[0] || '؟'}
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)'}}>
              {user?.name || 'المستخدم'}
            </div>
            <div style={{fontSize:10,color:'var(--text-muted)'}}>
              {user?.role === 'admin' ? 'مدير النظام' : user?.role || 'مستخدم'}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="logout-btn"
          style={{
            display:'flex',alignItems:'center',gap:9,
            padding:'9px 12px',
            borderRadius:'var(--radius-sm)',
            border:'1.5px solid transparent',
            background:'transparent',
            color:'var(--red)',
            fontSize:13,cursor:'pointer',
            width:'100%',fontFamily:'inherit',
            WebkitTapHighlightColor:'transparent',
          }}
        >
          <IcLogout size={16} />
          تسجيل الخروج
        </button>
      </div>

      {/* ── Bottom wave strips ── */}
      <div className="sidebar-waves" style={{zIndex:0}}>
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 40c33-15 66-15 100 0s66 15 100 0 66-15 100 0 66 15 100 0 66-15 100 0v40H0z"
            fill="rgba(124,58,237,0.15)"/>
        </svg>
      </div>
      <div className="sidebar-waves-2" style={{zIndex:0}}>
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 30c33-12 66-12 100 0s66 12 100 0 66-12 100 0 66 12 100 0 66-12 100 0v30H0z"
            fill="rgba(0,228,184,0.08)"/>
        </svg>
      </div>
    </div>
  )
}
