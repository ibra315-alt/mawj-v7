// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Spinner, Modal, Btn } from '../components/ui'
import { IcSearch, IcWhatsapp, IcClose } from '../components/Icons'
import type { PageProps } from '../types'

const SEGMENT_CONFIG = {
  VIP:   { color:'#F59E0B', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.30)', label:'VIP',    emoji:'👑' },
  مخلص:  { color:'#38BDF8', bg:'rgba(56,189,248,0.12)',  border:'rgba(56,189,248,0.30)',  label:'مخلص',   emoji:'⭐' },
  نشط:   { color:'var(--success)', bg:'rgba(93,216,164,0.10)', border:'rgba(93,216,164,0.25)', label:'نشط', emoji:'🟢' },
  جديد:  { color:'var(--info)',    bg:'rgba(126,184,247,0.10)', border:'rgba(126,184,247,0.25)', label:'جديد', emoji:'🆕' },
  خامل:  { color:'var(--danger)', bg:'rgba(248,113,113,0.10)', border:'rgba(248,113,113,0.25)', label:'خامل', emoji:'💤' },
}

function getSegment(c) {
  const daysSinceLast = Math.floor((Date.now() - new Date(c.lastOrderDate)) / 86400000)
  if (c.totalSpent >= 2000 || c.orderCount >= 5) return { label:'VIP',   color:SEGMENT_CONFIG['VIP'].color,   tier:1 }
  if (c.orderCount >= 3 && daysSinceLast < 60)   return { label:'مخلص', color:SEGMENT_CONFIG['مخلص'].color, tier:2 }
  if (daysSinceLast > 90 && c.orderCount >= 2)   return { label:'خامل', color:SEGMENT_CONFIG['خامل'].color, tier:4 }
  if (c.orderCount === 1)                        return { label:'جديد',  color:SEGMENT_CONFIG['جديد'].color,  tier:3 }
  return                                                { label:'نشط',   color:SEGMENT_CONFIG['نشط'].color,   tier:2 }
}

const SORT_OPTIONS = [
  { value:'spent',  label:'الأكثر إنفاقاً' },
  { value:'orders', label:'الأكثر طلبات' },
  { value:'recent', label:'الأحدث' },
  { value:'name',   label:'الاسم' },
]

