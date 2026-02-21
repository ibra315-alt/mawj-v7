import React, { useState, useEffect, useRef } from 'react'

/* ══════════════════════════════════════════════
   BUTTON — fully rounded, shimmer, glow
══════════════════════════════════════════════ */
export function Btn({ children, variant='primary', size='md', loading, onClick, style, type='button', disabled }) {
  const sizes = {
    sm: { padding:'6px 16px', fontSize:11 },
    md: { padding:'10px 22px', fontSize:13 },
    lg: { padding:'14px 32px', fontSize:15 },
  }
  const variants = {
    primary: {
      background:'linear-gradient(135deg, #00e4b8 0%, #00c49a 100%)',
      color:'#07090f', fontWeight:800,
      boxShadow:'0 4px 18px rgba(0,228,184,0.35)',
      hoverShadow:'0 6px 28px rgba(0,228,184,0.55)',
    },
    secondary: {
      background:'var(--bg-glass)',
      color:'var(--text)', fontWeight:600,
      border:'1px solid var(--bg-border)',
      backdropFilter:'blur(12px)',
      boxShadow:'none',
      hoverShadow:'0 4px 16px rgba(0,0,0,0.2)',
    },
    danger: {
      background:'linear-gradient(135deg,#ff4757,#cc1020)',
      color:'#fff', fontWeight:700,
      boxShadow:'0 4px 18px rgba(255,71,87,0.35)',
      hoverShadow:'0 6px 28px rgba(255,71,87,0.5)',
    },
    ghost: {
      background:'transparent',
      color:'var(--text-sec)', fontWeight:600,
      border:'1px solid var(--bg-border)',
      boxShadow:'none', hoverShadow:'none',
    },
    violet: {
      background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',
      color:'#fff', fontWeight:700,
      boxShadow:'0 4px 18px rgba(139,92,246,0.4)',
      hoverShadow:'0 6px 28px rgba(139,92,246,0.6)',
    },
  }
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
        ...s,
        borderRadius:'var(--radius-pill)',
        border: v.border || 'none',
        background: isDisabled ? 'rgba(255,255,255,0.07)' : v.background,
        color: isDisabled ? 'var(--text-muted)' : v.color,
        fontFamily:'inherit',
        fontWeight: v.fontWeight,
        boxShadow: isDisabled ? 'none' : v.boxShadow,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition:'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        position:'relative', overflow:'hidden',
        backdropFilter: v.backdropFilter,
        letterSpacing:'0.01em',
        whiteSpace:'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        if(isDisabled) return
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = v.hoverShadow
        if(variant==='secondary'||variant==='ghost') e.currentTarget.style.background='var(--bg-glass-hover)', e.currentTarget.style.color='var(--text)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = isDisabled ? 'none' : v.boxShadow
        if(variant==='secondary'||variant==='ghost') e.currentTarget.style.background=v.background, e.currentTarget.style.color='var(--text-sec)'
      }}
      onMouseDown={e => { if(!isDisabled) e.currentTarget.style.transform='translateY(0) scale(0.97)' }}
      onMouseUp={e => { if(!isDisabled) e.currentTarget.style.transform='translateY(-2px) scale(1)' }}
    >
      {loading
        ? <svg width="14" height="14" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite',flexShrink:0}}><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/></svg>
        : children
      }
    </button>
  )
}

/* ══════════════════════════════════════════════
   INPUT
══════════════════════════════════════════════ */
export function Input({ label, error, icon, containerStyle, style, ...props }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...containerStyle }}>
      {label && <label style={{ fontSize:11, fontWeight:600, color:'var(--text-sec)', letterSpacing:'0.04em', textTransform:'uppercase' }}>{label}</label>}
      <div style={{ position:'relative' }}>
        {icon && <span style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none', display:'flex' }}>{icon}</span>}
        <input
          style={{
            width:'100%',
            padding: icon ? '10px 40px 10px 14px' : '10px 14px',
            background:'var(--input-bg)',
            border:`1.5px solid ${error ? '#ff4757' : 'var(--input-border)'}`,
            borderRadius:'var(--radius-sm)',
            color:'var(--text)', fontSize:13,
            outline:'none', transition:'all 0.2s ease',
            backdropFilter:'blur(12px)',
            ...style,
          }}
          onFocus={e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12), 0 2px 8px rgba(0,0,0,0.15)' }}
          onBlur={e => { e.target.style.borderColor=error?'#ff4757':'var(--input-border)'; e.target.style.boxShadow='none' }}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize:11, color:'#ff4757', display:'flex', alignItems:'center', gap:4 }}>⚠ {error}</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════
   SELECT
