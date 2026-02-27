import React from 'react'

/**
 * Shared UI primitives for Settings sub-tabs.
 * Extracted from Settings.jsx to reduce file size and enable reuse.
 */

export function SectionTitle({ children, icon, style }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:800,fontSize:15,marginBottom:18,color:'var(--text)',paddingBottom:10,borderBottom:'none',...(style||{})}}>
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
      borderBottom: last ? 'none' : 'none',
      gap:16,
    }}>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{label}</div>
        {desc && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{desc}</div>}
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

export function GlassRow({ children, style }) {
  return (
    <div className="list-row" style={{
      display:'flex',alignItems:'center',gap:12,
      padding:'10px 14px',
      background:'var(--bg-surface)',
      border:'none',
      borderRadius:'var(--r-md)',
      ...style,
    }}>{children}</div>
  )
}

export function InfoBox({ children, color='var(--action)', icon='' }) {
  return (
    <div style={{
      padding:'12px 16px',
      background:`rgba(${color==='var(--action)'?'56,189,248':'37,99,235'},0.06)`,
      border:`1px solid ${color==='var(--action)'?'rgba(var(--action-rgb),0.18)':'rgba(var(--info-rgb),0.18)'}`,
      borderRadius:'var(--r-md)',fontSize:13,color:'var(--text-sec)',
      display:'flex',gap:10,alignItems:'flex-start',lineHeight:1.6,
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}
