import React, { useState, useEffect, useRef } from 'react'

/* ── BUTTON ─────────────────────────────────────────────────── */
export function Btn({ children, variant='primary', size='md', loading, onClick, style, type='button', disabled }) {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
    border:'none', cursor: disabled||loading ? 'not-allowed' : 'pointer',
    fontFamily:'var(--font)', fontWeight:700, borderRadius:'var(--radius-sm)',
    transition:'all 0.2s ease', position:'relative', overflow:'hidden',
    opacity: disabled||loading ? 0.6 : 1,
    letterSpacing:'0.01em',
  }
  const sizes = {
    sm: { padding:'6px 14px', fontSize:12 },
    md: { padding:'10px 20px', fontSize:13 },
    lg: { padding:'13px 28px', fontSize:15 },
  }
  const variants = {
    primary: {
      background:'linear-gradient(135deg, var(--teal) 0%, #00c49a 100%)',
      color:'#060810',
      boxShadow:'0 4px 16px rgba(0,228,184,0.3)',
    },
    secondary: {
      background:'var(--bg-glass)',
      color:'var(--text)',
      border:'1px solid var(--bg-border)',
      backdropFilter:'blur(10px)',
    },
    danger: {
      background:'linear-gradient(135deg, #ff4757, #cc0020)',
      color:'#fff',
      boxShadow:'0 4px 16px rgba(255,71,87,0.3)',
    },
    ghost: {
      background:'transparent',
      color:'var(--text-sec)',
      border:'1px solid var(--bg-border)',
    },
    violet: {
      background:'linear-gradient(135deg, var(--violet), #5b21b6)',
      color:'#fff',
      boxShadow:'0 4px 16px rgba(124,58,237,0.35)',
    },
  }
  function handleMouseEnter(e) {
    if (disabled||loading) return
    if (variant==='primary') e.currentTarget.style.transform='translateY(-1px)', e.currentTarget.style.boxShadow='0 6px 24px rgba(0,228,184,0.45)'
    else if (variant==='violet') e.currentTarget.style.transform='translateY(-1px)', e.currentTarget.style.boxShadow='0 6px 24px rgba(124,58,237,0.45)'
    else if (variant==='danger') e.currentTarget.style.transform='translateY(-1px)'
    else e.currentTarget.style.background='var(--bg-glass-hover)', e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'
  }
  function handleMouseLeave(e) {
    e.currentTarget.style.transform='translateY(0)'
    e.currentTarget.style.boxShadow = variants[variant]?.boxShadow||''
    if (variant==='secondary'||variant==='ghost') e.currentTarget.style.background=variants[variant].background, e.currentTarget.style.borderColor='var(--bg-border)'
  }
  return (
    <button
      type={type} onClick={onClick} disabled={disabled||loading}
      style={{...base,...sizes[size||'md'],...variants[variant||'primary'],...style}}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
    >
      {loading ? <svg width="14" height="14" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite',flexShrink:0}}><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/></svg> : children}
    </button>
  )
}

/* ── INPUT ──────────────────────────────────────────────────── */
export function Input({ label, error, icon, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5,...containerStyle}}>
      {label && <label style={{fontSize:11,fontWeight:600,color:'var(--text-sec)',letterSpacing:'0.03em'}}>{label}</label>}
      <div style={{position:'relative'}}>
        {icon && <span style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}>{icon}</span>}
        <input
          style={{
            width:'100%', padding: icon ? '9px 36px 9px 12px' : '9px 12px',
            background:'var(--bg-glass)', border:`1px solid ${error?'var(--red)':'var(--bg-border)'}`,
            borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13,
            outline:'none', transition:'all 0.2s ease', backdropFilter:'blur(10px)',
            ...style
          }}
          onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
          onBlur={e=>{e.target.style.borderColor=error?'var(--red)':'var(--bg-border)';e.target.style.boxShadow='none'}}
          {...props}
        />
      </div>
      {error && <span style={{fontSize:11,color:'var(--red)'}}>{error}</span>}
    </div>
  )
}

