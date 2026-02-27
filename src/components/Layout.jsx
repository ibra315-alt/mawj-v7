import React, { useState, useEffect, useCallback, useRef } from 'react'
import BgCanvas from './BgCanvas'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses,
  IcReports, IcInventory, IcSettings, IcLogout,
  IcTruck, IcMoon, IcSun, IcClose,
  IcSuppliers, IcPartners, IcAccounting, IcUpload,
} from './Icons'

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
   LAYOUT v10 — THE DOCK
   Desktop : Floating glass pill at bottom-center
   Mobile  : Floating pill + Wave center button
   Content : Full-width, max-width 1200px centered
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

export default function Layout({ page, onNavigate, user, onLogout, children, theme: themeProp, toggleTheme: toggleThemeProp }) {
  const [moreOpen, setMoreOpen]     = useState(false)
  const [dockVisible, setDockVisible] = useState(true)
  const [darkInternal, toggleInternal] = useTheme()
  const lastScrollY = useRef(0)

  const dark = themeProp !== undefined ? themeProp !== 'light' : darkInternal
  const toggleTheme = toggleThemeProp || toggleInternal

  const navigate = useCallback((id) => {
    onNavigate(id)
    setMoreOpen(false)
  }, [onNavigate])

  // Auto-hide dock on scroll down, show on scroll up
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

  // Show dock on bottom-edge hover (desktop)
  useEffect(() => {
    const handleMouse = (e) => {
      if (e.clientY > window.innerHeight - 24) setDockVisible(true)
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  // Close wave menu on Escape / back button
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && moreOpen) setMoreOpen(false) }
    const handlePop = (e) => { if (moreOpen) { e.preventDefault(); setMoreOpen(false) } }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('popstate', handlePop)
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('popstate', handlePop) }
  }, [moreOpen])

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--bg)', width:'100%', overflowX:'hidden' }}>

      {/* ── PREMIUM BACKGROUND ── */}
      <BgCanvas/>

      {/* ── MAIN CONTENT ── full-width, max-width centered ── */}
      <main
        key={page}
        className="layout-main"
        style={{
          position:'relative', zIndex:1,
          width:'100%', maxWidth:1200,
          margin:'0 auto',
          minHeight:'100vh',
          animation:'pageSlideIn var(--dur-page) var(--ease-out) both',
        }}
      >
        {children}
      </main>

      {/* ── DESKTOP DOCK ── floating glass pill at bottom-center ── */}
      <DesktopDock
        page={page} onNavigate={navigate}
        dark={dark} toggleTheme={toggleTheme}
        onLogout={onLogout} visible={dockVisible}
      />

      {/* ── MOBILE DOCK ── floating pill + wave menu ── */}
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
            zIndex:149,
            animation:'fadeIn 180ms var(--ease-out)',
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes waveMenuIn {
          from { opacity:0; transform:translateY(20px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes dockTooltip {
          from { opacity:0; transform:translateX(-50%) translateY(4px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @media (min-width: 769px) {
          .mobile-dock, .mobile-wave-menu { display: none !important; }
          .desktop-dock { display: flex !important; }
          .layout-main { padding: 32px 32px 88px !important; }
        }
        @media (max-width: 768px) {
          .desktop-dock { display: none !important; }
          .mobile-dock { display: flex !important; }
          .layout-main { padding: 16px 12px 88px !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DESKTOP DOCK — Floating glass pill at bottom-center
   All nav items as icons, grouped with dividers
   Labels appear on hover as tooltips
══════════════════════════════════════════════════ */
function DesktopDock({ page, onNavigate, dark, toggleTheme, onLogout, visible }) {
  return (
    <div
      className="desktop-dock"
      style={{
        position:'fixed',
        bottom: visible ? 16 : -80,
        left:'50%', transform:'translateX(-50%)',
        zIndex:200,
        display:'none',
        alignItems:'center', gap:2,
        padding:'6px 12px',
        background: dark ? 'rgba(6,10,20,0.88)' : 'rgba(255,255,255,0.88)',
        backdropFilter:'blur(24px) saturate(1.8)',
        WebkitBackdropFilter:'blur(24px) saturate(1.8)',
        borderRadius:999,
        border:`1px solid ${dark ? 'rgba(30,58,95,0.5)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: dark
          ? '0 8px 32px rgba(3,9,20,0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 4px 24px rgba(15,14,12,0.12)',
        transition:'bottom 300ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {PRIMARY_NAV.map(item => (
        <DockItem key={item.id} item={item} active={page === item.id} onClick={() => onNavigate(item.id)} />
      ))}
      <DockDivider />
      {SECONDARY_NAV.map(item => (
        <DockItem key={item.id} item={item} active={page === item.id} onClick={() => onNavigate(item.id)} />
      ))}
      <DockDivider />
      {TERTIARY_NAV.map(item => (
        <DockItem key={item.id} item={item} active={page === item.id} onClick={() => onNavigate(item.id)} />
      ))}
      <DockDivider />
      <DockControl onClick={toggleTheme} title={dark ? 'وضع فاتح' : 'وضع داكن'}>
        {dark ? <IcSun size={16}/> : <IcMoon size={16}/>}
      </DockControl>
      <DockControl onClick={onLogout} title="خروج" danger>
        <IcLogout size={16}/>
      </DockControl>
    </div>
  )
}

function DockItem({ item, active, onClick }) {
  const Icon = item.icon
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ position:'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        title={item.label}
        style={{
          width:40, height:40,
          borderRadius:'var(--r-md)',
          border:'none',
          background: active ? 'var(--action-soft)' : 'transparent',
          color: active ? 'var(--action)' : 'var(--text-muted)',
          cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
          transform: hovered && !active ? 'translateY(-4px) scale(1.15)' : 'scale(1)',
          WebkitTapHighlightColor:'transparent',
        }}
      >
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8}/>
      </button>

      {/* Active indicator dot */}
      {active && (
        <div style={{
          position:'absolute', bottom:-1, left:'50%',
          transform:'translateX(-50%)',
          width:4, height:4, borderRadius:'50%',
          background:'var(--action)',
          boxShadow:'0 0 8px var(--action-glow)',
        }}/>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div style={{
          position:'absolute', bottom:'100%', left:'50%',
          transform:'translateX(-50%)',
          marginBottom:8,
          padding:'5px 10px',
          background:'var(--bg-surface)',
          borderRadius:'var(--r-sm)',
          boxShadow:'var(--float-shadow)',
          border:'1px solid var(--border)',
          fontSize:11, fontWeight:700,
          color:'var(--text)',
          whiteSpace:'nowrap',
          pointerEvents:'none',
          animation:'dockTooltip 120ms ease both',
        }}>
          {item.label}
        </div>
      )}
    </div>
  )
}

function DockDivider() {
  return (
    <div style={{
      width:1, height:20,
      background:'var(--border)',
      margin:'0 4px',
      opacity:0.5,
      flexShrink:0,
    }}/>
  )
}

function DockControl({ onClick, title, children, danger }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:36, height:36,
        borderRadius:'var(--r-md)',
        border:'none',
        background: hovered
          ? (danger ? 'rgba(239,68,68,0.12)' : 'var(--bg-hover)')
          : 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-muted)',
        cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 120ms ease',
        WebkitTapHighlightColor:'transparent',
      }}
    >
      {children}
    </button>
  )
}

/* ══════════════════════════════════════════════════
   MOBILE DOCK — Floating pill with wave center button
   4 primary items + center wave button
   Wave button opens a grid of remaining nav items
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
          height:56,
          zIndex:200,
          display:'none',
          alignItems:'center',
          justifyContent:'space-around',
          padding:'0 4px',
          background: dark ? 'rgba(6,10,20,0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter:'blur(24px) saturate(1.8)',
          WebkitBackdropFilter:'blur(24px) saturate(1.8)',
          borderRadius:999,
          border:`1px solid ${dark ? 'rgba(30,58,95,0.4)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: dark
            ? '0 8px 32px rgba(3,9,20,0.6)'
            : '0 4px 24px rgba(15,14,12,0.12)',
          transition:'bottom 300ms cubic-bezier(0.4,0,0.2,1)',
          paddingBottom:'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* First 2 primary items */}
        {PRIMARY_NAV.slice(0, 2).map(item => (
          <MobileDockBtn key={item.id} item={item} active={page === item.id} onNavigate={onNavigate}/>
        ))}

        {/* Center wave button */}
        <WaveButton active={moreOpen} onToggle={() => setMoreOpen(o => !o)}/>

        {/* Last 2 primary items */}
        {PRIMARY_NAV.slice(2).map(item => (
          <MobileDockBtn key={item.id} item={item} active={page === item.id} onNavigate={onNavigate}/>
        ))}
      </nav>

      {/* ── Wave menu — grid of remaining items ── */}
      {moreOpen && (
        <div
          className="mobile-wave-menu"
          style={{
            position:'fixed',
            bottom:82,
            left:16, right:16,
            zIndex:200,
            background: dark ? 'rgba(8,15,28,0.96)' : 'rgba(255,255,255,0.96)',
            backdropFilter:'blur(32px) saturate(1.8)',
            WebkitBackdropFilter:'blur(32px) saturate(1.8)',
            borderRadius:'var(--r-xl)',
            border:`1px solid ${dark ? 'rgba(30,58,95,0.4)' : 'rgba(0,0,0,0.06)'}`,
            boxShadow: dark
              ? '0 16px 48px rgba(3,9,20,0.7)'
              : '0 8px 32px rgba(15,14,12,0.15)',
            padding:16,
            animation:'waveMenuIn 200ms var(--ease-out) both',
          }}
        >
          {/* User + controls header */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:16, paddingBottom:12,
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
                width:36, height:36, borderRadius:'var(--r-md)',
                border:'none', background:'var(--bg-hover)',
                color:'var(--text-muted)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
              }}>
                {dark ? <IcSun size={16}/> : <IcMoon size={16}/>}
              </button>
              <button onClick={() => setMoreOpen(false)} style={{
                width:36, height:36, borderRadius:'var(--r-md)',
                border:'none', background:'var(--bg-hover)',
                color:'var(--text-muted)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                WebkitTapHighlightColor:'transparent',
              }}>
                <IcClose size={16}/>
              </button>
            </div>
          </div>

          {/* Nav grid — 3 columns */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3, 1fr)',
            gap:8, marginBottom:12,
          }}>
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
                    border: active ? '1.5px solid var(--action)' : '1.5px solid transparent',
                    background: active ? 'var(--action-soft)' : 'var(--bg-hover)',
                    color: active ? 'var(--action)' : 'var(--text-sec)',
                    cursor:'pointer', fontFamily:'inherit',
                    fontSize:11, fontWeight: active ? 700 : 500,
                    WebkitTapHighlightColor:'transparent',
                    transition:'all 120ms ease',
                  }}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8}/>
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
              borderRadius:'var(--r-md)', border:'none',
              background:'rgba(239,68,68,0.06)',
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
        alignItems:'center', justifyContent:'center', gap:2,
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
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8}/>
      <span style={{ fontSize:9, fontWeight: active ? 700 : 400 }}>{item.label}</span>
      {active && (
        <div style={{
          position:'absolute', bottom:0,
          width:16, height:2,
          borderRadius:2,
          background:'var(--action)',
          boxShadow:'0 0 8px var(--action-glow)',
        }}/>
      )}
    </button>
  )
}

/* ══════════════════════════════════════════════════
   WAVE BUTTON — Center dock button
   Wave logo when closed, X when open
   Gradient background with glow
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
          ? '0 4px 16px rgba(239,68,68,0.4)'
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
      background:'linear-gradient(135deg, var(--action), var(--info))',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:800, fontSize:size * .4, color:'#031a13',
    }}>
      {name?.[0] || 'م'}
    </div>
  )
}