══════════════════════════════════════════════ */
export function Select({ label, children, containerStyle, style, ...props }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...containerStyle }}>
      {label && <label style={{ fontSize:11, fontWeight:600, color:'var(--text-sec)', letterSpacing:'0.04em', textTransform:'uppercase' }}>{label}</label>}
      <select
        style={{
          width:'100%', padding:'10px 14px',
          background:'var(--input-bg)',
          border:'1.5px solid var(--input-border)',
          borderRadius:'var(--radius-sm)',
          color:'var(--text)', fontSize:13,
          outline:'none', cursor:'pointer',
          backdropFilter:'blur(12px)',
          transition:'all 0.2s ease',
          appearance:'none',
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237880aa'/%3E%3C/svg%3E")`,
          backgroundRepeat:'no-repeat',
          backgroundPosition:'left 14px center',
          ...style,
        }}
        onFocus={e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12)' }}
        onBlur={e => { e.target.style.borderColor='var(--input-border)'; e.target.style.boxShadow='none' }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TEXTAREA
══════════════════════════════════════════════ */
export function Textarea({ label, containerStyle, style, ...props }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...containerStyle }}>
      {label && <label style={{ fontSize:11, fontWeight:600, color:'var(--text-sec)', letterSpacing:'0.04em', textTransform:'uppercase' }}>{label}</label>}
      <textarea
        style={{
          width:'100%', padding:'10px 14px', minHeight:80, resize:'vertical',
          background:'var(--input-bg)',
          border:'1.5px solid var(--input-border)',
          borderRadius:'var(--radius-sm)',
          color:'var(--text)', fontSize:13,
          outline:'none', lineHeight:1.7,
          backdropFilter:'blur(12px)',
          transition:'all 0.2s ease',
          ...style,
        }}
        onFocus={e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12)' }}
        onBlur={e => { e.target.style.borderColor='var(--input-border)'; e.target.style.boxShadow='none' }}
        {...props}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════
   CARD — glass morphism with shimmer on hover
══════════════════════════════════════════════ */
export function Card({ children, style, hover=false, glow=false, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(28px)',
        WebkitBackdropFilter:'blur(28px)',
        border:`1.5px solid ${hov && hover ? 'rgba(0,228,184,0.22)' : 'var(--bg-border)'}`,
        borderRadius:'var(--radius)',
        padding:'22px',
        transition:'all 0.28s cubic-bezier(0.4,0,0.2,1)',
        cursor: onClick ? 'pointer' : 'default',
        transform: hov && hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: glow
          ? '0 0 40px rgba(0,228,184,0.12), var(--shadow-card)'
          : hov && hover
          ? '0 16px 48px rgba(0,0,0,0.4), 0 0 24px rgba(0,228,184,0.07)'
          : 'var(--shadow-card)',
        position:'relative', overflow:'hidden',
        ...style,
      }}
    >
      {/* Shimmer on hover */}
      {hover && hov && (
        <div style={{
          position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
          background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          animation:'shimmerSlide 0.7s ease forwards',
          pointerEvents:'none',
        }} />
      )}
      {/* Top shimmer line */}
      {glow && <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(0,228,184,0.5),transparent)', pointerEvents:'none' }} />}
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════
   STAT CARD — animated counter + orb glow
