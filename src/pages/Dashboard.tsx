// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DB } from '../data/db'
import { subscribeOrders } from '../data/realtime'
import { formatCurrency } from '../data/constants'
import { SkeletonStats, SkeletonCard } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcAlert, IcTruck } from '../components/Icons'
import Sparkline from '../components/Sparkline'
import type { PageProps } from '../types'

const STATUS_COLORS = {
  new:'var(--info)', ready:'var(--warning)', with_hayyak:'var(--info)',
  confirmed:'var(--warning)', processing:'var(--action)',
  delivered:'var(--success)', not_delivered:'var(--danger)', cancelled:'var(--text-muted)',
  shipped:'var(--action)', returned:'var(--text-muted)',
}
const STATUS_LABELS = {
  new:'جديد', ready:'جاهز', with_hayyak:'مع حياك', confirmed:'مؤكد',
  processing:'قيد المعالجة', shipped:'تم الشحن',
  delivered:'مسلّم', not_delivered:'لم يتم', cancelled:'ملغي', returned:'مرتجع',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'مساء الخير'
  return 'مساء النور'
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `منذ ${Math.floor(diff/60)}د`
  if (diff < 86400) return `منذ ${Math.floor(diff/3600)}س`
  return `منذ ${Math.floor(diff/86400)}ي`
}

