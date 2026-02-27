import React, { useState, useEffect, useCallback, useRef } from 'react'
import BgCanvas from './BgCanvas'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses,
  IcReports, IcInventory, IcSettings, IcLogout,
  IcTruck, IcMoon, IcSun, IcClose,
  IcSuppliers, IcPartners, IcAccounting, IcUpload,
} from './Icons'
import MawjLogo from './Logo'

// Agent icon
const IcAgent = (p) => (
  <svg {...p} width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
    <line x1="12" y1="3" x2="12" y2="1"/>
    <line x1="8" y1="3" x2="7" y2="1"/>
    <line x1="16" y1="3" x2="17" y2="1"/>
  </svg>
)

/* ══════════════════════════════════════════════════
   LAYOUT v11 — CRYSTAL LUXURY
   Desktop : Glass sidebar (right side in RTL)
   Mobile  : Glass floating dock + wave menu
   Content : Full-width with sidebar offset
══════════════════════════════════════════════════ */

const PRIMARY_NAV = [
  { id: 'dashboard', label: 'الرئيسية',  icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',    icon: IcOrders    },
  { id: 'hayyak',    label: 'حياك',       icon: IcTruck     },
  { id: 'reports',   label: 'التقارير',   icon: IcReports   },
]

const SECONDARY_NAV = [
  { id: 'customers',  label: 'العملاء',    icon: IcCustomers  },
  { id: 'inventory',  label: 'المخزون',    icon: IcInventory  },
  { id: 'expenses',   label: 'المصاريف',   icon: IcExpenses   },
  { id: 'suppliers',  label: 'الموردون',   icon: IcSuppliers  },
]

const TERTIARY_NAV = [
  { id: 'accounting', label: 'المحاسبة',   icon: IcAccounting },
  { id: 'partners',   label: 'الشركاء',    icon: IcPartners   },
  { id: 'import',     label: 'استيراد',     icon: IcUpload     },
  { id: 'agent',      label: 'الوكيل',     icon: IcAgent      },
  { id: 'settings',   label: 'الإعدادات',  icon: IcSettings   },
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV, ...TERTIARY_NAV]

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('mawj-theme') !== 'light' } catch { return true }
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    try { localStorage.setItem('mawj-theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])
  return [dark, () => setDark(d => !d)]
}

const SIDEBAR_W = 240

export default function Layout({ page, onNavigate, user, onLogout, children, theme: themeProp, toggleTheme: toggleThemeProp }) {
  const [moreOpen, setMoreOpen]     = useState(false)
  const [dockVisible, setDockVisible] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkInternal, toggleInternal] = useTheme()
  const lastScrollY = useRef(0)

  const dark = themeProp !== undefined ? themeProp !== 'light' : darkInternal
  const toggleTheme = toggleThemeProp || toggleInternal

  const navigate = useCallback((id) => {
    onNavigate(id)
    setMoreOpen(false)
  }, [onNavigate])

  // Auto-hide dock on scroll down (mobile)
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY > lastScrollY.current + 12 && currentY > 120) {
        setDockVisible(false)
      } else if (currentY < lastScrollY.current - 6 || currentY < 60) {
        setDockVisible(true)
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Show dock on bottom-edge hover (desktop fallback)
  useEffect(() => {
    const handleMouse = (e) => {
      if (e.clientY > window.innerHeight - 24) setDockVisible(true)
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  // Close wave menu on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && moreOpen) setMoreOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [moreOpen])

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', width:'100%', overflowX:'hidden' }}>

      {/* ── PREMIUM BACKGROUND ── */}
      <BgCanvas/>

      {/* ── DESKTOP SIDEBAR ── */}
      <DesktopSidebar
        page={page} onNavigate={navigate}
        dark={dark} toggleTheme={toggleTheme}
        user={user} onLogout={onLogout}
      />

      {/* ── MAIN CONTENT ── */}
      <main
        key={page}
        className="layout-main"
        style={{
          position:'relative', zIndex:1,
          flex:1, minHeight:'100vh',
          maxWidth: 1200,
          animation:'pageSlideIn var(--dur-page) var(--ease-out) both',
        }}
      >
        {children}
      </main>

      {/* ── MOBILE DOCK ── */}
      <MobileDock
        page={page} onNavigate={navigate}
        dark={dark} toggleTheme={toggleTheme}
        user={user} onLogout={onLogout}
        moreOpen={moreOpen} setMoreOpen={setMoreOpen}
        visible={dockVisible}
      />

      {/* Backdrop for wave menu */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position:'fixed', inset:0,
            background:'var(--bg-overlay)',
            backdropFilter:'blur(4px)',
            WebkitBackdropFilter:'blur(4px)',
            zIndex:149,
            animation:'fadeIn 180ms var(--ease-out)',
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes waveMenuIn {
          from { opacity:0; transform:translateY(20px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes sidebarItemIn {
          from { opacity:0; transform:translateX(8px); }
          to   { opacity:1; transform:translateX(0); }
        }

        /* ── Desktop: sidebar visible, dock hidden ── */
        @media (min-width: 769px) {
          .mobile-dock, .mobile-wave-menu { display: none !important; }
          .desktop-sidebar { display: flex !important; }
          .layout-main {
            margin-inline-start: ${SIDEBAR_W}px !important;
            padding: 28px 32px 40px !important;
          }
        }

        /* ── Mobile: dock visible, sidebar hidden ── */
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-dock { display: flex !important; }
          .layout-main {
            padding: 16px 14px 88px !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}


/* ══════════════════════════════════════════════════
   DESKTOP SIDEBAR — Glass panel on the right (RTL start)
   Logo · Grouped nav · User footer
══════════════════════════════════════════════════ */
function DesktopSidebar({ page, onNavigate, dark, toggleTheme, user, onLogout }) {
  return (
    <aside
      className="desktop-sidebar"
      style={{
        position:'fixed',
        top:0, bottom:0,
        insetInlineStart:0,
        width:SIDEBAR_W,
        zIndex:100,
        display:'none',
        flexDirection:'column',
        background: dark ? 'rgba(8,9,13,0.75)' : 'rgba(255,255,255,0.60)',
        backdropFilter:'blur(48px) saturate(1.5)',
        WebkitBackdropFilter:'blur(48px) saturate(1.5)',
        borderInlineEnd:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        transition:'background 300ms ease',
      }}
    >
      {/* ── Logo area ── */}
      <div style={{
        padding:'24px 20px 16px',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:40, height:40, borderRadius:'var(--r-md)',
          background:'var(--action-soft)',
          border:'1px solid rgba(0,228,184,0.10)',
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          <MawjLogo size={24} color="var(--action)"/>
        </div>
        <div>
          <div style={{
            fontSize:20, fontWeight:900, lineHeight:1,
            background:'linear-gradient(135deg, var(--action), var(--gold-500))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>مَوج</div>
          <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'0.08em', marginTop:2 }}>
            CRYSTAL GIFTS ERP
          </div>
        </div>
      </div>

      {/* ── Accent line ── */}
      <div style={{
        height:1, marginInline:16,
        background:'linear-gradient(90deg, transparent, var(--action), var(--gold-500), transparent)',
        opacity:0.25,
      }}/>

      {/* ── Nav sections ── */}
      <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'12px 10px', scrollbarWidth:'none' }}>
        <NavGroup label="القائمة الرئيسية" items={PRIMARY_NAV} page={page} onNavigate={onNavigate} delay={0}/>
        <NavGroup label="إدارة" items={SECONDARY_NAV} page={page} onNavigate={onNavigate} delay={4}/>
        <NavGroup label="أخرى" items={TERTIARY_NAV} page={page} onNavigate={onNavigate} delay={8}/>
      </nav>

      {/* ── Footer — user + controls ── */}
      <div style={{
        padding:'12px 14px 16px',
        borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
      }}>
        {/* User */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <UserAvatar name={user?.name} size={32}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.name || 'المستخدم'}
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>
              {user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display:'flex', gap:6 }}>
          <button
            onClick={toggleTheme}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'8px 0', borderRadius:'var(--r-sm)',
              background:'var(--bg-hover)', border:'1px solid var(--border)',
              color:'var(--text-sec)', fontSize:11, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
              transition:'all 120ms ease',
              WebkitTapHighlightColor:'transparent',
            }}
          >
            {dark ? <IcSun size={14}/> : <IcMoon size={14}/>}
            {dark ? 'فاتح' : 'داكن'}
          </button>
          <button
            onClick={onLogout}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'8px 0', borderRadius:'var(--r-sm)',
              background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.06)',
              color:'var(--danger)', fontSize:11, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
              transition:'all 120ms ease',
              WebkitTapHighlightColor:'transparent',
            }}
          >
            <IcLogout size={14}/> خروج
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavGroup({ label, items, page, onNavigate, delay }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{
        fontSize:10, fontWeight:700, color:'var(--text-muted)',
        letterSpacing:'0.08em', textTransform:'uppercase',
        padding:'4px 10px 8px', lineHeight:1,
      }}>
        {label}
      </div>
      {items.map((item, i) => (
        <SidebarItem key={item.id} item={item} active={page === item.id} onClick={() => onNavigate(item.id)} index={delay + i}/>
      ))}
    </div>
  )
}

function SidebarItem({ item, active, onClick, index }) {
  const [hovered, setHovered] = useState(false)
  const Icon = item.icon

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:'100%', display:'flex', alignItems:'center', gap:10,
        padding:'9px 12px',
        borderRadius:'var(--r-sm)',
        border: active ? '1px solid rgba(0,228,184,0.12)' : '1px solid transparent',
        background: active ? 'var(--action-soft)' : hovered ? 'var(--bg-hover)' : 'transparent',
        color: active ? 'var(--action)' : hovered ? 'var(--text)' : 'var(--text-sec)',
        cursor:'pointer', fontFamily:'inherit',
        fontSize:13, fontWeight: active ? 700 : 500,
        transition:'all 140ms ease',
        WebkitTapHighlightColor:'transparent',
        animation: `sidebarItemIn 200ms ease both`,
        animationDelay: `${index * 30}ms`,
      }}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.7}/>
      <span style={{ flex:1, textAlign:'start' }}>{item.label}</span>
      {active && (
        <div style={{
          width:4, height:4, borderRadius:'50%',
          background:'var(--action)',
          boxShadow:'0 0 8px var(--action-glow)',
        }}/>
      )}
    </button>
  )
}