══════════════════════════════════════════════ */
export function StatCard({ label, value, color, trend, sub, icon }) {
  const [display, setDisplay] = useState(0)
  const [done, setDone]       = useState(false)
  const numStr = String(value)
  const isAED  = numStr.includes('د.إ')
  const isPct  = numStr.includes('%')
  const num    = parseFloat(numStr.replace(/[^0-9.-]/g,'')) || 0
  const isNum  = !isNaN(num) && num > 0 && (isAED || isPct || !isNaN(Number(value)))

  useEffect(() => {
    if (!isNum) { setDone(true); return }
    let frame = 0
    const total = 45
    const run = () => {
      frame++
      const t = frame/total
      const ease = 1 - Math.pow(1-t, 3)
      setDisplay(num * ease)
      if (frame < total) requestAnimationFrame(run)
      else { setDisplay(num); setDone(true) }
    }
    requestAnimationFrame(run)
  }, [value])

  const fmt = isNum
    ? isAED  ? `${Math.round(display).toLocaleString()} د.إ`
    : isPct  ? `${display.toFixed(1)}%`
    : Math.round(display).toLocaleString()
    : value

  const c = color || 'var(--teal)'

  return (
    <div style={{
      background:'var(--bg-glass)',
      backdropFilter:'blur(28px)',
      WebkitBackdropFilter:'blur(28px)',
      border:'1.5px solid var(--bg-border)',
      borderRadius:'var(--radius)',
      padding:'20px 22px',
      position:'relative', overflow:'hidden',
      transition:'all 0.28s cubic-bezier(0.4,0,0.2,1)',
      boxShadow:'var(--shadow-card)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform='translateY(-3px)'
        e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'
        e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.35)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='translateY(0)'
        e.currentTarget.style.borderColor='var(--bg-border)'
        e.currentTarget.style.boxShadow='var(--shadow-card)'
      }}
    >
      {/* Glow orb bg */}
      <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:c, opacity:0.08, filter:'blur(28px)', pointerEvents:'none' }} />
      {/* Top accent line */}
      <div style={{ position:'absolute', top:0, right:0, left:0, height:'2px', background:`linear-gradient(90deg,transparent,${c},transparent)`, opacity:0.6, pointerEvents:'none' }} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', lineHeight:1.4 }}>{label}</div>
        {icon && <div style={{ color:c, opacity:0.75, flexShrink:0 }}>{icon}</div>}
      </div>

      <div style={{
        fontSize:24, fontWeight:900, color:c,
        letterSpacing:'-0.03em', lineHeight:1.1,
        animation: done ? 'countUp 0.3s ease both' : 'none',
      }}>
        {fmt}
      </div>

      {(trend !== undefined || sub) && (
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
          {trend !== undefined && (
            <span style={{ color: trend >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700, display:'flex', alignItems:'center', gap:2 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   BADGE
══════════════════════════════════════════════ */
export function Badge({ children, color, style }) {
  const c = color || 'var(--teal)'
  // Convert CSS var to rgba for bg
  const bgMap = {
    'var(--teal)':   'rgba(0,228,184,0.12)',
    'var(--violet)': 'rgba(139,92,246,0.12)',
    'var(--red)':    'rgba(255,71,87,0.12)',
    'var(--green)':  'rgba(16,185,129,0.12)',
    'var(--gold)':   'rgba(230,185,74,0.12)',
    'var(--amber)':  'rgba(245,158,11,0.12)',
    'var(--blue)':   'rgba(59,130,246,0.12)',
    'var(--text-muted)': 'rgba(120,128,170,0.12)',
  }
  const borderMap = {
    'var(--teal)':   'rgba(0,228,184,0.3)',
    'var(--violet)': 'rgba(139,92,246,0.3)',
    'var(--red)':    'rgba(255,71,87,0.3)',
    'var(--green)':  'rgba(16,185,129,0.3)',
    'var(--gold)':   'rgba(230,185,74,0.3)',
    'var(--amber)':  'rgba(245,158,11,0.3)',
    'var(--blue)':   'rgba(59,130,246,0.3)',
    'var(--text-muted)': 'rgba(120,128,170,0.3)',
  }
  // Hex fallback
  function hexAlpha(hex, a) {
    const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r ? `rgba(${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)},${a})` : c
  }
  const bg = bgMap[c] || (c.startsWith('#') ? hexAlpha(c,0.12) : 'rgba(0,228,184,0.12)')
  const border = borderMap[c] || (c.startsWith('#') ? hexAlpha(c,0.3) : 'rgba(0,228,184,0.3)')

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'4px 12px',
      borderRadius:'var(--radius-pill)',
      fontSize:11, fontWeight:700, letterSpacing:'0.03em',
      background:bg, color:c,
      border:`1px solid ${border}`,
      whiteSpace:'nowrap',
      ...style,
    }}>
      {children}
    </span>
  )
}

/* ══════════════════════════════════════════════
   SPINNER
══════════════════════════════════════════════ */
export function Spinner({ size=24, color='var(--teal)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation:'spin 0.75s linear infinite', flexShrink:0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  )
}

/* ══════════════════════════════════════════════
   MODAL — deep glass
══════════════════════════════════════════════ */
export function Modal({ open, onClose, title, children, width=560 }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 769

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:1000,
        display:'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent:'center',
        background:'rgba(0,0,0,0.75)',
        backdropFilter:'blur(8px)',
        WebkitBackdropFilter:'blur(8px)',
        padding: isMobile ? 0 : 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width:'100%',
        maxWidth: isMobile ? '100%' : width,
        height: isMobile ? 'auto' : 'auto',
        maxHeight: isMobile ? '92dvh' : '88dvh',
        display:'flex',
        flexDirection:'column',
        background:'var(--modal-bg)',
        backdropFilter:'blur(48px)', WebkitBackdropFilter:'blur(48px)',
        border:'1.5px solid rgba(255,255,255,0.1)',
        borderRadius: isMobile ? '24px 24px 0 0' : 'var(--radius-xl)',
        boxShadow: isMobile
          ? '0 -16px 60px rgba(0,0,0,0.6)'
          : '0 32px 80px rgba(0,0,0,0.6)',
        animation: isMobile ? 'sheetUp 0.32s cubic-bezier(0.4,0,0.2,1) both' : 'modalIn 0.28s cubic-bezier(0.4,0,0.2,1) both',
        overflow:'hidden',
      }}>
        {/* Shimmer top line */}
        <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(0,228,184,0.5),transparent)', flexShrink:0 }} />

        {/* Drag pill (mobile only) */}
        {isMobile && (
          <div style={{ width:40, height:4, borderRadius:99, background:'rgba(255,255,255,0.18)', margin:'10px auto 2px', flexShrink:0 }} />
        )}

        {/* Sticky header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px',
          borderBottom:'1px solid var(--bg-border)',
          flexShrink:0,
          background:'var(--modal-bg)',
        }}>
          {/* Close left, Title right (RTL) */}
          <button
            onClick={onClose}
            style={{
              background:'var(--bg-glass)', border:'1.5px solid var(--bg-border)',
              borderRadius:'var(--radius-pill)', width:36, height:36,
              cursor:'pointer', color:'var(--text-sec)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:15, transition:'all 0.2s ease', flexShrink:0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--bg-glass-hover)'; e.currentTarget.style.color='var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--bg-glass)'; e.currentTarget.style.color='var(--text-sec)' }}
          >✕</button>
          <h2 style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.01em', margin:0 }}>{title}</h2>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex:1,
          overflowY:'auto',
          overflowX:'hidden',
          padding:'18px 20px',
          WebkitOverflowScrolling:'touch',
          // Ensure momentum scrolling on iOS
          scrollBehavior:'smooth',
        }}>
          {children}
          {/* Bottom breathing room on mobile so last field isn't behind keyboard */}
          {isMobile && <div style={{ height:40 }} />}
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.95) translateY(8px); }
          to   { opacity:1; transform:scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
let _setToast = null
export function setToastFn(fn) { _setToast = fn }
export function toast(msg, type='success') { _setToast?.({ msg, type, id: Date.now() }) }

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => { setToastFn(t => setToasts(p => [...p.slice(-2), t])) }, [])
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => setToasts(p => p.slice(1)), 2800)
    return () => clearTimeout(t)
  }, [toasts])
  if (!toasts.length) return null

  const colors = {
    success: { bg:'rgba(0,228,184,0.92)', color:'#07090f', border:'rgba(0,228,184,0.5)', icon:'✓' },
    error:   { bg:'rgba(255,71,87,0.92)',  color:'#fff',    border:'rgba(255,71,87,0.5)',  icon:'✕' },
    warning: { bg:'rgba(245,158,11,0.92)', color:'#fff',    border:'rgba(245,158,11,0.5)', icon:'⚠' },
  }

  return (
    <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:9999, display:'flex', flexDirection:'column', gap:8, alignItems:'center', pointerEvents:'none' }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.success
        return (
          <div key={t.id} style={{
            padding:'11px 22px', borderRadius:'var(--radius-pill)',
            fontSize:13, fontWeight:700,
            background:c.bg, color:c.color,
            backdropFilter:'blur(20px)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            animation:'toastIn 0.28s cubic-bezier(0.4,0,0.2,1) both',
            whiteSpace:'nowrap',
            border:`1px solid ${c.border}`,
            display:'flex', alignItems:'center', gap:8,
          }}>
            <span style={{ fontWeight:900 }}>{c.icon}</span>
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════ */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel='حذف', danger=true }) {
  return (
    <Modal open={open} onClose={onClose} title={title||'تأكيد'} width={400}>
      <p style={{ color:'var(--text-sec)', fontSize:14, lineHeight:1.65, marginBottom:24 }}>{message}</p>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn variant={danger?'danger':'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Btn>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   PAGE HEADER
══════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div style={{ minWidth:0 }}>
          <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.025em', lineHeight:1.2, margin:0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{subtitle}</p>}
        </div>
        {actions && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TABS — scrollable pill row
══════════════════════════════════════════════ */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      overflowX:'auto',
      overflowY:'hidden',
      WebkitOverflowScrolling:'touch',
      scrollbarWidth:'none', // Firefox
      msOverflowStyle:'none', // IE
      paddingBottom:2, // prevent clipping
    }}>
      <div style={{
        display:'inline-flex',
        gap:4,
        background:'var(--bg-glass)',
        backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        border:'1.5px solid var(--bg-border)',
        borderRadius:'var(--radius-pill)',
        padding:'4px 5px',
        minWidth:'max-content', // never shrink — forces horizontal scroll instead of wrap
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding:'8px 14px',
            borderRadius:'var(--radius-pill)',
            border:'none',
            background: active === t.id
              ? 'linear-gradient(135deg, var(--teal), #00c49a)'
              : 'transparent',
            color: active === t.id ? '#07090f' : 'var(--text-sec)',
            fontWeight: active === t.id ? 800 : 500,
            fontSize:12,
            cursor:'pointer',
            fontFamily:'inherit',
            transition:'all 0.22s ease',
            boxShadow: active === t.id ? '0 2px 12px rgba(0,228,184,0.35)' : 'none',
            whiteSpace:'nowrap',
            flexShrink:0,
          }}>
            {t.label}
          </button>
        ))}
      </div>
      <style>{`::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TOGGLE
══════════════════════════════════════════════ */
export function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width:44, height:24, borderRadius:'var(--radius-pill)',
        background: checked ? 'var(--teal)' : 'var(--bg-border)',
        position:'relative', cursor:'pointer',
        transition:'background 0.25s ease', flexShrink:0,
        boxShadow: checked ? '0 0 14px rgba(0,228,184,0.45)' : 'none',
      }}
    >
      <div style={{
        position:'absolute', top:3,
        right: checked ? 3 : 22,
        width:18, height:18, borderRadius:'50%',
        background: checked ? '#07090f' : 'var(--text-muted)',
        transition:'right 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow:'0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

/* ══════════════════════════════════════════════
   COLOR PICKER
══════════════════════════════════════════════ */
export function ColorPicker({ value, onChange }) {
  return (
    <div style={{ position:'relative', width:44, height:44 }}>
      <div style={{
        width:44, height:44, borderRadius:'var(--radius-sm)',
        background:value, border:'2px solid var(--bg-border)',
        cursor:'pointer', boxShadow:`0 0 16px ${value}60`,
        transition:'box-shadow 0.2s ease',
      }} />
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%', borderRadius:'var(--radius-sm)' }} />
    </div>
  )
}

/* ══════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════ */
export function Empty({ title='لا يوجد بيانات', sub, action }) {
  return (
    <div style={{ textAlign:'center', padding:'56px 20px', color:'var(--text-muted)' }}>
      <div style={{ fontSize:44, marginBottom:14, opacity:0.35, filter:'grayscale(0.5)' }}>📭</div>
      <div style={{ fontWeight:700, fontSize:15, color:'var(--text-sec)', marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:13, marginBottom:20, color:'var(--text-muted)' }}>{sub}</div>}
      {action}
    </div>
  )
}