/* ── SELECT ─────────────────────────────────────────────────── */
export function Select({ label, children, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5,...containerStyle}}>
      {label && <label style={{fontSize:11,fontWeight:600,color:'var(--text-sec)',letterSpacing:'0.03em'}}>{label}</label>}
      <select
        style={{
          width:'100%', padding:'9px 12px',
          background:'var(--bg-glass)', border:'1px solid var(--bg-border)',
          borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13,
          outline:'none', cursor:'pointer', backdropFilter:'blur(10px)',
          transition:'all 0.2s ease', appearance:'none',
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238890b8'/%3E%3C/svg%3E")`,
          backgroundRepeat:'no-repeat', backgroundPosition:'left 12px center',
          ...style
        }}
        onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
        onBlur={e=>{e.target.style.borderColor='var(--bg-border)';e.target.style.boxShadow='none'}}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

/* ── TEXTAREA ───────────────────────────────────────────────── */
export function Textarea({ label, containerStyle, style, ...props }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5,...containerStyle}}>
      {label && <label style={{fontSize:11,fontWeight:600,color:'var(--text-sec)',letterSpacing:'0.03em'}}>{label}</label>}
      <textarea
        style={{
          width:'100%', padding:'9px 12px', minHeight:80, resize:'vertical',
          background:'var(--bg-glass)', border:'1px solid var(--bg-border)',
          borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13,
          outline:'none', lineHeight:1.7, backdropFilter:'blur(10px)',
          transition:'all 0.2s ease', ...style
        }}
        onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
        onBlur={e=>{e.target.style.borderColor='var(--bg-border)';e.target.style.boxShadow='none'}}
        {...props}
      />
    </div>
  )
}

/* ── CARD ───────────────────────────────────────────────────── */
export function Card({ children, style, hover=false, glow=false, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:`1px solid ${hovered && hover ? 'rgba(0,228,184,0.25)' : 'var(--bg-border)'}`,
        borderRadius:'var(--radius)',
        padding:'20px',
        transition:'all 0.25s ease',
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered && hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: glow ? '0 0 32px rgba(0,228,184,0.1), 0 8px 32px rgba(0,0,0,0.3)'
          : hovered && hover ? '0 12px 40px rgba(0,0,0,0.35), 0 0 20px rgba(0,228,184,0.08)'
          : '0 4px 20px rgba(0,0,0,0.25)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── STAT CARD ──────────────────────────────────────────────── */
export function StatCard({ label, value, color, trend, sub, icon }) {
  const [display, setDisplay] = useState(0)
  const [animated, setAnimated] = useState(false)
  const numVal = parseFloat(String(value).replace(/[^0-9.-]/g,'')) || 0
  const isNum = !isNaN(numVal) && numVal > 0

  useEffect(() => {
    if (!isNum) { setAnimated(true); return }
    let start = 0
    const steps = 40
    const inc = numVal / steps
    const timer = setInterval(() => {
      start += inc
      if (start >= numVal) { setDisplay(numVal); setAnimated(true); clearInterval(timer) }
      else setDisplay(start)
    }, 16)
    return () => clearInterval(timer)
  }, [value])

  const formatted = isNum
    ? String(value).includes('د.إ')
      ? `${display.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')} د.إ`
      : String(value).includes('%')
      ? `${display.toFixed(1)}%`
      : Math.round(display).toLocaleString()
    : value

  return (
    <div style={{
      background:'var(--bg-glass)',
      backdropFilter:'blur(24px)',
      WebkitBackdropFilter:'blur(24px)',
      border:'1px solid var(--bg-border)',
      borderRadius:'var(--radius)',
      padding:'18px 20px',
      position:'relative',
      overflow:'hidden',
      transition:'all 0.25s ease',
      boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.boxShadow='0 12px 36px rgba(0,0,0,0.35)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='var(--bg-border)';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.25)'}}
    >
      {/* Glow orb */}
      <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:color||'var(--teal)',opacity:0.07,filter:'blur(20px)',pointerEvents:'none'}} />
      {/* Top line accent */}
      <div style={{position:'absolute',top:0,right:0,left:0,height:2,background:`linear-gradient(90deg, transparent, ${color||'var(--teal)'}, transparent)`,opacity:0.5}} />

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.04em',lineHeight:1.4}}>{label}</div>
        {icon && <div style={{color:color||'var(--teal)',opacity:0.7}}>{icon}</div>}
      </div>
      <div style={{
        fontSize:22,fontWeight:900,color:color||'var(--teal)',letterSpacing:'-0.02em',
        animation: animated ? 'countUp 0.3s ease both' : 'none',
        lineHeight:1.2,
      }}>
        {formatted}
      </div>
      {(trend||sub) && (
        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:6,display:'flex',alignItems:'center',gap:4}}>
          {trend && <span style={{color: trend > 0 ? 'var(--green)' : 'var(--red)', fontWeight:600}}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ── BADGE ──────────────────────────────────────────────────── */
export function Badge({ children, color, style }) {
  const c = color || 'var(--teal)'
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'3px 10px',
      borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:'0.02em',
      background: c.startsWith('var') ? `rgba(${hexToRgb(getComputedTeal(c))},0.12)` : hexToRgbA(c, 0.12),
      color: c, border: `1px solid ${hexToRgbA2(c, 0.25)}`,
      whiteSpace:'nowrap', ...style
    }}>
      {children}
    </span>
  )
}
function getComputedTeal(v) { return '0,228,184' }
function hexToRgb(s) { return s }
function hexToRgbA(hex, a) {
  if (hex.startsWith('var')) return `rgba(0,228,184,${a})`
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `rgba(${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)},${a})` : hex
}
function hexToRgbA2(hex, a) {
  if (hex.startsWith('var(--teal')) return `rgba(0,228,184,${a})`
  if (hex.startsWith('var(--violet')) return `rgba(124,58,237,${a})`
  if (hex.startsWith('var(--red')) return `rgba(255,71,87,${a})`
  if (hex.startsWith('var(--green')) return `rgba(16,185,129,${a})`
  if (hex.startsWith('var(--gold')) return `rgba(230,185,74,${a})`
  if (hex.startsWith('var(--amber')) return `rgba(245,158,11,${a})`
  if (hex.startsWith('var(--blue')) return `rgba(59,130,246,${a})`
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `rgba(${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)},${a})` : `rgba(0,228,184,${a})`
}

