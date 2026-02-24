import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../data/db'
import { formatCurrency } from '../data/constants'

export default function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const ref = useRef()

  useEffect(() => {
    // Close on outside click
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    // Subscribe to new orders in real time
    const channel = supabase
      .channel('notif-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const o = payload.new
        const n = {
          id: o.id,
          time: new Date(),
          text: `طلب جديد${o.customer_name ? ' من ' + o.customer_name : ''}`,
          sub: o.order_number,
          amount: o.total,
          read: false,
          type: 'order',
        }
        setNotifs(p => [n, ...p.slice(0, 19)])
        setUnread(u => u + 1)
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('موج — طلب جديد 📦', {
            body: `${n.text} — ${formatCurrency(o.total)}`,
            icon: '/logo.png',
          })
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const o = payload.new
        const n = {
          id: `upd-${o.id}-${Date.now()}`,
          time: new Date(),
          text: `تم تحديث طلب ${o.order_number}`,
          sub: `الحالة: ${o.status}`,
          amount: null,
          read: false,
          type: 'update',
        }
        setNotifs(p => [n, ...p.slice(0, 19)])
        setUnread(u => u + 1)
      })
      .subscribe()

    // Request browser notification permission
    if (Notification.permission === 'default') Notification.requestPermission()

    return () => supabase.removeChannel(channel)
  }, [])

  function markAllRead() { setUnread(0); setNotifs(p => p.map(n => ({...n, read:true}))) }

  const relTime = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000)
    if (diff < 60) return 'الآن'
    if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`
    return `منذ ${Math.floor(diff/86400)} يوم`
  }

  const TYPE_ICON = { order:'📦', update:'🔄', alert:'⚠️' }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        onClick={() => { setOpen(o=>!o); if(unread) markAllRead() }}
        style={{
          position:'relative', background:'var(--bg-glass)', border:'1.5px solid var(--bg-border)',
          borderRadius:'var(--radius-pill)', width:38, height:38,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--text-sec)', transition:'all 0.2s ease', fontSize:17,
        }}
        className="icon-btn"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position:'absolute', top:-4, right:-4,
            minWidth:18, height:18, borderRadius:'var(--radius-pill)',
            background:'var(--red)', color:'#fff',
            fontSize:10, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid var(--bg)', padding:'0 4px',
            animation:'dotPulse 1.5s ease infinite',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:46, left:0, width:320,
          background:'var(--modal-bg)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
          border:'1.5px solid var(--bg-border)', borderRadius:'var(--radius-lg)',
          boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
          zIndex:500, overflow:'hidden',
          animation:'modalIn 0.22s ease both',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--bg-border)' }}>
            <div style={{ fontWeight:800, fontSize:14 }}>الإشعارات</div>
            {notifs.length > 0 && (
              <button onClick={markAllRead} style={{ fontSize:11, color:'var(--teal)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                قراءة الكل
              </button>
            )}
          </div>

          <div style={{ maxHeight:340, overflowY:'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:10, opacity:0.4 }}>🔕</div>
                لا يوجد إشعارات
              </div>
            ) : notifs.map(n => (
              <div key={n.id} style={{
                padding:'12px 18px', borderBottom:'1px solid var(--bg-border)',
                background: n.read ? 'transparent' : 'rgba(0,228,184,0.03)',
                display:'flex', gap:12, alignItems:'flex-start',
                transition:'background 0.2s ease',
              }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--bg-glass)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {TYPE_ICON[n.type]||'📋'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{n.text}</div>
                  {n.sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{n.sub}</div>}
                  {n.amount && <div style={{ fontSize:12, color:'var(--teal)', fontWeight:700 }}>{formatCurrency(n.amount)}</div>}
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{relTime(n.time)}</div>
                </div>
                {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--teal)', flexShrink:0, marginTop:4, boxShadow:'0 0 6px var(--teal)' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
