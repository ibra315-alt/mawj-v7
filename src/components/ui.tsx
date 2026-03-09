import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/* ══════════════════════════════════════════════════
   موج UI v12 — TypeScript · Sky Blue Glassmorphism
══════════════════════════════════════════════════ */

// ── BTN ──────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'violet' | 'pink' | 'ghost-teal'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  onClick?: () => void
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export function Btn({ children, variant = 'primary', size = 'md', loading, onClick, style, type = 'button', disabled }: BtnProps) {
  const sz = { sm: { padding: '5px 12px', fontSize: 12, gap: 4 }, md: { padding: '9px 18px', fontSize: 13, gap: 6 }, lg: { padding: '12px 24px', fontSize: 14, gap: 7 } }[size] || { padding: '9px 18px', fontSize: 13, gap: 6 }
  const va: any = {
    primary:     { bg: 'var(--action)',                       color: '#ffffff',            fw: 800, shadow: 'none', border: 'none' },
    secondary:   { bg: 'var(--bg-surface)',                   color: 'var(--text-primary)', fw: 600, shadow: 'var(--card-shadow)', border: 'none' },
    danger:      { bg: 'rgba(var(--danger-rgb),0.08)',         color: 'var(--danger)',      fw: 700, shadow: 'none', border: 'none' },
    ghost:       { bg: 'transparent',                         color: 'var(--text-secondary)', fw: 600, shadow: 'none', border: 'none' },
    violet:      { bg: 'var(--info-faint)',                   color: 'var(--info)',         fw: 700, shadow: 'none', border: 'none' },
    pink:        { bg: 'var(--action-soft)',                  color: 'var(--action)',       fw: 700, shadow: 'none', border: 'none' },
    'ghost-teal':{ bg: 'transparent',                        color: 'var(--action)',       fw: 600, shadow: 'none', border: '1.5px solid var(--action-soft)' },
  }[variant] || {}
  const off = disabled || loading
  return (
    <button type={type} onClick={!off ? onClick : undefined} disabled={off}
      className={`mawj-btn mawj-btn-${variant}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
        padding: sz.padding, fontSize: sz.fontSize,
        borderRadius: 'var(--r-sm)', border: va.border || 'none',
        background: off ? 'var(--bg-hover)' : va.bg,
        color: off ? 'var(--text-muted)' : va.color,
        fontFamily: 'inherit', fontWeight: va.fw,
        boxShadow: off ? 'none' : va.shadow,
        cursor: off ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap', opacity: off ? 0.55 : 1,
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {loading
        ? <svg width={13} height={13} viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
          </svg>
        : children
      }
    </button>
  )
}

// ── INPUT ──────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  containerStyle?: React.CSSProperties
}

export function Input({ label, error, icon, hint, containerStyle, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label style={{ fontSize: 'var(--t-label)', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}>{icon}</span>}
        <input style={{ width: '100%', padding: '10px 14px', paddingInlineEnd: icon ? 38 : 14, background: 'var(--bg-surface)', border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 'var(--t-body)', boxSizing: 'border-box', transition: 'border-color 0.16s ease, box-shadow 0.16s ease', ...style }} {...props} />
      </div>
      {hint && !error && <span style={{ fontSize: 'var(--t-label)', color: 'var(--text-muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 'var(--t-label)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>{error}</span>}
    </div>
  )
}

// ── SELECT ──────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  containerStyle?: React.CSSProperties
}

export function Select({ label, children, containerStyle, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label style={{ fontSize: 'var(--t-label)', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>}
      <select style={{ width: '100%', padding: '10px 14px 10px 32px', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 'var(--t-body)', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2378756F'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center', boxSizing: 'border-box', transition: 'border-color 0.16s ease, box-shadow 0.16s ease', ...style }} {...props}>{children}</select>
    </div>
  )
}

// ── TEXTAREA ──────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  containerStyle?: React.CSSProperties
}

export function Textarea({ label, containerStyle, style, ...props }: TextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label style={{ fontSize: 'var(--t-label)', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>}
      <textarea style={{ width: '100%', padding: '10px 14px', minHeight: 88, resize: 'vertical', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 'var(--t-body)', lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.16s ease, box-shadow 0.16s ease', ...style }} {...props} />
    </div>
  )
}

// ── CARD ──────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  hover?: boolean
  onClick?: () => void
  accentColor?: string
  glow?: string
  [key: string]: any
}

export function Card({ children, style, hover, onClick, accentColor }: CardProps) {
  return (
    <div onClick={onClick} className={hover || onClick ? 'mawj-card mawj-card-hover' : 'mawj-card'}
      style={{ background: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--border)', borderTopColor: 'var(--glass-edge)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)', cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', ...style }}
    >{children}</div>
  )
}

// ── STAT CARD ──────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  color?: string
  trend?: number
  sub?: string
  icon?: React.ReactNode
}

export function StatCard({ label, value, color, trend, sub, icon }: StatCardProps) {
  const [display, setDisplay] = useState(0)
  const raw   = String(value ?? '')
  const isAED = raw.includes('د.إ')
  const isPct = raw.includes('%')
  const num   = parseFloat(raw.replace(/[^0-9.-]/g, ''))
  const isNum = !isNaN(num) && num > 0
  const c     = color || 'var(--action)'

  useEffect(() => {
    if (!isNum) { setDisplay(num); return }
    let f = 0; const total = 44; let raf: number
    const tick = () => {
      f++
      setDisplay(num * (1 - Math.pow(1 - f / total, 3)))
      if (f < total) raf = requestAnimationFrame(tick)
      else setDisplay(num)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  const fmt = isNum
    ? isAED ? `${Math.round(display).toLocaleString()} د.إ`
    : isPct  ? `${display.toFixed(1)}%`
    : Math.round(display).toLocaleString()
    : value

  return (
    <div className="hover-lift" style={{ background: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--border)', borderTopColor: 'var(--glass-edge)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', position: 'relative', overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${c},transparent)`, opacity: 0.7, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -32, right: -32, width: 100, height: 100, borderRadius: '50%', background: c, opacity: 0.12, filter: 'blur(24px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--s3)', position: 'relative' }}>
        <div style={{ fontSize: 'var(--t-label)', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', lineHeight: 1.4 }}>{label}</div>
        {icon && <div style={{ color: c, flexShrink: 0, background: `${c}18`, borderRadius: 'var(--r-sm)', padding: '6px', display: 'flex' }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 'var(--t-2xl)', fontWeight: 900, color: c, letterSpacing: '-0.03em', lineHeight: 1.1, position: 'relative' }}>{fmt}</div>
      {(trend !== undefined || sub) && (
        <div style={{ fontSize: 'var(--t-label)', color: 'var(--text-muted)', marginTop: 'var(--s2)', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          {trend !== undefined && (
            <span style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, background: trend >= 0 ? 'rgba(var(--success-rgb),0.08)' : 'rgba(var(--danger-rgb),0.08)', padding: '2px 6px', borderRadius: 999 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ── SKELETON ──────────────────────────────────────────
interface SkeletonProps {
  width?: string | number
  height?: number
  radius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius || 'var(--r-sm)', flexShrink: 0, ...style }} />
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Skeleton width={40} height={40} radius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton height={13} width="55%" style={{ marginBottom: 6 }} />
          <Skeleton height={10} width="35%" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} height={10} width={i === rows - 1 ? '65%' : '100%'} style={{ marginBottom: i < rows - 1 ? 6 : 0 }} />)}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
      <Skeleton height={10} width="50%" style={{ marginBottom: 14 }} />
      <Skeleton height={30} width="60%" style={{ marginBottom: 10 }} />
      <Skeleton height={10} width="40%" />
    </div>
  )
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonStat key={i} />)}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--r-lg)' }}>
      <Skeleton width={36} height={36} radius="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton height={12} width="40%" style={{ marginBottom: 6 }} />
        <Skeleton height={10} width="25%" />
      </div>
      <Skeleton width={64} height={22} radius={999} style={{ flexShrink: 0 }} />
      <Skeleton width={72} height={14} style={{ flexShrink: 0 }} />
    </div>
  )
}

