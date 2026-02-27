import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../data/db'
import { formatCurrency } from '../data/constants'

/* ══════════════════════════════════════════════════
   NOTIFICATION BELL — Premium dropdown
   Color-coded: sky=order · blue=update · amber=alert
══════════════════════════════════════════════════ */

const TYPE = {
  order:  { icon:'', color:'var(--action)',     bg:'var(--action-faint)',  label:'طلب جديد' },
  update: { icon:'', color:'var(--info-light)', bg:'var(--info-faint)',    label:'تحديث' },
  alert:  { icon:'️', color:'var(--warning)',    bg:'rgba(var(--warning-rgb),0.06)', label:'تنبيه' },
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen]     = useState(false)
  const [unread, setUnread] = useState(0)
  const ref = useRef()

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('notif-orders')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'orders' }, payload => {
        const o = payload.new
        addNotif({
          id: o.id,
          text: `طلب جديد${o.customer_name ? ' من '+o.customer_name : ''}`,
          sub: o.order_number,
          amount: o.total,
          type: 'order',
        })
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('موج — طلب جديد ', {
            body:`${o.customer_name||''} — ${formatCurrency(o.total)}`,
            icon:'/logo.png',
          })
        }
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'orders' }, payload => {
        const o = payload.new
        addNotif({
          id: `upd-${o.id}-${Date.now()}`,
          text: `تم تحديث طلب ${o.order_number}`,
          sub: `الحالة: ${o.status}`,
          amount: null,
          type: 'update',
        })
      })
      .subscribe()

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission()
    return () => supabase.removeChannel(channel)
  }, [])

  function addNotif(n) {
    setNotifs(p => [{ ...n, time:new Date(), read:false }, ...p.slice(0,19)])
    setUnread(u => u+1)
  }

  function markAllRead() {
    setUnread(0)
    setNotifs(p => p.map(n => ({...n, read:true})))
  }

  const relTime = d => {
    const diff = Math.floor((Date.now()-new Date(d))/1000)
    if (diff<60) return 'الآن'
    if (diff<3600) return `منذ ${Math.floor(diff/60)} دقيقة`
    if (diff<86400) return `منذ ${Math.floor(diff/3600)} ساعة`
    return `منذ ${Math.floor(diff/86400)} يوم`
  }

  return (
    <div ref={ref} style={{position:'relative'}}>
      {/* ── Bell button ── */}
      <button
        onClick={()=>{ setOpen(o=>!o); if(unread) markAllRead() }}
        className="icon-btn"
        style={{
          position:'relative',
          background: open ? 'var(--bg-active)' : 'var(--bg-hover)',
          border:`1.5px solid ${open ? 'var(--border-strong)' : 'var(--border)'}`,
          borderRadius:999,width:38,height:38,
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
          color:'var(--text-sec)',fontSize:17,
          transition:'all 0.2s ease',
          WebkitTapHighlightColor:'transparent',
        }}
      >
        {unread>0 && (
          <span style={{
            position:'absolute',top:-5,right:-5,
            minWidth:18,height:18,borderRadius:999,
            background:'linear-gradient(135deg,var(--pink),#db2777)',
            color:'#fff',fontSize:9,fontWeight:900,
            display:'flex',alignItems:'center',justifyContent:'center',
            border:'2px solid var(--bg)',padding:'0 4px',
            boxShadow:'0 0 8px rgba(236,72,153,0.5)',
            animation:'pulsePink 1.5s ease infinite',
          }}>{unread>9?'9+':unread}</span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position:'absolute',top:46,left:0,width:340,
          background:'var(--modal-bg)',
          border:'1.5px solid var(--border-strong)',
          borderRadius:'var(--radius-lg)',
          boxShadow:'var(--float-shadow)',
          zIndex:500,overflow:'hidden',
          animation:'modalIn 0.22s var(--ease-io) both',
        }}>
          {/* Top accent */}
          <div style={{
            height:2,
            background:'linear-gradient(90deg,transparent,var(--action),var(--info-light),transparent)',
            opacity:0.5,
          }} />

          {/* Header */}
          <div style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'14px 18px',borderBottom:'none',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:800,fontSize:14,color:'var(--text)'}}>الإشعارات</span>
              {unread>0 && (
                <span style={{
                  background:'var(--action-soft)',color:'var(--action)',
                  borderRadius:999,padding:'1px 7px',fontSize:10,fontWeight:700,
                }}>{unread} جديد</span>
              )}
            </div>
            {notifs.length>0 && (
              <button onClick={markAllRead} style={{
                fontSize:11,color:'var(--action)',background:'none',border:'none',
                cursor:'pointer',fontFamily:'inherit',fontWeight:600,
              }}>قراءة الكل</button>
            )}
          </div>

          {/* Notification list */}
          <div style={{maxHeight:360,overflowY:'auto'}}>
            {notifs.length===0 ? (
              <div style={{
                padding:'36px 20px',textAlign:'center',
                color:'var(--text-muted)',fontSize:13,
              }}>
                <div style={{fontSize:36,marginBottom:10,opacity:0.3}}></div>
                <div style={{fontWeight:600}}>لا يوجد إشعارات</div>
              </div>
            ) : notifs.map(n => {
              const t = TYPE[n.type] || TYPE.order
              return (
                <div key={n.id} style={{
                  padding:'12px 18px',
                  borderBottom:'none',
                  background: n.read ? 'transparent' : t.bg,
                  display:'flex',gap:12,alignItems:'flex-start',
                  transition:'background 0.2s ease',
                }}>
                  {/* Type icon circle */}
                  <div style={{
                    width:34,height:34,borderRadius:'50%',flexShrink:0,
                    background:'var(--bg-hover)',
                    border:`1.5px solid var(--border)`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                  }}>
                    {t.icon}
                  </div>

                  {/* Content */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2,color:'var(--text)'}}>{n.text}</div>
                    {n.sub && (
                      <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2}}>{n.sub}</div>
                    )}
                    {n.amount && (
                      <div style={{fontSize:12,color:'var(--action)',fontWeight:700}}>{formatCurrency(n.amount)}</div>
                    )}
                    <div style={{fontSize:10,color:'var(--text-muted)',marginTop:4}}>
                      {relTime(n.time)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      width:7,height:7,borderRadius:'50%',
                      background:t.color,flexShrink:0,marginTop:4,
                      boxShadow:`0 0 6px ${t.color}`,
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {notifs.length>0 && (
            <div style={{
              padding:'10px 18px',
              borderTop:'none',
              textAlign:'center',
            }}>
              <button
                onClick={()=>{ setNotifs([]); setUnread(0) }}
                style={{
                  fontSize:11,color:'var(--text-muted)',background:'none',
                  border:'none',cursor:'pointer',fontFamily:'inherit',
                }}
              >مسح الكل</button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulsePink {
          0%,100%{ box-shadow:0 0 8px rgba(236,72,153,0.5) }
          50%    { box-shadow:0 0 14px rgba(236,72,153,0.8) }
        }
      `}</style>
    </div>
  )
}