export default function Customers(_: PageProps) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState('spent')
  const [segFilter, setSegFilter] = useState('all')
  const [selected, setSelected]           = useState(null)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    try {
      const orders = await DB.list('orders', { orderBy: 'created_at' })
      const map = {}
      orders.forEach(o => {
        const key = o.customer_phone || o.customer_name || 'unknown'
        if (!map[key]) map[key] = {
          name: o.customer_name || '', phone: o.customer_phone || '',
          city: o.customer_city || '',
          orders: [], totalSpent: 0, totalProfit: 0,
          firstOrderDate: o.created_at, lastOrderDate: o.created_at,
        }
        map[key].orders.push(o)
        map[key].totalSpent  += (o.total  || 0)
        map[key].totalProfit += (o.gross_profit || 0)
        if (new Date(o.created_at) < new Date(map[key].firstOrderDate)) map[key].firstOrderDate = o.created_at
        if (new Date(o.created_at) > new Date(map[key].lastOrderDate))  map[key].lastOrderDate  = o.created_at
      })
      const list = Object.values(map).map(c => ({
        ...c,
        orderCount: c.orders.length,
        avgOrder:   c.totalSpent / c.orders.length,
      })).map(c => ({ ...c, segment: getSegment(c) }))
      setCustomers(list)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const segments = ['all', 'VIP', 'مخلص', 'نشط', 'جديد', 'خامل']

  const { segCounts, totalRevenue, vipCount, avgLTV } = useMemo(() => {
    const counts = {}
    let revenue = 0, vip = 0
    customers.forEach(c => {
      counts[c.segment.label] = (counts[c.segment.label] || 0) + 1
      revenue += c.totalSpent
      if (c.segment.label === 'VIP') vip++
    })
    return { segCounts: counts, totalRevenue: revenue, vipCount: vip, avgLTV: customers.length ? revenue / customers.length : 0 }
  }, [customers])

  const filtered = useMemo(() => {
    const list = customers.filter(c => {
      const q = !search || c.name.includes(search) || c.phone?.includes(search) || c.city?.includes(search)
      const s = segFilter === 'all' || c.segment.label === segFilter
      return q && s
    })
    return [...list].sort((a,b) => {
      if (sortBy==='spent')  return b.totalSpent - a.totalSpent
      if (sortBy==='orders') return b.orderCount - a.orderCount
      if (sortBy==='recent') return new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
      return a.name.localeCompare(b.name, 'ar')
    })
  }, [customers, search, segFilter, sortBy])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><Spinner size={36}/></div>

  return (
    <div className="page">

      {/* ─── Header ──────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:'var(--t-title)', fontWeight:900, color:'var(--text)', margin:0 }}>العملاء</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0', fontWeight:600 }}>
            {customers.length} عميل مسجل · {vipCount} VIP
          </p>
        </div>
        {customers.length > 0 && (
          <button
            onClick={() => setBroadcastOpen(true)}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
              background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.25)',
              borderRadius:'var(--r-md)', color:'var(--whatsapp)', fontSize:13, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
            }}
          >
            <IcWhatsapp size={16}/> رسالة جماعية
          </button>
        )}
      </div>

      {/* ─── KPI Row ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'إجمالي العملاء',    value: customers.length,              color:'var(--info)',    icon:'👥' },
          { label:'إيرادات العملاء',   value: formatCurrency(totalRevenue),  color:'var(--action)', icon:'💰' },
          { label:'متوسط قيمة العميل', value: formatCurrency(avgLTV),        color:'var(--success)',icon:'📊' },
          { label:'عملاء VIP',         value: vipCount,                      color:'#F59E0B',       icon:'👑' },
        ].map(s => (
          <div key={s.label} style={{
            background:'var(--bg-surface)',
            backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
            border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
            borderRadius:'var(--r-lg)', padding:'16px 18px',
            boxShadow:'var(--card-shadow)', position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', top:0, insetInlineStart:0, insetInlineEnd:0, height:3, background:`linear-gradient(90deg, transparent, ${s.color}, transparent)`, opacity:0.7 }} />
            <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Segment chips ───────────────────────────────── */}
      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        <button
          onClick={() => setSegFilter('all')}
          style={{
            padding:'7px 16px', borderRadius:999, flexShrink:0, whiteSpace:'nowrap',
            border: segFilter==='all' ? '2px solid var(--action)' : '1px solid var(--border)',
            background: segFilter==='all' ? 'var(--action-soft)' : 'var(--bg-hover)',
            color: segFilter==='all' ? 'var(--action)' : 'var(--text-muted)',
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s ease',
          }}
        >
          الكل ({customers.length})
        </button>
        {['VIP', 'مخلص', 'نشط', 'جديد', 'خامل'].map(seg => {
          const cfg = SEGMENT_CONFIG[seg] || {}
          const count = segCounts[seg] || 0
          const active = segFilter === seg
          return (
            <button
              key={seg}
              onClick={() => setSegFilter(seg)}
              style={{
                padding:'7px 16px', borderRadius:999, flexShrink:0, whiteSpace:'nowrap',
                border: active ? `2px solid ${cfg.color}` : `1px solid ${cfg.border || 'var(--border)'}`,
                background: active ? cfg.bg : 'var(--bg-hover)',
                color: active ? cfg.color : 'var(--text-muted)',
                fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                transition:'all 0.15s ease',
                boxShadow: active ? `0 0 12px ${cfg.bg}` : 'none',
              }}
            >
              {cfg.emoji} {seg} {count > 0 ? `(${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* ─── Search + Sort ────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginBottom:18 }}>
        <div style={{ position:'relative', flex:1 }}>
          <IcSearch size={14} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو المدينة..."
            style={{
              width:'100%', padding:'10px 12px 10px 38px', boxSizing:'border-box',
              background:'var(--bg-surface)', backdropFilter:'blur(20px)',
              border:'1px solid var(--border-strong)', borderRadius:'var(--r-md)',
              color:'var(--text)', fontSize:13, fontFamily:'inherit',
              outline:'none', transition:'border-color 0.15s ease',
            }}
            onFocus={e => e.target.style.borderColor='var(--action)'}
            onBlur={e => e.target.style.borderColor='var(--border-strong)'}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding:'10px 14px', background:'var(--bg-surface)', backdropFilter:'blur(20px)',
            border:'1px solid var(--border-strong)', borderRadius:'var(--r-md)',
            color:'var(--text)', fontSize:12, fontFamily:'inherit',
            cursor:'pointer', outline:'none', flexShrink:0,
          }}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ─── Customer Grid ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>لا يوجد عملاء</div>
          <div style={{ fontSize:13 }}>جرب تغيير فلتر البحث</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:14 }}>
          {filtered.map((c, i) => (
            <CustomerCard key={i} customer={c} onClick={() => setSelected(c)} />
          ))}
        </div>
      )}

      {/* ─── Customer Detail Drawer ───────────────────────── */}
      {selected && (
        <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
      )}

      {/* ─── WhatsApp Broadcast ───────────────────────────── */}
      <WhatsAppBroadcast
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        customers={customers}
      />
    </div>
  )
}


/* ─── CUSTOMER CARD ─────────────────────────────────────── */
function CustomerCard({ customer: c, onClick }) {
  const seg = c.segment
  const cfg = SEGMENT_CONFIG[seg.label] || {}
  const daysSince = Math.floor((Date.now() - new Date(c.lastOrderDate)) / 86400000)
  const initial = (c.name || c.phone || '?')[0]

  return (
    <div
      onClick={onClick}
      style={{
        background:'var(--bg-surface)',
        backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
        border:`1px solid ${cfg.border || 'var(--border)'}`,
        borderRadius:'var(--r-lg)', padding:'18px',
        cursor:'pointer', position:'relative', overflow:'hidden',
        boxShadow:'var(--card-shadow)',
        transition:'transform 0.18s var(--ease-spring), box-shadow 0.18s var(--ease-io)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='var(--card-shadow-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='var(--card-shadow)' }}
    >
      {/* Top gradient bar */}
      <div style={{ position:'absolute', top:0, insetInlineStart:0, insetInlineEnd:0, height:3, background:`linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)`, borderRadius:'var(--r-lg) var(--r-lg) 0 0' }} />

      {/* Ambient glow */}
      <div style={{ position:'absolute', top:0, insetInlineStart:0, insetInlineEnd:0, height:60, background:`radial-gradient(ellipse at 50% 0%, ${cfg.color}14, transparent 70%)`, pointerEvents:'none' }} />

      {/* Header: avatar + name + segment badge */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, position:'relative' }}>
        <div style={{
          width:46, height:46, borderRadius:'50%', flexShrink:0,
          background:`linear-gradient(135deg, ${cfg.color}50, ${cfg.color}20)`,
          border:`2px solid ${cfg.color}60`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20, fontWeight:800, color:cfg.color,
          boxShadow:`0 0 16px ${cfg.color}30`,
        }}>
          {initial}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {c.name || 'بدون اسم'}
          </div>
          {c.phone && (
            <div style={{ fontSize:11, color:'var(--text-muted)', direction:'ltr', marginTop:2 }}>{c.phone}</div>
          )}
        </div>
        <span style={{
          padding:'4px 10px', borderRadius:999, fontSize:10, fontWeight:800,
          background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
          flexShrink:0, boxShadow:`0 0 8px ${cfg.color}25`,
        }}>
          {cfg.emoji} {seg.label}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:14 }}>
        {[
          { label:'الإنفاق',  value:formatCurrency(c.totalSpent), color:'var(--action)' },
          { label:'الطلبات', value:c.orderCount,                   color:'var(--info)' },
          { label:'المتوسط', value:formatCurrency(c.avgOrder),     color:'var(--text-sec)' },
        ].map(s => (
          <div key={s.label} style={{
            textAlign:'center', padding:'8px 4px',
            background:'var(--bg-hover)', borderRadius:'var(--r-sm)',
            border:'1px solid var(--border)',
          }}>
            <div style={{ fontSize:12, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:2, fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:10, borderTop:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>
          {c.city && <span>{c.city} · </span>}
          {daysSince === 0 ? 'آخر طلب اليوم' : `منذ ${daysSince} يوم`}
        </div>
        {c.phone && (
          <a
            href={`https://wa.me/${c.phone.replace(/\D/g,'')}`}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
              background:'rgba(37,211,102,0.10)', border:'1px solid rgba(37,211,102,0.22)',
              borderRadius:999, color:'var(--whatsapp)', fontSize:11, fontWeight:700,
              textDecoration:'none',
            }}
          >
            <IcWhatsapp size={12}/> واتساب
          </a>
        )}
      </div>
    </div>
  )
}


