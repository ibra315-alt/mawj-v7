import React, { useState, useEffect } from 'react'

/* ══════════════════════════════════════════════════
   BTN — teal reserved for PRIMARY action only
   Other variants use neutral/semantic colors
══════════════════════════════════════════════════ */
export function Btn({ children, variant='primary', size='md', loading, onClick, style, type='button', disabled }) {
  const sz = {
    sm: { padding:'5px 14px',  fontSize:11, gap:5, iconSize:11 },
    md: { padding:'9px 20px',  fontSize:13, gap:6, iconSize:13 },
    lg: { padding:'13px 28px', fontSize:14, gap:7, iconSize:14 },
  }[size] || { padding:'9px 20px', fontSize:13, gap:6, iconSize:13 }

  const va = {
    primary:   { bg:'linear-gradient(135deg,#00e4b8,#00b894)', color:'#050810', fw:800, shadow:'0 4px 16px rgba(0,228,184,0.3)', border:'none' },
    secondary: { bg:'var(--bg-glass)', color:'var(--text-sec)', fw:600, shadow:'none', border:'1.5px solid var(--bg-border)' },
    danger:    { bg:'linear-gradient(135deg,#ff4757,#cc1020)', color:'#fff', fw:700, shadow:'0 4px 16px rgba(255,71,87,0.3)', border:'none' },
    ghost:     { bg:'transparent', color:'var(--text-sec)', fw:600, shadow:'none', border:'1.5px solid var(--bg-border)' },
    violet:    { bg:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fw:700, shadow:'0 4px 16px rgba(124,58,237,0.32)', border:'none' },
  }[variant] || {}

  const off = disabled || loading
  return (
    <button type={type} onClick={!off ? onClick : undefined} disabled={off}
      className={`mawj-btn mawj-btn-${variant}`}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:sz.gap,
        padding:sz.padding, fontSize:sz.fontSize,
        borderRadius:999, border: va.border,
        background: off ? 'rgba(255,255,255,0.05)' : va.bg,
        color: off ? 'var(--text-muted)' : va.color,
        fontFamily:'inherit', fontWeight: va.fw,
        boxShadow: off ? 'none' : va.shadow,
        cursor: off ? 'not-allowed' : 'pointer',
        letterSpacing:'0.01em', whiteSpace:'nowrap',
        WebkitTapHighlightColor:'transparent',
        ...style,
      }}
    >
      {loading
        ? <svg width={sz.iconSize} height={sz.iconSize} viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite',flexShrink:0}}>
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
      {label && <label style={{fontSize:'var(--t-xs)',fontWeight:700,color:'var(--text-sec)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</label>}
      <div style={{position:'relative'}}>
        {icon && <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none',display:'flex'}}>{icon}</span>}
        <input style={{
          width:'100%', padding: icon ? '10px 38px 10px 14px' : '10px 14px',
          background:'var(--input-bg)', border:`1.5px solid ${error ? 'var(--red)' : 'var(--input-border)'}`,
          borderRadius:'var(--radius-sm)', color:'var(--text)',
          fontSize:'var(--t-base)', outline:'none', boxSizing:'border-box',
          transition:'border-color 0.16s ease, box-shadow 0.16s ease',
          ...style,
        }}
          onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
          onBlur={e=>{e.target.style.borderColor=error?'var(--red)':'var(--input-border)';e.target.style.boxShadow='none'}}
          {...props}
        />
      </div>
      {hint  && !error && <span style={{fontSize:'var(--t-xs)',color:'var(--text-muted)'}}>{hint}</span>}
      {error && <span style={{fontSize:'var(--t-xs)',color:'var(--red)',display:'flex',alignItems:'center',gap:4}}>⚠ {error}</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SELECT
══════════════════════════════════════════════════ */
export function Select({ label, children, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,...containerStyle}}>
      {label && <label style={{fontSize:'var(--t-xs)',fontWeight:700,color:'var(--text-sec)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</label>}
      <select style={{
        width:'100%', padding:'10px 14px',
        background:'var(--input-bg)', border:'1.5px solid var(--input-border)',
        borderRadius:'var(--radius-sm)', color:'var(--text)',
        fontSize:'var(--t-base)', outline:'none', cursor:'pointer',
        appearance:'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b74a8'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat', backgroundPosition:'left 12px center',
        boxSizing:'border-box',
        transition:'border-color 0.16s ease, box-shadow 0.16s ease',
        ...style,
      }}
        onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
        onBlur={e=>{e.target.style.borderColor='var(--input-border)';e.target.style.boxShadow='none'}}
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
      {label && <label style={{fontSize:'var(--t-xs)',fontWeight:700,color:'var(--text-sec)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</label>}
      <textarea style={{
        width:'100%', padding:'10px 14px', minHeight:88, resize:'vertical',
        background:'var(--input-bg)', border:'1.5px solid var(--input-border)',
        borderRadius:'var(--radius-sm)', color:'var(--text)',
        fontSize:'var(--t-base)', outline:'none', lineHeight:1.65,
        boxSizing:'border-box',
        transition:'border-color 0.16s ease, box-shadow 0.16s ease',
        ...style,
      }}
        onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
        onBlur={e=>{e.target.style.borderColor='var(--input-border)';e.target.style.boxShadow='none'}}
        {...props}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   CARD
══════════════════════════════════════════════════ */
export function Card({ children, style, hover, glow, onClick }) {
  return (
    <div onClick={onClick} className={hover ? 'mawj-card mawj-card-hover' : 'mawj-card'}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        border:`1.5px solid ${glow ? 'rgba(0,228,184,0.12)' : 'var(--bg-border)'}`,
        borderRadius:'var(--radius)', padding:'var(--s5)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: glow ? '0 0 32px rgba(0,228,184,0.06), var(--shadow-card)' : 'var(--shadow-card)',
        position:'relative',
        ...style,
      }}
    >
      {/* Top shimmer line for glow cards */}
      {glow && <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,228,184,0.45),transparent)',pointerEvents:'none',borderRadius:'var(--radius) var(--radius) 0 0'}} />}
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   STAT CARD — animated count-up, color = meaning
   teal=revenue/positive  red=cost  violet=neutral
══════════════════════════════════════════════════ */
export function StatCard({ label, value, color, trend, sub, icon }) {
  const [display, setDisplay] = useState(0)
  const raw    = String(value ?? '')
  const isAED  = raw.includes('د.إ')
  const isPct  = raw.includes('%')
  const num    = parseFloat(raw.replace(/[^0-9.-]/g,''))
  const isNum  = !isNaN(num) && num > 0
  const c      = color || 'var(--teal)'

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

  return (
    <div className="hover-lift" style={{
      background:'var(--bg-glass)',
      backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
      border:'1.5px solid var(--bg-border)',
      borderRadius:'var(--radius)', padding:'var(--s5)',
      position:'relative', overflow:'hidden',
      boxShadow:'var(--shadow-card)',
    }}>
      {/* Top accent line = color meaning */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${c},transparent)`,opacity:0.55,pointerEvents:'none'}} />
      {/* Glow orb */}
      <div style={{position:'absolute',top:-28,right:-28,width:90,height:90,borderRadius:'50%',background:c,opacity:0.06,filter:'blur(22px)',pointerEvents:'none'}} />

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'var(--s3)'}}>
        <div style={{fontSize:'var(--t-xs)',color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',lineHeight:1.4}}>{label}</div>
        {icon && <div style={{color:c,opacity:0.6,flexShrink:0}}>{icon}</div>}
      </div>

      <div style={{fontSize:'var(--t-2xl)',fontWeight:900,color:c,letterSpacing:'-0.03em',lineHeight:1.1}}>{fmt}</div>

      {(trend !== undefined || sub) && (
        <div style={{fontSize:'var(--t-xs)',color:'var(--text-muted)',marginTop:'var(--s2)',display:'flex',alignItems:'center',gap:6}}>
          {trend !== undefined && <span style={{color:trend>=0?'var(--green)':'var(--red)',fontWeight:700}}>{trend>=0?'↑':'↓'} {Math.abs(trend)}%</span>}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SKELETON LOADERS — wave animation, branded
══════════════════════════════════════════════════ */
export function Skeleton({ width='100%', height=14, radius, style }) {
  return <div className="skeleton" style={{width,height,borderRadius:radius||'var(--radius-sm)',flexShrink:0,...style}} />
}

export function SkeletonCard({ rows=3 }) {
  return (
    <div style={{background:'var(--bg-glass)',border:'1.5px solid var(--bg-border)',borderRadius:'var(--radius)',padding:'var(--s5)'}}>
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
    <div style={{background:'var(--bg-glass)',border:'1.5px solid var(--bg-border)',borderRadius:'var(--radius)',padding:'var(--s5)'}}>
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
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--bg-glass)',border:'1.5px solid var(--bg-border)',borderRadius:'var(--radius)'}}>
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
   BADGE — semantic color only, never decorative
══════════════════════════════════════════════════ */
export function Badge({ children, color, style }) {
  const c = color || 'var(--teal)'
  function rgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m ? `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})` : null
  }
  const knownBg  = {'var(--teal)':'rgba(0,228,184,0.1)','var(--violet)':'rgba(124,58,237,0.1)','var(--red)':'rgba(255,71,87,0.1)','var(--green)':'rgba(16,185,129,0.1)','var(--gold)':'rgba(230,185,74,0.1)','var(--amber)':'rgba(245,158,11,0.1)','var(--blue)':'rgba(59,130,246,0.1)','var(--text-muted)':'rgba(107,116,168,0.1)'}
  const knownBo  = {'var(--teal)':'rgba(0,228,184,0.22)','var(--violet)':'rgba(124,58,237,0.22)','var(--red)':'rgba(255,71,87,0.22)','var(--green)':'rgba(16,185,129,0.22)','var(--gold)':'rgba(230,185,74,0.22)','var(--amber)':'rgba(245,158,11,0.22)','var(--blue)':'rgba(59,130,246,0.22)','var(--text-muted)':'rgba(107,116,168,0.22)'}
  const bg = knownBg[c] || (c.startsWith('#') ? rgba(c,0.1)  : 'rgba(0,228,184,0.1)')
  const bo = knownBo[c] || (c.startsWith('#') ? rgba(c,0.22) : 'rgba(0,228,184,0.22)')
  return (
    <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:999,fontSize:'var(--t-xs)',fontWeight:700,letterSpacing:'0.03em',background:bg,color:c,border:`1px solid ${bo}`,whiteSpace:'nowrap',...style}}>
      {children}
    </span>
  )
}

/* ══════════════════════════════════════════════════
   SPINNER
══════════════════════════════════════════════════ */
export function Spinner({ size=24, color='var(--teal)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{animation:'spin 0.75s linear infinite',flexShrink:0}}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  )
}

/* Full page loader — branded wave ring */
export function PageLoader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:16}}>
      <div style={{position:'relative',width:56,height:56}}>
        <div style={{width:56,height:56,borderRadius:'50%',border:'2px solid var(--bg-border)',position:'absolute'}} />
        <svg width="56" height="56" viewBox="0 0 56 56" style={{position:'absolute',animation:'spin 1s linear infinite'}}>
          <circle cx="28" cy="28" r="24" fill="none" stroke="url(#wg)" strokeWidth="2.5" strokeDasharray="40 112" strokeLinecap="round"/>
          <defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00e4b8"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
        </svg>
      </div>
      <span style={{fontSize:'var(--t-sm)',color:'var(--text-muted)',letterSpacing:'0.05em'}}>جاري التحميل...</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MODAL — sticky footer, mobile sheet
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
      const top = window.scrollY
      document.body.style.cssText = `overflow:hidden;position:fixed;top:-${top}px;width:100%`
    } else {
      const top = Math.abs(parseInt(document.body.style.top || '0'))
      document.body.style.cssText = ''
      if (top) window.scrollTo(0, top)
    }
  }, [open])
  if (!open) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:mobile?'flex-end':'center',justifyContent:'center',background:'rgba(0,0,0,0.8)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',padding:mobile?0:'20px'}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{width:'100%',maxWidth:mobile?'100%':width,maxHeight:mobile?'94dvh':'88dvh',display:'flex',flexDirection:'column',background:'var(--modal-bg)',backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:mobile?'20px 20px 0 0':'var(--radius-xl)',boxShadow:mobile?'0 -20px 60px rgba(0,0,0,0.65)':'var(--shadow-float)',animation:mobile?'sheetUp 0.3s cubic-bezier(0.4,0,0.2,1) both':'modalIn 0.22s cubic-bezier(0.4,0,0.2,1) both',overflow:'hidden'}}>
        {/* Wave accent top line */}
        <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(0,228,184,0.5),transparent)',flexShrink:0}} />
        {/* Drag handle (mobile) */}
        {mobile && <div style={{width:36,height:4,borderRadius:99,background:'rgba(255,255,255,0.12)',margin:'10px auto 2px',flexShrink:0}} />}
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid var(--bg-border)',flexShrink:0}}>
          <button onClick={onClose} className="icon-btn" style={{background:'var(--bg-glass)',border:'1.5px solid var(--bg-border)',borderRadius:999,width:32,height:32,cursor:'pointer',color:'var(--text-sec)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0,WebkitTapHighlightColor:'transparent'}}>✕</button>
          <h2 style={{fontSize:'var(--t-md)',fontWeight:800,letterSpacing:'-0.01em',margin:0}}>{title}</h2>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'var(--s5)',WebkitOverflowScrolling:'touch'}}>{children}</div>
        {/* Sticky footer */}
        {footer && <div style={{padding:'14px 20px',borderTop:'1px solid var(--bg-border)',background:'var(--modal-bg)',flexShrink:0,display:'flex',gap:8,justifyContent:'flex-end'}}>{footer}</div>}
      </div>
    </div>
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
  const c = { success:{ bg:'rgba(0,228,184,0.92)',color:'#050810',icon:'✓' }, error:{ bg:'rgba(255,71,87,0.92)',color:'#fff',icon:'✕' }, warning:{ bg:'rgba(245,158,11,0.92)',color:'#050810',icon:'⚠' } }
  return (
    <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:8,alignItems:'center',pointerEvents:'none'}}>
      {toasts.map(t => {
        const v = c[t.type] || c.success
        return <div key={t.id} style={{padding:'10px 20px',borderRadius:999,fontSize:'var(--t-sm)',fontWeight:700,background:v.bg,color:v.color,backdropFilter:'blur(20px)',boxShadow:'0 8px 28px rgba(0,0,0,0.4)',animation:'toastIn 0.22s ease both',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:8}}><span style={{fontWeight:900}}>{v.icon}</span>{t.msg}</div>
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════════ */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel='حذف', danger=true, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title||'تأكيد'} width={400}
      footer={<><Btn variant="ghost" onClick={onClose}>إلغاء</Btn><Btn variant={danger?'danger':'primary'} loading={loading} onClick={()=>{onConfirm();onClose()}}>{confirmLabel}</Btn></>}
    >
      <p style={{color:'var(--text-sec)',fontSize:'var(--t-sm)',lineHeight:1.75}}>{message}</p>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════
   PAGE HEADER
══════════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{marginBottom:'var(--s6)'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--s3)',flexWrap:'wrap'}}>
        <div style={{minWidth:0}}>
          <h1 style={{fontSize:'var(--t-xl)',fontWeight:900,letterSpacing:'-0.025em',lineHeight:1.2,margin:0}}>{title}</h1>
          {subtitle && <p style={{fontSize:'var(--t-sm)',color:'var(--text-muted)',marginTop:'var(--s1)'}}>{subtitle}</p>}
        </div>
        {actions && <div style={{display:'flex',gap:'var(--s2)',flexWrap:'wrap',alignItems:'center',flexShrink:0}}>{actions}</div>}
      </div>
      {/* Wave accent under every page header */}
      <div style={{height:1,background:'linear-gradient(90deg,var(--teal),rgba(124,58,237,0.4),transparent)',marginTop:'var(--s4)',opacity:0.35,borderRadius:999}} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════ */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{overflowX:'auto',overflowY:'hidden',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:2}}>
      <div style={{display:'inline-flex',gap:3,background:'var(--bg-glass)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1.5px solid var(--bg-border)',borderRadius:999,padding:'4px 5px',minWidth:'max-content'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            padding:'7px 14px', borderRadius:999, border:'none',
            background: active===t.id ? 'linear-gradient(135deg,var(--teal),var(--teal-deep))' : 'transparent',
            color: active===t.id ? '#050810' : 'var(--text-sec)',
            fontWeight: active===t.id ? 800 : 500, fontSize:'var(--t-sm)',
            cursor:'pointer', transition:'all 0.18s ease',
            boxShadow: active===t.id ? '0 2px 10px rgba(0,228,184,0.3)' : 'none',
            whiteSpace:'nowrap', flexShrink:0, WebkitTapHighlightColor:'transparent',
          }}>{t.label}</button>
        ))}
      </div>
      <style>{`.tabs-scroll::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TOGGLE
══════════════════════════════════════════════════ */
export function Toggle({ checked, onChange }) {
  return (
    <div onClick={()=>onChange(!checked)} style={{width:44,height:24,borderRadius:999,background:checked?'var(--teal)':'var(--bg-border)',position:'relative',cursor:'pointer',transition:'background 0.22s ease',flexShrink:0,boxShadow:checked?'0 0 10px rgba(0,228,184,0.35)':'none',WebkitTapHighlightColor:'transparent'}}>
      <div style={{position:'absolute',top:3,right:checked?3:22,width:18,height:18,borderRadius:'50%',background:checked?'#050810':'var(--text-muted)',transition:'right 0.22s cubic-bezier(0.4,0,0.2,1)',boxShadow:'0 1px 4px rgba(0,0,0,0.35)'}} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COLOR PICKER
══════════════════════════════════════════════════ */
export function ColorPicker({ value, onChange }) {
  return (
    <div style={{position:'relative',width:44,height:44}}>
      <div style={{width:44,height:44,borderRadius:'var(--radius-sm)',background:value,border:'2px solid var(--bg-border)',cursor:'pointer',boxShadow:`0 0 12px ${value}50`}} />
      <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   EMPTY STATE — موج branded wave icon
   Personality, not a generic mailbox
══════════════════════════════════════════════════ */
export function Empty({ title='لا يوجد بيانات', sub, action, icon }) {
  return (
    <div className="empty-state">
      <div className="empty-wave-icon">
        {icon || (
          /* Animated SVG wave — the موج brand mark */
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/>
            <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.4"/>
          </svg>
        )}
      </div>
      <div>
        <div style={{fontWeight:800,fontSize:'var(--t-md)',color:'var(--text-sec)',marginBottom:'var(--s1)'}}>{title}</div>
        {sub && <div style={{fontSize:'var(--t-sm)',color:'var(--text-muted)',lineHeight:1.65,maxWidth:280,margin:'0 auto'}}>{sub}</div>}
      </div>
      {action && <div style={{marginTop:'var(--s2)'}}>{action}</div>}
    </div>
  )
}
