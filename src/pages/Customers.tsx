// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Modal, Btn, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcSearch, IcWhatsapp, IcClose } from '../components/Icons'
import useDebounce from '../hooks/useDebounce'
import type { PageProps } from '../types'

/* ── Safe days-since helper (guards null/undefined dates) ── */
function daysSince(dateStr: any): number {
  if (!dateStr) return 9999
  const ms = new Date(dateStr).getTime()
  if (isNaN(ms)) return 9999
  return Math.floor((Date.now() - ms) / 86400000)
}

/* ── Segment config (preserved) ────────────────────────────── */
const SEGMENT_CONFIG = {
  VIP:  { color:'#F59E0B', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.30)',  label:'VIP',  emoji:'👑' },
  مخلص: { color:'#38BDF8', bg:'rgba(56,189,248,0.12)',  border:'rgba(56,189,248,0.30)',  label:'مخلص', emoji:'⭐' },
  نشط:  { color:'#5DD8A4', bg:'rgba(93,216,164,0.10)',  border:'rgba(93,216,164,0.25)',  label:'نشط',  emoji:'🟢' },
  جديد: { color:'#7EB8F7', bg:'rgba(126,184,247,0.10)', border:'rgba(126,184,247,0.25)', label:'جديد', emoji:'🆕' },
  خامل: { color:'#F87171', bg:'rgba(248,113,113,0.10)', border:'rgba(248,113,113,0.25)', label:'خامل', emoji:'💤' },
}

function getSegment(c) {
  const daysSinceLast = daysSince(c.lastOrderDate)
  if (c.totalSpent >= 2000 || c.orderCount >= 5) return { label:'VIP',  color:SEGMENT_CONFIG['VIP'].color,  tier:1 }
  if (c.orderCount >= 3 && daysSinceLast < 60)   return { label:'مخلص', color:SEGMENT_CONFIG['مخلص'].color, tier:2 }
  if (daysSinceLast > 90 && c.orderCount >= 2)   return { label:'خامل', color:SEGMENT_CONFIG['خامل'].color, tier:4 }
  if (c.orderCount === 1)                        return { label:'جديد', color:SEGMENT_CONFIG['جديد'].color,  tier:3 }
  return                                                { label:'نشط',  color:SEGMENT_CONFIG['نشط'].color,   tier:2 }
}

/* ── Phone normalization ───────────────────────────────────── */
function normalizePhone(raw) {
  if (!raw) return ''
  let p = raw.replace(/[\s\-\(\)\+]/g, '')
  if (p.startsWith('00971'))     p = p.slice(2)
  else if (p.startsWith('971'))  { /* already good */ }
  else if (p.startsWith('0'))    p = '971' + p.slice(1)
  else if (/^[5-9]/.test(p))    p = '971' + p
  return p
}
function waLink(phone, msg = '') {
  const p = normalizePhone(phone)
  if (!p) return '#'
  return msg ? `https://wa.me/${p}?text=${encodeURIComponent(msg)}` : `https://wa.me/${p}`
}

// When customer has no name, show their latest order number instead
function customerName(c) {
  if (c.name) return c.name
  const latestOrder = c.orders?.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  return latestOrder?.order_number || c.phone || '—'
}

/* ── Smart logic functions ─────────────────────────────────── */
function churnRisk(c) {
  const days = daysSince(c.lastOrderDate)
  if (c.orderCount < 2) {
    if (days > 90) return { score:80, label:'خطر مرتفع', color:'#F87171' }
    if (days > 45) return { score:50, label:'متوسط',     color:'#F59E0B' }
    return                { score:15, label:'جيد',        color:'#5DD8A4' }
  }
  const firstMs = c.firstOrderDate ? new Date(c.firstOrderDate).getTime() : Date.now()
  const lastMs  = c.lastOrderDate  ? new Date(c.lastOrderDate).getTime()  : Date.now()
  const avgGap  = Math.max(14, (lastMs - firstMs) / Math.max(1, c.orderCount - 1) / 86400000)
  const ratio   = days / avgGap
  if (ratio > 2)   return { score:Math.min(95, Math.round(ratio * 38)), label:'خطر مرتفع', color:'#F87171' }
  if (ratio > 1.2) return { score:Math.round(ratio * 30),               label:'متوسط',     color:'#F59E0B' }
  return                  { score:Math.max(5,  Math.round(ratio * 18)), label:'جيد',        color:'#5DD8A4' }
}

function loyaltyScore(c) {
  const days = daysSince(c.lastOrderDate)
  const r = Math.max(0, 33 - Math.round(days / 3))
  const f = Math.min(33, c.orderCount * 5)
  const m = Math.min(34, Math.round(c.totalSpent / 100))
  return Math.min(100, r + f + m)
}