// ── BADGE ──────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  color?: string
  style?: React.CSSProperties
  variant?: string
  [key: string]: any
}

export function Badge({ children, color, style }: BadgeProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 'var(--t-label)', fontWeight: 700, background: color ? `${color}18` : 'var(--bg-hover)', color: color || 'var(--text-muted)', letterSpacing: '0.03em', ...style }}>
      {children}
    </span>
  )
}

export function Spinner({ size = 24, color = 'var(--action)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  )
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--border)', position: 'absolute' }} />
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', animation: 'spin 1s linear infinite' }}>
          <defs>
            <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="var(--action)"/>
              <stop offset="50%"  stopColor="var(--info)"/>
              <stop offset="100%" stopColor="#60AEFF"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="none" stroke="url(#spinGrad)" strokeWidth="2.5" strokeDasharray="44 132" strokeLinecap="round"/>
        </svg>
        <div style={{ position: 'absolute', inset: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: 'var(--action)', boxShadow: '0 0 12px var(--action-glow)' }} />
      </div>
      <span style={{ fontSize: 'var(--t-sm)', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>جاري التحميل...</span>
    </div>
  )
}

// ── MODAL ──────────────────────────────────────────
interface ModalProps {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number
  maxWidth?: number
  footer?: React.ReactNode
  [key: string]: any
}

let _modalCount = 0
export function Modal({ open, onClose, title, children, width = 580, footer }: ModalProps) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 769)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => {
    if (open) {
      _modalCount++
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    }
    return () => {
      if (open) {
        _modalCount = Math.max(0, _modalCount - 1)
        if (_modalCount === 0) { document.body.style.overflow = ''; document.body.classList.remove('modal-open') }
      }
    }
  }, [open])
  if (!open) return null

  const modalTitleId = `modal-title-${title?.replace(/\s/g, '-') || 'dialog'}`

  if (mobile) {
    return createPortal(
      <div role="dialog" aria-modal="true" aria-labelledby={modalTitleId} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'pageIn 0.22s var(--ease-io) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', flexShrink: 0, background: 'var(--sidebar-bg)' }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent', padding: '4px 0' }}>← رجوع</button>
          <h2 id={modalTitleId} style={{ fontSize: 16, fontWeight: 900, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h2>
          <div style={{ width: 64 }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', WebkitOverflowScrolling: 'touch' as any }}>
          {children}
          {footer && <div style={{ marginTop: 24, paddingTop: 16, display: 'flex', gap: 10, flexDirection: 'column', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))' }}>{footer}</div>}
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={modalTitleId} style={{ width: '100%', maxWidth: width, maxHeight: '88dvh', display: 'flex', flexDirection: 'column', background: 'var(--modal-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--border)', borderTopColor: 'var(--glass-edge)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--float-shadow)', animation: 'modalIn 0.22s var(--ease-io) both', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexShrink: 0 }}>
          <button onClick={onClose} className="icon-btn" style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>✕</button>
          <h2 id={modalTitleId} style={{ fontSize: 'var(--t-body)', fontWeight: 800, letterSpacing: '-0.01em', margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 'var(--s5)', WebkitOverflowScrolling: 'touch' as any }}>{children}</div>
        {footer && <div style={{ padding: '14px 20px', background: 'var(--modal-bg)', flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

// ── TOAST ──────────────────────────────────────────
interface ToastItem { msg: string; type: string; id: number }
let _setToast: ((t: ToastItem) => void) | null = null
const _earlyQueue: ToastItem[] = []
export const setToastFn = (fn: (t: ToastItem) => void) => { _setToast = fn }
export const toast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  const item = { msg, type, id: Date.now() }
  if (_setToast) _setToast(item)
  else _earlyQueue.push(item)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  useEffect(() => {
    setToastFn(t => setToasts(p => [...p.slice(-2), t]))
    // Flush any toasts that fired before mount
    _earlyQueue.forEach(t => setToasts(p => [...p.slice(-2), t]))
    _earlyQueue.length = 0
  }, [])
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3000)
    return () => clearTimeout(t)
  }, [toasts])
  if (!toasts.length) return null
  const palette: Record<string, { bg: string; color: string; icon: string }> = {
    success: { bg: 'linear-gradient(135deg,var(--success),#34d399)', color: '#fff', icon: '✓' },
    error:   { bg: 'linear-gradient(135deg,var(--danger),#f87171)',  color: '#fff', icon: '✕' },
    warning: { bg: 'linear-gradient(135deg,var(--warning),#fbbf24)', color: '#fff', icon: '!' },
    info:    { bg: 'linear-gradient(135deg,var(--action),var(--action-deep))', color: '#fff', icon: 'ℹ' },
  }
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map(t => {
        const v = palette[t.type] || palette.success
        return (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, animation: 'toastIn 0.22s ease both' }}>
            <div role="alert" style={{ padding: '10px 20px', borderRadius: 999, fontSize: 'var(--t-sm)', fontWeight: 700, background: v.bg, color: v.color, backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 900 }}>{v.icon}</span>
              {t.msg}
            </div>
            <div style={{ width: '80%', height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.7)', transformOrigin: 'left center', animation: 'toastDrain 3s linear forwards' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CONFIRM MODAL ──────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  itemName?: string
  itemDetail?: string
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'حذف', danger = true, loading, itemName, itemDetail }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'تأكيد'} width={400}
      footer={<><Btn variant="ghost" onClick={onClose}>إلغاء</Btn><Btn variant={danger ? 'danger' : 'primary'} loading={loading} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Btn></>}
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--t-sm)', lineHeight: 1.75 }}>{message}</p>
      {itemName && (
        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:'var(--r-md)', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--danger)' }}>{itemName}</div>
          {itemDetail && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{itemDetail}</div>}
        </div>
      )}
    </Modal>
  )
}

// ── DIRTY WARNING ──────────────────────────────────────────
export function DirtyWarning({ onDiscard, onContinue }: { onDiscard: () => void; onContinue: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '10px 14px', borderRadius: 'var(--r-md)',
      background: 'rgba(251,191,36,0.10)', border: '1.5px solid rgba(251,191,36,0.28)',
      marginBottom: 12, animation: 'toastIn 0.18s ease both',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', flex: 1 }}>
        ⚠ توجد تغييرات غير محفوظة
      </span>
      <button onClick={onContinue} style={{
        fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 'var(--r-sm)',
        border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>متابعة التعديل</button>
      <button onClick={onDiscard} style={{
        fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 'var(--r-sm)',
        border: 'none', background: 'rgba(251,191,36,0.18)', color: 'var(--warning)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>تجاهل</button>
    </div>
  )
}

// ── PAGE HEADER ──────────────────────────────────────────
interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 'var(--s6)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'var(--t-xl)', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0, color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 'var(--t-sm)', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
      </div>
      <div style={{ height: 1.5, background: 'linear-gradient(90deg,transparent,var(--action),var(--info),transparent)', marginTop: 'var(--s4)', opacity: 0.4, borderRadius: 999 }} />
    </div>
  )
}

// ── TABS ──────────────────────────────────────────
interface TabItem { id: string; label: string }
interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any, paddingBottom: 2 }}>
      <div style={{ display: 'inline-flex', gap: 3, background: 'var(--bg-hover)', borderRadius: 999, padding: '4px 5px', minWidth: 'max-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: '7px 14px', borderRadius: 999, border: 'none', background: active === t.id ? 'linear-gradient(135deg,var(--action),var(--action-deep))' : 'transparent', color: active === t.id ? '#ffffff' : 'var(--text-secondary)', fontWeight: active === t.id ? 800 : 500, fontSize: 'var(--t-sm)', cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: active === t.id ? '0 2px 12px var(--action-glow)' : 'none', whiteSpace: 'nowrap', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>{t.label}</button>
        ))}
      </div>
    </div>
  )
}

