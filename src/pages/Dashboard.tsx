// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DB } from '../data/db'
import { subscribeOrders } from '../data/realtime'
import { formatCurrency } from '../data/constants'
import { PageHeader, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcArrowLeft, IcPlus, IcAlert, IcTruck } from '../components/Icons'
import Sparkline from '../components/Sparkline'
import type { PageProps } from '../types'

/* ══════════════════════════════════════════════════
   DASHBOARD v11 — "FROSTED DEPTH"
   Bento grid · Greeting card · Animated hero
   Floating dock · 3D tilt · Glowing borders
══════════════════════════════════════════════════ */

const STATUS_COLORS = {
  new:'var(--info)', ready:'var(--warning)', with_hayyak:'var(--info)',
  delivered:'var(--success)', not_delivered:'var(--danger)', cancelled:'var(--text-muted)',
  returned:'var(--text-muted)',
}
const STATUS_LABELS = {
  new:'جديد', ready:'جاهز', with_hayyak:'مع حياك',
  delivered:'مسلّم', not_delivered:'لم يتم', cancelled:'ملغي',
  returned:'مرتجع',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'مساء الخير'
  return 'مساء النور'
}

export default function Dashboard({ onNavigate }: PageProps) {
  const [data,      setData]      = useState(null)
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sparkData, setSparkData] = useState({ revenue:[], orders:[], profit:[] })

  useEffect(() => {
    loadData()
    const unsub = subscribeOrders(() => loadData())
    return unsub
  }, [])

  async function loadData() {
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const cutoffISO = cutoff.toISOString()

      const [allOrders, expenses] = await Promise.all([
        DB.list('orders',   { orderBy: 'created_at', filters: [['created_at', 'gte', cutoffISO]] }),
        DB.list('expenses', { orderBy: 'date', filters: [['date', 'gte', cutoffISO.split('T')[0]]] }),
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

      // 14-day sparklines
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
    <div className="page stagger">

      {/* ════════════════════════════════════════════
         ROW 1: Hero + Greeting — Bento Grid
      ════════════════════════════════════════════ */}
      <div className="bento-grid" style={{ marginBottom:14 }}>

        {/* ── HERO: Today's Revenue (animated gradient mesh) ── */}
        <div
          className="bento-8 gradient-mesh tilt-card"
          onClick={() => onNavigate('orders')}
          style={{
            position:'relative', overflow:'hidden', cursor:'pointer',
            border:'1px solid rgba(var(--action-rgb),0.18)',
            borderRadius:'var(--r-xl)',
            padding:'32px 28px 24px',
            backdropFilter:'var(--glass-blur)',
            WebkitBackdropFilter:'var(--glass-blur)',
          }}
        >
          {/* Wave SVG background */}
          <svg
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
            style={{
              position:'absolute', bottom:0, left:0, right:0, height:'55%',
              opacity:0.15, pointerEvents:'none',
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
                <stop offset="0%" stopColor="var(--action)"/>
                <stop offset="50%" stopColor="var(--info)"/>
                <stop offset="100%" stopColor="#8B5CF6"/>
              </linearGradient>
            </defs>
          </svg>

          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:'var(--t-label)', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>
              إيرادات اليوم
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:16, flexWrap:'wrap' }}>
              <div style={{
                fontSize:42, fontWeight:900, color:'var(--action)',
                fontFamily:'Inter,sans-serif', lineHeight:1, letterSpacing:'-0.03em',
                textShadow:'0 0 40px rgba(var(--action-rgb),0.25)',
              }}>
                {formatCurrency(data?.todayRevenue || 0)}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:6 }}>
                <span style={{
                  padding:'5px 12px', borderRadius:999,
                  fontSize:12, fontWeight:800,
                  background: (data?.revChange ?? 0) >= 0 ? 'rgba(var(--success-rgb),0.14)' : 'rgba(var(--danger-rgb),0.14)',
                  color: (data?.revChange ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                  backdropFilter:'blur(12px)',
                }}>
                  {data?.revChange !== null ? `${(data?.revChange ?? 0) >= 0 ? '↑' : '↓'} ${Math.abs(data?.revChange || 0)}%` : '—'}
                </span>
                <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>
                  {data?.todayOrders || 0} طلب
                </span>
              </div>
            </div>
          </div>

          {sparkData.revenue.length > 1 && (
            <div style={{ position:'relative', zIndex:1, marginTop:18, opacity:0.85, width:'100%' }}>
              <HeroSparkline data={sparkData.revenue} color="var(--action)" />
            </div>
          )}
        </div>

        {/* ── GREETING CARD ── */}
        <GreetingCard onNavigate={onNavigate} />
      </div>

      {/* ════════════════════════════════════════════
         ROW 2: Ring Charts — 3 columns
      ════════════════════════════════════════════ */}
      <div className="bento-grid" style={{ marginBottom:14 }}>
        <div className="bento-4">
          <RingCard
            label="إيرادات الشهر"
            value={formatCurrency(data?.revenue || 0)}
            pct={Math.min(100, data?.revenueProgress || 0)}
            color="var(--action)"
            rgbVar="var(--action-rgb)"
            sub={data?.prevRevenue > 0 ? `${data?.revenueProgress || 0}% مقارنة بالشهر السابق` : 'أول شهر'}
            sparkData={sparkData.revenue}
            sparkColor="var(--action)"
          />
        </div>
        <div className="bento-4">
          <RingCard
            label="معدل التسليم"
            value={`${data?.deliveryRate || 0}%`}
            pct={data?.deliveryRate || 0}
            color="var(--info)"
            rgbVar="var(--info-rgb)"
            sub={`${data?.delivered || 0} مسلّم من ${data?.totalOrders || 0}`}
            sparkData={sparkData.orders}
            sparkColor="var(--info)"
          />
        </div>
        <div className="bento-4">
          <RingCard
            label="هامش الربح"
            value={`${data?.profitMargin || 0}%`}
            pct={Math.max(0, Math.min(100, data?.profitMargin || 0))}
            color={data?.profitMargin >= 0 ? 'var(--success)' : 'var(--danger)'}
            rgbVar={data?.profitMargin >= 0 ? 'var(--success-rgb)' : 'var(--danger-rgb)'}
            sub={formatCurrency(data?.netProfit || 0) + ' صافي'}
            sparkData={sparkData.profit}
            sparkColor="var(--success)"
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════
         ROW 3: Stats + Activity Stream
      ════════════════════════════════════════════ */}
      <div className="bento-grid" style={{ marginBottom:14 }}>

        {/* ── Left: Mini Stats 2×2 + COD ── */}
        <div className="bento-5" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <MiniStat label="طلبات الشهر" value={data?.totalOrders || 0} color="var(--action)" icon={<IcOrders size={18}/>} />
            <MiniStat label="قيد المعالجة" value={data?.inProgress || 0} color="var(--warning)" icon={<IcPackage size={18}/>} />
            <MiniStat label="لم يتم" value={data?.notDelivered || 0} color="var(--danger)" icon={<IcTruck size={18}/>} />
            <MiniStat label="المصاريف" value={formatCurrency(data?.opExpenses || 0)} color="var(--warning)" icon={<IcExpenses size={18}/>} />
          </div>

          {/* COD Alert */}
          {data?.pendingCOD > 0 && (
            <div
              onClick={() => onNavigate('hayyak')}
              className="tilt-card"
              style={{
                display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                cursor:'pointer',
                background:'rgba(var(--warning-rgb),0.08)',
                backdropFilter:'var(--glass-blur)',
                WebkitBackdropFilter:'var(--glass-blur)',
                border:'1.5px solid rgba(var(--warning-rgb),0.25)',
                borderRadius:'var(--r-lg)',
                transition:'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(var(--warning-rgb),0.12)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(var(--warning-rgb),0.08)'}
            >
              <IcAlert size={20} style={{ color:'var(--warning)', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:'var(--t-body)', color:'var(--warning)' }}>
                  {formatCurrency(data.pendingCOD)} COD معلق
                </div>
                <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)', marginTop:2 }}>
                  {data.pendingCount} طلب • صافي المتوقع: {formatCurrency(data.pendingNet)}
                </div>
              </div>
              <IcArrowLeft size={16} style={{ color:'var(--warning)', flexShrink:0 }}/>
            </div>
          )}
        </div>

        {/* ── Right: Unified Activity Stream ── */}
        <div className="bento-7">
          <ActivityStream
            stream={stream}
            inProgressOrders={inProgressOrders}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════
         FLOATING DOCK — Quick Actions
      ════════════════════════════════════════════ */}
      <div className="floating-dock">
        {[
          { icon:<IcPlus size={20}/>,     label:'طلب جديد',   color:'var(--action)',      action: () => onNavigate('orders') },
          { icon:<IcExpenses size={20}/>,  label:'مصروف جديد', color:'var(--warning)',     action: () => onNavigate('expenses') },
          { icon:<IcTruck size={20}/>,     label:'حياك',       color:'var(--info-light)',  action: () => onNavigate('hayyak') },
          { icon:<IcTrendUp size={20}/>,   label:'المحاسبة',   color:'var(--success)',     action: () => onNavigate('accounting') },
        ].map(a => (
          <button key={a.label} onClick={a.action} className="dock-item">
            <div style={{ color:a.color, display:'flex' }}>{a.icon}</div>
            <span className="dock-item-label">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   HERO SPARKLINE — Responsive width sparkline for hero card
═══════════════════════════════════════════════════ */
function HeroSparkline({ data, color }) {
  const ref = useRef(null)
  const [w, setW] = useState(300)
  useEffect(() => {
    if (!ref.current) return
    const measure = () => setW(ref.current.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ width:'100%' }}>
      <Sparkline data={data} color={color} width={w} height={52} />
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   GREETING CARD — Time-of-day greeting + clock + actions
═══════════════════════════════════════════════════ */
function GreetingCard({ onNavigate }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="bento-4 glass-accent-card"
      style={{
        padding:'28px 22px 20px',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        '--accent-color':'var(--info)',
      }}
    >
      <div>
        <div style={{
          fontSize:'var(--t-title)', fontWeight:800, color:'var(--text)',
          marginBottom:6,
        }}>
          {getGreeting()} 👋
        </div>
        <div style={{
          fontSize:38, fontWeight:900, color:'var(--action)',
          fontFamily:'Inter,sans-serif', lineHeight:1, letterSpacing:'-0.02em',
          marginBottom:8, direction:'ltr', textAlign:'right',
        }}>
          {time.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })}
        </div>
        <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)', fontWeight:600 }}>
          {time.toLocaleDateString('ar-AE', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:16 }}>
        <button
          onClick={() => onNavigate('orders')}
          style={{
            flex:1, padding:'10px 8px', borderRadius:'var(--r-md)',
            background:'var(--action-soft)', border:'1px solid rgba(var(--action-rgb),0.15)',
            color:'var(--action)', fontSize:12, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s ease',
          }}
        >
          + طلب
        </button>
        <button
          onClick={() => onNavigate('expenses')}
          style={{
            flex:1, padding:'10px 8px', borderRadius:'var(--r-md)',
            background:'rgba(var(--warning-rgb),0.08)', border:'1px solid rgba(var(--warning-rgb),0.15)',
            color:'var(--warning)', fontSize:12, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s ease',
          }}
        >
          + مصروف
        </button>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   RING CARD — Glass arc chart + value + sparkline
═══════════════════════════════════════════════════ */
function RingCard({ label, value, pct, color, rgbVar, sub, sparkData, sparkColor }) {
  const size = 68, sw = 5
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(100, pct) / 100

  return (
    <div
      className="tilt-card glow-hover"
      style={{
        background:'var(--bg-surface)',
        backdropFilter:'var(--glass-blur)',
        WebkitBackdropFilter:'var(--glass-blur)',
        borderRadius:'var(--r-lg)',
        padding:'20px 18px',
        boxShadow:'var(--card-shadow)',
        border:'1px solid var(--border)',
        borderTopColor:'var(--glass-edge)',
        position:'relative', overflow:'hidden',
        height:'100%',
        '--glow-rgb': rgbVar || 'var(--action-rgb)',
      }}
    >
      {/* Top accent */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.6 }}/>

      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={sw}/>
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ filter:`drop-shadow(0 0 6px ${color})`, transition:'stroke-dasharray 0.8s ease' }}
          />
          <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
            fill={color} fontSize={size*0.22} fontWeight="800" fontFamily="Inter,sans-serif"
          >
            {pct}%
          </text>
        </svg>

        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
          <div style={{ fontSize:20, fontWeight:900, color, lineHeight:1.1, fontFamily:'Inter,sans-serif' }}>{value}</div>
          {sub && <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)', marginTop:4, lineHeight:1.3 }}>{sub}</div>}
        </div>
      </div>

      {sparkData?.length > 1 && (
        <div style={{ marginTop:12, opacity:0.65, width:'100%', overflow:'hidden' }}>
          <Sparkline data={sparkData} color={sparkColor || color} width={220} height={26}/>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   MINI STAT — Glass compact stat card with 3D tilt
═══════════════════════════════════════════════════ */
function MiniStat({ label, value, color, icon }) {
  return (
    <div
      className="tilt-card glow-hover"
      style={{
        background:'var(--bg-surface)',
        backdropFilter:'var(--glass-blur)',
        WebkitBackdropFilter:'var(--glass-blur)',
        borderRadius:'var(--r-md)',
        padding:'16px 16px',
        boxShadow:'var(--card-shadow)',
        border:'1px solid var(--border)',
        borderTopColor:'var(--glass-edge)',
        position:'relative', overflow:'hidden',
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.5 }}/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
        {icon && <div style={{ color, opacity:0.8 }}>{icon}</div>}
      </div>
      <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1.1, fontFamily:'Inter,sans-serif' }}>{value}</div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   ACTIVITY STREAM — Unified today + in-progress with tabs
═══════════════════════════════════════════════════ */
function ActivityStream({ stream, inProgressOrders, onNavigate }) {
  const [tab, setTab] = useState('today')

  const items = tab === 'today' ? stream : inProgressOrders
  const tabColor = tab === 'today' ? 'var(--action)' : 'var(--warning)'

  return (
    <div
      className="glass-accent-card"
      style={{
        height:'100%',
        display:'flex', flexDirection:'column',
        '--accent-color': tabColor,
      }}
    >
      {/* Tab header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 18px', borderBottom:'1px solid var(--border)',
      }}>
        <div style={{ display:'flex', gap:4, background:'var(--bg-hover)', borderRadius:999, padding:3 }}>
          <button onClick={() => setTab('today')} style={{
            padding:'6px 14px', borderRadius:999, border:'none',
            background: tab==='today' ? 'var(--action)' : 'transparent',
            color: tab==='today' ? '#fff' : 'var(--text-muted)',
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s ease',
          }}>
            طلبات اليوم ({stream.length})
          </button>
          <button onClick={() => setTab('progress')} style={{
            padding:'6px 14px', borderRadius:999, border:'none',
            background: tab==='progress' ? 'var(--warning)' : 'transparent',
            color: tab==='progress' ? '#fff' : 'var(--text-muted)',
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s ease',
          }}>
            قيد المعالجة ({inProgressOrders.length})
          </button>
        </div>

        <button
          onClick={() => onNavigate('orders')}
          style={{
            background:'none', border:'none', color:'var(--action)',
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          }}
        >
          عرض الكل ←
        </button>
      </div>

      {/* Items */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, maxHeight:320 }}>
        {items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:'var(--t-body)' }}>
            {tab === 'today' ? 'لا يوجد طلبات اليوم بعد' : 'لا يوجد طلبات قيد المعالجة'}
          </div>
        ) : (
          items.map(o => <StreamOrderRow key={o.id} order={o}/>)
        )}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════
   STREAM ORDER ROW — Single order in activity stream
═══════════════════════════════════════════════════ */
function StreamOrderRow({ order }) {
  const color = STATUS_COLORS[order.status] || 'var(--text-muted)'

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'10px 14px',
      background:'var(--bg-hover)',
      backdropFilter:'blur(8px)',
      borderRadius:'var(--r-md)',
      borderInlineStart:`3px solid ${color}`,
      transition:'background 0.12s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.background='var(--bg-active)'}
      onMouseLeave={e => e.currentTarget.style.background='var(--bg-hover)'}
    >
      <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, boxShadow:`0 0 8px ${color}60` }}/>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:'var(--t-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {order.customer_name || 'عميل'}
        </div>
        <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)', display:'flex', gap:6, flexWrap:'wrap' }}>
          <span style={{ direction:'ltr' }}>{order.order_number}</span>
          {order.customer_city && <span>• {order.customer_city}</span>}
        </div>
      </div>

      <span style={{
        padding:'3px 9px', borderRadius:999,
        fontSize:10, fontWeight:700,
        background:`${color}18`, color,
        flexShrink:0,
      }}>
        {STATUS_LABELS[order.status] || order.status}
      </span>

      <div style={{
        fontWeight:800, color:'var(--action)', fontSize:'var(--t-body)',
        fontFamily:'Inter,sans-serif', flexShrink:0,
      }}>
        {formatCurrency(order.total || 0)}
      </div>
    </div>
  )
}