function nextBestAction(c) {
  const days = daysSince(c.lastOrderDate)
  const risk = churnRisk(c)
  if (risk.score > 70)                                                   return { text:`لم يطلب منذ ${days} يوم — أرسل عرضاً`, color:'#F87171', icon:'🔥' }
  if (c.segment.label === 'VIP' && days > 30)                            return { text:'عميل VIP — تواصل شخصياً',                color:'#F59E0B', icon:'👑' }
  if (c.orderCount === 1 && days < 14)                                   return { text:'عميل جديد — رحب به بخصم',                color:'#38BDF8', icon:'🌟' }
  if (c.orderCount === 4)                                                return { text:'طلب واحد عن VIP — حفزه',                   color:'#A78BFA', icon:'💎' }
  if (c.totalSpent >= 1600 && c.segment.label !== 'VIP')                 return { text:`${Math.round(2000 - c.totalSpent)} د عن VIP`, color:'#F59E0B', icon:'⭐' }
  return null
}

const SORT_OPTIONS = [
  { value:'spent',   label:'الأكثر إنفاقاً' },
  { value:'orders',  label:'الأكثر طلبات'  },
  { value:'recent',  label:'الأحدث'         },
  { value:'loyalty', label:'الولاء'         },
  { value:'risk',    label:'خطر التسرب'     },
  { value:'name',    label:'الاسم'          },
]

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Customers(_: PageProps) {
  const [customers,     setCustomers]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const debouncedSearch = useDebounce(search)
  const [sortBy,        setSortBy]        = useState('spent')
  const [segFilter,     setSegFilter]     = useState('all')
  const [selected,      setSelected]      = useState(null)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [cityOpen,      setCityOpen]      = useState(false)

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
        map[key].totalSpent  += (o.total        || 0)
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
    } catch (err) { console.error(err); toast('خطأ في تحميل العملاء', 'error') }
    finally { setLoading(false) }
  }

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

  const top3 = useMemo(() =>
    [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3)
  , [customers])

  const cityData = useMemo(() => {
    const map = {}
    customers.forEach(c => { if (c.city) map[c.city] = (map[c.city] || 0) + c.totalSpent })
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 6).map(([city, rev]) => ({ city, rev }))
  }, [customers])

  const { atRiskCount, nearVipCount } = useMemo(() => ({
    atRiskCount:  customers.filter(c => churnRisk(c).score > 70).length,
    nearVipCount: customers.filter(c => c.segment.label !== 'VIP' && (c.totalSpent >= 1600 || c.orderCount === 4)).length,
  }), [customers])

  const filtered = useMemo(() => {
    const list = customers.filter(c => {
      const q = !debouncedSearch || c.name.includes(debouncedSearch) || c.phone?.includes(debouncedSearch) || c.city?.includes(debouncedSearch)
      const s = segFilter === 'all' || c.segment.label === segFilter
      return q && s
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'spent')   return b.totalSpent  - a.totalSpent
      if (sortBy === 'orders')  return b.orderCount  - a.orderCount
      if (sortBy === 'recent')  return new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
      if (sortBy === 'loyalty') return loyaltyScore(b) - loyaltyScore(a)
      if (sortBy === 'risk')    return churnRisk(b).score - churnRisk(a).score
      return a.name.localeCompare(b.name, 'ar')
    })
  }, [customers, debouncedSearch, segFilter, sortBy])

  const maxCityRev = cityData[0]?.rev || 1

  if (loading) return (
    <div className="page" style={{ paddingBottom:140 }}>
      <SkeletonStats count={4} />
      <SkeletonCard rows={4} />
      <div style={{ marginTop:16 }}><SkeletonCard rows={4} /></div>
      <div style={{ marginTop:16 }}><SkeletonCard rows={4} /></div>
    </div>
  )

  return (
    <div className="page cust-page">
      <style>{`
        /* ─ Page ─ */
        .cust-page { padding-bottom: 140px; }
        @media (min-width: 769px) { .cust-page { padding-bottom: 80px; } }

        /* ─ Animations ─ */
        @keyframes custSpin  { to { transform: rotate(360deg) } }
        @keyframes rowIn     { from { opacity:0; transform:translateY(7px) } to { opacity:1; transform:translateY(0) } }
        @keyframes statIn    { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes podiumIn  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes alertIn   { from { opacity:0; transform:translateX(10px) } to { opacity:1; transform:translateX(0) } }
        @keyframes barGrow   { from { width: 0 } }
        @keyframes pulseDot  { 0%,100%{ opacity:1; transform:scale(1) } 50%{ opacity:0.5; transform:scale(1.4) } }
        @keyframes fadeInBg  { from { opacity:0 } to { opacity:1 } }
        @keyframes drawerUp  { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes drawerSide { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes drawerSideRtl { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }

        /* ─ Top row ─ */
        .cust-toprow { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:10px; }

        /* ─ Stats ─ */
        .cust-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
        @media (min-width:769px) { .cust-stats { grid-template-columns:repeat(4,1fr); } }
        .cust-stat { padding:16px; border-radius:14px; background:var(--bg-surface); backdrop-filter:blur(40px); border:1px solid var(--border); position:relative; overflow:hidden; transition:transform 0.18s,box-shadow 0.18s; animation:statIn 0.35s ease both; }
        @media (min-width:769px) { .cust-stat:hover { transform:translateY(-3px); box-shadow:var(--card-shadow-hover); } }

        /* ─ Podium ─ */
        .cust-podium { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; padding-bottom:4px; align-items:flex-end; margin-bottom:16px; }
        @media (min-width:769px) { .cust-podium { overflow:visible; justify-content:center; gap:14px; } }
        .podium-card { min-width:128px; flex-shrink:0; background:var(--bg-surface); border-radius:14px; padding:14px 12px; text-align:center; cursor:pointer; transition:transform 0.18s, box-shadow 0.2s; border:1px solid var(--border); animation:podiumIn 0.4s ease both; }
        .podium-card:active { transform:scale(0.97) !important; }
        @media (min-width:769px) { .podium-card:hover { transform:translateY(-5px); } .podium-card.rank-1 { min-width:168px; padding:22px 16px; } }

        /* ─ City ─ */
        .city-wrap { background:var(--bg-surface); border-radius:14px; border:1px solid var(--border); overflow:hidden; margin-bottom:16px; }
        .city-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; cursor:pointer; transition:background 0.15s; }
        .city-header:hover { background:var(--bg-hover); }
        .city-bars { padding:0 16px 14px; display:flex; flex-direction:column; gap:10px; }
        .city-chevron { font-size:12px; color:var(--text-muted); transition:transform 0.2s; display:inline-block; }

        /* ─ Segment chips ─ */
        .cust-segs { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; padding-bottom:4px; margin-bottom:12px; }
        .seg-chip { padding:6px 14px; border-radius:99px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; flex-shrink:0; border:1.5px solid var(--border); background:var(--bg-hover); color:var(--text-muted); transition:all 0.15s; font-family:inherit; }
        .seg-chip.seg-act { border-color:var(--sc); background:color-mix(in srgb, var(--sc) 12%, transparent); color:var(--sc); box-shadow:0 0 12px color-mix(in srgb, var(--sc) 22%, transparent); }

        /* ─ Customer feed rows ─ */
        .cust-feed { display:flex; flex-direction:column; gap:10px; }
        .cust-row { display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--bg-surface); border-radius:14px; border:1px solid var(--border); cursor:pointer; transition:transform 0.15s,box-shadow 0.15s; backdrop-filter:blur(40px); overflow:hidden; position:relative; }
        .cust-row:active { transform:scale(0.99); }
        @media (min-width:769px) { .cust-row:hover { transform:translateY(-2px); box-shadow:var(--card-shadow-hover); } }
        .cust-sparkline { display:none; }
        @media (min-width:500px) { .cust-sparkline { display:block; } }

        /* ─ Detail drawer ─ */
        .cust-drawer-bg { position:fixed; inset:0; background:rgba(0,0,0,0.3); backdrop-filter:blur(3px); z-index:500; animation:fadeInBg 0.2s ease; }
        .cust-drawer {
          position:fixed; bottom:0; left:0; right:0;
          max-height:88vh;
          background:var(--modal-bg);
          backdrop-filter:blur(52px) saturate(1.9);
          -webkit-backdrop-filter:blur(52px) saturate(1.9);
          border-radius:20px 20px 0 0;
          border-top:1px solid var(--border);
          z-index:501;
          display:flex; flex-direction:column;
          animation:drawerUp 0.28s ease both;
        }
        @media (min-width:769px) {
          .cust-drawer {
            top:64px; bottom:0; left:auto; inset-inline-end:0;
            width:420px; max-width:100vw; max-height:none;
            border-radius:0; border-top:none;
            border-inline-start:1px solid var(--border);
            box-shadow:-8px 0 40px rgba(0,0,0,0.25);
            animation-name:drawerSide;
          }
          [dir="rtl"] .cust-drawer { animation-name:drawerSideRtl; }
        }
        .drawer-body { flex:1; overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
      `}</style>

      {/* ══ SMART ALERT BANNERS ══════════════════════════════════ */}
      {atRiskCount > 0 && (
        <div onClick={() => { setSegFilter('all'); setSortBy('risk') }}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, marginBottom:10, background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.22)', cursor:'pointer', animation:'alertIn 0.3s ease' }}>
          <span style={{ fontSize:16 }}>🔥</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#F87171', flex:1 }}>{atRiskCount} عميل في خطر التسرب — اضغط للعرض</span>
          <span style={{ fontSize:11, color:'#F87171', opacity:0.7 }}>عرض ←</span>
        </div>
      )}
      {nearVipCount > 0 && (
        <div onClick={() => { setSegFilter('all'); setSortBy('spent') }}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, marginBottom:10, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.22)', cursor:'pointer', animation:'alertIn 0.35s ease' }}>
          <span style={{ fontSize:16 }}>⭐</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#F59E0B', flex:1 }}>{nearVipCount} عميل قريب من VIP — حفزهم بخصم</span>
          <span style={{ fontSize:11, color:'#F59E0B', opacity:0.7 }}>عرض ←</span>
        </div>
      )}

      {/* ══ TOP ROW ══════════════════════════════════════════════ */}
      <div className="cust-toprow">
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:'var(--text)', marginBottom:2 }}>العملاء</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>
            <span style={{ color:'var(--action)', fontWeight:800 }}>{customers.length}</span> عميل ·{' '}
            <span style={{ color:'#F59E0B', fontWeight:800 }}>{vipCount}</span> VIP
          </div>
        </div>
        {customers.length > 0 && (
          <button onClick={() => setBroadcastOpen(true)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:12,
            background:'rgba(37,211,102,0.09)', border:'1px solid rgba(37,211,102,0.25)',
            color:'#25D366', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0,
          }}>
            <IcWhatsapp size={13}/> رسالة جماعية
          </button>
        )}
      </div>

      {/* ══ KPI STATS ════════════════════════════════════════════ */}
      <div className="cust-stats">
        {[
          { label:'إجمالي العملاء',   v:customers.length,             c:'#38BDF8', i:'👥', sub:`${vipCount} VIP` },
          { label:'إيرادات الكل',     v:formatCurrency(totalRevenue), c:'#318CE7', i:'💰', sub:'إجمالي الإنفاق' },
          { label:'متوسط LTV',        v:formatCurrency(avgLTV),       c:'#5DD8A4', i:'📊', sub:'قيمة العميل' },
          { label:'عملاء VIP',        v:vipCount,                     c:'#F59E0B', i:'👑', sub:'2000+ أو 5+ طلبات' },
        ].map((s, idx) => (
          <div key={s.label} className="cust-stat" style={{ borderTop:`2px solid ${s.c}`, animationDelay:`${idx * 0.07}s` }}>
            <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%, ${s.c}14, transparent 65%)`, pointerEvents:'none' }} />
            <div style={{ fontSize:20, marginBottom:8, lineHeight:1 }}>{s.i}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.04em', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.c, fontFamily:'Inter,sans-serif', lineHeight:1.1 }}>{s.v}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ══ PODIUM TOP 3 ═════════════════════════════════════════ */}
      {top3.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:10 }}>🏆 أعلى المنفقين</div>
          <div className="cust-podium">
            {/* Desktop: silver–gold–bronze order. Mobile: 1–2–3 scroll */}
            {[
              { rank:2, data:top3[1] },
              { rank:1, data:top3[0] },
              { rank:3, data:top3[2] },
            ].filter(p => p.data).map(({ rank, data }) => (
              <PodiumCard key={rank} rank={rank} customer={data} onClick={() => setSelected(data)} />
            ))}
          </div>
        </div>
      )}

      {/* ══ CITY INTELLIGENCE ════════════════════════════════════ */}
      {cityData.length > 0 && (
        <div className="city-wrap">
          <div className="city-header" onClick={() => setCityOpen(v => !v)}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>🗺️</span>
              <span style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>التوزيع الجغرافي</span>
              {cityData[0] && (
                <span style={{ fontSize:11, color:'#F59E0B', fontWeight:700, background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:99, border:'1px solid rgba(245,158,11,0.2)' }}>
                  👑 {cityData[0].city}
                </span>
              )}
            </div>
            <span className="city-chevron" style={{ transform: cityOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </div>
          {cityOpen && (
            <div className="city-bars">
              {cityData.map(({ city, rev }, i) => {
                const pct = Math.round((rev / maxCityRev) * 100)
                return (
                  <div key={city} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, color: i === 0 ? '#F59E0B' : 'var(--text-sec)', fontWeight: i === 0 ? 800 : 600, minWidth:52, textAlign:'end', flexShrink:0 }}>
                      {city}
                    </span>
                    <div style={{ flex:1, height:7, background:'var(--bg-hover)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:99,
                        width:`${pct}%`,
                        background: i === 0 ? 'linear-gradient(90deg,#F59E0B,#FCD34D)' : 'linear-gradient(90deg,#318CE7,#38BDF8)',
                        animation:`barGrow 0.9s ${i * 0.1}s ease both`,
                      }}/>
                    </div>
                    <span style={{ fontSize:11, fontFamily:'Inter,sans-serif', color:'var(--text-muted)', minWidth:52, textAlign:'start', flexShrink:0 }}>
                      {formatCurrency(rev)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ SEGMENT CHIPS ════════════════════════════════════════ */}
      <div className="cust-segs">
        {[
          { seg:'all', label:'الكل',                           color:'#318CE7' },
          ...Object.entries(SEGMENT_CONFIG).map(([k, v]) => ({ seg:k, label:`${v.emoji} ${v.label}`, color:v.color })),
        ].map(({ seg, label, color }) => {
          const count = seg === 'all' ? customers.length : (segCounts[seg] || 0)
          const act = segFilter === seg
          return (
            <button key={seg} className={`seg-chip${act ? ' seg-act' : ''}`}
              style={{ '--sc': color } as any}
              onClick={() => setSegFilter(seg)}>
              {label} <span style={{ fontFamily:'Inter,sans-serif', fontSize:11, opacity:0.8 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* ══ SEARCH + SORT ════════════════════════════════════════ */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <div style={{ position:'relative', flex:1 }}>
          <IcSearch size={14} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو المدينة..."
            style={{
              width:'100%', paddingTop:10, paddingBottom:10, paddingInlineStart:38, paddingInlineEnd: search ? 36 : 12,
              background:'var(--bg-surface)', border:'1.5px solid var(--input-border)',
              borderRadius:12, color:'var(--text)', fontSize:13, fontFamily:'inherit',
              outline:'none', boxSizing:'border-box', transition:'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor='var(--action)'}
            onBlur={e => e.target.style.borderColor='var(--input-border)'}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, padding:4, lineHeight:1 }}>✕</button>
          )}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          padding:'10px 12px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)',
          borderRadius:12, color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none', flexShrink:0,
        }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ══ CUSTOMER FEED ════════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'56px 24px', background:'var(--bg-surface)', borderRadius:20, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:44, marginBottom:12, opacity:0.35 }}>👤</div>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:6 }}>لا يوجد عملاء</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>جرب تغيير فلتر البحث أو الشريحة</div>
        </div>
      ) : (
        <div className="cust-feed">
          {filtered.map((c, i) => (
            <CustomerRow
              key={`${c.phone || c.name}-${i}`}
              customer={c}
              onClick={() => setSelected(c)}
              animDelay={Math.min(i * 0.04, 0.5)}
            />
          ))}
        </div>
      )}

      {/* ══ DETAIL DRAWER — portal ════════════════════════════════ */}
      {selected && createPortal(
        <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />,
        document.body
      )}

      {/* ══ BROADCAST ════════════════════════════════════════════ */}
      <WhatsAppBroadcast
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        customers={customers}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MINI SPARKLINE — polyline of last 6 orders
═══════════════════════════════════════════════════════════════ */
function MiniSparkline({ orders }) {
  const sorted = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const vals = sorted.slice(-6).map(o => o.total || 0)
  if (vals.length < 2) return null
  const max = Math.max(...vals, 1)
  const W = 46, H = 22
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - (v / max) * (H - 3) - 1}`)
  const lastX = pts[pts.length - 1].split(',')[0]
  const lastY = pts[pts.length - 1].split(',')[1]
  return (
    <svg width={W} height={H} className="cust-sparkline" style={{ flexShrink:0, opacity:0.72 }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#318CE7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lastX} cy={lastY} r="2.5" fill="#318CE7"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PODIUM CARD
═══════════════════════════════════════════════════════════════ */
function PodiumCard({ rank, customer: c, onClick }) {
  if (!c) return null
  const medals = {
    1: { emoji:'🥇', color:'#F59E0B', shadow:'rgba(245,158,11,0.22)', delay:'0.05s' },
    2: { emoji:'🥈', color:'#94A3B8', shadow:'rgba(148,163,184,0.18)', delay:'0s' },
    3: { emoji:'🥉', color:'#B45309', shadow:'rgba(180,83,9,0.15)', delay:'0.1s' },
  }
  const { emoji, color, shadow, delay } = medals[rank]
  const cfg = SEGMENT_CONFIG[c.segment?.label] || {}
  const initial = customerName(c)[0]
  return (
    <div
      className={`podium-card rank-${rank}`}
      onClick={onClick}
      style={{
        borderTop:`3px solid ${color}`,
        boxShadow:`0 0 22px ${shadow}, var(--card-shadow)`,
        animationDelay: delay,
      }}
    >
      <div style={{ fontSize: rank === 1 ? 26 : 20, marginBottom:6 }}>{emoji}</div>
      <div style={{
        width: rank === 1 ? 48 : 40, height: rank === 1 ? 48 : 40, borderRadius:'50%', margin:'0 auto 8px',
        background:`linear-gradient(135deg,${cfg.color || color}55,${cfg.color || color}22)`,
        border:`2px solid ${cfg.color || color}55`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: rank === 1 ? 20 : 16, fontWeight:800, color: cfg.color || color,
        boxShadow:`0 0 16px ${cfg.color || color}25`,
      }}>
        {initial}
      </div>
      <div style={{ fontSize: rank === 1 ? 13 : 12, fontWeight:800, color:'var(--text)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>
        {customerName(c)}
      </div>
      <div style={{ fontSize: rank === 1 ? 15 : 13, fontWeight:900, color, fontFamily:'Inter,sans-serif' }}>
        {formatCurrency(c.totalSpent)}
      </div>
      <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{c.orderCount} طلب</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER ROW — dense profile feed
═══════════════════════════════════════════════════════════════ */
function CustomerRow({ customer: c, onClick, animDelay }) {
  const seg = c.segment
  const cfg = SEGMENT_CONFIG[seg.label] || {}
  const risk = churnRisk(c)
  const nba  = nextBestAction(c)
  const initial = customerName(c)[0]
  const days = daysSince(c.lastOrderDate)

  return (
    <div
      className="cust-row"
      onClick={onClick}
      style={{
        borderInlineStart:`3px solid ${cfg.color || 'var(--border)'}`,
        animationDelay:`${animDelay}s`,
        animation:'rowIn 0.22s ease both',
      }}
    >
      {/* Ambient glow */}
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 100% 50%, ${cfg.color || '#318CE7'}07, transparent 55%)`, pointerEvents:'none' }}/>

      {/* Avatar */}
      <div style={{
        width:44, height:44, borderRadius:'50%', flexShrink:0,
        background:`linear-gradient(135deg,${cfg.color || '#318CE7'}50,${cfg.color || '#318CE7'}20)`,
        border:`2px solid ${cfg.color || 'var(--border)'}50`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, fontWeight:800, color: cfg.color || 'var(--action)',
        boxShadow:`0 0 14px ${cfg.color || '#318CE7'}20`,
      }}>
        {initial}
      </div>

      {/* Main info */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* Name + segment */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:800, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170 }}>
            {customerName(c)}
          </span>
          <span style={{
            fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, flexShrink:0,
            background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
          }}>
            {cfg.emoji} {seg.label}
          </span>
        </div>

        {/* City + last order */}
        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:5, flexWrap:'wrap', marginBottom: nba ? 5 : 0 }}>
          {c.city && <span>📍 {c.city}</span>}
          <span>· منذ {days} يوم</span>
        </div>

        {/* Next Best Action chip */}
        {nba && (
          <div style={{
            display:'inline-flex', alignItems:'center', gap:4,
            fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6,
            background:`color-mix(in srgb, ${nba.color} 10%, transparent)`,
            color:nba.color, border:`1px solid color-mix(in srgb, ${nba.color} 25%, transparent)`,
          }}>
            {nba.icon} {nba.text}
          </div>
        )}
      </div>

      {/* Right: sparkline + amount + churn */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
        <MiniSparkline orders={c.orders}/>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>
          {formatCurrency(c.totalSpent)}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{
            width:7, height:7, borderRadius:'50%', background:risk.color,
            animation: risk.score > 70 ? 'pulseDot 2s infinite' : 'none',
            flexShrink:0,
          }}/>
          <span style={{ fontSize:9, color:risk.color, fontWeight:700 }}>{risk.label}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER DRAWER — portal, bottom sheet mobile / right panel desktop
═══════════════════════════════════════════════════════════════ */
function CustomerDrawer({ customer: c, onClose }) {
  const seg = c.segment
  const cfg = SEGMENT_CONFIG[seg.label] || {}
  const sorted = [...c.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const daysSinceFirst = daysSince(c.firstOrderDate)
  const daysSinceLast  = daysSince(c.lastOrderDate)
  const loyalty = loyaltyScore(c)
  const risk    = churnRisk(c)
  const nba     = nextBestAction(c)
  const initial = customerName(c)[0]

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const STATUS_COLORS = {
    delivered:'#5DD8A4', cancelled:'#F87171', not_delivered:'#F87171',
    returned:'#F59E0B', shipped:'#38BDF8', processing:'#A78BFA',
    confirmed:'#318CE7', new:'var(--text-muted)', with_hayyak:'#38BDF8',
  }

  return (
    <>
      <div className="cust-drawer-bg" onClick={onClose}/>
      <div className="cust-drawer">
        {/* Drag handle (mobile) */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'var(--border)' }}/>
        </div>

        {/* Header */}
        <div style={{
          padding:'8px 18px 14px', borderBottom:'1px solid var(--border)',
          background:`color-mix(in srgb, ${cfg.color || '#318CE7'} 5%, transparent)`,
          display:'flex', alignItems:'center', gap:12, flexShrink:0,
        }}>
          <div style={{
            width:52, height:52, borderRadius:'50%', flexShrink:0,
            background:`linear-gradient(135deg,${cfg.color || '#318CE7'}50,${cfg.color || '#318CE7'}20)`,
            border:`2px solid ${cfg.color || 'var(--border)'}60`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, fontWeight:800, color: cfg.color || 'var(--action)',
            boxShadow:`0 0 20px ${cfg.color || '#318CE7'}30`,
          }}>
            {initial}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--text)', marginBottom:4 }}>{customerName(c)}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{
                fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:99,
                background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
              }}>{cfg.emoji} {seg.label}</span>
              {c.city && <span style={{ fontSize:11, color:'var(--text-muted)' }}>📍 {c.city}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-hover)', border:'none', borderRadius:8, padding:8, cursor:'pointer', color:'var(--text-muted)', display:'flex', flexShrink:0 }}>
            <IcClose size={16}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="drawer-body">

          {/* NBA action card */}
          {nba && (
            <div style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12,
              background:`color-mix(in srgb, ${nba.color} 8%, transparent)`,
              border:`1px solid color-mix(in srgb, ${nba.color} 25%, transparent)`,
              fontSize:12, fontWeight:700, color:nba.color,
            }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{nba.icon}</span>
              <span style={{ flex:1 }}>{nba.text}</span>
              {c.phone && (
                <a href={waLink(c.phone, `مرحبا ${c.name || ''}، `)} target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ padding:'4px 10px', borderRadius:99, background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.25)', color:'#25D366', fontSize:11, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                  <IcWhatsapp size={11}/> إرسال
                </a>
              )}
            </div>
          )}

          {/* Loyalty + Risk scores */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ padding:'12px 14px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:12 }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, marginBottom:6 }}>نقاط الولاء</div>
              <div style={{ fontSize:24, fontWeight:900, color:'#318CE7', fontFamily:'Inter,sans-serif', marginBottom:8 }}>{loyalty}</div>
              <div style={{ height:5, background:'var(--bg-surface)', borderRadius:99, overflow:'hidden' }}>
                <div style={{
                  width:`${loyalty}%`, height:'100%', borderRadius:99,
                  background:'linear-gradient(90deg,#318CE7,#5DD8A4)',
                  animation:'barGrow 0.9s ease both',
                }}/>
              </div>
            </div>
            <div style={{ padding:'12px 14px', background:'var(--bg-hover)', border:`1px solid color-mix(in srgb,${risk.color} 25%, transparent)`, borderRadius:12 }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, marginBottom:6 }}>خطر التسرب</div>
              <div style={{ fontSize:24, fontWeight:900, color:risk.color, fontFamily:'Inter,sans-serif', marginBottom:4 }}>{risk.score}%</div>
              <div style={{ fontSize:11, color:risk.color, fontWeight:700 }}>{risk.label}</div>
            </div>
          </div>

          {/* Financial stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { l:'إجمالي الإنفاق',    v:formatCurrency(c.totalSpent),  c:'var(--action)' },
              { l:'صافي الربح',        v:formatCurrency(c.totalProfit), c:c.totalProfit >= 0 ? '#5DD8A4' : '#F87171' },
              { l:'عدد الطلبات',       v:`${c.orderCount} طلب`,          c:'var(--info)' },
              { l:'متوسط قيمة الطلب', v:formatCurrency(c.avgOrder),    c:'var(--text)' },
            ].map(s => (
              <div key={s.l} style={{ padding:'10px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:12 }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, marginBottom:5 }}>{s.l}</div>
                <div style={{ fontSize:15, fontWeight:900, color:s.c, fontFamily:'Inter,sans-serif' }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Meta info */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', padding:'10px 14px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:12, fontSize:12, color:'var(--text-sec)' }}>
            <span>📅 عميل منذ {daysSinceFirst} يوم</span>
            <span>🕐 آخر طلب منذ {daysSinceLast} يوم</span>
            {c.phone && <span style={{ direction:'ltr', fontFamily:'Inter,sans-serif' }}>📱 +{normalizePhone(c.phone)}</span>}
          </div>

          {/* WhatsApp CTA */}
          {c.phone && (
            <a href={waLink(c.phone, `مرحبا ${c.name || 'عزيزي العميل'}، `)} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:12, background:'rgba(37,211,102,0.10)', border:'1px solid rgba(37,211,102,0.25)', color:'#25D366', fontSize:13, fontWeight:700, textDecoration:'none' }}>
              <IcWhatsapp size={16}/> تواصل عبر واتساب
            </a>
          )}

          {/* Order history — timeline style */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', marginBottom:12 }}>
              سجل الطلبات ({sorted.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {sorted.map((o, i) => {
                const stColor = STATUS_COLORS[o.status] || 'var(--text-muted)'
                return (
                  <div key={o.id} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    {/* Stem */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, paddingTop:5 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:stColor, border:`2px solid ${stColor}`, flexShrink:0 }}/>
                      {i < sorted.length - 1 && <div style={{ width:2, flex:1, minHeight:18, background:'var(--border)', margin:'4px 0' }}/>}
                    </div>
                    {/* Content */}
                    <div style={{ flex:1, paddingBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                        <span style={{ fontSize:11, color:'var(--action)', fontFamily:'monospace', fontWeight:700 }}>{o.order_number}</span>
                        <span style={{ fontSize:13, fontWeight:900, color:stColor, fontFamily:'Inter,sans-serif' }}>{formatCurrency(o.total)}</span>
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>{formatDate(o.created_at)}</div>
                      {o.items?.length > 0 && (
                        <div style={{ fontSize:11, color:'var(--text-sec)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {o.items.map(it => `${it.name}×${it.qty}`).join('، ')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   WHATSAPP BROADCAST (preserved logic, normalized phones)
═══════════════════════════════════════════════════════════════ */
function WhatsAppBroadcast({ open, onClose, customers }) {
  const [segFilter,  setSegFilter]  = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [message,    setMessage]    = useState('مرحباً {الاسم}،\n\nلدينا عروض حصرية لعملائنا المميزين 🎁\nتواصلوا معنا للاستفادة من العروض.\n\nموج للهدايا الكريستالية ✨')
  const [sending,    setSending]    = useState(false)
  const [sentCount,  setSentCount]  = useState(0)

  const cities   = ['all', ...Array.from(new Set(customers.map(c => c.city).filter(Boolean)))]
  const segments = ['all', 'VIP', 'مخلص', 'نشط', 'جديد', 'خامل']

  const targets = customers.filter(c => {
    const hasSeg  = segFilter  === 'all' || c.segment.label === segFilter
    const hasCity = cityFilter === 'all' || c.city === cityFilter
    return hasSeg && hasCity && !!c.phone
  })

  function buildMessage(customer) {
    return message
      .replace(/{الاسم}/g,   customer.name || 'عزيزي العميل')
      .replace(/{الهاتف}/g,  customer.phone || '')
      .replace(/{المدينة}/g, customer.city  || '')
  }

  function sendToAll() {
    if (targets.length === 0) return
    setSending(true); setSentCount(0)
    let i = 0
    function sendNext() {
      if (i >= targets.length) { setSending(false); return }
      const phone = normalizePhone(targets[i].phone)
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(targets[i]))}`, '_blank')
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
        <Btn onClick={sendToAll} loading={sending} disabled={targets.length === 0}
          style={{ background:'#25D366', color:'#fff', border:'none', gap:6 }}>
          <IcWhatsapp size={14}/> إرسال لـ {targets.length} عميل
        </Btn>
      </>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'الشريحة', val:segFilter, set:setSegFilter, opts:segments.map(s => ({ v:s, l: s === 'all' ? 'الكل' : s })) },
            { label:'المدينة', val:cityFilter, set:setCityFilter, opts:cities.map(c => ({ v:c, l: c === 'all' ? 'كل المدن' : c })) },
          ].map(field => (
            <div key={field.label}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>{field.label}</div>
              <select value={field.val} onChange={e => field.set(e.target.value)}
                style={{ width:'100%', padding:'9px 10px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
                {field.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 14px', background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:10, fontSize:13 }}>
          <span style={{ fontWeight:900, color:'#25D366', fontSize:18, fontFamily:'Inter,sans-serif' }}>{targets.length}</span>
          <span style={{ color:'var(--text-sec)' }}> عميل سيصلهم الرسالة</span>
          {targets.length === 0 && <span style={{ color:'var(--danger)', marginInlineStart:8 }}>— لا يوجد أرقام هاتف</span>}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>
            نص الرسالة — متاح: {'{الاسم}'} {'{المدينة}'}
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
            style={{ width:'100%', padding:'10px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}/>
        </div>
        {targets.length > 0 && (
          <div style={{ padding:'10px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:10 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>معاينة (أول عميل):</div>
            <div style={{ fontSize:12, color:'var(--text-sec)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>{buildMessage(targets[0])}</div>
          </div>
        )}
        {sending && (
          <div style={{ padding:'10px 14px', background:'rgba(49,140,231,0.06)', border:'1px solid rgba(49,140,231,0.2)', borderRadius:10, textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--action)', fontWeight:700 }}>جاري الإرسال... {sentCount}/{targets.length}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