// ── TOGGLE ──────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 999, background: checked ? 'var(--action)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.22s ease', flexShrink: 0, boxShadow: checked ? '0 0 12px var(--action-glow)' : 'none', WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ position: 'absolute', top: 3, right: checked ? 3 : 22, width: 18, height: 18, borderRadius: '50%', background: checked ? '#ffffff' : 'var(--text-muted)', transition: 'right 0.22s var(--ease-io)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
    </div>
  )
}

// ── COLOR PICKER ──────────────────────────────────────────
export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', width: 44, height: 44 }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--r-sm)', background: value, border: '2px solid var(--border)', cursor: 'pointer', boxShadow: `0 0 14px ${value}50` }} />
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
    </div>
  )
}

// ── EMPTY ──────────────────────────────────────────
interface EmptyProps {
  title?: string
  sub?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function Empty({ title = 'لا يوجد بيانات', sub, action, icon }: EmptyProps) {
  return (
    <div className="empty-state">
      <div className="empty-wave-icon">
        {icon || <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--action)" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.4"/></svg>}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 'var(--t-body)', color: 'var(--text-secondary)', marginBottom: 'var(--s1)' }}>{title}</div>
        {sub && <div style={{ fontSize: 'var(--t-sm)', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto' }}>{sub}</div>}
      </div>
      {action && <div style={{ marginTop: 'var(--s2)' }}>{action}</div>}
    </div>
  )
}

// ── DIVIDER ──────────────────────────────────────────
export function Divider({ label, style }: { label?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 'var(--s4) 0', ...style }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span style={{ fontSize: 'var(--t-label)', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────
interface ProgressBarProps {
  value?: number
  max?: number
  color?: string
  height?: number
  showLabel?: boolean
  style?: React.CSSProperties
}

export function ProgressBar({ value = 0, max = 100, color, height = 6, showLabel = false, style }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const fillColor = color || 'linear-gradient(90deg,var(--info),var(--action))'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {showLabel && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-label)', color: 'var(--text-muted)' }}><span>{value}</span><span>{pct.toFixed(0)}%</span></div>}
      <div style={{ height, borderRadius: 999, background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: fillColor, transition: 'width 0.6s var(--ease-io)', boxShadow: color ? undefined : '0 0 8px var(--action-glow)' }} />
      </div>
    </div>
  )
}

// ── DONUT MINI ──────────────────────────────────────────
interface DonutMiniProps {
  value?: number
  max?: number
  color?: string
  size?: number
  strokeWidth?: number
}

export function DonutMini({ value = 0, max = 100, color = 'var(--action)', size = 56, strokeWidth = 5 }: DonutMiniProps) {
  const pct  = Math.min(100, Math.max(0, (value / max) * 100))
  const r    = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * pct / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.22} fontWeight="700" fontFamily="inherit">{pct.toFixed(0)}%</text>
    </svg>
  )
}