/* ══════════════════════════════════════════════════
   MOBILE DOCK — Glass floating pill + wave menu
══════════════════════════════════════════════════ */
function MobileDock({ page, onNavigate, dark, toggleTheme, user, onLogout, moreOpen, setMoreOpen, visible }) {
  return (
    <>
      {/* Bottom floating dock pill */}
      <nav
        className="mobile-dock"
        style={{
          position:'fixed',
          bottom: visible ? 12 : -80,
          left:12, right:12,
          height:58,
          zIndex:200,
          display:'none',
          alignItems:'center',
          justifyContent:'space-around',
          padding:'0 4px',
          background: dark ? 'rgba(8,9,13,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter:'blur(40px) saturate(1.6)',
          WebkitBackdropFilter:'blur(40px) saturate(1.6)',
          borderRadius:999,
          border:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: dark
            ? '0 8px 32px rgba(0,0,0,0.5)'
            : '0 4px 24px rgba(15,14,12,0.10)',
          transition:'bottom 300ms cubic-bezier(0.4,0,0.2,1)',
          paddingBottom:'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {PRIMARY_NAV.slice(0, 2).map(item => (
          <MobileDockBtn key={item.id} item={item} active={page === item.id} onNavigate={onNavigate}/>
        ))}
        <WaveButton active={moreOpen} onToggle={() => setMoreOpen(o => !o)}/>
        {PRIMARY_NAV.slice(2).map(item => (
          <MobileDockBtn key={item.id} item={item} active={page === item.id} onNavigate={onNavigate}/>
        ))}
      </nav>

      {/* ── Wave menu — glass grid ── */}
      {moreOpen && (
        <div
          className="mobile-wave-menu"
          style={{
            position:'fixed',
            bottom:84,
            left:14, right:14,
            zIndex:200,
            background: dark ? 'rgba(13,14,20,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter:'blur(48px) saturate(1.6)',
            WebkitBackdropFilter:'blur(48px) saturate(1.6)',
            borderRadius:'var(--r-xl)',
            border:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            boxShadow: dark
              ? '0 16px 48px rgba(0,0,0,0.6)'
              : '0 8px 32px rgba(15,14,12,0.12)',
            padding:16,
            animation:'waveMenuIn 200ms var(--ease-out) both',
          }}
        >
          {/* User header */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:14, paddingBottom:12,
            borderBottom:'1px solid var(--border)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <UserAvatar name={user?.name} size={32}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{user?.name || 'المستخدم'}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                  {user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={toggleTheme} style={{
                width:36, height:36, borderRadius:'var(--r-sm)',
                border:'1px solid var(--border)', background:'var(--bg-hover)',
                color:'var(--text-muted)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
              }}>
                {dark ? <IcSun size={16}/> : <IcMoon size={16}/>}
              </button>
              <button onClick={() => setMoreOpen(false)} style={{
                width:36, height:36, borderRadius:'var(--r-sm)',
                border:'1px solid var(--border)', background:'var(--bg-hover)',
                color:'var(--text-muted)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
              }}>
                <IcClose size={16}/>
              </button>
            </div>
          </div>

          {/* Nav grid — 3 columns */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:12 }}>
            {[...SECONDARY_NAV, ...TERTIARY_NAV].map(item => {
              const Icon = item.icon
              const active = page === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    gap:6, padding:'14px 8px',
                    borderRadius:'var(--r-md)',
                    border: active ? '1px solid rgba(0,228,184,0.15)' : '1px solid var(--border)',
                    background: active ? 'var(--action-soft)' : 'var(--bg-hover)',
                    color: active ? 'var(--action)' : 'var(--text-sec)',
                    cursor:'pointer', fontFamily:'inherit',
                    fontSize:11, fontWeight: active ? 700 : 500,
                    WebkitTapHighlightColor:'transparent',
                    transition:'all 120ms ease',
                  }}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.7}/>
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:8, padding:'12px', width:'100%',
              borderRadius:'var(--r-md)',
              border:'1px solid rgba(239,68,68,0.06)',
              background:'rgba(239,68,68,0.04)',
              color:'var(--danger)',
              cursor:'pointer', fontFamily:'inherit',
              fontSize:13, fontWeight:700,
              WebkitTapHighlightColor:'transparent',
            }}
          >
            <IcLogout size={16}/> تسجيل الخروج
          </button>
        </div>
      )}
    </>
  )
}

