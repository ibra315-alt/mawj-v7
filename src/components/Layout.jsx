import React, { useState } from 'react'
import {
  IcDashboard, IcOrders, IcCustomers, IcExpenses, IcSettlements,
  IcReports, IcPartners, IcInventory, IcSuppliers, IcAccounting,
  IcSettings, IcLogout, IcMenu, IcClose, IcNotif,
} from './Icons'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'الرئيسية',      icon: IcDashboard },
  { id: 'orders',       label: 'الطلبات',        icon: IcOrders },
  { id: 'customers',    label: 'العملاء',         icon: IcCustomers },
  { id: 'inventory',    label: 'المخزون',         icon: IcInventory },
  { id: 'suppliers',    label: 'الموردون',        icon: IcSuppliers },
  { id: 'expenses',     label: 'المصاريف',        icon: IcExpenses },
  { id: 'settlements',  label: 'التسويات',        icon: IcSettlements },
  { id: 'accounting',   label: 'المحاسبة',        icon: IcAccounting },
  { id: 'partners',     label: 'الشركاء',         icon: IcPartners },
  { id: 'reports',      label: 'التقارير',        icon: IcReports },
  { id: 'settings',     label: 'الإعدادات',       icon: IcSettings },
]

const MOBILE_NAV = [
  { id: 'dashboard', label: 'الرئيسية', icon: IcDashboard },
  { id: 'orders',    label: 'الطلبات',  icon: IcOrders },
  { id: 'inventory', label: 'المخزون',  icon: IcInventory },
  { id: 'reports',   label: 'التقارير', icon: IcReports },
  { id: 'settings',  label: 'الإعدادات', icon: IcSettings },
]

export default function Layout({ page, onNavigate, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        overflowY: 'auto',
      }} className="desktop-only">
        <SidebarContent page={page} onNavigate={onNavigate} user={user} onLogout={onLogout} />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <aside style={{
        width: 260,
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        right: sidebarOpen ? 0 : '-100%',
        bottom: 0,
        zIndex: 210,
        transition: 'right 0.25s ease',
        overflowY: 'auto',
      }} className="mobile-only">
        <SidebarContent
          page={page}
          onNavigate={id => { onNavigate(id); setSidebarOpen(false) }}
          user={user}
          onLogout={onLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── MAIN ── */}
      <main style={{
        flex: 1,
        marginRight: 'var(--sidebar-w)',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mobile Header */}
        <header style={{
          height: 'var(--header-h)',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--bg-border)',
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
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 4 }}
          >
            <IcMenu size={22} />
          </button>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--teal)' }}>مَوج</span>
          <div style={{ width: 30 }} />
        </header>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Page content injected here */}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--bg-border)',
        display: 'none',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} className="mobile-flex">
        {MOBILE_NAV.map(item => {
          const Icon = item.icon
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                color: active ? 'var(--teal)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                transition: 'color var(--transition)',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
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
      `}</style>
    </div>
  )
}

function SidebarContent({ page, onNavigate, user, onLogout, onClose }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--teal)', letterSpacing: '-0.5px' }}>مَوج</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>نظام إدارة المبيعات</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer' }}>
            <IcClose size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: active ? 'rgba(0,228,184,0.12)' : 'transparent',
                color: active ? 'var(--teal)' : 'var(--text-sec)',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all var(--transition)',
                width: '100%',
                textAlign: 'right',
                fontFamily: 'var(--font)',
                borderRight: active ? '3px solid var(--teal)' : '3px solid transparent',
              }}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--bg-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#fff',
            flexShrink: 0,
          }}>
            {user?.name?.[0] || '؟'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role === 'admin' ? 'مدير' : user?.role}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--red)',
            fontSize: 13,
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'var(--font)',
            transition: 'background var(--transition)',
          }}
          className="logout-btn"
        >
          <IcLogout size={16} />
          تسجيل الخروج
        </button>
      </div>
    </>
  )
}
