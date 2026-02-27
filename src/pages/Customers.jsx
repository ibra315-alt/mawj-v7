import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Badge, Spinner, Empty, PageHeader, Modal, Btn } from '../components/ui'
import { IcSearch, IcWhatsapp } from '../components/Icons'

function getSegment(c) {
  const daysSinceLast = Math.floor((Date.now() - new Date(c.lastOrderDate)) / 86400000)
  if (c.totalSpent >= 2000 || c.orderCount >= 5) return { label:'VIP',   color:'#f59e0b', icon:'' }
  if (c.orderCount >= 3 && daysSinceLast < 60)   return { label:'مخلص', color:'#00e4b8', icon:'⭐' }
  if (daysSinceLast > 90 && c.orderCount >= 2)   return { label:'خامل', color:'#ef4444', icon:'' }
  if (c.orderCount === 1)                        return { label:'جديد',  color:'#a78bfa', icon:'' }
  return                                                { label:'نشط',   color:'#34d399', icon:'' }
}

const SORT_OPTIONS = [
  { value:'spent',  label:'الأكثر إنفاقاً' },
  { value:'orders', label:'الأكثر طلبات' },
  { value:'recent', label:'الأحدث' },
  { value:'name',   label:'الاسم' },
]

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState('spent')
  const [segFilter, setSegFilter] = useState('all')
  const [selected, setSelected]         = useState(null)
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
  const segCounts = {}
  customers.forEach(c => { segCounts[c.segment.label] = (segCounts[c.segment.label] || 0) + 1 })

  let filtered = customers.filter(c => {
    const q = !search || c.name.includes(search) || c.phone?.includes(search) || c.city?.includes(search)
    const s = segFilter === 'all' || c.segment.label === segFilter
    return q && s
  })
  filtered = [...filtered].sort((a,b) => {
    if (sortBy==='spent')  return b.totalSpent - a.totalSpent
    if (sortBy==='orders') return b.orderCount - a.orderCount
    if (sortBy==='recent') return new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
    return a.name.localeCompare(b.name, 'ar')
  })

  const totalRevenue = customers.reduce((s,c) => s + c.totalSpent, 0)
  const vipCount     = customers.filter(c => c.segment.label === 'VIP').length
  const avgLTV       = customers.length ? totalRevenue / customers.length : 0

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><Spinner size={36}/></div>

  return (
    <div className="page">
      <PageHeader
        title="العملاء"
        subtitle={`${customers.length} عميل • ${vipCount} VIP`}
        actions={
          customers.length > 0 && (
            <Btn variant="secondary" onClick={() => setBroadcastOpen(true)} style={{ gap:6 }}>
              رسالة جماعية
            </Btn>
          )
        }
      />

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'إجمالي العملاء',    value: customers.length,       color:'var(--violet)' },
          { label:'متوسط قيمة العميل', value: formatCurrency(avgLTV), color:'var(--teal)' },
          { label:'عملاء VIP',        value: vipCount,                color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:15, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Segment chips */}
      <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:2 }}>
        {segments.map(seg => (
          <button key={seg} onClick={() => setSegFilter(seg)} style={{
            padding:'5px 12px', borderRadius:999,
            border:`1.5px solid ${segFilter===seg ? 'var(--teal)' : 'var(--border)'}`,
            background: segFilter===seg ? 'rgba(0,228,184,0.12)' : 'var(--bg-hover)',
            color: segFilter===seg ? 'var(--teal)' : 'var(--text-muted)',
            fontSize:12, fontWeight: segFilter===seg ? 800 : 500,
            cursor:'pointer', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap',
          }}>
            {seg==='all' ? 'الكل' : seg}{seg!=='all' && segCounts[seg] ? ` (${segCounts[seg]})` : ''}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <div style={{ position:'relative', flex:1 }}>
          <IcSearch size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            style={{ width:'100%', padding:'9px 32px 9px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding:'9px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? <Empty title="لا يوجد عملاء"/> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
          {filtered.map((c,i) => <CustomerCard key={i} customer={c} onClick={() => setSelected(c)}/>)}
        </div>
      )}

      <WhatsAppBroadcast
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        customers={customers}
      />
      <CustomerModal customer={selected} onClose={() => setSelected(null)}/>
    </div>
  )
}

function CustomerCard({ customer: c, onClick }) {
  const seg = c.segment
  const daysSince = Math.floor((Date.now() - new Date(c.lastOrderDate)) / 86400000)
  return (
    <div onClick={onClick} className="list-row" style={{
      background:'var(--bg-surface)',
      borderTop:`3px solid ${seg.color}`,
      borderRadius:'var(--r-lg)', padding:'16px', cursor:'pointer',
      transition:'box-shadow 120ms ease, transform 120ms ease', boxShadow:'var(--card-shadow)', position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:40, background:`radial-gradient(ellipse at 50% 0%, ${seg.color}15, transparent 70%)`, pointerEvents:'none' }}/>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
        <div style={{ width:42, height:42, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg, ${seg.color}40, ${seg.color}20)`, border:`2px solid ${seg.color}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800 }}>
          {(c.name || c.phone || '?')[0]}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name || 'بدون اسم'}</div>
          {c.phone && <div style={{ fontSize:12, color:'var(--text-muted)', direction:'ltr' }}>{c.phone}</div>}
        </div>
        <span style={{ padding:'3px 8px', borderRadius:999, fontSize:10, fontWeight:800, background:`${seg.color}20`, color:seg.color, border:`1px solid ${seg.color}40`, flexShrink:0 }}>
          {seg.icon} {seg.label}
        </span>
      </div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, marginBottom:10 }}>
        {[
          { label:'الإنفاق',    value: formatCurrency(c.totalSpent), color:'var(--teal)' },
          { label:'الطلبات',   value: c.orderCount,                  color:'var(--violet-light,#a78bfa)' },
          { label:'المتوسط',   value: formatCurrency(c.avgOrder),   color:'var(--text-sec)' },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center', padding:'7px 4px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
            <div style={{ fontSize:12, fontWeight:900, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:10, borderTop:'none' }}>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>
          {c.city && ` ${c.city} • `}آخر طلب: {daysSince===0 ? 'اليوم' : `منذ ${daysSince} يوم`}
        </div>
        {c.phone && (
          <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', background:'rgba(37,209,102,0.1)', border:'1px solid rgba(37,209,102,0.2)', borderRadius:999, color:'#25d166', fontSize:11, fontWeight:700, textDecoration:'none' }}>
            <IcWhatsapp size={12}/> واتساب
          </a>
        )}
      </div>
    </div>
  )
}