function MobileDockBtn({ item, active, onNavigate }) {
  const Icon = item.icon
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={() => onNavigate(item.id)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:3,
        background:'none', border:'none',
        color: active ? 'var(--action)' : 'var(--text-muted)',
        cursor:'pointer', fontFamily:'inherit',
        transform: pressed ? 'scale(0.85)' : 'scale(1)',
        transition:'all 120ms ease',
        WebkitTapHighlightColor:'transparent',
        padding:'6px 0',
        position:'relative',
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.7}/>
      <span style={{ fontSize:9, fontWeight: active ? 700 : 400 }}>{item.label}</span>
      {active && (
        <div style={{
          position:'absolute', bottom:0,
          width:16, height:2, borderRadius:2,
          background:'var(--action)',
          boxShadow:'0 0 8px var(--action-glow)',
        }}/>
      )}
    </button>
  )
}


/* ══════════════════════════════════════════════════
   WAVE BUTTON — Center dock button
══════════════════════════════════════════════════ */
function WaveButton({ active, onToggle }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onToggle}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width:48, height:48,
        borderRadius:'50%',
        border:'none',
        background: active
          ? 'linear-gradient(135deg, var(--danger), #cc1020)'
          : 'linear-gradient(135deg, var(--action), var(--action-deep))',
        color: active ? '#fff' : '#031a13',
        cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: active
          ? '0 4px 16px rgba(239,68,68,0.35)'
          : '0 4px 16px var(--action-glow)',
        transform: pressed ? 'scale(0.88)' : active ? 'rotate(45deg)' : 'scale(1)',
        transition:'all 200ms cubic-bezier(0.4,0,0.2,1)',
        WebkitTapHighlightColor:'transparent',
        margin:'0 4px',
        flexShrink:0,
      }}
    >
      {active ? (
        <IcClose size={20} strokeWidth={2.5}/>
      ) : (
        <svg width={22} height={22} viewBox="0 0 32 32" fill="none">
          <path d="M4 20c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M4 14c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
        </svg>
      )}
    </button>
  )
}


/* ══════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════ */
function UserAvatar({ name, size = 32 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:'linear-gradient(135deg, var(--action), var(--gold-500))',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:800, fontSize:size * .38, color:'#031a13',
    }}>
      {name?.[0] || 'م'}
    </div>
  )
}