/* ── SPINNER ────────────────────────────────────────────────── */
export function Spinner({ size=24, color='var(--teal)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite',flexShrink:0}}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  )
}

/* ── MODAL ──────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, width=560 }) {
  useEffect(()=>{
    if (open) document.body.style.overflow='hidden'
    else document.body.style.overflow=''
    return ()=>{document.body.style.overflow=''}
  },[open])
  if (!open) return null
  return (
    <div
      style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}
    >
      <div style={{
        width:'100%', maxWidth:width, maxHeight:'90vh', overflowY:'auto',
        background:'rgba(10,12,24,0.95)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        border:'1px solid rgba(255,255,255,0.1)', borderRadius:'var(--radius-lg)',
        boxShadow:'0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,228,184,0.06)',
        animation:'modalIn 0.25s ease both',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--bg-border)'}}>
          <h2 style={{fontSize:16,fontWeight:800,letterSpacing:'-0.01em'}}>{title}</h2>
          <button onClick={onClose} style={{background:'var(--bg-glass)',border:'1px solid var(--bg-border)',borderRadius:'var(--radius-sm)',width:32,height:32,cursor:'pointer',color:'var(--text-sec)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s ease'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-glass-hover)';e.currentTarget.style.color='var(--text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-glass)';e.currentTarget.style.color='var(--text-sec)'}}>
            ✕
          </button>
        </div>
        <div style={{padding:'20px 24px'}}>{children}</div>
      </div>
    </div>
  )
}

/* ── TOAST ──────────────────────────────────────────────────── */
let _setToast = null
export function setToastFn(fn) { _setToast = fn }
export function toast(msg, type='success') { if(_setToast) _setToast({msg,type,id:Date.now()}) }

