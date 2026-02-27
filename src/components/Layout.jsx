import React, { useState, useEffect, useCallback } from 'react'
import BgCanvas from './BgCanvas'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses,
  IcReports, IcInventory, IcSettings, IcLogout,
  IcTruck, IcClose,
  IcSuppliers, IcPartners, IcAccounting, IcUpload,
  IcWhatsapp,
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

// More/grid icon for mobile
const IcMore = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
)

/* ══════════════════════════════════════════════════
   NAVIGATION STRUCTURE
   Organized into semantic groups
══════════════════════════════════════════════════ */

const NAV_GROUPS = [
  {
    label: 'العمليات',
    items: [
      { id: 'dashboard', label: 'الرئيسية',  icon: IcDashboard },
      { id: 'orders',    label: 'الطلبات',    icon: IcOrders    },
      { id: 'hayyak',    label: 'حياك',       icon: IcTruck     },
      { id: 'inventory', label: 'المخزون',    icon: IcInventory },
    ],
  },
  {
    label: 'العملاء',
    items: [
      { id: 'customers', label: 'العملاء',   icon: IcCustomers },
      { id: 'suppliers', label: 'الموردون',  icon: IcSuppliers },
      { id: 'whatsapp',  label: 'واتساب',    icon: IcWhatsapp  },
    ],
  },
  {
    label: 'المالية',
    items: [
      { id: 'expenses',   label: 'المصاريف',  icon: IcExpenses   },
      { id: 'accounting', label: 'المحاسبة',  icon: IcAccounting },
      { id: 'partners',   label: 'الشركاء',   icon: IcPartners   },
    ],
  },
  {
    label: 'التحليلات',
    items: [
      { id: 'reports', label: 'التقارير', icon: IcReports },
      { id: 'agent',   label: 'الوكيل',  icon: IcAgent   },
    ],
  },
  {
    label: 'النظام',
    items: [
      { id: 'import',   label: 'استيراد',    icon: IcUpload   },
      { id: 'settings', label: 'الإعدادات', icon: IcSettings },
    ],
  },
]

// Flat list for lookups
const ALL_NAV = NAV_GROUPS.flatMap(g => g.items)

