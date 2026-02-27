import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { subscribeToOrders } from '../data/db'
import { formatCurrency } from '../data/constants'
import { PageHeader, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcArrowLeft, IcPlus, IcAlert, IcTruck } from '../components/Icons'
import Sparkline from '../components/Sparkline'

/* ══════════════════════════════════════════════════
   DASHBOARD v11 — "THE CRYSTAL PULSE"
   Glass hero · Ring charts · Activity stream
   Every panel = frosted glass · Gold-teal accents
══════════════════════════════════════════════════ */

const STATUS_COLORS = {
  new:'#6366f1', ready:'#f59e0b', with_hayyak:'#3b82f6',
  delivered:'#10b981', not_delivered:'#ef4444', cancelled:'#6b7280',
  returned:'#6b7280',
}
const STATUS_LABELS = {
  new:'جديد', ready:'جاهز', with_hayyak:'مع حياك',
  delivered:'مسلّم', not_delivered:'لم يتم', cancelled:'ملغي',
  returned:'مرتجع',
}

export default function Dashboard({ onNavigate }) {
  const [data,      setData]      = useState(null)
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sparkData, setSparkData] = useState({ revenue:[], orders:[], profit:[] })

  useEffect(() => {
    loadData()
    const unsub = subscribeToOrders(() => loadData())
    return unsub
  }, [])

  async function loadData() {
    try {
      const [allOrders, expenses] = await Promise.all([
        DB.list('orders',   { orderBy: 'created_at' }),
        DB.list('expenses', { orderBy: 'date' }),
      ])

      const now        = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1)

      const monthOrders    = allOrders.filter(o => new Date(o.order_date||o.created_at) >= monthStart && o.status !== 'cancelled')
      const prevOrders     = allOrders.filter(o => { const d = new Date(o.order_date||o.created_at); return d >= prevStart && d < monthStart && o.status !== 'cancelled' })
      const monthExpenses  = expenses.filter(e => new Date(e.date) >= monthStart)
      const todayOrders    = allOrders.filter(o => new Date(o.order_date||o.created_at) >= todayStart)
      const yestOrders     = allOrders.filter(o => { const d = new Date(o.order_date||o.created_at); return d >= yestStart && d < todayStart })

      const revFilter      = o => !o.is_replacement && o.status !== 'not_delivered'
      const revenue        = monthOrders.filter(revFilter).reduce((s, o) => s + (o.total || 0), 0)
      const prevRevenue    = prevOrders.filter(revFilter).reduce((s, o) => s + (o.total || 0), 0)
      const grossProfit    = monthOrders.reduce((s, o) => s + (o.gross_profit || 0), 0)
      const opExpenses     = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0)
      const netProfit      = grossProfit - opExpenses

      const todayRev  = todayOrders.filter(revFilter).reduce((s, o) => s + (o.total || 0), 0)
      const yestRev   = yestOrders.filter(revFilter).reduce((s, o) => s + (o.total || 0), 0)
      const revChange = yestRev > 0 ? Math.round((todayRev - yestRev) / yestRev * 100) : null

      const pendingOrders = allOrders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
      const pendingCOD    = pendingOrders.reduce((s, o) => s + (o.total || 0), 0)
      const pendingHayyak = pendingOrders.reduce((s, o) => s + (o.hayyak_fee || 0), 0)

      const delivered    = monthOrders.filter(o => o.status === 'delivered').length
      const notDelivered = monthOrders.filter(o => o.status === 'not_delivered').length
      const inProgress   = monthOrders.filter(o => ['new','ready','with_hayyak'].includes(o.status)).length
      const deliveryRate = monthOrders.length ? Math.round((delivered / monthOrders.length) * 100) : 0
      const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0
      const revenueProgress = prevRevenue > 0 ? Math.min(200, Math.round((revenue / prevRevenue) * 100)) : 100

      setData({
        revenue, prevRevenue, grossProfit, netProfit, opExpenses,
        totalOrders: monthOrders.length,
        delivered, notDelivered, inProgress, deliveryRate,
        todayOrders: todayOrders.length,
        todayRevenue: todayRev,
        revChange,
        pendingCOD, pendingNet: pendingCOD - pendingHayyak, pendingCount: pendingOrders.length,
        profitMargin, revenueProgress,
      })

      setOrders(allOrders)

      const revByDay = [], ordByDay = [], profByDay = []
      for (let i = 13; i >= 0; i--) {
        const d  = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toDateString()
        const dayOrds = allOrders.filter(o => new Date(o.order_date||o.created_at).toDateString() === ds && o.status !== 'cancelled')
        revByDay.push(dayOrds.reduce((s, o) => s + (o.total || 0), 0))
        ordByDay.push(dayOrds.length)
        profByDay.push(dayOrds.reduce((s, o) => s + (o.gross_profit || 0), 0))
      }
      setSparkData({ revenue: revByDay, orders: ordByDay, profit: profByDay })

    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const stream = useMemo(() => {
    if (!orders.length) return []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return orders
      .filter(o => new Date(o.order_date||o.created_at) >= todayStart)
      .sort((a, b) => new Date(b.order_date||b.created_at) - new Date(a.order_date||a.created_at))
  }, [orders])

  const inProgressOrders = useMemo(() => {
    return orders
      .filter(o => ['new','ready','with_hayyak'].includes(o.status))
      .sort((a, b) => new Date(b.order_date||b.created_at) - new Date(a.order_date||a.created_at))
      .slice(0, 10)
  }, [orders])

  if (loading) return (
    <div className="page">
      <PageHeader title="لوحة التحكم" subtitle="جاري تحميل البيانات..." />
      <SkeletonStats count={3} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16, marginTop:16 }}>
        <SkeletonCard rows={4}/><SkeletonCard rows={4}/>
      </div>
    </div>
  )

  return (
    <div className="page">
      {/* ── Header ── */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:900, margin:0, color:'var(--text)' }}>لوحة التحكم</h1>
        <p style={{ color:'var(--text-muted)', marginTop:4, fontSize:13 }}>
          {new Date().toLocaleDateString('ar-AE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
        {/* Accent line */}
        <div style={{
          height:1.5, marginTop:16,
          background:'linear-gradient(90deg, transparent, var(--action), var(--gold-500), transparent)',
          opacity:0.3, borderRadius:999,
        }}/>
      </div>

      {/* ════════════════════════════════════════════
         1. THE WAVE — Today's revenue hero (glass)
      ════════════════════════════════════════════ */}
      <div
        onClick={() => onNavigate('orders')}
        style={{
          position:'relative', overflow:'hidden', cursor:'pointer',
          background:'var(--bg-surface)',
          backdropFilter:'var(--glass-blur)',
          WebkitBackdropFilter:'var(--glass-blur)',
          border:'1px solid var(--border)',
          borderRadius:'var(--r-xl)',
          padding:'28px 24px 22px',
          marginBottom:20,
          transition:'border-color 200ms ease, box-shadow 200ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor='rgba(0,228,184,0.20)'
          e.currentTarget.style.boxShadow='0 8px 40px rgba(0,228,184,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor='var(--border)'
          e.currentTarget.style.boxShadow='none'
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:2,
          background:'linear-gradient(90deg, var(--action), var(--gold-500), var(--action))',
          opacity:0.5,
        }}/>

        {/* Ambient glow */}
        <div style={{
          position:'absolute', top:-60, right:-40,
          width:200, height:200, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,228,184,0.15), transparent 65%)',
          filter:'blur(60px)', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', bottom:-40, left:-20,
          width:160, height:160, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(201,169,110,0.10), transparent 65%)',
          filter:'blur(50px)', pointerEvents:'none',
        }}/>

        {/* Wave SVG background */}
        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          style={{
            position:'absolute', bottom:0, left:0, right:0, height:'45%',
            opacity:0.10, pointerEvents:'none',
          }}
        >
          <path
            d="M0 60 C50 30,100 70,150 45 C200 20,250 65,300 40 C350 15,380 55,400 35 L400 80 L0 80Z"
            fill="url(#waveGrad)"
          />
          <path
            d="M0 70 C60 45,120 75,180 55 C240 35,300 70,360 50 C380 42,400 60,400 55 L400 80 L0 80Z"
            fill="url(#waveGrad)" opacity="0.5"
          />
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00e4b8"/>
              <stop offset="50%" stopColor="#c9a96e"/>
              <stop offset="100%" stopColor="#6366f1"/>
            </linearGradient>
          </defs>
        </svg>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
            إيرادات اليوم
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16, flexWrap:'wrap' }}>
            <div style={{
              fontSize:38, fontWeight:900, color:'var(--action)',
              fontFamily:'Inter,sans-serif', lineHeight:1, letterSpacing:'-0.03em',
            }}>
              {formatCurrency(data?.todayRevenue || 0)}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:6 }}>
              <span style={{
                padding:'4px 12px', borderRadius:999,
                fontSize:12, fontWeight:800,
                background: (data?.revChange ?? 0) >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                color: (data?.revChange ?? 0) >= 0 ? '#10b981' : 'var(--danger)',
                border: `1px solid ${(data?.revChange ?? 0) >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}`,
              }}>
                {data?.revChange !== null ? `${(data?.revChange ?? 0) >= 0 ? '↑' : '↓'} ${Math.abs(data?.revChange || 0)}%` : '—'}
              </span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                {data?.todayOrders || 0} طلب
              </span>
            </div>
          </div>
        </div>

        {sparkData.revenue.length > 1 && (
          <div style={{ position:'relative', zIndex:1, marginTop:18, opacity:0.7 }}>
            <Sparkline data={sparkData.revenue} color="#00e4b8" width={340} height={40}/>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
         2. THE RINGS — Revenue · Delivery · Profit
      ════════════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:20 }}
        className="stats-grid-4"
      >
        <RingCard
          label="إيرادات الشهر"
          value={formatCurrency(data?.revenue || 0)}
          pct={Math.min(100, data?.revenueProgress || 0)}
          color="#00e4b8"
          sub={data?.prevRevenue > 0 ? `${data?.revenueProgress || 0}% مقارنة بالشهر السابق` : 'أول شهر'}
          sparkData={sparkData.revenue}
          sparkColor="#00e4b8"
        />
        <RingCard
          label="معدل التسليم"
          value={`${data?.deliveryRate || 0}%`}
          pct={data?.deliveryRate || 0}
          color="#6366f1"
          sub={`${data?.delivered || 0} مسلّم من ${data?.totalOrders || 0}`}
          sparkData={sparkData.orders}
          sparkColor="#6366f1"
        />
        <RingCard
          label="هامش الربح"
          value={`${data?.profitMargin || 0}%`}
          pct={Math.max(0, Math.min(100, data?.profitMargin || 0))}
          color={data?.profitMargin >= 0 ? '#10b981' : '#ef4444'}
          sub={formatCurrency(data?.netProfit || 0) + ' صافي'}
          sparkData={sparkData.profit}
          sparkColor="#10b981"
        />
      </div>

      {/* ── Quick stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:20 }}
        className="stats-grid-4"
      >
        <MiniStat label="طلبات الشهر" value={data?.totalOrders || 0} color="var(--action)" icon={<IcOrders size={16}/>} />
        <MiniStat label="قيد المعالجة" value={data?.inProgress || 0} color="#f59e0b" icon={<IcPackage size={16}/>} />
        <MiniStat label="لم يتم" value={data?.notDelivered || 0} color="var(--danger)" icon={<IcTruck size={16}/>} />
        <MiniStat label="المصاريف" value={formatCurrency(data?.opExpenses || 0)} color="#f59e0b" icon={<IcExpenses size={16}/>} />
      </div>

      {/* ── Pending COD alert ── */}
      {data?.pendingCOD > 0 && (
        <div
          onClick={() => onNavigate('hayyak')}
          style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            marginBottom:20, cursor:'pointer',
            background:'rgba(245,158,11,0.04)',
            backdropFilter:'var(--glass-blur-subtle)',
            WebkitBackdropFilter:'var(--glass-blur-subtle)',
            border:'1px solid rgba(245,158,11,0.12)',
            borderRadius:'var(--r-lg)',
            transition:'all 140ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background='rgba(245,158,11,0.08)'
            e.currentTarget.style.borderColor='rgba(245,158,11,0.20)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background='rgba(245,158,11,0.04)'
            e.currentTarget.style.borderColor='rgba(245,158,11,0.12)'
          }}
        >
          <IcAlert size={20} style={{ color:'#f59e0b', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#f59e0b' }}>
              {formatCurrency(data.pendingCOD)} COD معلق
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {data.pendingCount} طلب • صافي المتوقع: {formatCurrency(data.pendingNet)}
            </div>
          </div>
          <IcArrowLeft size={16} style={{ color:'#f59e0b', flexShrink:0 }}/>
        </div>
      )}

      {/* ════════════════════════════════════════════
         3. THE STREAM — Activity feed (glass panels)
      ════════════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
        <StreamCard
          title="طلبات اليوم"
          count={stream.length}
          icon={<IcOrders size={16}/>}
          color="var(--action)"
          onAction={() => onNavigate('orders')}
          actionLabel="+ طلب جديد"
        >
          {stream.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
              لا يوجد طلبات اليوم بعد
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {stream.map(o => <StreamOrderRow key={o.id} order={o}/>)}
            </div>
          )}
        </StreamCard>

        {inProgressOrders.length > 0 && (
          <StreamCard
            title="قيد المعالجة"
            count={inProgressOrders.length}
            icon={<IcPackage size={16}/>}
            color="#f59e0b"
            onAction={() => onNavigate('orders')}
            actionLabel="عرض الكل"
          >
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {inProgressOrders.map(o => <StreamOrderRow key={o.id} order={o}/>)}
            </div>
          </StreamCard>
        )}
      </div>

      {/* ── Quick shortcuts ── */}
      <div style={{
        display:'flex', gap:8, marginTop:20, overflowX:'auto',
        paddingBottom:4, scrollbarWidth:'none',
      }}>
        {[
          { icon:<IcPlus size={16}/>,     label:'طلب جديد',   color:'var(--action)',      action: () => onNavigate('orders') },
          { icon:<IcExpenses size={16}/>,  label:'مصروف جديد', color:'#f59e0b',           action: () => onNavigate('expenses') },
          { icon:<IcTruck size={16}/>,     label:'حياك',       color:'var(--info-light)',  action: () => onNavigate('hayyak') },
          { icon:<IcTrendUp size={16}/>,   label:'المحاسبة',   color:'#10b981',           action: () => onNavigate('accounting') },
        ].map(a => (
          <button key={a.label} onClick={a.action} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            padding:'14px 18px',
            background:'var(--bg-surface)',
            backdropFilter:'var(--glass-blur-subtle)',
            WebkitBackdropFilter:'var(--glass-blur-subtle)',
            border:'1px solid var(--border)',
            boxShadow:'var(--card-shadow)',
            borderRadius:'var(--r-md)',
            cursor:'pointer', fontFamily:'inherit', flexShrink:0, minWidth:76,
            color:a.color, transition:'all 140ms ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform='translateY(-2px)'
              e.currentTarget.style.borderColor='var(--border-strong)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform='translateY(0)'
              e.currentTarget.style.borderColor='var(--border)'
            }}
          >
            {a.icon}
            <span style={{ fontSize:10, fontWeight:700, whiteSpace:'nowrap', color:'var(--text-muted)' }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   RING CARD — Glass panel with arc chart
═══════════════════════════════════════════════════ */
function RingCard({ label, value, pct, color, sub, sparkData, sparkColor }) {
  const size = 64, sw = 4.5
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(100, pct) / 100

  return (
    <div style={{
      background:'var(--bg-surface)',
      backdropFilter:'var(--glass-blur)',
      WebkitBackdropFilter:'var(--glass-blur)',
      border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)',
      padding:'18px 16px',
      boxShadow:'var(--card-shadow)',
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.4 }}/>
      {/* Ambient glow */}
      <div style={{
        position:'absolute', top:-30, right:-30, width:80, height:80, borderRadius:'50%',
        background:color, opacity:0.04, filter:'blur(30px)', pointerEvents:'none',
      }}/>

      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={sw}/>
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ filter:`drop-shadow(0 0 4px ${color})`, transition:'stroke-dasharray 0.8s ease' }}
          />
          <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
            fill={color} fontSize={size*0.22} fontWeight="800" fontFamily="Inter,sans-serif"
          >
            {pct}%
          </text>
        </svg>

        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
          <div style={{ fontSize:18, fontWeight:900, color, lineHeight:1.1, fontFamily:'Inter,sans-serif' }}>{value}</div>
          {sub && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, lineHeight:1.3 }}>{sub}</div>}
        </div>
      </div>

      {sparkData?.length > 1 && (
        <div style={{ marginTop:10, opacity:0.5 }}>
          <Sparkline data={sparkData} color={sparkColor || color} width={160} height={24}/>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   MINI STAT — Compact glass card
═══════════════════════════════════════════════════ */
function MiniStat({ label, value, color, icon }) {
  return (
    <div style={{
      background:'var(--bg-surface)',
      backdropFilter:'var(--glass-blur-subtle)',
      WebkitBackdropFilter:'var(--glass-blur-subtle)',
      border:'1px solid var(--border)',
      borderRadius:'var(--r-md)',
      padding:'14px 16px', boxShadow:'var(--card-shadow)',
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.35 }}/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</div>
        {icon && <div style={{ color, opacity:0.6 }}>{icon}</div>}
      </div>
      <div style={{ fontSize:20, fontWeight:900, color, lineHeight:1.1, fontFamily:'Inter,sans-serif' }}>{value}</div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   STREAM CARD — Collapsible glass panel
═══════════════════════════════════════════════════ */
function StreamCard({ title, count, icon, color, children, onAction, actionLabel }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{
      background:'var(--bg-surface)',
      backdropFilter:'var(--glass-blur)',
      WebkitBackdropFilter:'var(--glass-blur)',
      border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)',
      boxShadow:'var(--card-shadow)',
      overflow:'hidden',
    }}>
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 18px', cursor:'pointer',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ color, display:'flex' }}>{icon}</div>
          <span style={{ fontWeight:800, fontSize:14 }}>{title}</span>
          {count > 0 && (
            <span style={{
              padding:'2px 9px', borderRadius:999,
              fontSize:11, fontWeight:800,
              background:`${color}12`, color,
              border:`1px solid ${color}10`,
            }}>
              {count}
            </span>
          )}
        </div>
        <span style={{
          color:'var(--text-muted)', fontSize:13,
          transition:'transform 200ms ease',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
        }}>▼</span>
      </div>

      {expanded && (
        <div style={{ padding:'0 14px 14px' }}>
          {children}
          {onAction && (
            <button onClick={e => { e.stopPropagation(); onAction() }} style={{
              marginTop:10, width:'100%', padding:'10px',
              background:'none', border:'1.5px dashed var(--border)',
              borderRadius:'var(--r-md)', color:'var(--text-muted)',
              fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600,
              transition:'all 140ms ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor='var(--action)'
                e.currentTarget.style.color='var(--action)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor='var(--border)'
                e.currentTarget.style.color='var(--text-muted)'
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   STREAM ORDER ROW — Glass row with status accent
═══════════════════════════════════════════════════ */
function StreamOrderRow({ order }) {
  const color = STATUS_COLORS[order.status] || '#6b7280'

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'10px 14px',
      background:'var(--bg-hover)',
      border:'1px solid var(--border)',
      borderRadius:'var(--r-md)',
      borderInlineStart:`3px solid ${color}`,
    }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0, boxShadow:`0 0 6px ${color}50` }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {order.customer_name || 'عميل'}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:6, flexWrap:'wrap' }}>
          <span style={{ direction:'ltr' }}>{order.order_number}</span>
          {order.customer_city && <span>• {order.customer_city}</span>}
        </div>
      </div>
      <span style={{
        padding:'3px 9px', borderRadius:999,
        fontSize:10, fontWeight:700,
        background:`${color}12`, color,
        border:`1px solid ${color}10`,
        flexShrink:0,
      }}>
        {STATUS_LABELS[order.status] || order.status}
      </span>
      <div style={{
        fontWeight:800, color:'var(--action)', fontSize:13,
        fontFamily:'Inter,sans-serif', flexShrink:0,
      }}>
        {formatCurrency(order.total || 0)}
      </div>
    </div>
  )
}