function CustomerModal({ customer: c, onClose }) {
  if (!c) return null
  const seg = c.segment
  const sorted = [...c.orders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  const daysSinceFirst = Math.floor((Date.now() - new Date(c.firstOrderDate)) / 86400000)
  return (
    <Modal open={!!c} onClose={onClose} title={c.name || c.phone || 'عميل'} maxWidth={520}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Segment strip */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:`${seg.color}0e`, border:`1px solid ${seg.color}30`, borderRadius:'var(--r-md)' }}>
          <span style={{ fontSize:28 }}>{seg.icon}</span>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:seg.color }}>{seg.label}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>عميل منذ {daysSinceFirst} يوم</div>
          </div>
          {c.phone && (
            <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ marginInlineStart:'auto', display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'rgba(37,209,102,0.12)', border:'1px solid rgba(37,209,102,0.25)', borderRadius:999, color:'#25d166', fontSize:12, fontWeight:700, textDecoration:'none' }}>
              <IcWhatsapp size={13}/> واتساب
            </a>
          )}
        </div>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          {[
            { label:'إجمالي الإنفاق',   value: formatCurrency(c.totalSpent),  color:'var(--teal)' },
            { label:'صافي الربح',       value: formatCurrency(c.totalProfit), color: c.totalProfit>=0?'var(--green,#34d399)':'var(--red)' },
            { label:'عدد الطلبات',      value: `${c.orderCount} طلب`,         color:'var(--violet-light,#a78bfa)' },
            { label:'متوسط قيمة الطلب', value: formatCurrency(c.avgOrder),   color:'var(--text)' },
          ].map(s => (
            <div key={s.label} style={{ padding:'12px 14px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        {/* Info */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px', fontSize:12, color:'var(--text-sec)' }}>
          {c.city  && <span> {c.city}</span>}
          {c.phone && <span style={{direction:'ltr'}}> {c.phone}</span>}
          <span> أول طلب: {formatDate(c.firstOrderDate)}</span>
          <span> آخر طلب: {formatDate(c.lastOrderDate)}</span>
        </div>
        {/* Order history */}
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text-sec)', marginBottom:8 }}>سجل الطلبات</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflowY:'auto' }}>
            {sorted.map(o => (
              <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-md)', border:'none' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', fontWeight:600, flexShrink:0 }}>{o.order_number}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{formatDate(o.created_at)}</span>
                {o.items?.length > 0 && <span style={{ fontSize:11, color:'var(--text-sec)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.items.map(i=>`${i.name}×${i.qty}`).join('، ')}</span>}
                <span style={{ fontWeight:800, color:'var(--teal)', fontSize:13, flexShrink:0 }}>{formatCurrency(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   WHATSAPP BROADCAST MODAL
   Filter customers, compose message, open each
══════════════════════════════════════════════ */
function WhatsAppBroadcast({ open, onClose, customers }) {
  const [segFilter, setSegFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [message, setMessage] = useState('مرحباً {الاسم}،\n\nلدينا عروض حصرية لعملائنا المميزين \nتواصلوا معنا للاستفادة من العروض.\n\nموج للهدايا الكريستالية ')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)

  const cities = ['all', ...Array.from(new Set(customers.map(c=>c.city).filter(Boolean)))]
  const segments = ['all', 'VIP', 'مخلص', 'نشط', 'جديد', 'خامل']

  const targets = customers.filter(c => {
    const hasSeg  = segFilter  === 'all' || c.segment.label === segFilter
    const hasCity = cityFilter === 'all' || c.city === cityFilter
    const hasPhone = !!c.phone
    return hasSeg && hasCity && hasPhone
  })

  function buildMessage(customer) {
    return message
      .replace(/{الاسم}/g, customer.name || 'عزيزي العميل')
      .replace(/{الهاتف}/g, customer.phone || '')
      .replace(/{المدينة}/g, customer.city || '')
  }

  function sendToAll() {
    if (targets.length === 0) return
    setSending(true)
    setSentCount(0)
    let i = 0
    function sendNext() {
      if (i >= targets.length) { setSending(false); return }
      const c = targets[i]
      const phone = c.phone.replace(/\D/g,'')
      const text  = encodeURIComponent(buildMessage(c))
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
      setSentCount(++i)
      setTimeout(sendNext, 1500) // 1.5s between each to avoid spam block
    }
    sendNext()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="رسالة واتساب جماعية" maxWidth={520}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn onClick={sendToAll} loading={sending} disabled={targets.length===0}
          style={{ background:'#25d166', color:'#fff', border:'none', gap:6 }}>
          إرسال لـ {targets.length} عميل
        </Btn>
      </>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Filters */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>الشريحة</div>
            <select value={segFilter} onChange={e=>setSegFilter(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {segments.map(s => <option key={s} value={s}>{s==='all'?'الكل':s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>المدينة</div>
            <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {cities.map(c => <option key={c} value={c}>{c==='all'?'كل المدن':c}</option>)}
            </select>
          </div>
        </div>

        {/* Target count */}
        <div style={{ padding:'10px 14px', background:'rgba(37,209,102,0.06)', border:'1px solid rgba(37,209,102,0.2)', borderRadius:'var(--r-md)', fontSize:13 }}>
          <span style={{ fontWeight:800, color:'#25d166', fontSize:16 }}>{targets.length}</span>
          <span style={{ color:'var(--text-sec)' }}> عميل سيصلهم الرسالة</span>
          {targets.length === 0 && <span style={{ color:'var(--red)', marginInlineStart:8 }}>— لا يوجد عملاء بأرقام هاتف</span>}
        </div>

        {/* Message composer */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>
            نص الرسالة — يمكن استخدام: {'{الاسم}'} {'{المدينة}'}
          </div>
          <textarea
            value={message}
            onChange={e=>setMessage(e.target.value)}
            rows={6}
            style={{ width:'100%', padding:'10px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {/* Preview */}
        {targets.length > 0 && (
          <div style={{ padding:'10px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>معاينة (أول عميل):</div>
            <div style={{ fontSize:12, color:'var(--text-sec)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>
              {buildMessage(targets[0])}
            </div>
          </div>
        )}

        {sending && (
          <div style={{ padding:'10px 14px', background:'rgba(0,228,184,0.06)', border:'1px solid rgba(0,228,184,0.2)', borderRadius:'var(--r-md)', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--teal)', fontWeight:700 }}>جاري الإرسال... {sentCount}/{targets.length}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>سيتم فتح واتساب لكل عميل — يرجى عدم إغلاق النوافذ</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
