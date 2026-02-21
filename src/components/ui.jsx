import React, { useState, useRef, useEffect } from 'react'

// ─── BUTTON ──────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, style, type = 'button', loading, ...props }) {
  const sizes = { sm: '6px 14px', md: '10px 20px', lg: '14px 28px' }
  const fontSizes = { sm: '12px', md: '13px', lg: '15px' }

  const variants = {
    primary: { background: 'var(--teal)', color: '#07080f', fontWeight: 700 },
    secondary: { background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--bg-border)' },
    danger: { background: 'rgba(255,71,87,0.15)', color: 'var(--red)', border: '1px solid rgba(255,71,87,0.3)' },
    ghost: { background: 'transparent', color: 'var(--text-sec)', border: '1px solid var(--bg-border)' },
    violet: { background: 'var(--violet)', color: '#fff', fontWeight: 700 },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: sizes[size],
        fontSize: fontSizes[size],
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition)',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font)',
        whiteSpace: 'nowrap',
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {loading ? <Spinner size={14} /> : children}
    </button>
  )
}

// ─── INPUT ───────────────────────────────────────────────────
export function Input({ label, error, style, containerStyle, icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text-sec)', fontWeight: 600 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            {icon}
          </span>
        )}
        <input
          style={{
            width: '100%',
            padding: icon ? '10px 36px 10px 12px' : '10px 12px',
            background: 'var(--bg-surface)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--bg-border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: 'var(--font)',
            outline: 'none',
            transition: 'border-color var(--transition)',
            ...style,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--teal)'}
          onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--bg-border)'}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

// ─── SELECT ──────────────────────────────────────────────────
export function Select({ label, error, style, containerStyle, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text-sec)', fontWeight: 600 }}>{label}</label>}
      <select
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-surface)',
          border: `1px solid ${error ? 'var(--red)' : 'var(--bg-border)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text)',
          fontSize: 13,
          fontFamily: 'var(--font)',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {children}
      </select>
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

// ─── TEXTAREA ────────────────────────────────────────────────
export function Textarea({ label, error, style, containerStyle, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text-sec)', fontWeight: 600 }}>{label}</label>}
      <textarea
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-surface)',
          border: `1px solid ${error ? 'var(--red)' : 'var(--bg-border)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text)',
          fontSize: 13,
          fontFamily: 'var(--font)',
          outline: 'none',
          resize: 'vertical',
          minHeight: 80,
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--teal)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--bg-border)'}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

// ─── CARD ────────────────────────────────────────────────────
export function Card({ children, style, onClick, hover = false, glow }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${glow && hovered ? glow : 'var(--bg-border)'}`,
        borderRadius: 'var(--radius)',
        padding: 20,
        transition: 'all var(--transition)',
        cursor: onClick ? 'pointer' : 'default',
        transform: hover && hovered ? 'translateY(-2px)' : 'none',
        boxShadow: glow && hovered ? `0 8px 32px ${glow}25` : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── MODAL ───────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 560 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth,
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'modalIn 0.18s ease',
      }}>
        <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
        {title && (
          <div style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--bg-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontWeight: 700, fontSize: 16,
          }}>
            {title}
            {onClose && (
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>
                ✕
              </button>
            )}
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── BADGE ───────────────────────────────────────────────────
export function Badge({ children, color = '#00e4b8', style }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      background: `${color}20`,
      color,
      border: `1px solid ${color}40`,
      ...style,
    }}>
      {children}
    </span>
  )
}

// ─── STAT CARD ───────────────────────────────────────────────
export function StatCard({ label, value, icon, color = 'var(--teal)', trend, sub }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--bg-border)',
      borderRadius: 'var(--radius)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-sec)', fontWeight: 600 }}>{label}</span>
        {icon && (
          <span style={{
            width: 36, height: 36,
            background: `${color}18`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      {(trend !== undefined || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          {trend !== undefined && (
            <span style={{ color: trend >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ color: 'var(--text-muted)' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ─── SPINNER ─────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--teal)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  )
}

// ─── TOAST ───────────────────────────────────────────────────
let toastFn = null
export function setToastFn(fn) { toastFn = fn }
export function toast(msg, type = 'success') { toastFn?.(msg, type) }

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    setToastFn((msg, type = 'success') => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, msg, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    })
  }, [])

  return (
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 20px',
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          background: t.type === 'error' ? 'var(--red)' : t.type === 'warning' ? 'var(--amber)' : 'var(--teal)',
          color: t.type === 'warning' ? '#07080f' : t.type === 'success' ? '#07080f' : '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── CONFIRM MODAL ───────────────────────────────────────────
export function ConfirmModal({ open, onClose, onConfirm, title = 'تأكيد الحذف', message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={420}>
      <p style={{ color: 'var(--text-sec)', marginBottom: 20, lineHeight: 1.7 }}>{message || 'هل أنت متأكد؟'}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn variant="danger" onClick={onConfirm} loading={loading}>تأكيد الحذف</Btn>
      </div>
    </Modal>
  )
}

// ─── EMPTY STATE ─────────────────────────────────────────────
export function Empty({ title, message, action }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <div style={{ fontWeight: 700, color: 'var(--text-sec)', marginBottom: 6, fontSize: 15 }}>{title || 'لا توجد بيانات'}</div>
      {message && <div style={{ fontSize: 13, marginBottom: 16 }}>{message}</div>}
      {action}
    </div>
  )
}

// ─── PAGE HEADER ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

// ─── TABS ────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      background: 'var(--bg-surface)',
      border: '1px solid var(--bg-border)',
      borderRadius: 'var(--radius-sm)',
      padding: 4,
      flexWrap: 'wrap',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: active === tab.id ? 'var(--teal)' : 'transparent',
            color: active === tab.id ? '#07080f' : 'var(--text-sec)',
            fontWeight: active === tab.id ? 700 : 500,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all var(--transition)',
            fontFamily: 'var(--font)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {tab.icon && tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── TOGGLE ──────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 42, height: 24,
          borderRadius: 99,
          background: checked ? 'var(--teal)' : 'var(--bg-border)',
          position: 'relative',
          transition: 'background var(--transition)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          right: checked ? 3 : 'auto',
          left: checked ? 'auto' : 3,
          transition: 'all var(--transition)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{label}</span>}
    </label>
  )
}

// ─── COLOR PICKER ────────────────────────────────────────────
export function ColorPicker({ value, onChange, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: value,
        border: '2px solid var(--bg-border)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '200%', height: '200%', transform: 'translate(-25%, -25%)', cursor: 'pointer', opacity: 0, position: 'absolute' }}
        />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
        />
      </div>
      <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-sec)' }}>{value}</span>
    </div>
  )
}