export function ToastContainer() {
  const [toasts,setToasts] = useState([])
  useEffect(()=>{ setToastFn(t=>setToasts(p=>[...p,t])) },[])
  useEffect(()=>{
    if(toasts.length===0) return
    const t = setTimeout(()=>setToasts(p=>p.slice(1)),2800)
    return ()=>clearTimeout(t)
  },[toasts])
  if(!toasts.length) return null
  return (
    <div style={{position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:8,alignItems:'center',pointerEvents:'none'}}>
      {toasts.map(t=>(
        <div key={t.id} style={{
          padding:'11px 20px', borderRadius:99, fontSize:13, fontWeight:600,
          background: t.type==='error' ? 'rgba(255,71,87,0.9)' : t.type==='warning' ? 'rgba(245,158,11,0.9)' : 'rgba(0,228,184,0.9)',
          color: t.type==='success' ? '#060810' : '#fff',
          backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
          animation:'toastIn 0.25s ease both', whiteSpace:'nowrap',
          border:`1px solid ${t.type==='error'?'rgba(255,71,87,0.5)':t.type==='warning'?'rgba(245,158,11,0.5)':'rgba(0,228,184,0.5)'}`,
        }}>
          {t.type==='success'?'✓ ':t.type==='error'?'✕ ':'⚠ '}{t.msg}
        </div>
      ))}
    </div>
  )
}

/* ── CONFIRM MODAL ──────────────────────────────────────────── */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel='حذف', danger=true }) {
  return (
    <Modal open={open} onClose={onClose} title={title||'تأكيد'} width={400}>
      <p style={{color:'var(--text-sec)',fontSize:14,lineHeight:1.6,marginBottom:24}}>{message}</p>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn variant={danger?'danger':'primary'} onClick={()=>{onConfirm();onClose()}}>{confirmLabel}</Btn>
      </div>
    </Modal>
  )
}

/* ── PAGE HEADER ────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,gap:16,flexWrap:'wrap'}}>
      <div>
        <h1 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.02em',lineHeight:1.2}}>{title}</h1>
        {subtitle && <p style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>{subtitle}</p>}
      </div>
      {actions && <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>{actions}</div>}
    </div>
  )
}

/* ── TABS ───────────────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',gap:4,background:'var(--bg-glass)',backdropFilter:'blur(20px)',border:'1px solid var(--bg-border)',borderRadius:'var(--radius)',padding:4,flexWrap:'wrap'}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          padding:'8px 16px', borderRadius:'var(--radius-sm)', border:'none',
          background: active===t.id ? 'linear-gradient(135deg, var(--teal), #00c49a)' : 'transparent',
          color: active===t.id ? '#060810' : 'var(--text-sec)',
          fontWeight: active===t.id ? 800 : 500, fontSize:13, cursor:'pointer',
          fontFamily:'var(--font)', transition:'all 0.2s ease',
          boxShadow: active===t.id ? '0 2px 12px rgba(0,228,184,0.3)' : 'none',
          whiteSpace:'nowrap',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ── TOGGLE ─────────────────────────────────────────────────── */
export function Toggle({ checked, onChange }) {
  return (
    <div onClick={()=>onChange(!checked)} style={{width:42,height:24,borderRadius:99,background:checked?'var(--teal)':'var(--bg-border)',position:'relative',cursor:'pointer',transition:'background 0.2s ease',flexShrink:0,boxShadow:checked?'0 0 12px rgba(0,228,184,0.4)':'none'}}>
      <div style={{position:'absolute',top:3,right:checked?3:21,width:18,height:18,borderRadius:'50%',background:checked?'#060810':'var(--text-muted)',transition:'right 0.2s ease',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}} />
    </div>
  )
}

/* ── COLOR PICKER ───────────────────────────────────────────── */
export function ColorPicker({ value, onChange }) {
  return (
    <div style={{position:'relative',width:40,height:40}}>
      <div style={{width:40,height:40,borderRadius:'var(--radius-sm)',background:value,border:'2px solid var(--bg-border)',cursor:'pointer',boxShadow:`0 0 12px ${value}50`}} />
      <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
    </div>
  )
}

/* ── EMPTY ──────────────────────────────────────────────────── */
export function Empty({ title='لا يوجد بيانات', sub, action }) {
  return (
    <div style={{textAlign:'center',padding:'48px 20px',color:'var(--text-muted)'}}>
      <div style={{fontSize:40,marginBottom:12,opacity:0.4}}>📭</div>
      <div style={{fontWeight:700,fontSize:15,color:'var(--text-sec)',marginBottom:4}}>{title}</div>
      {sub && <div style={{fontSize:13,marginBottom:16}}>{sub}</div>}
      {action}
    </div>
  )
}
