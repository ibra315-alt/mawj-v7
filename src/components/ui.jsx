import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/* ══════════════════════════════════════════════════
   موج UI v10 — Maison · Sky Blue · Premium
   Sky Blue = PRIMARY action · Blue = info accent
   Light mode default · Role-aware
══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   BTN
══════════════════════════════════════════════════ */
export function Btn({ children, variant='primary', size='md', loading, onClick, style, type='button', disabled }) {
  const sz = {
    sm: { padding:'5px 12px',  fontSize:12, gap:4 },
    md: { padding:'9px 18px',  fontSize:13, gap:6 },
    lg: { padding:'12px 24px', fontSize:14, gap:7 },
  }[size] || { padding:'9px 18px', fontSize:13, gap:6 }

  const va = {
    primary:    { bg:'var(--action)',      color:'#ffffff',          fw:800, shadow:'none', border:'none' },
    secondary:  { bg:'var(--bg-surface)',  color:'var(--text)',      fw:600, shadow:'var(--card-shadow)', border:'none' },
    danger:     { bg:'rgba(var(--danger-rgb),0.08)', color:'var(--danger)', fw:700, shadow:'none', border:'none' },
    ghost:      { bg:'transparent',        color:'var(--text-sec)',  fw:600, shadow:'none', border:'none' },
    violet:     { bg:'var(--info-soft)',    color:'var(--info-light)', fw:700, shadow:'none', border:'none' },
    pink:       { bg:'var(--action-soft)',  color:'var(--action)',   fw:700, shadow:'none', border:'none' },
    'ghost-teal':{ bg:'transparent',       color:'var(--action)',   fw:600, shadow:'none', border:'1.5px solid var(--action-soft)' },
  }[variant] || {}

  const off = disabled || loading
  return (
    <button type={type} onClick={!off ? onClick : undefined} disabled={off}
      className={`mawj-btn mawj-btn-${variant}`}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:sz.gap,
        padding:sz.padding, fontSize:sz.fontSize,
        borderRadius:'var(--r-sm)', border: va.border || 'none',
        background: off ? 'var(--bg-hover)' : va.bg,
        color: off ? 'var(--text-muted)' : va.color,
        fontFamily:'inherit', fontWeight: va.fw,
        boxShadow: off ? 'none' : va.shadow,
        cursor: off ? 'not-allowed' : 'pointer',
        whiteSpace:'nowrap', opacity: off ? 0.55 : 1,
        WebkitTapHighlightColor:'transparent',
        ...style,
      }}
    >
      {loading
        ? <svg width={13} height={13} viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite',flexShrink:0}}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
          </svg>
        : children
      }
    </button>
  )
}
/* ══════════════════════════════════════════════════
   INPUT
══════════════════════════════════════════════════ */
export function Input({ label, error, icon, hint, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,...containerStyle}}>
      {label && (
        <label style={{fontSize:'var(--t-label)',fontWeight:700,color:'var(--text-sec)',letterSpacing:'0.06em',textTransform:'uppercase'}}>
          {label}
        </label>
      )}
      <div style={{position:'relative'}}>
        {icon && (
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none',display:'flex'}}>
            {icon}
          </span>
        )}
        <input style={{
          width:'100%', padding: icon ? '10px 38px 10px 14px' : '10px 14px',
          background:'var(--input-bg)',
          border:`1.5px solid ${error ? 'var(--red)' : 'var(--input-border)'}`,
          borderRadius:'var(--r-sm)', color:'var(--text)',
          fontSize:'var(--t-body)', boxSizing:'border-box',
          transition:'border-color 0.16s ease, box-shadow 0.16s ease',
          ...style,
        }}
          {...props}
        />
      </div>
      {hint  && !error && <span style={{fontSize:'var(--t-label)',color:'var(--text-muted)'}}>{hint}</span>}
      {error && <span style={{fontSize:'var(--t-label)',color:'var(--red)',display:'flex',alignItems:'center',gap:4}}>{error}</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SELECT
══════════════════════════════════════════════════ */
export function Select({ label, children, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,...containerStyle}}>
      {label && (
        <label style={{fontSize:'var(--t-label)',fontWeight:700,color:'var(--text-sec)',letterSpacing:'0.06em',textTransform:'uppercase'}}>
          {label}
        </label>
      )}
      <select style={{
        width:'100%', padding:'10px 14px',
        background:'var(--input-bg)',
        border:'1.5px solid var(--input-border)',
        borderRadius:'var(--r-sm)', color:'var(--text)',
        fontSize:'var(--t-body)', cursor:'pointer',
        appearance:'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2378756F'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center',
        boxSizing:'border-box',
        transition:'border-color 0.16s ease, box-shadow 0.16s ease',
        ...style,
      }}
        {...props}
      >{children}</select>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TEXTAREA
══════════════════════════════════════════════════ */
export function Textarea({ label, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,...containerStyle}}>
      {label && (
        <label style={{fontSize:'var(--t-label)',fontWeight:700,color:'var(--text-sec)',letterSpacing:'0.06em',textTransform:'uppercase'}}>
          {label}
        </label>
      )}
      <textarea style={{
        width:'100%', padding:'10px 14px', minHeight:88, resize:'vertical',
        background:'var(--input-bg)',
        border:'1.5px solid var(--input-border)',
        borderRadius:'var(--r-sm)', color:'var(--text)',
        fontSize:'var(--t-body)', lineHeight:1.65,
        boxSizing:'border-box',
        transition:'border-color 0.16s ease, box-shadow 0.16s ease',
        ...style,
      }}
        {...props}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   CARD — elevated shadow, no borders
══════════════════════════════════════════════════ */
export function Card({ children, style, hover, glow, onClick, accentColor }) {
  return (
    <div onClick={onClick} className={hover || onClick ? 'mawj-card mawj-card-hover' : 'mawj-card'}
      style={{
        background:'var(--bg-surface)',
        border:'none',
        borderRadius:'var(--r-lg)', padding:'var(--sp-5)',
        cursor: onClick ? 'pointer' : 'default',
        position:'relative', overflow:'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   STAT CARD — animated count-up
══════════════════════════════════════════════════ */
export function StatCard({ label, value, color, trend, sub, icon }) {
  const [display, setDisplay] = useState(0)
  const raw    = String(value ?? '')
  const isAED  = raw.includes('د.إ')
  const isPct  = raw.includes('%')
  const num    = parseFloat(raw.replace(/[^0-9.-]/g,''))
  const isNum  = !isNaN(num) && num > 0
  const c      = color || 'var(--action)'

  useEffect(() => {
    if (!isNum) { setDisplay(num); return }
    let f = 0; const total = 44
    const tick = () => {
      f++
      setDisplay(num * (1 - Math.pow(1 - f/total, 3)))
      if (f < total) requestAnimationFrame(tick)
      else setDisplay(num)
    }
    requestAnimationFrame(tick)
  }, [value])

  const fmt = isNum
    ? isAED ? `${Math.round(display).toLocaleString()} د.إ`
    : isPct  ? `${display.toFixed(1)}%`
    : Math.round(display).toLocaleString()
    : value

  const glowColor = {
    'var(--action)': 'rgba(var(--action-rgb),0.12)',
    'var(--violet)': 'rgba(var(--info-rgb),0.12)',
    'var(--violet-light)': 'rgba(96,165,250,0.12)',
    'var(--pink)': 'rgba(236,72,153,0.10)',
    'var(--red)': 'rgba(var(--danger-rgb),0.10)',
    'var(--green)': 'rgba(var(--success-rgb),0.10)',
    'var(--amber)': 'rgba(var(--warning-rgb),0.10)',
  }[c] || 'rgba(var(--action-rgb),0.08)'

  return (
    <div className="hover-lift" style={{
      background:'var(--bg-hover)',
      border:'none',
      borderRadius:'var(--r-lg)', padding:'var(--s5)',
      position:'relative', overflow:'hidden',
      boxShadow:'var(--card-shadow)',
    }}>
      {/* Top accent line = color meaning */}
      <div style={{
        position:'absolute',top:0,left:0,right:0,height:2,
        background:`linear-gradient(90deg,transparent,${c},transparent)`,
        opacity:0.65,pointerEvents:'none',
      }} />
      {/* Ambient glow orb */}
      <div style={{
        position:'absolute',top:-32,right:-32,width:100,height:100,
        borderRadius:'50%',background:c,opacity:0.08,
        filter:'blur(24px)',pointerEvents:'none',
      }} />
      {/* Bottom corner ambient */}
      <div style={{
        position:'absolute',bottom:-20,left:-20,width:80,height:80,
        borderRadius:'50%',background:'var(--action)',opacity:0.04,
        filter:'blur(20px)',pointerEvents:'none',
      }} />

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'var(--s3)',position:'relative'}}>
        <div style={{
          fontSize:'var(--t-label)',color:'var(--text-muted)',
          fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',lineHeight:1.4,
        }}>{label}</div>
        {icon && (
          <div style={{
            color:c, flexShrink:0,
            background:glowColor,
            borderRadius:'var(--r-sm)',
            padding:'6px', display:'flex',
          }}>{icon}</div>
        )}
      </div>

      <div style={{
        fontSize:'var(--t-2xl)',fontWeight:900,color:c,
        letterSpacing:'-0.03em',lineHeight:1.1,position:'relative',
      }}>{fmt}</div>

      {(trend !== undefined || sub) && (
        <div style={{
          fontSize:'var(--t-label)',color:'var(--text-muted)',
          marginTop:'var(--s2)',display:'flex',alignItems:'center',gap:6,position:'relative',
        }}>
          {trend !== undefined && (
            <span style={{
              color:trend>=0?'var(--green)':'var(--red)',fontWeight:700,
              background:trend>=0?'rgba(var(--success-rgb),0.08)':'rgba(255,71,87,0.08)',
              padding:'2px 6px',borderRadius:999,
            }}>
              {trend>=0?'↑':'↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SKELETON LOADERS
══════════════════════════════════════════════════ */
export function Skeleton({ width='100%', height=14, radius, style }) {
  return (
    <div className="skeleton" style={{width,height,borderRadius:radius||'var(--r-sm)',flexShrink:0,...style}} />
  )
}

export function SkeletonCard({ rows=3 }) {
  return (
    <div style={{
      background:'var(--bg-hover)',
      border:'none',
      borderRadius:'var(--r-lg)',padding:'var(--s5)',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <Skeleton width={40} height={40} radius="50%" />
        <div style={{flex:1}}>
          <Skeleton height={13} width="55%" style={{marginBottom:6}} />
          <Skeleton height={10} width="35%" />
        </div>
      </div>
      {Array.from({length:rows}).map((_,i) =>
        <Skeleton key={i} height={10} width={i===rows-1?'65%':'100%'} style={{marginBottom:i<rows-1?6:0}} />
      )}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div style={{
      background:'var(--bg-hover)',
      border:'none',
      borderRadius:'var(--r-lg)',padding:'var(--s5)',
    }}>
      <Skeleton height={10} width="50%" style={{marginBottom:14}} />
      <Skeleton height={30} width="60%" style={{marginBottom:10}} />
      <Skeleton height={10} width="40%" />
    </div>
  )
}

export function SkeletonStats({ count=4 }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
      {Array.from({length:count}).map((_,i) => <SkeletonStat key={i} />)}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
      background:'var(--bg-hover)',
      border:'none',
      borderRadius:'var(--r-lg)',
    }}>
      <Skeleton width={36} height={36} radius="50%" style={{flexShrink:0}} />
      <div style={{flex:1}}>
        <Skeleton height={12} width="40%" style={{marginBottom:6}} />
        <Skeleton height={10} width="25%" />
      </div>
      <Skeleton width={64} height={22} radius={999} style={{flexShrink:0}} />
      <Skeleton width={72} height={14} style={{flexShrink:0}} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BADGE — semantic color
══════════════════════════════════════════════════ */
export function Badge({ children, color, style }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'3px 10px', borderRadius:'var(--r-pill)',
      fontSize:'var(--t-label)', fontWeight:700,
      background: color ? `${color}18` : 'var(--bg-hover)',
      color: color || 'var(--text-muted)',
      letterSpacing:'0.03em',
      ...style,
    }}>
      {children}
    </span>
  )
}
export function Spinner({ size=24, color='var(--action)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{animation:'spin 0.75s linear infinite',flexShrink:0}}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  )
}

/* Full page loader — sky blue ring */
export function PageLoader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:16}}>
      <div style={{position:'relative',width:64,height:64}}>
        {/* Outer ring track */}
        <div style={{width:64,height:64,borderRadius:'50%',border:'2px solid var(--border)',position:'absolute'}} />
        {/* Glowing spinner */}
        <svg width="64" height="64" viewBox="0 0 64 64" style={{position:'absolute',animation:'spin 1s linear infinite'}}>
          <defs>
            <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="var(--action)"/>
              <stop offset="50%"  stopColor="var(--info)"/>
              <stop offset="100%" stopColor="#0EA5E9"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="none" stroke="url(#spinGrad)" strokeWidth="2.5" strokeDasharray="44 132" strokeLinecap="round"/>
        </svg>
        {/* Center glow dot */}
        <div style={{
          position:'absolute',inset:'50%',transform:'translate(-50%,-50%)',
          width:8,height:8,borderRadius:'50%',
          background:'var(--action)',boxShadow:'0 0 12px var(--action-glow)',
        }} />
      </div>
      <span style={{fontSize:'var(--t-sm)',color:'var(--text-muted)',letterSpacing:'0.05em'}}>جاري التحميل...</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MODAL — full-screen on mobile · centered on desktop
══════════════════════════════════════════════════ */
export function Modal({ open, onClose, title, children, width=580, footer }) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 769)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    } else {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  }, [open])

  if (!open) return null

  const modalTitleId = `modal-title-${title?.replace(/\s/g,'-') || 'dialog'}`

  if (mobile) {
    return createPortal(
      <div role="dialog" aria-modal="true" aria-labelledby={modalTitleId} style={{
        position:'fixed', inset:0, zIndex:99999,
        background:'var(--bg)',
        display:'flex', flexDirection:'column',
        animation:'pageIn 0.22s var(--ease-io) both',
      }}>

        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 16px',
          borderBottom:'none',
          flexShrink:0,
          background:'var(--sidebar-bg)',
        }}>
          <button onClick={onClose} style={{
            display:'flex', alignItems:'center', gap:6,
            background:'none', border:'none',
            color:'var(--text-sec)', fontSize:14, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            WebkitTapHighlightColor:'transparent', padding:'4px 0',
          }}>
            {String.fromCharCode(8592)} {String.fromCharCode(1585,1580,1608,1593)}
          </button>
          <h2 id={modalTitleId} style={{
            fontSize:16, fontWeight:900, margin:0,
            color:'var(--text)', letterSpacing:'-0.01em',
          }}>{title}</h2>
          <div style={{width:64}} />
        </div>
        <div style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          padding:'16px',
          WebkitOverflowScrolling:'touch',
        }}>
          {children}
          {footer && (
            <div style={{
              marginTop:24,
              paddingTop:16,
              borderTop:'none',
              display:'flex', gap:10,
              flexDirection:'column',
              paddingBottom:'calc(24px + env(safe-area-inset-bottom, 16px))',
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div
      style={{
        position:'fixed', inset:0, zIndex:99999,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'var(--bg-overlay)',
        padding:'20px',
      }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={modalTitleId} style={{
        width:'100%', maxWidth:width,
        maxHeight:'88dvh',
        display:'flex', flexDirection:'column',
        background:'var(--modal-bg)',
        border:'none',
        borderRadius:'var(--r-xl)',
        boxShadow:'var(--modal-shadow)',
        animation:'modalIn 0.22s var(--ease-io) both',
        overflow:'hidden',
      }}>

        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px',
          borderBottom:'none',
          flexShrink:0,
        }}>
          <button onClick={onClose} className="icon-btn" style={{
            background:'var(--bg-hover)', border:'none',
            borderRadius:999, width:32, height:32, cursor:'pointer',
            color:'var(--text-sec)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:13, flexShrink:0,
            WebkitTapHighlightColor:'transparent',
          }}>{String.fromCharCode(10005)}</button>
          <h2 id={modalTitleId} style={{fontSize:'var(--t-body)',fontWeight:800,letterSpacing:'-0.01em',margin:0,color:'var(--text)'}}>{title}</h2>
        </div>
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'var(--s5)',WebkitOverflowScrolling:'touch'}}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding:'14px 20px',
            borderTop:'none',
            background:'var(--modal-bg)', flexShrink:0,
            display:'flex', gap:8, justifyContent:'flex-end',
            flexWrap:'wrap',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
/* ══════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════ */
let _setToast = null
export const setToastFn = fn => { _setToast = fn }
export const toast = (msg, type='success') => _setToast?.({ msg, type, id: Date.now() })

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => { setToastFn(t => setToasts(p => [...p.slice(-2), t])) }, [])
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3000)
    return () => clearTimeout(t)
  }, [toasts])
  if (!toasts.length) return null

  const palette = {
    success: { bg:'linear-gradient(135deg,var(--success),var(--success-light))', color:'#fff',    icon:'' },
    error:   { bg:'linear-gradient(135deg,var(--danger),var(--danger-light))', color:'#fff',    icon:'' },
    warning: { bg:'linear-gradient(135deg,var(--warning),var(--warning-light))', color:'#fff',    icon:'' },
    info:    { bg:'linear-gradient(135deg,#38BDF8,#0EA5E9)', color:'#fff',    icon:'ℹ' },
  }
  return (
    <div role="status" aria-live="polite" style={{
      position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',
      zIndex:9999,display:'flex',flexDirection:'column',gap:8,
      alignItems:'center',pointerEvents:'none',
    }}>
      {toasts.map(t => {
        const v = palette[t.type] || palette.success
        return (
          <div key={t.id} role="alert" style={{
            padding:'10px 20px',borderRadius:999,
            fontSize:'var(--t-sm)',fontWeight:700,
            background:v.bg,color:v.color,
            backdropFilter:'blur(20px)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
            animation:'toastIn 0.22s ease both',
            whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:8,
          }}>
            <span style={{fontWeight:900}}>{v.icon}</span>
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════════ */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel='حذف', danger=true, loading }) {
  return (
    <Modal
      open={open} onClose={onClose} title={title||'تأكيد'} width={400}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn variant={danger?'danger':'primary'} loading={loading} onClick={()=>{onConfirm();onClose()}}>
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <p style={{color:'var(--text-sec)',fontSize:'var(--t-sm)',lineHeight:1.75}}>{message}</p>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════
   PAGE HEADER — sky blue accent line
══════════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{marginBottom:'var(--s6)'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--s3)',flexWrap:'wrap'}}>
        <div style={{minWidth:0}}>
          <h1 style={{
            fontSize:'var(--t-xl)',fontWeight:900,
            letterSpacing:'-0.025em',lineHeight:1.2,margin:0,
            color:'var(--text)',
          }}>{title}</h1>
          {subtitle && (
            <p style={{fontSize:'var(--t-sm)',color:'var(--text-muted)',marginTop:'var(--s1)'}}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{display:'flex',gap:'var(--s2)',flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
            {actions}
          </div>
        )}
      </div>
      {/* Accent underline */}
      <div style={{
        height:1.5,
        background:'linear-gradient(90deg,transparent,var(--action),var(--info-light),transparent)',
        marginTop:'var(--s4)',opacity:0.4,borderRadius:999,
      }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TABS — glass pill, sky blue active
══════════════════════════════════════════════════ */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{overflowX:'auto',overflowY:'hidden',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:2}}>
      <div style={{
        display:'inline-flex',gap:3,
        background:'var(--bg-hover)',
        border:'none',
        borderRadius:999,padding:'4px 5px',minWidth:'max-content',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            padding:'7px 14px',borderRadius:999,border:'none',
            background: active===t.id ? 'linear-gradient(135deg,var(--action),var(--action-deep))' : 'transparent',
            color: active===t.id ? '#ffffff' : 'var(--text-sec)',
            fontWeight: active===t.id ? 800 : 500, fontSize:'var(--t-sm)',
            cursor:'pointer', transition:'all 0.18s ease',
            boxShadow: active===t.id ? '0 2px 12px var(--action-glow)' : 'none',
            whiteSpace:'nowrap',flexShrink:0,
            WebkitTapHighlightColor:'transparent',
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TOGGLE — sky blue on
══════════════════════════════════════════════════ */
export function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={()=>onChange(!checked)}
      style={{
        width:44,height:24,borderRadius:999,
        background:checked?'var(--action)':'var(--border)',
        position:'relative',cursor:'pointer',
        transition:'background 0.22s ease',flexShrink:0,
        boxShadow:checked?'0 0 12px var(--action-glow)':'none',
        WebkitTapHighlightColor:'transparent',
      }}
    >
      <div style={{
        position:'absolute',top:3,right:checked?3:22,
        width:18,height:18,borderRadius:'50%',
        background:checked?'#ffffff':'var(--text-muted)',
        transition:'right 0.22s var(--ease-io)',
        boxShadow:'0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COLOR PICKER
══════════════════════════════════════════════════ */
export function ColorPicker({ value, onChange }) {
  return (
    <div style={{position:'relative',width:44,height:44}}>
      <div style={{
        width:44,height:44,borderRadius:'var(--r-sm)',
        background:value,border:'2px solid var(--border)',
        cursor:'pointer',boxShadow:`0 0 14px ${value}50`,
      }} />
      <input type="color" value={value} onChange={e=>onChange(e.target.value)}
        style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   EMPTY STATE — wave icon
══════════════════════════════════════════════════ */
export function Empty({ title='لا يوجد بيانات', sub, action, icon }) {
  return (
    <div className="empty-state">
      <div className="empty-wave-icon">
        {icon || (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--violet-light)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/>
            <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.4"/>
          </svg>
        )}
      </div>
      <div>
        <div style={{fontWeight:800,fontSize:'var(--t-body)',color:'var(--text-sec)',marginBottom:'var(--s1)'}}>{title}</div>
        {sub && (
          <div style={{fontSize:'var(--t-sm)',color:'var(--text-muted)',lineHeight:1.65,maxWidth:280,margin:'0 auto'}}>
            {sub}
          </div>
        )}
      </div>
      {action && <div style={{marginTop:'var(--s2)'}}>{action}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SECTION DIVIDER
══════════════════════════════════════════════════ */
export function Divider({ label, style }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'var(--s4) 0',...style}}>
      <div style={{flex:1,height:1,background:'var(--border)'}} />
      {label && (
        <span style={{fontSize:'var(--t-label)',color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
          {label}
        </span>
      )}
      <div style={{flex:1,height:1,background:'var(--border)'}} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PROGRESS BAR — sky blue gradient fill
══════════════════════════════════════════════════ */
export function ProgressBar({ value=0, max=100, color, height=6, showLabel=false, style }) {
  const pct = Math.min(100, Math.max(0, (value/max)*100))
  const fillColor = color || 'linear-gradient(90deg,var(--info-light),var(--action))'
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4,...style}}>
      {showLabel && (
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--t-label)',color:'var(--text-muted)'}}>
          <span>{value}</span><span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div style={{
        height,borderRadius:999,
        background:'var(--bg-surface)',
        overflow:'hidden',
      }}>
        <div style={{
          height:'100%',width:`${pct}%`,borderRadius:999,
          background: fillColor,
          transition:'width 0.6s var(--ease-io)',
          boxShadow: color ? undefined : '0 0 8px var(--action-glow)',
        }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DONUT CHART MINI — neon glow ring
══════════════════════════════════════════════════ */
export function DonutMini({ value=0, max=100, color='var(--action)', size=56, strokeWidth=5 }) {
  const pct = Math.min(100, Math.max(0, (value/max)*100))
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * pct / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      {/* Track */}
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke="var(--bg-surface)" strokeWidth={strokeWidth}
      />
      {/* Fill */}
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{filter:`drop-shadow(0 0 4px ${color})`}}
      />
      {/* Center % */}
      <text
        x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size*0.22} fontWeight="700"
        fontFamily="inherit"
      >
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}
