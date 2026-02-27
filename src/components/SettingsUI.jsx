import React from 'react'

/**
 * Shared UI primitives for Settings sub-tabs.
 * Frosted Depth glass edition.
 */

export function SectionTitle({ children, icon, style }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:800,fontSize:15,marginBottom:18,color:'var(--text)',paddingBottom:12,borderBottom:'1px solid var(--border)',...(style||{})}}>
      {icon && <span style={{fontSize:18}}>{icon}</span>}
      {children}
    </div>
  )
}

export function ControlRow({ label, desc, children, last }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'14px 0',
      borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.04)',
      gap:16,
    }}>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:600,fontSize:'var(--t-body)',color:'var(--text)'}}>{label}</div>
        {desc && <div style={{fontSize:'var(--t-label)',color:'var(--text-muted)',marginTop:2}}>{desc}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  )
}

export function ControlBtn({ active, onClick, children, style={}, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      minWidth:36,height:36,padding:'0 10px',borderRadius:'var(--r-md)',
      border:`2px solid ${active?'var(--action)':'var(--border)'}`,
      background: active ? 'linear-gradient(135deg,rgba(var(--action-rgb),0.12),rgba(var(--info-rgb),0.08))' : 'var(--bg-hover)',
      color: active?'var(--action)':'var(--text-sec)',
      cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:13,
      transition:'all 0.15s ease',
      boxShadow: active ? '0 0 12px rgba(var(--action-rgb),0.2)' : 'none',
      ...style,
    }}>{children}</button>
  )
}

export function GlassRow({ children, style, ...rest }) {
  return (
    <div className="list-row" {...rest} style={{
      display:'flex',alignItems:'center',gap:12,
      padding:'10px 14px',
      background:'var(--bg-surface)',
      backdropFilter:'var(--glass-blur)',
      WebkitBackdropFilter:'var(--glass-blur)',
      border:'1px solid var(--border)',
      borderTopColor:'var(--glass-edge)',
      borderRadius:'var(--r-md)',
      ...style,
    }}>{children}</div>
  )
}

export function InfoBox({ children, color='var(--action)', icon='' }) {
  return (
    <div style={{
      padding:'12px 16px',
      background:'var(--bg-surface)',
      backdropFilter:'blur(12px)',
      WebkitBackdropFilter:'blur(12px)',
      border:`1px solid rgba(var(--action-rgb),0.15)`,
      borderRadius:'var(--r-md)',fontSize:'var(--t-body)',color:'var(--text-sec)',
      display:'flex',gap:10,alignItems:'flex-start',lineHeight:1.6,
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}
