import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import BgCanvas from './BgCanvas'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses,
  IcReports, IcInventory, IcSettings, IcLogout,
  IcTruck, IcClose, IcChevronDown,
  IcSuppliers, IcPartners, IcAccounting, IcUpload,
  IcWhatsapp, IcMenu,
} from './Icons'
import MawjLogo from './Logo'
import { applyAppearance, DEFAULT_PREFS } from '../data/appearance'
import type { User } from '../types'

// ─── Local icon components ────────────────────────────────────────────────────
interface SvgIconProps { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }

const IcAgent = ({ size = 20, ...p }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
    <line x1="12" y1="3" x2="12" y2="1"/>
    <line x1="8" y1="3" x2="7" y2="1"/>
    <line x1="16" y1="3" x2="17" y2="1"/>
  </svg>
)

const IcMoon = ({ size = 18 }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const IcSun = ({ size = 18 }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const IcPlus = ({ size = 20 }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IcReceiptPlus = ({ size = 20 }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="12" y1="7" x2="12" y2="11"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
)

// ─── Navigation structure ─────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { id: string; label: string; items: NavItem[] }

const ALWAYS_VISIBLE: NavItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',      icon: IcOrders    },
  { id: 'customers', label: 'العملاء',      icon: IcCustomers },
]

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'inventory-group',
    label: 'المخزون',
    items: [
      { id: 'inventory', label: 'المخزون',  icon: IcInventory },
      { id: 'suppliers', label: 'الموردون', icon: IcSuppliers },
    ],
  },
  {
    id: 'finance-group',
    label: 'المالية',
    items: [
      { id: 'expenses',   label: 'المصاريف', icon: IcExpenses   },
      { id: 'accounting', label: 'المحاسبة', icon: IcAccounting },
      { id: 'partners',   label: 'الشركاء',  icon: IcPartners   },
    ],
  },
  {
    id: 'tools-group',
    label: 'أدوات',
    items: [
      { id: 'reports',  label: 'التقارير',  icon: IcReports  },
      { id: 'hayyak',   label: 'حياك',      icon: IcTruck    },
      { id: 'whatsapp', label: 'واتساب',    icon: IcWhatsapp },
      { id: 'import',   label: 'استيراد',   icon: IcUpload   },
      { id: 'agent',    label: 'الوكيل',    icon: IcAgent    },
      { id: 'settings', label: 'الإعدادات', icon: IcSettings },
    ],
  },
]

const DRAWER_SECTIONS = [
  { label: 'الرئيسية',  items: ALWAYS_VISIBLE },
  ...NAV_GROUPS.map(g => ({ label: g.label, items: g.items })),
]

// ─── Role labels ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام', accountant: 'محاسب', sales: 'مبيعات', viewer: 'مشاهد',
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LayoutProps {
  page: string
  onNavigate: (id: string) => void
  user: User | null
  onLogout: () => void
  children: React.ReactNode
}

// ─── Top Nav Dropdown (click-based) ──────────────────────────────────────────
interface DropdownProps {
  group: NavGroup
  page: string
  onNavigate: (id: string) => void
}