export default function Dashboard({ onNavigate }: PageProps) {
  const [data,      setData]      = useState(null)
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sparkData, setSparkData] = useState({ revenue:[], orders:[], profit:[] })
  const [chartData, setChartData] = useState([])

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
      const inProgress   = monthOrders.filter(o => ['new','ready','with_hayyak','confirmed','processing','shipped'].includes(o.status)).length
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

      // 30-day chart data
      const chartDays = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toDateString()
        const dayOrds = allOrders.filter(o =>
          new Date(o.order_date||o.created_at).toDateString() === ds &&
          o.status !== 'cancelled' && !o.is_replacement && o.status !== 'not_delivered'
        )
        chartDays.push({
          label: d.toLocaleDateString('ar', { day: 'numeric', month: 'short' }),
          value: dayOrds.reduce((s, o) => s + (o.total || 0), 0),
        })
      }
      setChartData(chartDays)

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
      .filter(o => ['new','ready','with_hayyak','confirmed','processing','shipped'].includes(o.status))
      .sort((a, b) => new Date(b.order_date||b.created_at) - new Date(a.order_date||a.created_at))
      .slice(0, 12)
  }, [orders])

  if (loading) return (
    <div className="page">
      <SkeletonStats count={4} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16, marginTop:16 }}>
        <SkeletonCard rows={4}/><SkeletonCard rows={4}/>
      </div>
    </div>
  )

  return (
    <div className="page stagger">

      {/* ─── HERO: Revenue today ──────────────────────────── */}
      <div
        className="dash-hero"
        onClick={() => onNavigate('orders')}
        style={{ cursor:'pointer' }}
      >
        {/* Left: stats */}
        <div className="dash-hero-left">
          <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.55)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
            {getGreeting()} · {new Date().toLocaleDateString('ar-AE', { weekday:'long', day:'numeric', month:'long' })}
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.65)', marginBottom:8 }}>
            إيرادات اليوم
          </div>
          <div style={{
            fontSize:48, fontWeight:900, color:'#fff',
            fontFamily:'Inter,sans-serif', lineHeight:1, letterSpacing:'-0.03em',
            marginBottom:14, textShadow:'0 0 40px rgba(255,255,255,0.20)',
          }}>
            {formatCurrency(data?.todayRevenue || 0)}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {data?.revChange !== null && (
              <span style={{
                padding:'5px 14px', borderRadius:999,
                fontSize:12, fontWeight:800,
                background: (data?.revChange ?? 0) >= 0 ? 'rgba(93,216,164,0.25)' : 'rgba(248,113,113,0.25)',
                color: (data?.revChange ?? 0) >= 0 ? '#5DD8A4' : '#F87171',
                border: `1px solid ${(data?.revChange ?? 0) >= 0 ? 'rgba(93,216,164,0.35)' : 'rgba(248,113,113,0.35)'}`,
              }}>
                {(data?.revChange ?? 0) >= 0 ? '↑' : '↓'} {Math.abs(data?.revChange || 0)}% مقارنة بالأمس
              </span>
            )}
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:600 }}>
              {data?.todayOrders || 0} طلب اليوم
            </span>
          </div>
        </div>

        {/* Right: sparkline chart */}
        <div className="dash-hero-right">
          <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.45)', marginBottom:8, letterSpacing:'0.06em' }}>
            آخر 14 يوم
          </div>
          {sparkData.revenue.length > 1 && (
            <HeroSparkline data={sparkData.revenue} color="rgba(255,255,255,0.85)" />
          )}
        </div>
      </div>

      {/* ─── KPI ROW: 4 cards ─────────────────────────────── */}
      <div className="dash-kpi-row">
        <KpiCard
          label="إيرادات الشهر"
          value={formatCurrency(data?.revenue || 0)}
          sub={data?.prevRevenue > 0 ? `${data?.revenueProgress || 0}% مقارنة بالشهر السابق` : 'أول شهر'}
          color="var(--action)"
          icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          trend={data?.revenueProgress > 100 ? 'up' : data?.revenueProgress < 100 ? 'down' : null}
        />
        <KpiCard
          label="طلبات الشهر"
          value={data?.totalOrders || 0}
          sub={`${data?.inProgress || 0} قيد المعالجة · ${data?.notDelivered || 0} لم يتم`}
          color="var(--info)"
          icon={<IcOrders size={20}/>}
          trend={null}
        />
        <KpiCard
          label="معدل التسليم"
          value={`${data?.deliveryRate || 0}%`}
          sub={`${data?.delivered || 0} مسلّم من ${data?.totalOrders || 0} طلب`}
          color={data?.deliveryRate >= 75 ? 'var(--success)' : 'var(--warning)'}
          icon={<IcTruck size={20}/>}
          trend={data?.deliveryRate >= 75 ? 'up' : 'down'}
        />
        <KpiCard
          label="هامش الربح"
          value={`${data?.profitMargin || 0}%`}
          sub={`${formatCurrency(data?.netProfit || 0)} صافي · ${formatCurrency(data?.opExpenses || 0)} مصاريف`}
          color={data?.profitMargin >= 0 ? 'var(--success)' : 'var(--danger)'}
          icon={<IcTrendUp size={20}/>}
          trend={data?.profitMargin > 0 ? 'up' : 'down'}
        />
      </div>

      {/* ─── 30-Day Revenue Chart ─────────────────────────── */}
      {chartData.length > 1 && (
        <RevenueChart data={chartData} />
      )}

      {/* ─── COD Alert ──────────────────────────────────────── */}
      {data?.pendingCOD > 0 && (
        <div
          onClick={() => onNavigate('hayyak')}
          style={{
            display:'flex', alignItems:'center', gap:14, padding:'16px 20px',
            marginBottom:14, cursor:'pointer',
            background:'rgba(251,191,36,0.08)',
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            border:'1.5px solid rgba(251,191,36,0.25)',
            borderRadius:'var(--r-lg)',
            transition:'background 0.12s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(251,191,36,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(251,191,36,0.08)'}
        >
          <div style={{
            width:40, height:40, borderRadius:'var(--r-md)', flexShrink:0,
            background:'rgba(251,191,36,0.15)', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcAlert size={20} style={{ color:'var(--warning)' }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:'var(--t-body)', color:'var(--warning)', marginBottom:2 }}>
              {formatCurrency(data.pendingCOD)} — COD معلق
            </div>
            <div style={{ fontSize:'var(--t-label)', color:'var(--text-muted)' }}>
              {data.pendingCount} طلب بانتظار التسوية · صافي المتوقع: {formatCurrency(data.pendingNet)}
            </div>
          </div>
          <div style={{ color:'var(--warning)', fontSize:18, fontWeight:700 }}>←</div>
        </div>
      )}

      {/* ─── Bottom: Activity + Ring Stats ─────────────────── */}
      <div className="dash-bottom">
        {/* Activity Feed */}
        <div className="dash-activity">
          <ActivityStream
            stream={stream}
            inProgressOrders={inProgressOrders}
            onNavigate={onNavigate}
          />
        </div>

        {/* Ring stats sidebar */}
        <div className="dash-rings">
          <RingCard
            label="إيرادات الشهر"
            value={formatCurrency(data?.revenue || 0)}
            pct={Math.min(100, data?.revenueProgress || 0)}
            color="var(--action)"
            sub={data?.prevRevenue > 0 ? `${data?.revenueProgress || 0}% الشهر السابق` : 'أول شهر'}
          />
          <RingCard
            label="معدل التسليم"
            value={`${data?.deliveryRate || 0}%`}
            pct={data?.deliveryRate || 0}
            color="var(--info)"
            sub={`${data?.delivered || 0} من ${data?.totalOrders || 0}`}
          />
          <RingCard
            label="هامش الربح"
            value={`${data?.profitMargin || 0}%`}
            pct={Math.max(0, Math.min(100, data?.profitMargin || 0))}
            color={data?.profitMargin >= 0 ? 'var(--success)' : 'var(--danger)'}
            sub={formatCurrency(data?.netProfit || 0)}
          />

          {/* Quick actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
            {[
              { label:'+ طلب جديد',    color:'var(--action)',  bg:'var(--action-soft)',  border:'rgba(49,140,231,0.20)',  page:'orders'     },
              { label:'+ مصروف جديد',  color:'var(--warning)', bg:'rgba(251,191,36,0.08)', border:'rgba(251,191,36,0.20)', page:'expenses'   },
              { label:'التقارير',       color:'var(--success)', bg:'rgba(93,216,164,0.08)', border:'rgba(93,216,164,0.20)', page:'reports'    },
              { label:'المحاسبة',       color:'var(--info)',    bg:'var(--info-faint)',   border:'rgba(126,184,247,0.18)', page:'accounting' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => onNavigate(a.page)}
                style={{
                  width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)',
                  border:`1px solid ${a.border}`, background:a.bg,
                  color:a.color, fontSize:12, fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                  transition:'all 0.15s ease', textAlign:'start',
                }}
                onMouseEnter={e => e.currentTarget.style.filter='brightness(1.2)'}
                onMouseLeave={e => e.currentTarget.style.filter='none'}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


/* ─── HERO SPARKLINE ──────────────────────────────────── */
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
      <Sparkline data={data} color={color} width={w} height={64} />
    </div>
  )
}


/* ─── KPI CARD ─────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, icon, trend }) {
  return (
    <div className="dash-kpi-card">
      <div style={{ position:'absolute', top:0, insetInlineStart:0, insetInlineEnd:0, height:3, background:`linear-gradient(90deg, transparent, ${color}, transparent)`, borderRadius:'var(--r-lg) var(--r-lg) 0 0', opacity:0.7 }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
        <div style={{ color, opacity:0.85 }}>{icon}</div>
      </div>
      <div style={{ fontSize:22, fontWeight:900, color, fontFamily:'Inter,sans-serif', lineHeight:1.1, marginBottom:6 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>{sub}</div>
      {trend && (
        <div style={{
          position:'absolute', top:14, insetInlineEnd:14,
          fontSize:16, fontWeight:900,
          color: trend === 'up' ? 'var(--success)' : 'var(--danger)',
          opacity:0.6,
        }}>
          {trend === 'up' ? '↑' : '↓'}
        </div>
      )}
    </div>
  )
}


/* ─── 30-DAY REVENUE CHART ────────────────────────────── */
function RevenueChart({ data: days }) {
  const [mounted, setMounted] = useState(false)
  const pathRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const W = 800, H = 110
  const PL = 8, PR = 8, PT = 10, PB = 28
  const maxVal = Math.max(...days.map(d => d.value), 1)

  const pts = days.map((d, i) => ({
    x: PL + (i / (days.length - 1)) * (W - PL - PR),
    y: PT + (1 - d.value / maxVal) * (H - PT - PB),
  }))

  // Smooth cubic bezier path
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + pt.x) / 2
    return `${acc} C${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`
  }, '')

  const areaPath = linePath +
    ` L${pts[pts.length-1].x},${H - PB} L${pts[0].x},${H - PB} Z`

  // Label every 7th point
  const labelPts = days
    .map((d, i) => ({ ...d, i, pt: pts[i] }))
    .filter((_, i) => i === 0 || i === days.length - 1 || i % 7 === 0)

  return (
    <div style={{
      background:'var(--bg-surface)', backdropFilter:'blur(52px) saturate(1.9)',
      WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:'var(--r-lg)', padding:'20px 20px 16px',
      border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
      boxShadow:'var(--card-shadow)',
      marginBottom:14,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
          الإيراد اليومي — آخر 30 يوم
        </div>
        <div style={{ fontSize:13, fontWeight:800, color:'var(--action)', fontFamily:'Inter' }}>
          {formatCurrency(days.reduce((s, d) => s + d.value, 0))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', overflow:'visible' }}>
        <defs>
          <linearGradient id="areaGrad30" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--action)" stopOpacity="0.30"/>
            <stop offset="100%" stopColor="var(--action)" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={PL} y1={PT + (1-f)*(H-PT-PB)}
            x2={W-PR} y2={PT + (1-f)*(H-PT-PB)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad30)" />

        {/* Line */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="var(--action)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter:'drop-shadow(0 0 8px rgba(49,140,231,0.55))',
            transition: mounted ? 'none' : 'stroke-dashoffset 1.5s ease',
          }}
        />

        {/* Data points on max */}
        {(() => {
          const maxIdx = days.findIndex(d => d.value === maxVal)
          const pt = pts[maxIdx]
          return pt ? (
            <g>
              <circle cx={pt.x} cy={pt.y} r={5} fill="var(--action)" style={{ filter:'drop-shadow(0 0 6px rgba(49,140,231,0.8))' }} />
              <circle cx={pt.x} cy={pt.y} r={9} fill="rgba(49,140,231,0.15)" />
            </g>
          ) : null
        })()}

        {/* X-axis labels */}
        {labelPts.map(({ label, pt }) => (
          <text key={label + pt.x}
            x={pt.x} y={H - 4}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={9}
            fontFamily="Inter,sans-serif"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}


/* ─── RING CARD ─────────────────────────────────────────── */
function RingCard({ label, value, pct, color, sub }) {
  const size = 60, sw = 4.5
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(100, pct) / 100

  return (
    <div style={{
      background:'var(--bg-surface)', backdropFilter:'blur(36px)',
      WebkitBackdropFilter:'blur(36px)',
      borderRadius:'var(--r-md)', padding:'14px 16px',
      boxShadow:'var(--card-shadow)', border:'1px solid var(--border)',
      borderTopColor:'var(--glass-edge)',
      display:'flex', alignItems:'center', gap:12,
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={sw}/>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter:`drop-shadow(0 0 5px ${color})`, transition:'stroke-dasharray 0.8s ease' }}
        />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={size*0.22} fontWeight="800" fontFamily="Inter,sans-serif"
        >
          {pct}%
        </text>
      </svg>
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:900, color, fontFamily:'Inter,sans-serif', lineHeight:1.1 }}>{value}</div>
        {sub && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}


/* ─── ACTIVITY STREAM ───────────────────────────────────── */
function ActivityStream({ stream, inProgressOrders, onNavigate }) {
  const [tab, setTab] = useState('today')
  const items = tab === 'today' ? stream : inProgressOrders

  return (
    <div style={{
      background:'var(--bg-surface)', backdropFilter:'blur(52px) saturate(1.9)',
      WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:'var(--r-lg)', border:'1px solid var(--border-strong)',
      borderTopColor:'var(--glass-edge)', boxShadow:'var(--card-shadow)',
      display:'flex', flexDirection:'column', height:'100%',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 18px', borderBottom:'1px solid var(--border)',
        flexShrink:0,
      }}>
        <div style={{ display:'flex', gap:4, background:'var(--bg-hover)', borderRadius:999, padding:3 }}>
          {[
            { id:'today',    label:`طلبات اليوم (${stream.length})`,     activeColor:'var(--action)'  },
            { id:'progress', label:`قيد المعالجة (${inProgressOrders.length})`, activeColor:'var(--warning)' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding:'6px 14px', borderRadius:999, border:'none',
                background: tab === t.id ? (t.id === 'today' ? 'var(--action)' : 'var(--warning)') : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
                fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                transition:'all 0.15s ease', whiteSpace:'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onNavigate('orders')}
          style={{
            background:'none', border:'none', color:'var(--action)',
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            whiteSpace:'nowrap',
          }}
        >
          عرض الكل ←
        </button>
      </div>

      {/* Items */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:5, maxHeight:380 }}>
        {items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:'var(--t-body)' }}>
            {tab === 'today' ? 'لا يوجد طلبات اليوم بعد' : 'لا يوجد طلبات قيد المعالجة'}
          </div>
        ) : (
          items.map(o => {
            const color = STATUS_COLORS[o.status] || 'var(--text-muted)'
            return (
              <div
                key={o.id}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px',
                  background:'var(--bg-hover)',
                  borderRadius:'var(--r-md)',
                  borderInlineStart:`3px solid ${color}`,
                  transition:'background 0.12s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-active)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--bg-hover)'}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>
                    {o.customer_name || 'عميل'}
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', display:'flex', gap:6 }}>
                    <span style={{ direction:'ltr' }}>{o.order_number}</span>
                    {o.customer_city && <span>· {o.customer_city}</span>}
                    <span>· {timeAgo(o.order_date || o.created_at)}</span>
                  </div>
                </div>
                <span style={{
                  padding:'3px 8px', borderRadius:999, fontSize:9, fontWeight:700,
                  background:`${color}18`, color, flexShrink:0,
                }}>
                  {STATUS_LABELS[o.status] || o.status}
                </span>
                <div style={{
                  fontWeight:800, color:'var(--action)', fontSize:13,
                  fontFamily:'Inter,sans-serif', flexShrink:0, minWidth:64, textAlign:'start',
                }}>
                  {formatCurrency(o.total || 0)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
