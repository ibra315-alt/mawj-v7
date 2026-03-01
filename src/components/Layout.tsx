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
import { applyAppearance, DEFAULT_PREFS } from '../data/appearance'
import type { User } from '../types'

// ─── Local SVG icons ─────────────────────────────────────────────────────────
interface SvgProps { size?: number; strokeWidth?: number; style?: React.CSSProperties }

const IcAgent = ({ size = 20, ...p }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/>
    <line x1="12" y1="3" x2="12" y2="1"/><line x1="8" y1="3" x2="7" y2="1"/><line x1="16" y1="3" x2="17" y2="1"/>
  </svg>
)
const IcMoon = ({ size = 18 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const IcSun = ({ size = 18 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IcPlus = ({ size = 20 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IcSearch = ({ size = 18 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IcChevronRight = ({ size = 14 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
)
const IcReceiptPlus = ({ size = 20 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2"/>
    <line x1="9" y1="9" x2="15" y2="9"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
)

// ─── Nav structure ────────────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { id: string; label: string; items: NavItem[] }

const ALWAYS_VISIBLE: NavItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',      icon: IcOrders    },
  { id: 'customers', label: 'العملاء',      icon: IcCustomers },
]
const NAV_GROUPS: NavGroup[] = [
  { id: 'inventory-group', label: 'المخزون', items: [
    { id: 'inventory', label: 'المخزون',  icon: IcInventory },
    { id: 'suppliers', label: 'الموردون', icon: IcSuppliers },
  ]},
  { id: 'finance-group', label: 'المالية', items: [
    { id: 'expenses',   label: 'المصاريف', icon: IcExpenses   },
    { id: 'accounting', label: 'المحاسبة', icon: IcAccounting },
    { id: 'partners',   label: 'الشركاء',  icon: IcPartners   },
  ]},
  { id: 'tools-group', label: 'أدوات', items: [
    { id: 'reports',  label: 'التقارير',        icon: IcReports     },
    { id: 'hayyak',   label: 'حياك',            icon: IcTruck       },
    { id: 'whatsapp', label: 'واتساب',          icon: IcWhatsapp    },
    { id: 'receipt',  label: 'تخصيص الفاتورة',  icon: IcReceiptPlus },
    { id: 'import',   label: 'استيراد البيانات',icon: IcUpload      },
    { id: 'agent',    label: 'وكيل الذكاء',     icon: IcAgent       },
    { id: 'settings', label: 'الإعدادات',       icon: IcSettings    },
  ]},
]
const DRAWER_SECTIONS = [
  { label: 'الرئيسية', items: ALWAYS_VISIBLE },
  ...NAV_GROUPS.map(g => ({ label: g.label, items: g.items })),
]

// ─── Command palette items ────────────────────────────────────────────────────
interface CmdItem { type: 'page'|'action'; id: string; label: string; icon: React.ComponentType<any>; group: string; shortcut?: string }
const CMD_ITEMS: CmdItem[] = [
  { type:'page',   id:'dashboard', label:'لوحة التحكم',      icon:IcDashboard, group:'الصفحات', shortcut:'Alt+1' },
  { type:'page',   id:'orders',    label:'الطلبات',           icon:IcOrders,    group:'الصفحات', shortcut:'Alt+2' },
  { type:'page',   id:'customers', label:'العملاء',           icon:IcCustomers, group:'الصفحات', shortcut:'Alt+3' },
  { type:'page',   id:'inventory', label:'المخزون',           icon:IcInventory, group:'الصفحات', shortcut:'Alt+4' },
  { type:'page',   id:'expenses',  label:'المصاريف',          icon:IcExpenses,  group:'الصفحات', shortcut:'Alt+5' },
  { type:'page',   id:'reports',   label:'التقارير',          icon:IcReports,   group:'الصفحات', shortcut:'Alt+6' },
  { type:'page',   id:'accounting',label:'المحاسبة',          icon:IcAccounting,group:'الصفحات' },
  { type:'page',   id:'partners',  label:'الشركاء',           icon:IcPartners,  group:'الصفحات' },
  { type:'page',   id:'suppliers', label:'الموردون',          icon:IcSuppliers, group:'الصفحات' },
  { type:'page',   id:'hayyak',    label:'حياك للتوصيل',      icon:IcTruck,     group:'الصفحات' },
  { type:'page',   id:'whatsapp',  label:'واتساب',            icon:IcWhatsapp,  group:'الصفحات' },
  { type:'page',   id:'receipt',   label:'تخصيص الفاتورة',    icon:IcReceiptPlus,group:'الصفحات' },
  { type:'page',   id:'import',    label:'استيراد البيانات',  icon:IcUpload,    group:'الصفحات' },
  { type:'page',   id:'agent',     label:'وكيل الذكاء AI',    icon:IcAgent,     group:'الصفحات' },
  { type:'page',   id:'settings',  label:'الإعدادات',         icon:IcSettings,  group:'الصفحات' },
  { type:'action', id:'new-order', label:'إنشاء طلب جديد',    icon:IcOrders,    group:'إجراءات سريعة' },
  { type:'action', id:'new-expense',label:'تسجيل مصروف جديد',icon:IcExpenses,  group:'إجراءات سريعة' },
]

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────
const BREADCRUMBS: Record<string, string[]> = {
  dashboard:  ['الرئيسية'],
  orders:     ['الرئيسية', 'الطلبات'],
  customers:  ['الرئيسية', 'العملاء'],
  inventory:  ['المخزون', 'المنتجات'],
  suppliers:  ['المخزون', 'الموردون'],
  expenses:   ['المالية', 'المصاريف'],
  accounting: ['المالية', 'المحاسبة'],
  partners:   ['المالية', 'الشركاء'],
  reports:    ['أدوات', 'التقارير'],
  hayyak:     ['أدوات', 'حياك'],
  whatsapp:   ['أدوات', 'واتساب'],
  receipt:    ['أدوات', 'الفاتورة'],
  import:     ['أدوات', 'الاستيراد'],
  agent:      ['أدوات', 'الوكيل AI'],
  settings:   ['النظام', 'الإعدادات'],
}

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

// ─── Command Palette ──────────────────────────────────────────────────────────
function CommandPalette({ onNavigate, onClose }: { onNavigate:(id:string)=>void; onClose:()=>void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? CMD_ITEMS.filter(i => i.label.includes(query) || i.id.toLowerCase().includes(query.toLowerCase()))
    : CMD_ITEMS

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])
  useEffect(() => { setActive(0) }, [query])

  const handleSelect = (item: CmdItem) => {
    if (item.type === 'page') {
      onNavigate(item.id)
    } else if (item.id === 'new-order') {
      sessionStorage.setItem('openNewOrder', '1'); onNavigate('orders')
    } else if (item.id === 'new-expense') {
      sessionStorage.setItem('openNewExpense', '1'); onNavigate('expenses')
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && filtered[active]) handleSelect(filtered[active])
    if (e.key === 'Escape') onClose()
  }

  const groups = [...new Set(filtered.map(i => i.group))]

  return createPortal(
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        {/* Search input row */}
        <div className="cmd-input-row">
          <IcSearch size={17} />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="ابحث عن صفحة أو إجراء..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <button className="cmd-clear" onClick={() => setQuery('')}>✕</button>
          )}
          <kbd className="cmd-esc">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">لا نتائج لـ «{query}»</div>
          ) : groups.map(group => (
            <div key={group}>
              <div className="cmd-group-label">{group}</div>
              {filtered.filter(i => i.group === group).map(item => {
                const gi = filtered.indexOf(item)
                const Icon = item.icon
                const isActive = gi === active
                return (
                  <button
                    key={item.id}
                    className={`cmd-item ${isActive ? 'cmd-item-active' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActive(gi)}
                  >
                    <span className="cmd-item-icon"><Icon size={15} /></span>
                    <span className="cmd-item-label">{item.label}</span>
                    <span style={{ flex: 1 }} />
                    {item.shortcut && <kbd className="cmd-shortcut">{item.shortcut}</kbd>}
                    {isActive && <IcChevronRight size={13} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> تنقل</span>
          <span><kbd>↵</kbd> فتح</span>
          <span><kbd>Esc</kbd> إغلاق</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── User Menu Popup ──────────────────────────────────────────────────────────
function UserMenuPopup({ user, presence, onLogout, onNavigate, onClose }: {
  user: User | null; presence: 'online'|'idle'; onLogout:()=>void; onNavigate:(id:string)=>void; onClose:()=>void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const initial = user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'م'

  return (
    <div ref={ref} className="user-menu-popup" role="menu">
      {/* Profile card */}
      <div className="ump-card">
        <div className="ump-avatar">
          {initial}
          <span className={`ump-dot ${presence === 'online' ? 'ump-dot-on' : 'ump-dot-idle'}`} />
        </div>
        <div className="ump-info">
          <div className="ump-name">{user?.name || 'المستخدم'}</div>
          <div className="ump-email">{user?.email || ''}</div>
          <span className="ump-role">{ROLE_LABELS[user?.role || ''] || ''}</span>
        </div>
      </div>

      <div className="ump-divider" />

      <button className="ump-item" onClick={() => { onNavigate('settings'); onClose() }} role="menuitem">
        <IcSettings size={14} />
        <span>الإعدادات</span>
      </button>

      <div className="ump-divider" />

      <button className="ump-item ump-item-danger" onClick={onLogout} role="menuitem">
        <IcLogout size={14} />
        <span>تسجيل الخروج</span>
      </button>
    </div>
  )
}

// ─── Quick Add Menu ───────────────────────────────────────────────────────────
function QuickAddMenu({ onNavigate, onClose }: { onNavigate:(id:string)=>void; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const items = [
    { label: 'طلب جديد', sub: 'New Order', icon: IcOrders,
      action: () => { sessionStorage.setItem('openNewOrder','1'); onNavigate('orders'); onClose() } },
    { label: 'مصروف جديد', sub: 'New Expense', icon: IcExpenses,
      action: () => { sessionStorage.setItem('openNewExpense','1'); onNavigate('expenses'); onClose() } },
    { label: 'عميل جديد', sub: 'New Customer', icon: IcCustomers,
      action: () => { sessionStorage.setItem('openNewCustomer','1'); onNavigate('customers'); onClose() } },
  ]

  return (
    <div ref={ref} className="qa-menu" role="menu">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <button key={i} className="qa-item" onClick={item.action} role="menuitem">
            <span className="qa-icon"><Icon size={15} /></span>
            <span>
              <span className="qa-label">{item.label}</span>
              <span className="qa-sub">{item.sub}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Nav Dropdown (pill style) ────────────────────────────────────────────────
interface DropdownProps {
  group: NavGroup; page: string; onNavigate:(id:string)=>void
  triggerRef?: (el: HTMLButtonElement | null) => void
}
function NavDropdown({ group, page, onNavigate, triggerRef }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const isGroupActive = group.items.some(i => i.id === page)

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="np-group">
      <button
        ref={el => {
          (btnRef as React.MutableRefObject<HTMLButtonElement | null>).current = el
          triggerRef?.(el)
        }}
        className={`nav-pill-tab np-trigger ${isGroupActive ? 'nav-pill-tab-active' : ''}`}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="npt-label">{group.label}</span>
        <span style={{ display:'flex', transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.55 }}>
          <IcChevronDown size={11} strokeWidth={2.5} />
        </span>
      </button>

      {open && createPortal(
        <div ref={dropRef} className="np-dropdown" style={{ position:'fixed', top: pos.top, right: pos.right }}>
          {group.items.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                className={`np-dd-item ${active ? 'np-dd-item-active' : ''}`}
                onClick={() => { onNavigate(item.id); setOpen(false) }}
                role="option" aria-selected={active}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
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

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function Layout({ page, onNavigate, user, onLogout, children }: LayoutProps) {
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [isDark, setIsDark]           = useState(() => !document.documentElement.hasAttribute('data-theme'))
  const [cmdOpen, setCmdOpen]         = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [presence, setPresence]       = useState<'online'|'idle'>('online')
  const [indicator, setIndicator]     = useState({ inlineStart: 4, width: 80, ready: false })
  const [logoUrl, setLogoUrl]         = useState<string>('/logo.png')
  const [logoDarkUrl, setLogoDarkUrl] = useState<string>('')
  const [pwaPrompt, setPwaPrompt]     = useState<any>(null)

  // Load logo from business settings (uploaded via Settings page)
  useEffect(() => {
    import('../data/db').then(({ Settings }) => {
      Settings.get('business').then((biz: any) => {
        if (biz?.logo_url) setLogoUrl(biz.logo_url)
        if (biz?.logo_dark_url) setLogoDarkUrl(biz.logo_dark_url)
      }).catch(() => {})
    }).catch(() => {})

    // Live-update when user changes logo in Settings during same session
    const logoHandler = (e: Event) => {
      const url = (e as CustomEvent).detail?.url
      setLogoUrl(url || '/logo.png')
    }
    const logoDarkHandler = (e: Event) => {
      const url = (e as CustomEvent).detail?.url
      setLogoDarkUrl(url || '')
    }
    window.addEventListener('mawj-logo-changed', logoHandler)
    window.addEventListener('mawj-logo-dark-changed', logoDarkHandler)

    // PWA install prompt — show subtle button in header instead of banner
    const pwaHandler = (e: Event) => setPwaPrompt((e as CustomEvent).detail?.prompt)
    window.addEventListener('mawj-pwa-ready', pwaHandler)

    return () => {
      window.removeEventListener('mawj-logo-changed', logoHandler)
      window.removeEventListener('mawj-logo-dark-changed', logoDarkHandler)
      window.removeEventListener('mawj-pwa-ready', pwaHandler)
    }
  }, [])

  const navPillRef = useRef<HTMLDivElement>(null)
  const tabRefs    = useRef<Record<string, HTMLButtonElement | null>>({})

  const navigate = useCallback((id: string) => {
    onNavigate(id)
    setDrawerOpen(false); setCmdOpen(false); setQuickAddOpen(false); setUserMenuOpen(false)
  }, [onNavigate])

  // Presence dot
  useEffect(() => {
    const update = () => setPresence(document.hidden ? 'idle' : 'online')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = (drawerOpen || cmdOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen, cmdOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) }
      if (e.key === 'Escape') { setCmdOpen(false); setQuickAddOpen(false); setUserMenuOpen(false); setDrawerOpen(false) }
      if (!cmdOpen && e.altKey && !e.ctrlKey && !e.shiftKey) {
        const map: Record<string, string> = { '1':'dashboard','2':'orders','3':'customers','4':'inventory','5':'expenses','6':'reports' }
        if (map[e.key]) { e.preventDefault(); navigate(map[e.key]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmdOpen, navigate])

  // Sliding indicator
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      let activeKey = page
      for (const g of NAV_GROUPS) {
        if (g.items.some(i => i.id === page)) { activeKey = g.id; break }
      }
      const btn  = tabRefs.current[activeKey]
      const pill = navPillRef.current
      if (!btn || !pill) return
      const pillRect = pill.getBoundingClientRect()
      const btnRect  = btn.getBoundingClientRect()
      const isRTL    = document.documentElement.dir === 'rtl'
      const inlineStart = isRTL
        ? pillRect.right - btnRect.right
        : btnRect.left - pillRect.left
      setIndicator({ inlineStart, width: btnRect.width, ready: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [page])

  // Theme toggle
  const toggleTheme = useCallback(async () => {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    const stored = (window as any).__mawjPrefs || DEFAULT_PREFS
    applyAppearance({ ...stored, theme: next })
    try {
      const { Settings } = await import('../data/db')
      const key = user?.id ? `appearance_${user.id}` : 'appearance'
      await Settings.set(key, { ...stored, theme: next })
    } catch {}
  }, [isDark, user])

  const handlePwaInstall = async () => {
    if (!pwaPrompt) return
    pwaPrompt.prompt()
    const { outcome } = await pwaPrompt.userChoice
    if (outcome === 'accepted') setPwaPrompt(null)
  }

  const userInitial = user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'م'
  const breadcrumb  = (BREADCRUMBS[page] || ['الرئيسية']).join(' › ')

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--bg)', overflowX:'hidden' }}>

      {/* ── Injected styles ─────────────────────────────────────────────── */}
      <style>{`
        /* ═══ Logo ═══════════════════════════════════════════════ */
        .nav-logo-btn {
          display: flex; align-items: center; flex-shrink: 0;
          background: none; border: none; cursor: pointer; padding: 4px;
          border-radius: var(--r-md); transition: opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-logo-btn:hover { opacity: 0.82; }
        .logo-bare {
          width: 52px; height: 52px; object-fit: contain; display: block; flex-shrink: 0;
          filter: drop-shadow(0 2px 8px rgba(49,140,231,0.30)) drop-shadow(0 1px 2px rgba(0,0,0,0.18));
          transition: filter 0.2s, transform 0.2s;
        }
        .nav-logo-btn:hover .logo-bare {
          filter: drop-shadow(0 4px 18px rgba(49,140,231,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.18));
          transform: scale(1.06);
        }

        /* ═══ Floating Pill Nav — full liquid glass ═════════════ */
        .nav-pill {
          position: relative; display: flex; align-items: center; gap: 2px;
          padding: 4px; justify-content: center;
          max-width: 680px; border-radius: 100px;

          /* Liquid glass background: edge ring + specular dome + shimmer + tint */
          background:
            radial-gradient(ellipse 96% 92% at 50% 50%, transparent 70%, rgba(255,255,255,0.12) 84%, transparent 100%),
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,255,255,0.22) 0%, transparent 60%),
            linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.07) 100%),
            var(--lg-tint);

          backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-brt));
          -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-brt));

          /* Deep specular inset shadows */
          box-shadow:
            0 2px 8px rgba(0,8,24,0.10),
            0 8px 28px rgba(0,8,24,0.12),
            inset 0  1.5px 0 var(--lg-specular-hi),
            inset 0 -1px   0 rgba(255,255,255,0.08),
            inset  1.5px 0 0 rgba(255,255,255,0.18),
            inset -1.5px 0 0 rgba(255,255,255,0.12);

          border: 1px solid var(--lg-rim);
          border-bottom-color: rgba(255,255,255,0.08);
          isolation: isolate;
        }
        /* Prismatic border ring on the pill */
        .nav-pill::before {
          content: '';
          position: absolute; inset: 0; border-radius: inherit; padding: 1px;
          background: conic-gradient(
            from 120deg at 62% 18%,
            rgba(255,255,255,0.80) 0deg, rgba(255,255,255,0.12) 52deg,
            rgba(255,255,255,0.44) 108deg, rgba(255,255,255,0.06) 196deg,
            rgba(255,255,255,0.54) 278deg, rgba(255,255,255,0.80) 360deg
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events: none; z-index: 0;
        }
        .nav-pill-indicator {
          position: absolute; top: 4px; bottom: 4px;
          background: var(--action-faint); border: 1px solid var(--action-soft);
          border-radius: 100px; pointer-events: none;
          transition: inset-inline-start 0.38s cubic-bezier(0.34,1.56,0.64,1),
                      width 0.38s cubic-bezier(0.34,1.56,0.64,1);
          opacity: 0; animation: indicatorAppear 0.3s 0.2s ease both;
        }
        @keyframes indicatorAppear { to { opacity: 1; } }
        .nav-pill-tab {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border: none; background: transparent;
          color: var(--text-sec); font-family: var(--font-arabic);
          font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 100px;
          white-space: nowrap; transition: color 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-pill-tab:hover:not(.nav-pill-tab-active) { color: var(--text); }
        .nav-pill-tab-active { color: var(--action-light); }
        .npt-label { transition: inherit; }
        .nav-pill-sep { width: 1px; height: 16px; background: var(--border); flex-shrink: 0; margin: 0 3px; }
        .np-group { position: relative; }
        .np-trigger { gap: 5px; }

        /* Dropdown from nav pill — liquid glass */
        .np-dropdown {
          min-width: 172px; z-index: 400; padding: 6px;
          border-radius: var(--r-lg);
          animation: menuSlideIn 0.16s ease both;
          background:
            radial-gradient(ellipse 90% 46% at 50% -4%, rgba(255,255,255,0.18) 0%, transparent 60%),
            linear-gradient(152deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%),
            var(--lg-tint);
          backdrop-filter: blur(52px) saturate(2.4) brightness(1.06);
          -webkit-backdrop-filter: blur(52px) saturate(2.4) brightness(1.06);
          box-shadow: var(--float-shadow),
            inset 0 1.5px 0 var(--lg-specular-hi), inset 0 -1px 0 rgba(255,255,255,0.07);
          border: 1px solid var(--lg-rim); border-bottom-color: rgba(255,255,255,0.08);
        }
        @keyframes menuSlideIn { from { opacity:0; transform: translateY(-6px) scale(0.97); } to { opacity:1; transform: none; } }
        .np-dd-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 9px 12px; border: none; background: transparent; text-align: start;
          color: var(--text-sec); font-family: var(--font-arabic); font-size: 13px; font-weight: 600;
          cursor: pointer; border-radius: var(--r-sm);
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .np-dd-item:hover { background: var(--action-faint); color: var(--text); }
        .np-dd-item-active { background: var(--action-soft); color: var(--action-light); }

        /* ═══ Nav Actions (right side in RTL = start) ════════════ */
        .nav-actions {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          justify-self: end;
        }
        .nav-action-btn {
          display: flex; align-items: center; gap: 6px;
          height: 34px; padding: 0 10px; border-radius: var(--r-sm);
          border: 1px solid var(--border); background: var(--bg-hover);
          color: var(--text-sec); cursor: pointer; font-size: 12px; font-weight: 600;
          font-family: var(--font-arabic); transition: all 0.15s ease;
          -webkit-tap-highlight-color: transparent; flex-shrink: 0;
        }
        .nav-action-btn:hover { background: var(--bg-elevated); color: var(--text); border-color: var(--border-strong); }
        .nav-search-btn { gap: 8px; }
        .nav-search-hint {
          font-size: 10px; color: var(--text-muted); font-family: monospace;
          border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; letter-spacing: 0;
        }
        .nav-add-btn {
          width: 34px; padding: 0;
          justify-content: center;
          background: linear-gradient(135deg, var(--action-deep), var(--action));
          color: #fff; border-color: transparent;
          box-shadow: 0 2px 8px var(--action-glow);
        }
        .nav-add-btn:hover {
          box-shadow: 0 4px 16px var(--action-glow); transform: scale(1.05);
          background: linear-gradient(135deg, var(--action), var(--action-light));
          color: #fff; border-color: transparent;
        }
        .nav-sep { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; margin: 0 2px; }
        .nav-theme-btn { width: 34px; padding: 0; justify-content: center; }
        .nav-theme-btn svg { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }

        /* Avatar button */
        .nav-avatar-btn {
          position: relative; width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, var(--action), var(--info));
          border: none; cursor: pointer; color: #fff;
          font-weight: 800; font-size: 14px; box-shadow: 0 0 12px var(--action-glow);
          transition: transform 0.2s, box-shadow 0.2s;
          -webkit-tap-highlight-color: transparent; flex-shrink: 0;
        }
        .nav-avatar-btn:hover { transform: scale(1.08); box-shadow: 0 0 20px var(--action-glow); }
        .nav-avatar-letter { pointer-events: none; }
        .presence-dot {
          position: absolute; bottom: 0; inset-inline-end: 0;
          width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--bg);
          pointer-events: none;
        }
        .pd-online { background: #22c55e; }
        .pd-idle   { background: #f59e0b; }

        /* ═══ User Menu Popup — liquid glass ════════════════════ */
        .user-menu-popup {
          position: absolute; top: calc(100% + 10px); inset-inline-end: 0;
          min-width: 224px; z-index: 500; padding: 8px;
          border-radius: var(--r-lg); animation: menuSlideIn 0.18s ease both;
          background:
            radial-gradient(ellipse 90% 46% at 50% -4%, rgba(255,255,255,0.20) 0%, transparent 60%),
            linear-gradient(152deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.07) 100%),
            var(--modal-bg);
          backdrop-filter: blur(56px) saturate(2.6) brightness(1.06);
          -webkit-backdrop-filter: blur(56px) saturate(2.6) brightness(1.06);
          box-shadow: var(--float-shadow),
            inset 0 1.5px 0 var(--lg-specular-hi), inset 0 -1px 0 rgba(255,255,255,0.07);
          border: 1px solid var(--lg-rim); border-bottom-color: rgba(255,255,255,0.08);
        }
        .ump-card { display: flex; align-items: center; gap: 10px; padding: 10px; }
        .ump-avatar {
          position: relative; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--action), var(--info));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 18px; color: #fff;
          box-shadow: 0 0 16px var(--action-glow);
        }
        .ump-dot {
          position: absolute; bottom: 1px; inset-inline-end: 1px;
          width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--bg-elevated);
        }
        .ump-dot-on   { background: #22c55e; }
        .ump-dot-idle { background: #f59e0b; }
        .ump-info { flex: 1; min-width: 0; }
        .ump-name  { font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ump-email { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .ump-role  {
          display: inline-block; margin-top: 4px;
          font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px;
          background: var(--action-faint); color: var(--action-light); border: 1px solid var(--action-soft);
        }
        .ump-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .ump-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 9px 12px; border: none; background: transparent; text-align: start;
          color: var(--text-sec); font-family: var(--font-arabic); font-size: 13px; font-weight: 600;
          cursor: pointer; border-radius: var(--r-sm); transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .ump-item:hover { background: var(--bg-hover); color: var(--text); }
        .ump-item-danger { color: var(--danger); }
        .ump-item-danger:hover { background: var(--danger-faint); color: var(--danger); }

        /* ═══ Quick Add Menu — liquid glass ═════════════════════ */
        .qa-menu {
          position: absolute; top: calc(100% + 10px); inset-inline-end: 0;
          min-width: 200px; z-index: 500; padding: 6px;
          border-radius: var(--r-lg); animation: menuSlideIn 0.16s ease both;
          background:
            radial-gradient(ellipse 90% 46% at 50% -4%, rgba(255,255,255,0.20) 0%, transparent 60%),
            linear-gradient(152deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%),
            var(--modal-bg);
          backdrop-filter: blur(52px) saturate(2.4) brightness(1.06);
          -webkit-backdrop-filter: blur(52px) saturate(2.4) brightness(1.06);
          box-shadow: var(--float-shadow),
            inset 0 1.5px 0 var(--lg-specular-hi), inset 0 -1px 0 rgba(255,255,255,0.07);
          border: 1px solid var(--lg-rim); border-bottom-color: rgba(255,255,255,0.08);
        }
        .qa-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 12px; border: none; background: transparent; text-align: start;
          cursor: pointer; border-radius: var(--r-sm); transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .qa-item:hover { background: var(--action-faint); }
        .qa-icon {
          width: 30px; height: 30px; border-radius: var(--r-sm); flex-shrink: 0;
          background: var(--action-soft); color: var(--action-light);
          display: flex; align-items: center; justify-content: center;
        }
        .qa-label { display: block; font-size: 13px; font-weight: 700; color: var(--text); font-family: var(--font-arabic); }
        .qa-sub   { display: block; font-size: 10px; color: var(--text-muted); font-family: 'Inter', sans-serif; }

        /* ═══ Command Palette ════════════════════════════════════ */
        .cmd-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: var(--bg-overlay); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 80px; animation: fadeIn 0.15s ease;
        }
        .cmd-box {
          width: min(580px, calc(100vw - 32px));
          border-radius: var(--r-xl); overflow: hidden;
          animation: cmdIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
          /* Heaviest liquid glass — the spotlight panel */
          background:
            radial-gradient(ellipse 96% 94% at 50% 50%, transparent 72%, rgba(255,255,255,0.09) 85%, transparent 100%),
            radial-gradient(ellipse 80% 40% at 50% -4%, rgba(255,255,255,0.22) 0%, transparent 58%),
            linear-gradient(152deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 48%, rgba(255,255,255,0.07) 100%),
            var(--modal-bg);
          backdrop-filter: blur(72px) saturate(2.8) brightness(1.08);
          -webkit-backdrop-filter: blur(72px) saturate(2.8) brightness(1.08);
          box-shadow: var(--modal-shadow),
            inset 0 1.5px 0 var(--lg-specular-hi),
            inset 0 -1px 0 rgba(255,255,255,0.07);
          border: 1px solid var(--lg-rim); border-bottom-color: rgba(255,255,255,0.08);
        }
        @keyframes cmdIn { from { opacity:0; transform: scale(0.94) translateY(-12px); } to { opacity:1; transform: none; } }
        .cmd-input-row {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          color: var(--text-muted);
        }
        .cmd-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-size: 15px; font-family: var(--font-arabic); color: var(--text);
          direction: rtl;
        }
        .cmd-input::placeholder { color: var(--text-muted); }
        .cmd-clear {
          background: var(--bg-hover); border: none; border-radius: 50%;
          width: 20px; height: 20px; cursor: pointer; color: var(--text-muted);
          font-size: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cmd-esc {
          font-size: 10px; padding: 3px 7px; border-radius: 5px; flex-shrink: 0;
          background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-muted);
          font-family: monospace; cursor: pointer;
        }
        .cmd-results { max-height: 380px; overflow-y: auto; padding: 6px; }
        .cmd-results::-webkit-scrollbar { width: 4px; }
        .cmd-results::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .cmd-group-label {
          font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.08em;
          padding: 10px 12px 4px; text-transform: uppercase;
        }
        .cmd-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 12px; border: none; background: transparent; text-align: start;
          cursor: pointer; border-radius: var(--r-sm); transition: background 0.12s;
          -webkit-tap-highlight-color: transparent; color: var(--text-sec);
          font-family: var(--font-arabic); font-size: 13px; font-weight: 600;
        }
        .cmd-item:hover, .cmd-item-active {
          background: var(--action-faint); color: var(--text);
        }
        .cmd-item-icon {
          width: 28px; height: 28px; border-radius: var(--r-sm); flex-shrink: 0;
          background: var(--bg-hover); display: flex; align-items: center; justify-content: center;
          color: var(--text-sec);
        }
        .cmd-item-active .cmd-item-icon { background: var(--action-soft); color: var(--action-light); }
        .cmd-item-label { flex: 1; }
        .cmd-shortcut {
          font-size: 10px; padding: 2px 6px; border-radius: 5px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-muted); font-family: monospace;
        }
        .cmd-empty {
          padding: 32px 16px; text-align: center; color: var(--text-muted);
          font-size: 14px; font-family: var(--font-arabic);
        }
        .cmd-footer {
          display: flex; gap: 16px; padding: 10px 16px;
          border-top: 1px solid var(--border); font-size: 11px; color: var(--text-muted);
          font-family: var(--font-arabic); justify-content: flex-start;
        }
        .cmd-footer kbd {
          display: inline-block; padding: 1px 5px; border-radius: 4px;
          background: var(--bg-hover); border: 1px solid var(--border);
          font-family: monospace; font-size: 10px; margin-inline-end: 4px;
        }

        /* ═══ Tablet: icon-only nav ══════════════════════════════ */
        @media (min-width: 769px) and (max-width: 1100px) {
          .npt-label { display: none !important; }
          .nav-pill-tab { padding: 8px 10px !important; }
          .nav-search-hint { display: none !important; }
          .nav-pill { max-width: 420px; }
        }
      `}</style>

      {/* SVG filters for liquid glass effects */}
      <svg aria-hidden="true" style={{ position:'fixed', width:0, height:0, overflow:'hidden' }}>
        <defs>
          {/* Fine frost grain — applied to glass surfaces via filter: url(#lg-frost) */}
          <filter id="lg-frost" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.72 0.72" numOctaves="2" stitchTiles="stitch" result="noise"/>
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.035 0" in="noise" result="tinted"/>
            <feComposite in="SourceGraphic" in2="tinted" operator="over"/>
          </filter>
          {/* Edge warp — creates subtle liquid distortion at glass rims */}
          <filter id="lg-warp" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="turbulence" baseFrequency="0.025 0.015" numOctaves="2" seed="3" result="warp"/>
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>

      {/* Animated background */}
      <BgCanvas />

      {/* ══════════ DESKTOP TOP NAV ══════════ */}
      <nav className="top-nav" aria-label="التنقل الرئيسي" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>

        {/* Logo — RTL start (visually right) */}
        <button className="nav-logo-btn" onClick={() => navigate('dashboard')} aria-label="الصفحة الرئيسية" style={{ justifySelf: 'start' }}>
          <img src={isDark ? (logoDarkUrl || logoUrl) : logoUrl} alt="مَوج" className="logo-bare" />
        </button>

        {/* ── Floating Pill Nav — center ── */}
        <div className="nav-pill" ref={navPillRef} role="tablist">
          {/* Sliding active indicator */}
          {indicator.ready && (
            <div
              className="nav-pill-indicator"
              style={{ insetInlineStart: indicator.inlineStart, width: indicator.width }}
            />
          )}

          {/* Always-visible tabs */}
          {ALWAYS_VISIBLE.map((item, i) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                ref={el => { tabRefs.current[item.id] = el }}
                className={`nav-pill-tab ${active ? 'nav-pill-tab-active' : ''}`}
                onClick={() => navigate(item.id)}
                role="tab"
                aria-selected={active}
                title={`Alt+${i + 1}`}
              >
                <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                <span className="npt-label">{item.label}</span>
              </button>
            )
          })}

          <div className="nav-pill-sep" />

          {/* Dropdown groups */}
          {NAV_GROUPS.map(group => (
            <NavDropdown
              key={group.id}
              group={group}
              page={page}
              onNavigate={navigate}
              triggerRef={el => { tabRefs.current[group.id] = el }}
            />
          ))}
        </div>

        {/* ── Right actions (RTL end = visually left) ── */}
        <div className="nav-actions">

          {/* PWA install — only shown when browser offers install */}
          {pwaPrompt && (
            <button
              className="nav-action-btn"
              onClick={handlePwaInstall}
              title="تثبيت التطبيق"
              style={{ gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span style={{ fontSize: 11 }}>تثبيت</span>
            </button>
          )}

          {/* Search / Command palette */}
          <button
            className="nav-action-btn nav-search-btn"
            onClick={() => setCmdOpen(true)}
            title="بحث (Ctrl+K)"
          >
            <IcSearch size={15} />
            <span className="nav-search-hint">Ctrl+K</span>
          </button>

          {/* Quick Add */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-action-btn nav-add-btn"
              onClick={() => setQuickAddOpen(o => !o)}
              title="إضافة جديد"
              aria-haspopup="menu"
              aria-expanded={quickAddOpen}
            >
              <IcPlus size={16} />
            </button>
            {quickAddOpen && (
              <QuickAddMenu onNavigate={navigate} onClose={() => setQuickAddOpen(false)} />
            )}
          </div>

          {/* Separator */}
          <div className="nav-sep" />

          {/* Theme toggle */}
          <button
            className="nav-action-btn nav-theme-btn"
            onClick={toggleTheme}
            title={isDark ? 'الوضع المضيء' : 'الوضع الداكن'}
          >
            <span style={{ display:'flex', transition:'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)', transform: isDark ? 'rotate(0deg)' : 'rotate(200deg)' }}>
              {isDark ? <IcSun size={16} /> : <IcMoon size={16} />}
            </span>
          </button>

          {/* User avatar + dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="nav-avatar-btn"
              onClick={() => setUserMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title={user?.name || 'المستخدم'}
            >
              <span className="nav-avatar-letter">{userInitial}</span>
              <span className={`presence-dot ${presence === 'online' ? 'pd-online' : 'pd-idle'}`} />
            </button>
            {userMenuOpen && (
              <UserMenuPopup
                user={user}
                presence={presence}
                onLogout={onLogout}
                onNavigate={navigate}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ MOBILE HEADER ══════════ */}
      <header className="mobile-header" aria-label="رأس الصفحة">
        {/* Hamburger — DOM first = visually RIGHT in RTL */}
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
          style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', WebkitTapHighlightColor:'transparent' }}
        >
          <img src={isDark ? (logoDarkUrl || logoUrl) : logoUrl} alt="مَوج" style={{ width:44, height:44, objectFit:'contain', display:'block', filter:'drop-shadow(0 2px 8px rgba(49,140,231,0.30)) drop-shadow(0 1px 2px rgba(0,0,0,0.18))' }} />
        </button>

        {/* Theme toggle — DOM last = visually LEFT in RTL */}
        <button
          onClick={toggleTheme}
          style={{ width:40, height:40, borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
        >
          {isDark ? <IcSun size={16} /> : <IcMoon size={16} />}
        </button>
      </header>

      {/* ══════════ MOBILE DRAWER (RIGHT side in RTL) ══════════ */}
      {drawerOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="قائمة التنقل">

            {/* Drawer header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ position:'relative', width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,var(--action),var(--info))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16, color:'#fff', boxShadow:'0 0 12px var(--action-glow)', flexShrink:0 }}>
                  {userInitial}
                  <span className={`presence-dot ${presence === 'online' ? 'pd-online' : 'pd-idle'}`} />
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{user?.name || 'المستخدم'}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{ROLE_LABELS[user?.role || ''] || ''}</div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ width:36, height:36, borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
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
            <div style={{ marginTop:'auto', paddingTop:16, borderTop:'1px solid var(--border)' }}>
              <button
                onClick={onLogout}
                className="mobile-drawer-item"
                style={{ color:'var(--danger)' }}
              >
                <IcLogout size={18} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════ COMMAND PALETTE ══════════ */}
      {cmdOpen && (
        <CommandPalette onNavigate={navigate} onClose={() => setCmdOpen(false)} />
      )}

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main
        key={page}
        className="page-main"
        style={{ position:'relative', zIndex:1, flex:1, width:'100%', minHeight:'100vh', animation:'pageSlideIn var(--dur-page) var(--ease-out) both' }}
      >
        {children}
      </main>
    </div>
  )
}