function NavDropdown({ group, page, onNavigate }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const isGroupActive = group.items.some(i => i.id === page)

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  // Close on click outside (checks both button and portal dropdown)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className="top-nav-group">
      <button
        ref={btnRef}
        className={`top-nav-tab ${isGroupActive ? 'top-nav-tab-active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{group.label}</span>
        <span style={{ transition: 'transform 0.2s var(--ease-io)', transform: open ? 'rotate(180deg)' : 'none', display: 'flex' }}>
          <IcChevronDown size={12} strokeWidth={2.5} />
        </span>
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          className="top-nav-dropdown top-nav-dropdown-open"
          style={{ position: 'fixed', top: pos.top, right: pos.right, left: 'auto' }}
        >
          {group.items.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                className={`top-nav-dropdown-item ${active ? 'top-nav-dropdown-item-active' : ''}`}
                onClick={() => { onNavigate(item.id); setOpen(false) }}
                role="option"
                aria-selected={active}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function Layout({ page, onNavigate, user, onLogout, children }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isDark, setIsDark] = useState(() =>
    !document.documentElement.hasAttribute('data-theme')
  )
  const drawerRef = useRef<HTMLDivElement>(null)

  const navigate = useCallback((id: string) => {
    onNavigate(id)
    setDrawerOpen(false)
  }, [onNavigate])

  // Close drawer on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Theme toggle
  const toggleTheme = useCallback(async () => {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    const stored = (window as any).__mawjPrefs || DEFAULT_PREFS
    applyAppearance({ ...stored, theme: next })
    try {
      const { Settings } = await import('../data/db')
      const userId = user?.id
      const key = userId ? `appearance_${userId}` : 'appearance'
      await Settings.set(key, { ...stored, theme: next })
    } catch {}
  }, [isDark, user])

  const userInitial = user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'م'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* Animated background orbs */}
      <BgCanvas />

      {/* ══════════ DESKTOP TOP NAVIGATION BAR ══════════ */}
      <nav className="top-nav" aria-label="التنقل الرئيسي">
        {/* Logo — right (RTL start) */}
        <button
          onClick={() => navigate('dashboard')}
          className="top-nav-logo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="الصفحة الرئيسية"
        >
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--r-md)', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--action-soft), rgba(var(--info-rgb),0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--action-glow)',
          }}>
            <MawjLogo size={22} color="var(--action)" />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{
              fontSize: 17, fontWeight: 900,
              background: 'linear-gradient(135deg, var(--action-light), var(--info))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>مَوج</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>ERP v7</div>
          </div>
        </button>

        {/* Nav tabs — center */}
        <div className="top-nav-tabs" role="tablist">
          {/* Always-visible primary tabs */}
          {ALWAYS_VISIBLE.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                className={`top-nav-tab top-nav-tab-always ${active ? 'top-nav-tab-active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            )
          })}

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

          {/* Dropdown groups */}
          {NAV_GROUPS.map(group => (
            <NavDropdown key={group.id} group={group} page={page} onNavigate={navigate} />
          ))}
        </div>

        {/* Action buttons — left (RTL end) */}
        <div className="top-nav-actions">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'الوضع المضيء' : 'الوضع الداكن'}
            style={{
              width: 36, height: 36, borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-hover)',
              color: 'var(--text-sec)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease-io)',
              flexShrink: 0,
            }}
          >
            {isDark ? <IcSun size={16} /> : <IcMoon size={16} />}
          </button>

          {/* User avatar + role */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                {user?.name || 'المستخدم'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {ROLE_LABELS[user?.role || ''] || ''}
              </span>
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--action), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: '#fff',
              boxShadow: '0 0 12px var(--action-glow)',
            }}>
              {userInitial}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            style={{
              width: 36, height: 36, borderRadius: 'var(--r-sm)',
              border: '1px solid rgba(var(--danger-rgb),0.15)',
              background: 'var(--danger-faint)',
              color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease-io)',
              flexShrink: 0,
            }}
          >
            <IcLogout size={16} />
          </button>
        </div>
      </nav>

      {/* ══════════ MOBILE HEADER (RTL: hamburger RIGHT, logo CENTER, theme LEFT) ══════════ */}
      <header className="mobile-header" aria-label="رأس الصفحة">
        {/* Hamburger — DOM first → visually RIGHT in RTL */}
        <button
          className="mobile-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح القائمة"
          aria-expanded={drawerOpen}
        >
          <IcMenu size={20} />
        </button>

        {/* Logo — center */}
        <button
          onClick={() => navigate('dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <MawjLogo size={20} color="var(--action)" />
          <span style={{
            fontSize: 18, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--action-light), var(--info))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>مَوج</span>
        </button>

        {/* Theme toggle — DOM last → visually LEFT in RTL */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'الوضع المضيء' : 'الوضع الداكن'}
          style={{
            width: 40, height: 40, borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--bg-hover)',
            color: 'var(--text-sec)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {isDark ? <IcSun size={16} /> : <IcMoon size={16} />}
        </button>
      </header>

      {/* ══════════ MOBILE DRAWER ══════════ */}
      {drawerOpen && (
        <>
          <div
            className="mobile-drawer-overlay"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
          >
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20, paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--action), var(--info))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 15, color: '#fff',
                  boxShadow: '0 0 12px var(--action-glow)',
                }}>{userInitial}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {user?.name || 'المستخدم'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[user?.role || ''] || ''}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)', background: 'var(--bg-hover)',
                  color: 'var(--text-sec)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer',
                }}
                aria-label="إغلاق"
              >
                <IcClose size={16} />
              </button>
            </div>

            {/* Nav sections */}
            {DRAWER_SECTIONS.map((section, si) => (
              <div key={si}>
                <div className="mobile-drawer-section-label">{section.label}</div>
                {section.items.map(item => {
                  const Icon = item.icon
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      className={`mobile-drawer-item ${active ? 'mobile-drawer-item-active' : ''}`}
                      onClick={() => navigate(item.id)}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Logout */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                onClick={onLogout}
                className="mobile-drawer-item"
                style={{ color: 'var(--danger)', borderColor: 'rgba(var(--danger-rgb),0.20)' }}
              >
                <IcLogout size={18} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════ MOBILE FLOATING ACTION BUTTONS ══════════ */}
      <div className="mobile-fabs" aria-label="إجراءات سريعة">
        <button
          className="mobile-fab mobile-fab-secondary"
          onClick={() => { sessionStorage.setItem('openNewExpense', '1'); navigate('expenses') }}
          title="مصروف جديد"
          aria-label="إضافة مصروف جديد"
        >
          <IcReceiptPlus size={20} />
        </button>
        <button
          className="mobile-fab mobile-fab-primary"
          onClick={() => { sessionStorage.setItem('openNewOrder', '1'); navigate('orders') }}
          title="طلب جديد"
          aria-label="إضافة طلب جديد"
        >
          <IcPlus size={22} />
        </button>
      </div>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main
        key={page}
        className="page-main"
        style={{
          position: 'relative', zIndex: 1,
          flex: 1, width: '100%',
          minHeight: '100vh',
          animation: 'pageSlideIn var(--dur-page) var(--ease-out) both',
        }}
      >
        {children}
      </main>
    </div>
  )
}
