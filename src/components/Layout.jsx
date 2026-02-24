import React, { useState, useEffect, useCallback } from 'react'
import BgCanvas from './BgCanvas'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses,
  IcReports, IcInventory, IcSettings, IcLogout,
  IcTruck, IcMoreGrid, IcMoon, IcSun, IcClose,
  IcSuppliers, IcPartners, IcAccounting, IcUpload,
} from './Icons'

/* ══════════════════════════════════════════════════
   LAYOUT v9.0
   Desktop : Collapsed sidebar (64px) → expands on hover (224px)
   Mobile  : Bottom bar 4 primary + More sheet
   Motion  : Fluid crafted, 180ms, physical press
══════════════════════════════════════════════════ */

const PRIMARY_NAV = [
  { id: 'dashboard', label: 'الرئيسية',  icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',    icon: IcOrders    },
  { id: 'hayyak',   label: 'حياك',       icon: IcTruck     },
  { id: 'reports',  label: 'التقارير',   icon: IcReports   },
]

const MORE_NAV = [
  { id: 'customers',   label: 'العملاء',   icon: IcCustomers   },
  { id: 'inventory',   label: 'المخزون',   icon: IcInventory   },
  { id: 'expenses',    label: 'المصاريف',  icon: IcExpenses    },
  { id: 'suppliers',   label: 'الموردون', icon: IcSuppliers    },
  { id: 'accounting',  label: 'المحاسبة', icon: IcAccounting  },
  { id: 'import',      label: 'استيراد البيانات', icon: IcUpload  },
  { id: 'partners',    label: 'الشركاء',  icon: IcPartners     },
  { id: 'settings',   label: 'الإعدادات', icon: IcSettings    },
]

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV]

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
  const [expanded, setExpanded]  = useState(false)
  const [moreOpen, setMoreOpen]  = useState(false)
  const [prevPage, setPrevPage]  = useState(page)
  const [darkInternal, toggleInternal] = useTheme()

  // Use external theme if provided, else internal
  const dark = themeProp !== undefined ? themeProp !== 'light' : darkInternal
  const toggleTheme = toggleThemeProp || toggleInternal

  const navigate = useCallback((id) => {
    setPrevPage(page)
    onNavigate(id)
    setMoreOpen(false)
  }, [page, onNavigate])

  // Close more sheet on back button
  useEffect(() => {
    const handler = (e) => { if (moreOpen) { e.preventDefault(); setMoreOpen(false) } }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [moreOpen])

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', width:'100%', overflowX:'hidden' }}>

      {/* ── PREMIUM BACKGROUND ───────────────────────── */}
      <BgCanvas/>

      {/* ── DESKTOP SIDEBAR ──────────────────────────── */}
      <aside
        className="desktop-only"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: expanded ? 224 : 64,
          background: 'var(--sidebar-bg)',
          boxShadow: '0 0 0 1px var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          zIndex: 100,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <DesktopSidebar
          page={page} onNavigate={navigate} user={user} onLogout={onLogout}
          expanded={expanded} dark={dark} toggleTheme={toggleTheme}
        />
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────── */}
      <main
        key={page}
        style={{
          position: 'relative',
          zIndex: 1,
          marginRight: expanded ? 224 : 64,
          width: expanded ? 'calc(100vw - 224px)' : 'calc(100vw - 64px)',
          minWidth: 0,
          minHeight: '100vh',
          paddingRight: 32,
          paddingTop: 32,
          paddingLeft: 32,
          transition: 'margin-right 220ms cubic-bezier(0.4,0,0.2,1), width 220ms cubic-bezier(0.4,0,0.2,1)',
          animation: 'pageSlideIn var(--dur-page) var(--ease-out) both',
        }}
      >
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV ────────────────────────── */}
      <MobileNav
        page={page} onNavigate={navigate}
        moreOpen={moreOpen} onMoreToggle={() => setMoreOpen(o => !o)}
        dark={dark} toggleTheme={toggleTheme}
        user={user} onLogout={onLogout}
      />

      {/* Backdrop */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'var(--bg-overlay)',
            zIndex: 149,
            animation: 'fadeIn 180ms var(--ease-out)',
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @media (min-width: 769px) {
          .mobile-only, .mobile-flex { display: none !important; }
          .desktop-only { display: flex !important; }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only, .mobile-flex { display: flex !important; }
          main { margin-right: 0 !important; width: 100vw !important; padding-bottom: calc(64px + env(safe-area-inset-bottom, 12px)) !important; padding-right: 0 !important; padding-top: 0 !important; padding-left: 0 !important; }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DESKTOP SIDEBAR
══════════════════════════════════════════════════ */
function DesktopSidebar({ page, onNavigate, user, onLogout, expanded, dark, toggleTheme }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Logo */}
      <div style={{
        height: 64, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: `0 ${expanded ? 16 : 0}px`,
        justifyContent: expanded ? 'flex-start' : 'center',
        borderBottom: 'none',
        gap: 10, overflow: 'hidden',
        transition: 'padding 220ms ease',
      }}>
        <WaveLogo size={32} />
        <div style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
          transition: 'opacity 160ms ease, transform 160ms ease',
          whiteSpace: 'nowrap',
          pointerEvents: expanded ? 'auto' : 'none',
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800,
            background: 'linear-gradient(135deg, var(--action), var(--info-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>مَوج</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, WebkitTextFillColor: 'var(--text-muted)' }}>إدارة المبيعات</div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:'8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto', overflowX:'hidden' }}>
        {ALL_NAV.map(item => (
          <SidebarNavBtn
            key={item.id} item={item}
            active={page === item.id}
            expanded={expanded}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Bottom controls */}
      <div style={{ padding:'8px', borderTop:'none', display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
        <SidebarBottomBtn onClick={toggleTheme} label={dark ? 'فاتح' : 'داكن'} expanded={expanded}>
          {dark ? <IcSun size={16}/> : <IcMoon size={16}/>}
        </SidebarBottomBtn>

        {/* User info — only when expanded */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px', borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          opacity: expanded ? 1 : 0,
          maxHeight: expanded ? 60 : 0,
          transition: 'opacity 160ms ease, max-height 220ms ease',
        }}>
          <UserAvatar name={user?.name} size={28} />
          <div style={{ minWidth:0, flex:1, overflow:'hidden' }}>
            <div style={{ fontSize:12, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.name || 'المستخدم'}
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>
              {user?.role === 'admin' ? 'مدير النظام' : user?.role || 'مستخدم'}
            </div>
          </div>
        </div>

        <SidebarBottomBtn onClick={onLogout} label="خروج" expanded={expanded} danger>
          <IcLogout size={16}/>
        </SidebarBottomBtn>
      </div>
    </div>
  )
}

function SidebarNavBtn({ item, active, expanded, onClick }) {
  const Icon = item.icon
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      title={!expanded ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px',
        borderRadius: 'var(--r-md)', border: 'none',
        background: active ? 'var(--action-soft)' : 'transparent',
        color: active ? 'var(--action)' : 'var(--text-muted)',
        fontWeight: active ? 700 : 500,
        fontSize: 13, cursor: 'pointer',
        width: '100%', textAlign: 'right',
        fontFamily: 'inherit',
        justifyContent: expanded ? 'flex-start' : 'center',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'background 120ms ease, color 120ms ease, transform 100ms ease',
        position: 'relative', whiteSpace: 'nowrap', overflow: 'hidden',
      }}
    >
      {/* Active indicator line on right */}
      {active && (
        <div style={{
          position: 'absolute', right: 0, top: '50%',
          transform: 'translateY(-50%)',
          width: 3, height: 18,
          borderRadius: '0 3px 3px 0',
          background: 'var(--action)',
          boxShadow: '0 0 8px var(--action-glow)',
        }}/>
      )}

      <div style={{ flexShrink:0, display:'flex' }}>
        <Icon size={17} strokeWidth={active ? 2.2 : 1.8}/>
      </div>

      <span style={{
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateX(0)' : 'translateX(-4px)',
        transition: 'opacity 140ms ease, transform 140ms ease',
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.label}
      </span>
    </button>
  )
}

function SidebarBottomBtn({ onClick, label, expanded, danger, children }) {
  const [pressed, setPressed] = useState(false)
  const [hov, setHov] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => { setPressed(false); setHov(false) }}
      onMouseEnter={() => setHov(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px',
        borderRadius: 'var(--r-md)', border: 'none',
        background: danger
          ? (hov ? 'rgba(239,68,68,0.08)' : 'transparent')
          : (hov ? 'var(--bg-hover)' : 'transparent'),
        color: danger ? 'var(--danger)' : 'var(--text-muted)',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        width: '100%',
        justifyContent: expanded ? 'flex-start' : 'center',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'background 120ms ease, transform 100ms ease',
      }}
    >
      <div style={{ flexShrink:0, display:'flex' }}>{children}</div>
      <span style={{
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateX(0)' : 'translateX(-4px)',
        transition: 'opacity 140ms ease, transform 140ms ease',
        whiteSpace: 'nowrap',
      }}>{label}</span>
    </button>
  )
}

/* ══════════════════════════════════════════════════
   MOBILE NAVIGATION
══════════════════════════════════════════════════ */
function MobileNav({ page, onNavigate, moreOpen, onMoreToggle, dark, toggleTheme, user, onLogout }) {
  return (
    <>
      {/* Bottom bar */}
      <nav
        className="mobile-flex"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 60,
          background: 'var(--sidebar-bg)',
          borderTop: 'none',
          display: 'none',
          zIndex: 150,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {PRIMARY_NAV.map(item => (
          <MobileTabBtn key={item.id} item={item} active={page === item.id} onNavigate={onNavigate}/>
        ))}
        <MobileMoreBtn active={moreOpen} onToggle={onMoreToggle}/>
      </nav>

      {/* More sheet */}
      <div
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: moreOpen ? 60 : '-100%',
          left: 0, right: 0,
          background: 'var(--modal-bg)',
          boxShadow: 'var(--modal-shadow)',
          borderRadius: '20px 20px 0 0',
          zIndex: 150,
          display: 'none',
          flexDirection: 'column',
          transition: 'bottom 240ms cubic-bezier(0.4,0,0.2,1)',
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 99,
          background: 'var(--border-strong)',
          margin: '12px auto 0',
          flexShrink: 0,
        }}/>

        {/* Sheet header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: 'none',
          flexShrink: 0,
        }}>
          {/* User */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <UserAvatar name={user?.name} size={32}/>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>{user?.name || 'المستخدم'}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                {user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:'flex', gap:8 }}>
            <IconSheetBtn onClick={toggleTheme}>
              {dark ? <IcSun size={16}/> : <IcMoon size={16}/>}
            </IconSheetBtn>
            <IconSheetBtn onClick={onMoreToggle}>
              <IcClose size={16}/>
            </IconSheetBtn>
          </div>
        </div>

        {/* Nav list */}
        <div style={{ padding: '8px 0' }}>
          {MORE_NAV.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <SheetNavRow
                key={item.id}
                active={active}
                onClick={() => onNavigate(item.id)}
                icon={<Icon size={18} strokeWidth={active ? 2.2 : 1.8}/>}
                label={item.label}
              />
            )
          })}
        </div>

        {/* Logout */}
        <div style={{ padding: '0 12px 24px' }}>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent:'center', gap: 8,
              padding: '12px 16px',
              borderRadius: 'var(--r-md)', border: 'none',
              background: 'rgba(239,68,68,0.06)',
              color: 'var(--danger)',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
              width: '100%',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <IcLogout size={16}/> تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  )
}