/* ─── CUSTOMER DETAIL DRAWER ────────────────────────────── */
function CustomerDrawer({ customer: c, onClose }) {
  const seg = c.segment
  const cfg = SEGMENT_CONFIG[seg.label] || {}
  const sorted = [...c.orders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  const daysSinceFirst = Math.floor((Date.now() - new Date(c.firstOrderDate)) / 86400000)
  const daysSinceLast  = Math.floor((Date.now() - new Date(c.lastOrderDate)) / 86400000)

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, background:'var(--bg-overlay)',
          backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
          zIndex:400, animation:'fadeIn 0.2s ease',
        }}
      />
      {/* Drawer panel */}
      <div style={{
        position:'fixed', top:0, insetInlineEnd:0, bottom:0, width:420,
        maxWidth:'95vw',
        background:'var(--modal-bg)', backdropFilter:'blur(64px) saturate(2)',
        WebkitBackdropFilter:'blur(64px) saturate(2)',
        borderInlineStart:'1px solid var(--border-strong)',
        boxShadow:'var(--modal-shadow)',
        zIndex:401,
        display:'flex', flexDirection:'column',
        animation:'slideInEnd 0.25s var(--ease-spring)',
        overflowY:'auto',
      }}>
        {/* Drawer header */}
        <div style={{
          display:'flex', alignItems:'center', gap:12, padding:'20px 20px 16px',
          borderBottom:'1px solid var(--border)', flexShrink:0,
          background:`linear-gradient(135deg, ${cfg.color}08, transparent)`,
        }}>
          <div style={{
            width:52, height:52, borderRadius:'50%', flexShrink:0,
            background:`linear-gradient(135deg, ${cfg.color}50, ${cfg.color}20)`,
            border:`2px solid ${cfg.color}60`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, fontWeight:800, color:cfg.color,
            boxShadow:`0 0 20px ${cfg.color}30`,
          }}>
            {(c.name || c.phone || '?')[0]}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:16, color:'var(--text)', marginBottom:4 }}>
              {c.name || 'بدون اسم'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{
                padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:800,
                background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
              }}>
                {cfg.emoji} {seg.label}
              </span>
              {c.city && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{c.city}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <IcClose size={14}/>
          </button>
        </div>

        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'إجمالي الإنفاق',    value:formatCurrency(c.totalSpent),                                    color:'var(--action)' },
              { label:'صافي الربح',        value:formatCurrency(c.totalProfit),                                   color:c.totalProfit>=0?'var(--success)':'var(--danger)' },
              { label:'عدد الطلبات',       value:`${c.orderCount} طلب`,                                           color:'var(--info)' },
              { label:'متوسط قيمة الطلب', value:formatCurrency(c.avgOrder),                                      color:'var(--text)' },
            ].map(s => (
              <div key={s.label} style={{ padding:'12px 14px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-md)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 16px', padding:'12px 14px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:12, color:'var(--text-sec)' }}>
            <span>📅 عميل منذ {daysSinceFirst} يوم</span>
            <span>🕐 آخر طلب منذ {daysSinceLast} يوم</span>
            {c.phone && <span style={{ direction:'ltr' }}>📱 {c.phone}</span>}
          </div>

          {/* Actions */}
          {c.phone && (
            <a
              href={`https://wa.me/${c.phone.replace(/\D/g,'')}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'12px', borderRadius:'var(--r-md)',
                background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.25)',
                color:'var(--whatsapp)', fontSize:13, fontWeight:700, textDecoration:'none',
              }}
            >
              <IcWhatsapp size={16}/> تواصل عبر واتساب
            </a>
          )}

          {/* Order history */}
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text-sec)', marginBottom:10 }}>
              سجل الطلبات ({sorted.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {sorted.map(o => (
                <div key={o.id} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px', background:'var(--bg-hover)',
                  borderRadius:'var(--r-md)', border:'1px solid var(--border)',
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:'var(--action)', fontFamily:'monospace', fontWeight:700, direction:'ltr', marginBottom:2 }}>{o.order_number}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{formatDate(o.created_at)}</div>
                    {o.items?.length > 0 && (
                      <div style={{ fontSize:11, color:'var(--text-sec)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {o.items.map(i=>`${i.name}×${i.qty}`).join('، ')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight:800, color:'var(--action)', fontSize:13, fontFamily:'Inter,sans-serif', flexShrink:0 }}>
                    {formatCurrency(o.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


/* ─── WHATSAPP BROADCAST ────────────────────────────────── */
function WhatsAppBroadcast({ open, onClose, customers }) {
  const [segFilter, setSegFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [message, setMessage] = useState('مرحباً {الاسم}،\n\nلدينا عروض حصرية لعملائنا المميزين 🎁\nتواصلوا معنا للاستفادة من العروض.\n\nموج للهدايا الكريستالية ✨')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)

  const cities = ['all', ...Array.from(new Set(customers.map(c=>c.city).filter(Boolean)))]
  const segments = ['all', 'VIP', 'مخلص', 'نشط', 'جديد', 'خامل']

  const targets = customers.filter(c => {
    const hasSeg  = segFilter  === 'all' || c.segment.label === segFilter
    const hasCity = cityFilter === 'all' || c.city === cityFilter
    return hasSeg && hasCity && !!c.phone
  })

  function buildMessage(customer) {
    return message
      .replace(/{الاسم}/g, customer.name || 'عزيزي العميل')
      .replace(/{الهاتف}/g, customer.phone || '')
      .replace(/{المدينة}/g, customer.city || '')
  }

  function sendToAll() {
    if (targets.length === 0) return
    setSending(true); setSentCount(0)
    let i = 0
    function sendNext() {
      if (i >= targets.length) { setSending(false); return }
      const c = targets[i]
      const phone = c.phone.replace(/\D/g,'')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(c))}`, '_blank')
      setSentCount(++i)
      setTimeout(sendNext, 1500)
    }
    sendNext()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="رسالة واتساب جماعية" maxWidth={520}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn onClick={sendToAll} loading={sending} disabled={targets.length===0}
          style={{ background:'var(--whatsapp)', color:'#fff', border:'none', gap:6 }}>
          إرسال لـ {targets.length} عميل
        </Btn>
      </>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>الشريحة</div>
            <select value={segFilter} onChange={e=>setSegFilter(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
              {segments.map(s => <option key={s} value={s}>{s==='all'?'الكل':s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>المدينة</div>
            <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
              {cities.map(c => <option key={c} value={c}>{c==='all'?'كل المدن':c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding:'10px 14px', background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:'var(--r-md)', fontSize:13 }}>
          <span style={{ fontWeight:800, color:'var(--whatsapp)', fontSize:16 }}>{targets.length}</span>
          <span style={{ color:'var(--text-sec)' }}> عميل سيصلهم الرسالة</span>
          {targets.length === 0 && <span style={{ color:'var(--danger)', marginInlineStart:8 }}>— لا يوجد عملاء بأرقام هاتف</span>}
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>
            نص الرسالة — يمكن استخدام: {'{الاسم}'} {'{المدينة}'}
          </div>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={6}
            style={{ width:'100%', padding:'10px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}/>
        </div>
        {targets.length > 0 && (
          <div style={{ padding:'10px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-md)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>معاينة (أول عميل):</div>
            <div style={{ fontSize:12, color:'var(--text-sec)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>{buildMessage(targets[0])}</div>
          </div>
        )}
        {sending && (
          <div style={{ padding:'10px 14px', background:'rgba(var(--action-rgb),0.06)', border:'1px solid rgba(var(--action-rgb),0.2)', borderRadius:'var(--r-md)', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--action)', fontWeight:700 }}>جاري الإرسال... {sentCount}/{targets.length}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
