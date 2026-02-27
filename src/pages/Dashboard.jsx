import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { subscribeToOrders } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Card, Badge, Empty, SkeletonStats, SkeletonCard, PageHeader, DonutMini } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcArrowLeft, IcPlus, IcAlert } from '../components/Icons'
import Sparkline from '../components/Sparkline'

/* ══════════════════════════════════════════════════
   DASHBOARD v8.5 — Mawj Crystal Gifts
   No inventory · No target · Correct profit formula
══════════════════════════════════════════════════ */

export default function Dashboard({ onNavigate }) {
  const [data,         setData]         = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [sparkData,    setSparkData]    = useState({ revenue:[], orders:[], profit:[] })
  const [todayFull,    setTodayFull]    = useState([])

  useEffect(() => {
    loadData()
    const unsub = subscribeToOrders(() => loadData())
    return unsub
  }, [])

  async function loadData() {
    try {
      const [orders, expenses] = await Promise.all([
        DB.list('orders',   { orderBy: 'created_at' }),
        DB.list('expenses', { orderBy: 'date' }),
      ])

      const now        = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1)

      const monthOrders    = orders.filter(o => new Date(o.order_date||o.created_at) >= monthStart && o.status !== 'cancelled')
      const monthExpenses  = expenses.filter(e => new Date(e.date) >= monthStart)
      const todayOrders    = orders.filter(o => new Date(o.order_date||o.created_at) >= todayStart)
      const yestOrders     = orders.filter(o => { const d = new Date(o.order_date||o.created_at); return d >= yestStart && d < todayStart })

      // Revenue = only delivered (non-replacement) orders
      const revenue         = monthOrders.filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o) => s + (o.total || 0), 0)
      const grossProfit     = monthOrders.reduce((s, o) => s + (o.gross_profit || 0), 0)
      const opExpenses      = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0)
      const netProfit       = grossProfit - opExpenses

      // FIX: Filter today/yesterday revenue same as monthly (exclude replacements + not_delivered)
      const todayRev  = todayOrders.filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o) => s + (o.total || 0), 0)
      const yestRev   = yestOrders.filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o)  => s + (o.total || 0), 0)
      const revChange = yestRev > 0 ? ((todayRev - yestRev) / yestRev * 100).toFixed(0) : null

      // Pending COD — delivered but not yet remitted by Hayyak
      const pendingOrders  = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
      const pendingCOD     = pendingOrders.reduce((s, o) => s + (o.total || 0), 0)
      const pendingHayyak  = pendingOrders.reduce((s, o) => s + (o.hayyak_fee || 25), 0)
      const pendingNet     = pendingCOD - pendingHayyak

      // Order status counts
      const delivered    = monthOrders.filter(o => o.status === 'delivered').length
      const notDelivered = monthOrders.filter(o => o.status === 'not_delivered').length
      const inProgress   = monthOrders.filter(o => ['new','ready','with_hayyak'].includes(o.status)).length
      const deliveryRate = monthOrders.length ? Math.round((delivered / monthOrders.length) * 100) : 0

      setData({
        revenue, grossProfit, netProfit, opExpenses,
        totalOrders:  monthOrders.length,
        delivered, notDelivered, inProgress, deliveryRate,
        todayOrders:  todayOrders.length,
        todayRevenue: todayRev,
        revChange,
        pendingCOD, pendingNet, pendingCount: pendingOrders.length,
      })

      // 14-day sparklines
      const revByDay = [], ordByDay = [], profByDay = []
      for (let i = 13; i >= 0; i--) {
        const d  = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toDateString()
        const dayOrds = orders.filter(o => new Date(o.order_date||o.created_at).toDateString() === ds && o.status !== 'cancelled')
        revByDay.push( dayOrds.reduce((s, o) => s + (o.total         || 0), 0))
        ordByDay.push( dayOrds.length)
        profByDay.push(dayOrds.reduce((s, o) => s + (o.gross_profit  || 0), 0))
      }
      setSparkData({ revenue: revByDay, orders: ordByDay, profit: profByDay })
      // Today's orders
      const todayFull = orders.filter(o => new Date(o.order_date||o.created_at) >= todayStart)
        .sort((a,b) => new Date(b.order_date||b.created_at) - new Date(a.order_date||a.created_at))
      setTodayFull(todayFull)
      setRecentOrders(orders.slice(-8).reverse())

    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="page">
      <PageHeader title="لوحة التحكم" subtitle="جاري تحميل البيانات..." />
      <SkeletonStats count={4} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16, marginTop:16 }}>
        <SkeletonCard rows={4}/><SkeletonCard rows={4}/><SkeletonCard rows={3}/>
      </div>
    </div>
  )

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, margin:0, color:'var(--text)' }}>لوحة التحكم</h1>
          <p style={{ color:'var(--text-muted)', marginTop:4, fontSize:13 }}>
            {new Date().toLocaleDateString('ar-AE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
      </div>
      <div className="page-wave-accent"/>

      {/* Quick actions */}
      <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {[
          { icon:<IcPlus    size={16}/>, label:'طلب جديد',   color:'var(--action)',  action: () => onNavigate('orders')   },
          { icon:<IcExpenses size={16}/>, label:'مصروف جديد', color:'#f59e0b',       action: () => onNavigate('expenses') },
          { icon:<IcOrders  size={16}/>, label:'حياك',        color:'var(--info-light)', action: () => onNavigate('hayyak') },
          { icon:<IcTrendUp size={16}/>, label:'المحاسبة',    color:'#10b981',       action: () => onNavigate('accounting') },
        ].map(a => (
          <button key={a.label} onClick={a.action} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            padding:'12px 16px', background:'var(--bg-surface)',
            boxShadow:'var(--card-shadow)', borderRadius:'var(--r-md)',
            cursor:'pointer', fontFamily:'inherit', flexShrink:0, minWidth:72, border:'none',
            color: a.color, transition:'box-shadow 120ms ease, transform 120ms ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='var(--card-shadow-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='var(--card-shadow)' }}
          >
            {a.icon}
            <span style={{ fontSize:10, fontWeight:700, whiteSpace:'nowrap', color:'var(--text-muted)' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Today hero strip */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px', marginBottom:20,
        background:'var(--bg-surface)', boxShadow:'var(--card-shadow)',
        borderRadius:'var(--r-lg)', flexWrap:'wrap', gap:12,
      }}>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>إيرادات اليوم</div>
          <div style={{ fontSize:28, fontWeight:900, color:'var(--action)', fontFamily:'Inter,sans-serif', lineHeight:1 }}>
            {formatCurrency(data?.todayRevenue || 0)}
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{data?.todayOrders || 0} طلب</div>
        </div>
        {data?.revChange !== null && data?.revChange !== undefined && (
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'8px 14px', borderRadius:'var(--r-pill)',
            background: data.revChange >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
            color: data.revChange >= 0 ? '#10b981' : 'var(--danger)',
          }}>
            <span style={{ fontSize:13, fontWeight:800 }}>
              {data.revChange >= 0 ? '↑' : '↓'} {Math.abs(data.revChange)}%
            </span>
            <span style={{ fontSize:11, opacity:0.8 }}>مقارنة بالأمس</span>
          </div>
        )}
      </div>

      {/* Pending COD alert */}
      {data?.pendingCOD > 0 && (
        <div
          onClick={() => onNavigate('hayyak')}
          style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            marginBottom:20, cursor:'pointer',
            background:'rgba(245,158,11,0.08)',
            border:'1.5px solid rgba(245,158,11,0.3)',
            borderRadius:'var(--r-md)',
            transition:'background 120ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(245,158,11,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(245,158,11,0.08)'}
        >
          <IcAlert size={20} style={{ color:'#f59e0b', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#f59e0b' }}>
              {formatCurrency(data.pendingCOD)} COD معلق
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {data.pendingCount} طلب مسلّم لم يُحوَّل بعد من حياك • صافي المتوقع: {formatCurrency(data.pendingNet)}
            </div>
          </div>
          <IcArrowLeft size={16} style={{ color:'#f59e0b', flexShrink:0 }}/>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        <StatCardWithSpark
          label="طلبات الشهر"    value={data?.totalOrders || 0}
          icon={<IcOrders size={18}/>}  color="var(--action)"
          spark={sparkData.orders}      sparkColor="#00e4b8"
        />
        <StatCardWithSpark
          label="إيرادات الشهر"  value={formatCurrency(data?.revenue || 0)}
          icon={<IcTrendUp size={18}/>} color="var(--info-light)"
          spark={sparkData.revenue}     sparkColor="#a78bfa"
        />
        <StatCardWithSpark
          label="ربح إجمالي"    value={formatCurrency(data?.grossProfit || 0)}
          icon={<IcTrendUp size={18}/>} color="#10b981"
          spark={sparkData.profit}      sparkColor="#10b981"
        />
        <StatCardPlain
          label="طلبات معلقة"   value={data?.inProgress || 0}
          icon={<IcPackage size={18}/>} color="#f59e0b"
        />
      </div>

      {/* Delivery rate + Not delivered row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
        {/* Delivery rate donut */}
        <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-lg)', padding:'16px', boxShadow:'var(--card-shadow)', display:'flex', alignItems:'center', gap:14 }}>
          <DonutMini value={data?.deliveryRate || 0} max={100} color="#00e4b8" size={52} strokeWidth={5}/>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>معدل التسليم</div>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--action)', marginTop:2 }}>{data?.deliveryRate || 0}%</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{data?.delivered || 0} مسلّم من {data?.totalOrders || 0}</div>
          </div>
        </div>

        {/* Not delivered */}
        <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-lg)', padding:'16px', boxShadow:'var(--card-shadow)', display:'flex', alignItems:'center', gap:14, borderRight:'3px solid var(--danger)' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>لم يتم التسليم</div>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--danger)', marginTop:2 }}>{data?.notDelivered || 0}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>طلب مرتجع هذا الشهر</div>
          </div>
        </div>

        {/* Net profit */}
        <div style={{
          background: (data?.netProfit || 0) >= 0 ? 'rgba(0,228,184,0.06)' : 'rgba(239,68,68,0.06)',
          border:`1.5px solid ${(data?.netProfit || 0) >= 0 ? 'rgba(0,228,184,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius:'var(--r-lg)', padding:'16px', display:'flex', alignItems:'center', gap:14,
        }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>صافي الربح</div>
            <div style={{ fontSize:22, fontWeight:900, color:(data?.netProfit||0) >= 0 ? 'var(--action)' : 'var(--danger)', marginTop:2, fontFamily:'Inter,sans-serif' }}>
              {formatCurrency(data?.netProfit || 0)}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>بعد خصم المصاريف</div>
          </div>
        </div>
      </div>

      {/* Today's orders */}
      <TodaySection orders={todayFull} onNavigate={onNavigate}/>

      {/* In-progress orders */}
      <InProgressSection orders={recentOrders} onNavigate={onNavigate}/>
    </div>
  )
}

/* ── Today's orders section ── */
const STATUS_COLORS = {
  new:'#7c3aed', ready:'#f59e0b', with_hayyak:'#3b82f6',
  delivered:'#10b981', not_delivered:'#ef4444', cancelled:'#6b7280',
}
const STATUS_LABELS = {
  new:'جديد', ready:'جاهز', with_hayyak:'مع حياك',
  delivered:'مسلّم', not_delivered:'لم يتم', cancelled:'ملغي',
}

function OrderRow({ order }) {
  const color = STATUS_COLORS[order.status] || '#6b7280'
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 14px', background:'var(--bg-hover)',
      borderRadius:'var(--r-md)', gap:12, flexWrap:'wrap',
      borderRight:`3px solid ${color}`,
    }}>
      <div style={{ flex:1, minWidth:100 }}>
        <div style={{ fontWeight:700, fontSize:13 }}>{order.customer_name || 'عميل'}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', direction:'ltr', display:'flex', gap:8 }}>
          <span>{order.order_number}</span>
          {order.customer_city && <span>• {order.customer_city}</span>}
        </div>
      </div>
      <span style={{ padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700, background:`${color}18`, color, flexShrink:0 }}>
        {STATUS_LABELS[order.status] || order.status}
      </span>
      <div style={{ fontWeight:800, color:'var(--action)', fontSize:13, minWidth:68, textAlign:'left', fontFamily:'Inter,sans-serif', flexShrink:0 }}>
        {formatCurrency(order.total || 0)}
      </div>
    </div>
  )
}

function TodaySection({ orders, onNavigate }) {
  const [expanded, setExpanded] = useState(true)
  const delivered = orders.filter(o => o.status === 'delivered').length
  const todayRev  = orders.reduce((s,o) => s+(o.total||0), 0)

  return (
    <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-lg)', marginBottom:14, boxShadow:'var(--card-shadow)', overflow:'hidden' }}>
      {/* Header — always visible, tap to expand/collapse */}
      <div
        onClick={() => setExpanded(p=>!p)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', cursor:'pointer' }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontWeight:800, fontSize:15 }}>📋 طلبات اليوم</span>
          {orders.length > 0 && (
            <span style={{ padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:800, background:'rgba(0,228,184,0.12)', color:'var(--action)' }}>
              {orders.length}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {orders.length > 0 && (
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              {delivered > 0 && `${delivered} مسلّم · `}{formatCurrency(todayRev)}
            </span>
          )}
          <span style={{ color:'var(--text-muted)', fontSize:14 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:'0 14px 14px' }}>
          {orders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-muted)', fontSize:13 }}>
              لا يوجد طلبات اليوم بعد
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {orders.map(o => <OrderRow key={o.id} order={o}/>)}
            </div>
          )}
          <button onClick={() => onNavigate('orders')} style={{
            marginTop:10, width:'100%', padding:'9px', background:'none',
            border:'1.5px dashed var(--border)', borderRadius:'var(--r-md)',
            color:'var(--text-muted)', fontSize:12, cursor:'pointer',
            fontFamily:'inherit', fontWeight:600,
          }}>
            + طلب جديد
          </button>
        </div>
      )}
    </div>
  )
}

function InProgressSection({ orders, onNavigate }) {
  const inProgress = orders.filter(o => ['new','ready','with_hayyak'].includes(o.status))
  const [expanded, setExpanded] = useState(true)
  if (inProgress.length === 0) return null
  return (
    <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-lg)', marginBottom:14, boxShadow:'var(--card-shadow)', overflow:'hidden' }}>
      <div onClick={() => setExpanded(p=>!p)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontWeight:800, fontSize:15 }}>⏳ قيد المعالجة</span>
          <span style={{ padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:800, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>
            {inProgress.length}
          </span>
        </div>
        <span style={{ color:'var(--text-muted)', fontSize:14 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding:'0 14px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          {inProgress.map(o => <OrderRow key={o.id} order={o}/>)}
          <button onClick={() => onNavigate('orders')} style={{
            marginTop:4, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4,
            background:'none', border:'none', color:'var(--action)',
            cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600, padding:'6px 0',
          }}>
            عرض كل الطلبات <IcArrowLeft size={13}/>
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Stat card with sparkline ── */
function StatCardWithSpark({ label, value, color, icon, spark = [], sparkColor }) {
  const hasSpark = spark.length > 1
  return (
    <div className="hover-lift" style={{
      background:'var(--bg-surface)', border:'none',
      borderRadius:'var(--r-lg)',
      padding: hasSpark ? '18px 20px 56px' : '18px 20px',
      position:'relative', overflow:'hidden',
      boxShadow:'var(--card-shadow)', minHeight: hasSpark ? 110 : 'auto',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.65, pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:-24, right:-24, width:80, height:80, borderRadius:'50%', background:color, opacity:0.08, filter:'blur(22px)', pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</div>
        {icon && <div style={{ color, opacity:0.8 }}>{icon}</div>}
      </div>
      <div style={{ fontSize:22, fontWeight:900, color, letterSpacing:'-0.03em', lineHeight:1.1, position:'relative', zIndex:1 }}>{value}</div>
      {hasSpark && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, opacity:0.7, pointerEvents:'none' }}>
          <Sparkline data={spark} color={sparkColor || color} width={200} height={48}/>
        </div>
      )}
    </div>
  )
}

/* ── Plain stat card ── */
function StatCardPlain({ label, value, color, icon }) {
  return (
    <div style={{
      background:'var(--bg-surface)', borderRadius:'var(--r-lg)',
      padding:'18px 20px', boxShadow:'var(--card-shadow)', position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.65 }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</div>
        {icon && <div style={{ color, opacity:0.8 }}>{icon}</div>}
      </div>
      <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1.1 }}>{value}</div>
    </div>
  )
}