function MobileTabBtn({ item, active, onNavigate }) {
  const Icon = item.icon
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={() => onNavigate(item.id)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        background: 'none', border: 'none',
        color: active ? 'var(--action)' : 'var(--text-muted)',
        cursor: 'pointer', fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'color 120ms ease, transform 100ms ease',
        position: 'relative', paddingTop: 6,
      }}
    >
      {/* Active pill indicator */}
      {active && (
        <div style={{
          position: 'absolute', top: 0,
          width: 24, height: 3,
          borderRadius: '0 0 3px 3px',
          background: 'var(--action)',
          boxShadow: '0 2px 8px var(--action-glow)',
        }}/>
      )}
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8}/>
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{item.label}</span>
    </button>
  )
}

function MobileMoreBtn({ active, onToggle }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onToggle}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        background: 'none', border: 'none',
        color: active ? 'var(--action)' : 'var(--text-muted)',
        cursor: 'pointer', fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'color 120ms ease, transform 100ms ease',
        position: 'relative', paddingTop: 6,
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', top: 0,
          width: 24, height: 3,
          borderRadius: '0 0 3px 3px',
          background: 'var(--action)',
          boxShadow: '0 2px 8px var(--action-glow)',
        }}/>
      )}
      <IcMoreGrid size={20}/>
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>المزيد</span>
    </button>
  )
}

function SheetNavRow({ active, onClick, icon, label }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px',
        width: '100%', border: 'none',
        background: active ? 'var(--action-soft)' : (pressed ? 'var(--bg-hover)' : 'transparent'),
        color: active ? 'var(--action)' : 'var(--text-sec)',
        cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 14, fontWeight: active ? 700 : 500,
        textAlign: 'right',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'background 100ms ease, transform 80ms ease',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <span>{label}</span>
      {active && (
        <div style={{
          marginRight: 'auto', marginLeft: 0,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--action)',
        }}/>
      )}
    </button>
  )
}

function IconSheetBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36,
        borderRadius: 'var(--r-md)', border: 'none',
        background: 'var(--bg-hover)', color: 'var(--text-sec)',
        cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

/* ══════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════ */
function WaveLogo({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--r-sm)',
      background: 'var(--action-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * .6} height={size * .6} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="wLogo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00e4b8"/>
            <stop offset="1" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>
        <path d="M4 20c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
          stroke="url(#wLogo)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M4 14c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
          stroke="url(#wLogo)" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
      </svg>
    </div>
  )
}

function UserAvatar({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--action), var(--info))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * .4, color: '#031a13',
    }}>
      {name?.[0] || 'م'}
    </div>
  )
}