// Mobile primary tabs (4 + More)
const MOBILE_TABS = [
  { id: 'dashboard', label: 'الرئيسية', icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',   icon: IcOrders    },
  { id: 'hayyak',    label: 'حياك',      icon: IcTruck     },
  { id: 'customers', label: 'العملاء',   icon: IcCustomers },
]

// Items shown in the "More" menu on mobile
const MORE_ITEMS = ALL_NAV.filter(n => !MOBILE_TABS.some(t => t.id === n.id))


export default function Layout({ page, onNavigate, user, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('mawj-sidebar') === 'collapsed' } catch { return false }
  })
  const [moreOpen, setMoreOpen] = useState(false)

  const navigate = useCallback((id) => {
    onNavigate(id)
    setMoreOpen(false)
  }, [onNavigate])

  // Persist sidebar state
  useEffect(() => {
    try { localStorage.setItem('mawj-sidebar', collapsed ? 'collapsed' : 'expanded') } catch {}
  }, [collapsed])

  // Close more menu on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && moreOpen) setMoreOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [moreOpen])

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', width:'100%', overflowX:'hidden' }}>

      {/* ── PREMIUM BACKGROUND ── */}
      <BgCanvas/>

      {/* ══════════ DESKTOP SIDEBAR ══════════ */}
      <aside
        className="sidebar"
        style={{ width: sidebarWidth }}
      >
        {/* Logo header */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding: collapsed ? '16px 0' : '16px 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          marginBottom: 8,
          flexShrink: 0,
        }}>
          <div
            onClick={() => setCollapsed(c => !c)}
            style={{
              width:36, height:36, borderRadius:'var(--r-md)', flexShrink:0,
              background:'linear-gradient(135deg, var(--action-soft), rgba(var(--info-rgb),0.06))',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer',
              transition:'all var(--dur-base) var(--ease-io)',
              boxShadow:'0 0 20px rgba(var(--action-rgb),0.15)',
            }}
            title={collapsed ? 'توسيع' : 'تصغير'}
          >
            <MawjLogo size={22} color="var(--action)" />
          </div>
          {!collapsed && (
            <div style={{ overflow:'hidden', whiteSpace:'nowrap' }}>
              <div style={{
                fontSize: 18, fontWeight: 900,
                background: 'linear-gradient(135deg, var(--action), var(--info-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}>مَوج</div>
              <div style={{ fontSize: 10, color:'var(--text-muted)' }}>إدارة المبيعات</div>
            </div>
          )}
        </div>

        {/* Navigation groups */}
        <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'0 0 8px' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 8 }}>
              {!collapsed && (
                <div className="sidebar-section-label">{group.label}</div>
              )}
              {collapsed && gi > 0 && (
                <div style={{ height:1, background:'var(--border)', margin:'8px 12px', opacity:0.5 }}/>
              )}
              {group.items.map(item => {
                const Icon = item.icon
                const active = page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`sidebar-nav-item ${active ? 'sidebar-nav-item-active' : ''}`}
                    style={{
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '10px 0' : '10px 16px',
                      margin: collapsed ? '2px 8px' : '2px 8px',
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink:0 }}/>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom controls */}
        <div style={{ flexShrink:0, padding:8, borderTop:'1px solid var(--border)' }}>
          {/* User info */}
          {!collapsed && user && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', marginBottom:8,
            }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg, var(--action), var(--info))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:13, color:'#fff',
                boxShadow:'0 0 14px rgba(var(--action-rgb),0.25)',
              }}>{user?.name?.[0] || 'م'}</div>
              <div style={{ overflow:'hidden', flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name || 'المستخدم'}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                  {{ admin:'مدير النظام', accountant:'محاسب', sales:'مبيعات', viewer:'مشاهد' }[user?.role] || user?.role}
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="sidebar-nav-item"
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 16px',
              margin: '2px 8px',
              color: 'var(--danger)',
            }}
            title="خروج"
          >
            <IcLogout size={18}/>
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main
        key={page}
        className="layout-main"
        style={{
          position:'relative', zIndex:1,
          flex:1,
          width:'100%', maxWidth:1200,
          minHeight:'100vh',
          animation:'pageSlideIn var(--dur-page) var(--ease-out) both',
        }}
      >
        {children}
      </main>

      {/* ══════════ MOBILE BOTTOM TABS ══════════ */}
      <nav className="mobile-bottom-tabs">
        {MOBILE_TABS.map(item => {
          const Icon = item.icon
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`mobile-tab-btn ${active ? 'mobile-tab-btn-active' : ''}`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8}/>
              <span>{item.label}</span>
            </button>
          )
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`mobile-tab-btn ${moreOpen || MORE_ITEMS.some(n => n.id === page) ? 'mobile-tab-btn-active' : ''}`}
        >
          <IcMore size={20}/>
          <span>المزيد</span>
        </button>
      </nav>

      {/* ══════════ MORE MENU (Mobile) ══════════ */}
      {moreOpen && (
        <>
          <div className="more-menu-overlay" onClick={() => setMoreOpen(false)} />
          <div className="more-menu">
            {/* User + controls */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:16, paddingBottom:12,
              borderBottom:'1px solid var(--border)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg, var(--action), var(--info))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, fontSize:14, color:'#fff',
                }}>{user?.name?.[0] || 'م'}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{user?.name || 'المستخدم'}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {{ admin:'مدير النظام', accountant:'محاسب', sales:'مبيعات', viewer:'مشاهد' }[user?.role] || ''}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setMoreOpen(false)} style={{
                  width:38, height:38, borderRadius:'var(--r-md)',
                  border:'1px solid var(--border)', background:'var(--bg-hover)',
                  color:'var(--text-sec)', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <IcClose size={16}/>
                </button>
              </div>
            </div>

            {/* Nav grid */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(3, 1fr)',
              gap:8, marginBottom:12,
            }}>
              {MORE_ITEMS.map(item => {
                const Icon = item.icon
                const active = page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    style={{
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      gap:6, padding:'14px 8px',
                      borderRadius:'var(--r-md)',
                      border: active ? '1.5px solid var(--action)' : '1px solid var(--border)',
                      background: active ? 'var(--action-soft)' : 'transparent',
                      color: active ? 'var(--action)' : 'var(--text-sec)',
                      cursor:'pointer', fontFamily:'inherit',
                      fontSize:11, fontWeight: active ? 700 : 500,
                      minHeight:44,
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
                borderRadius:'var(--r-md)',
                border:'1px solid rgba(var(--danger-rgb),0.15)',
                background:'rgba(var(--danger-rgb),0.04)',
                color:'var(--danger)',
                cursor:'pointer', fontFamily:'inherit',
                fontSize:13, fontWeight:700, minHeight:44,
                WebkitTapHighlightColor:'transparent',
              }}
            >
              <IcLogout size={16}/> تسجيل الخروج
            </button>
          </div>
        </>
      )}

      {/* ── Layout styles ── */}
      <style>{`
        @media (min-width: 769px) {
          .layout-main {
            margin-right: ${sidebarWidth}px !important;
            padding: 32px 32px 40px !important;
            transition: margin-right var(--dur-slow) var(--ease-io);
          }
        }
        @media (max-width: 768px) {
          .layout-main {
            padding: 16px 14px calc(80px + env(safe-area-inset-bottom, 0px)) !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
