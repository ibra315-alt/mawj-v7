// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DB } from '../data/db'
import { subscribeOrders } from '../data/realtime'
import { formatCurrency } from '../data/constants'
import { SkeletonStats, SkeletonCard, toast } from '../components/ui'
import Sparkline from '../components/Sparkline'
import type { PageProps } from '../types'

/* ─── Pipeline config ─────────────────────────────────────── */
const PIPELINE = [
  { id:'new',           label:'جديد',    color:'#7EB8F7' },
  { id:'confirmed',     label:'مؤكد',    color:'#F59E0B' },
  { id:'processing',    label:'معالجة',  color:'#318CE7' },
  { id:'with_hayyak',   label:'حياك',   color:'#8B5CF6' },
  { id:'shipped',       label:'شُحن',    color:'#38BDF8' },
  { id:'delivered',     label:'مسلّم',   color:'#5DD8A4' },
  { id:'not_delivered', label:'لم يتم',  color:'#F87171' },
  { id:'cancelled',     label:'ملغي',    color:'#6B7280' },
]

/* ─── Helpers ─────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'مساء الخير'
  return 'مساء النور'
}
function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)    return 'الآن'
  if (s < 3600)  return `${Math.floor(s/60)}د`
  if (s < 86400) return `${Math.floor(s/3600)}س`
  return `${Math.floor(s/86400)}ي`
}

/* ─── Animated counter ────────────────────────────────────── */
function AnimNum({ to, fmt = v => Math.round(v).toLocaleString() }) {
  const [v, setV] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const start = ref.current, end = to; ref.current = to
    if (Math.abs(start - end) < 1) return
    const dur = 1000, t0 = performance.now()
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1)
      setV(start + (end - start) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [to])
  return <>{fmt(v)}</>
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD — Command Center v3
   New smart logic: insights, funnel, top products, projection
══════════════════════════════════════════════════════════ */
export default function Dashboard({ onNavigate }: PageProps) {
  const [metrics,     setMetrics]     = useState(null)
  const [allOrders,   setAllOrders]   = useState([])
  const [chartData,   setChartData]   = useState([])
  const [sparkData,   setSparkData]   = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [insights,    setInsights]    = useState([])
  const [newCusts,    setNewCusts]    = useState(0)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    loadData()
    const unsub = subscribeOrders(() => loadData())
    return unsub
  }, [])

  async function loadData() {
    try {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90)
      const [orders, expenses] = await Promise.all([
        DB.list('orders',   { orderBy:'created_at', filters:[['created_at','gte',cutoff.toISOString()]] }),
        DB.list('expenses', { orderBy:'date',        filters:[['date','gte',cutoff.toISOString().split('T')[0]]] }),
      ])

      const now        = new Date()
      const day        = now.getDate()
      const daysInMon  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1)

      const revFilter   = o => !o.is_replacement && o.status !== 'not_delivered'
      const monthOrders = orders.filter(o => new Date(o.order_date||o.created_at) >= monthStart && o.status !== 'cancelled')
      const prevOrders  = orders.filter(o => { const d = new Date(o.order_date||o.created_at); return d >= prevStart && d < monthStart && o.status !== 'cancelled' })
      const todayOrds   = orders.filter(o => new Date(o.order_date||o.created_at) >= todayStart)
      const yestOrds    = orders.filter(o => { const d = new Date(o.order_date||o.created_at); return d >= yestStart && d < todayStart })
      const monthExp    = expenses.filter(e => new Date(e.date) >= monthStart)

      const revenue     = monthOrders.filter(revFilter).reduce((s,o) => s+(o.total||0), 0)
      const prevRev     = prevOrders.filter(revFilter).reduce((s,o) => s+(o.total||0), 0)
      const grossProfit = monthOrders.reduce((s,o) => s+(o.gross_profit||0), 0)
      const opExp       = monthExp.reduce((s,e) => s+(e.amount||0), 0)
      const netProfit   = grossProfit - opExp
      const todayRev    = todayOrds.filter(revFilter).reduce((s,o) => s+(o.total||0), 0)
      const yestRev     = yestOrds.filter(revFilter).reduce((s,o) => s+(o.total||0), 0)
      const todayChg    = yestRev > 0 ? Math.round((todayRev - yestRev) / yestRev * 100) : null
      const profitMargin= revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0
      const delivered   = monthOrders.filter(o => o.status === 'delivered').length
      const notDlv      = monthOrders.filter(o => o.status === 'not_delivered').length
      const delivRate   = monthOrders.length ? Math.round((delivered / monthOrders.length) * 100) : 0
      const prevChg     = prevRev > 0 ? Math.round(((revenue - prevRev) / prevRev) * 100) : null

      // Projected month-end revenue
      const projected = day > 0 ? Math.round((revenue / day) * daysInMon) : revenue
      const remainDays = daysInMon - day

      // Pending COD
      const pendingCOD   = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
      const pendingCODVal= pendingCOD.reduce((s,o) => s+(o.total||0), 0)

      // Stuck orders (in processing > 2 days)
      const stuck = orders.filter(o =>
        ['new','confirmed','processing'].includes(o.status) &&
        (Date.now() - new Date(o.created_at)) > 2 * 86400000
      )

      // Top products by revenue this month
      const pMap = {}
      monthOrders.forEach(o => (o.items || []).forEach(it => {
        if (!pMap[it.name]) pMap[it.name] = { name:it.name, qty:0, rev:0 }
        pMap[it.name].qty += it.qty || 1
        pMap[it.name].rev += (it.price || 0) * (it.qty || 1)
      }))
      const prods = Object.values(pMap).sort((a,b) => b.rev - a.rev).slice(0, 5)
      setTopProducts(prods)

      // New customers this month (first order in this month)
      const custFirst = {}
      orders.forEach(o => {
        const k = o.customer_phone || o.customer_name
        if (k && (!custFirst[k] || new Date(o.created_at) < new Date(custFirst[k]))) custFirst[k] = o.created_at
      })
      const newC = Object.values(custFirst).filter(d => new Date(d) >= monthStart).length
      setNewCusts(newC)

      // Best revenue weekday
      const dayMap = {}
      monthOrders.filter(revFilter).forEach(o => {
        const d = new Date(o.order_date||o.created_at).toLocaleDateString('ar-AE', { weekday:'long' })
        dayMap[d] = (dayMap[d] || 0) + (o.total || 0)
      })
      const bestDay = Object.entries(dayMap).sort((a,b) => b[1]-a[1])[0]

      // Average order value
      const avgOrder = monthOrders.length > 0 ? Math.round(revenue / monthOrders.length) : 0

      // Build smart insights
      const ins = []
      if (bestDay && bestDay[1] > 0) ins.push({ icon:'📈', text:`أفضل يوم: ${bestDay[0]} — ${formatCurrency(bestDay[1])}`, color:'#5DD8A4' })
      if (stuck.length > 0)  ins.push({ icon:'⚠️', text:`${stuck.length} طلب عالق +٢ أيام دون تحديث`, color:'#F59E0B', page:'orders' })
      if (pendingCOD.length > 0) ins.push({ icon:'💰', text:`${pendingCOD.length} طلب COD معلق — ${formatCurrency(pendingCODVal)}`, color:'#F87171', page:'hayyak' })
      if (remainDays > 0 && day > 3) ins.push({ icon:'🎯', text:`بمعدل اليوم — ${formatCurrency(projected)} بنهاية الشهر`, color:'#318CE7' })
      if (newC > 0)  ins.push({ icon:'👥', text:`${newC} عميل جديد هذا الشهر`, color:'#A78BFA' })
      if (avgOrder > 0) ins.push({ icon:'🧾', text:`متوسط قيمة الطلب: ${formatCurrency(avgOrder)}`, color:'#38BDF8' })
      if (delivRate < 70 && monthOrders.length > 5) ins.push({ icon:'📉', text:`معدل التسليم منخفض: ${delivRate}% فقط`, color:'#F87171', page:'orders' })
      if (prods.length > 0) ins.push({ icon:'🏆', text:`الأكثر مبيعاً: ${prods[0].name} (${prods[0].qty} قطعة)`, color:'#FCD34D' })
      setInsights(ins.slice(0, 6))

      setMetrics({
        revenue, prevRev, prevChg, netProfit, grossProfit, opExp, profitMargin,
        todayRev, todayOrds: todayOrds.length, todayChg,
        totalOrders: monthOrders.length, delivered, notDlv, delivRate,
        pendingCODVal, pendingCODCount: pendingCOD.length,
        projected, remainDays, avgOrder, newC,
        monthGoalPct: prevRev > 0 ? Math.min(200, Math.round((revenue / prevRev) * 100)) : 100,
      })
      setAllOrders(orders)

      // 14-day sparkline
      const spark = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toDateString()
        spark.push(orders.filter(o => new Date(o.order_date||o.created_at).toDateString() === ds && o.status !== 'cancelled').reduce((s,o) => s+(o.total||0), 0))
      }
      setSparkData(spark)

      // 30-day chart
      const chart = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toDateString()
        const v = orders.filter(o => new Date(o.order_date||o.created_at).toDateString() === ds && o.status !== 'cancelled' && !o.is_replacement && o.status !== 'not_delivered').reduce((s,o) => s+(o.total||0), 0)
        chart.push({ label: d.toLocaleDateString('ar', { day:'numeric', month:'short' }), value: v })
      }
      setChartData(chart)

    } catch (e) { console.error(e); toast('خطأ في تحميل لوحة القيادة', 'error') }
    finally { setLoading(false) }
  }

  const todayStream = useMemo(() => {
    const ts = new Date(); ts.setHours(0,0,0,0)
    return allOrders.filter(o => new Date(o.order_date||o.created_at) >= ts).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,8)
  }, [allOrders])

  const pipelineCounts = useMemo(() => {
    const c = {}; PIPELINE.forEach(s => { c[s.id] = allOrders.filter(o => o.status === s.id).length }); return c
  }, [allOrders])

  if (loading) return (
    <div className="page">
      <div style={{ height:72, borderRadius:20, background:'var(--bg-surface)', marginBottom:14, opacity:0.5 }} />
      <SkeletonStats count={3} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
        <SkeletonCard rows={5}/><SkeletonCard rows={4}/><SkeletonCard rows={3}/>
      </div>
    </div>
  )

  return (
    <div className="page">
      <style>{`
        @keyframes gradMesh { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulseDot { 0%,100%{box-shadow:0 0 0 0 rgba(0,228,184,0.6)} 60%{box-shadow:0 0 0 7px rgba(0,228,184,0)} }
        @keyframes insIn    { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes barIn    { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes heroIn   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .ins-item { animation: insIn .35s ease both; }
        .ins-item:nth-child(1){animation-delay:.04s} .ins-item:nth-child(2){animation-delay:.10s}
        .ins-item:nth-child(3){animation-delay:.16s} .ins-item:nth-child(4){animation-delay:.22s}
        .ins-item:nth-child(5){animation-delay:.28s} .ins-item:nth-child(6){animation-delay:.34s}
        .hero-m { animation: heroIn .4s ease both; transition: transform .2s, box-shadow .2s; }
        .hero-m:nth-child(1){animation-delay:.03s} .hero-m:nth-child(2){animation-delay:.08s} .hero-m:nth-child(3){animation-delay:.13s}
        .hero-m:hover { transform:translateY(-4px) !important; }
        .db-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:16px; }
        .db-grid2r { display:grid; grid-template-columns:1fr 320px; gap:16px; margin-bottom:16px; }
        .db-grid2l { display:grid; grid-template-columns:300px 1fr; gap:16px; margin-bottom:16px; }
        @media(max-width:900px) {
          .db-grid3  { grid-template-columns:1fr 1fr !important; }
          .db-grid2r { grid-template-columns:1fr !important; }
          .db-grid2l { grid-template-columns:1fr !important; }
        }
        @media(max-width:600px) {
          .db-grid3 { grid-template-columns:1fr !important; }
        }

        /* ── Quick Actions ── */
        .db-quick-actions {
          display: flex; gap: 12px; margin-bottom: 18px;
          overflow-x: auto; padding-bottom: 2px;
          scrollbar-width: none;
        }
        .db-quick-actions::-webkit-scrollbar { display: none; }
        .db-qa-btn {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 10px;
          padding: 13px 18px; border-radius: 14px;
          border: none; cursor: pointer; font-family: inherit;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .db-qa-btn:active { transform: scale(0.95) !important; }
        .db-qa-icon { font-size: 22px; line-height: 1; }
        .db-qa-text { display: flex; flex-direction: column; text-align: right; }
        .db-qa-label { font-size: 14px; font-weight: 800; line-height: 1.2; }
        .db-qa-sub   { font-size: 10px; font-weight: 500; margin-top: 2px; opacity: 0.7; letter-spacing: 0.03em; }

        .db-qa-primary {
          background: linear-gradient(135deg, var(--action-deep, #1a6ec4), var(--action));
          color: #fff;
          box-shadow: 0 4px 20px rgba(49,140,231,0.38);
          min-width: 148px;
        }
        .db-qa-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(49,140,231,0.5); }

        .db-qa-secondary {
          background: var(--bg-surface);
          color: var(--text);
          border: 1.5px solid var(--border-strong);
          box-shadow: var(--card-shadow);
          min-width: 148px;
        }
        .db-qa-secondary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }

        .db-qa-ghost {
          background: var(--bg-surface);
          color: var(--text-secondary);
          border: 1px solid var(--border);
          box-shadow: var(--card-shadow);
          opacity: 0.85;
        }
        .db-qa-ghost:hover { opacity: 1; transform: translateY(-2px); color: var(--action); }

        @media(max-width:600px) {
          .db-qa-primary, .db-qa-secondary { min-width: 130px; }
          .db-qa-ghost .db-qa-text { display: none; }
          .db-qa-ghost { padding: 13px 14px; }
        }
      `}</style>

      {/* ══ GREETING BAR ════════════════════════════════════ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#00E4B8', animation:'pulseDot 2.2s infinite', flexShrink:0 }} />
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--text)', lineHeight:1.2 }}>{getGreeting()} 👋</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date().toLocaleDateString('ar-AE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
          </div>
        </div>
        {metrics?.projected > 0 && metrics?.remainDays > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:999, background:'rgba(49,140,231,0.09)', border:'1px solid rgba(49,140,231,0.2)', fontSize:12, color:'#7EB8F7', fontWeight:700 }}>
            🎯 توقع نهاية الشهر: <span style={{ color:'#318CE7', fontWeight:900, fontFamily:'Inter' }}>{formatCurrency(metrics.projected)}</span>
            <span style={{ color:'var(--text-muted)' }}>({metrics.remainDays} يوم متبقٍ)</span>
          </div>
        )}
      </div>

      {/* ══ QUICK ACTIONS ════════════════════════════════════ */}
      <div className="db-quick-actions">
        {/* Primary: New Order */}
        <button
          className="db-qa-btn db-qa-primary"
          onClick={() => { sessionStorage.setItem('openNewOrder','1'); onNavigate('orders') }}
        >
          <span className="db-qa-icon">➕</span>
          <div className="db-qa-text">
            <span className="db-qa-label">طلب جديد</span>
            <span className="db-qa-sub">New Order</span>
          </div>
        </button>

        {/* Secondary: New Expense */}
        <button
          className="db-qa-btn db-qa-secondary"
          onClick={() => { sessionStorage.setItem('openNewExpense','1'); onNavigate('expenses') }}
        >
          <span className="db-qa-icon">💸</span>
          <div className="db-qa-text">
            <span className="db-qa-label">مصروف جديد</span>
            <span className="db-qa-sub">New Expense</span>
          </div>
        </button>

        {/* Ghost shortcuts */}
        <button className="db-qa-btn db-qa-ghost" onClick={() => onNavigate('customers')}>
          <span className="db-qa-icon">👥</span>
          <div className="db-qa-text">
            <span className="db-qa-label">العملاء</span>
            <span className="db-qa-sub">Customers</span>
          </div>
        </button>
        <button className="db-qa-btn db-qa-ghost" onClick={() => onNavigate('inventory')}>
          <span className="db-qa-icon">📦</span>
          <div className="db-qa-text">
            <span className="db-qa-label">المخزون</span>
            <span className="db-qa-sub">Inventory</span>
          </div>
        </button>
        <button className="db-qa-btn db-qa-ghost" onClick={() => onNavigate('reports')}>
          <span className="db-qa-icon">📊</span>
          <div className="db-qa-text">
            <span className="db-qa-label">التقارير</span>
            <span className="db-qa-sub">Reports</span>
          </div>
        </button>
      </div>

      {/* ══ HERO METRICS — 3 BIG CARDS ══════════════════════ */}
      <div className="db-grid3">
        <HeroMetric
          title="إيراد اليوم"
          value={metrics?.todayRev || 0}
          fmt={v => formatCurrency(v)}
          change={metrics?.todayChg}
          changeSuffix="% عن الأمس"
          sub={`${metrics?.todayOrds || 0} طلب اليوم`}
          color="#318CE7"
          sparkData={sparkData}
          onClick={() => onNavigate('orders')}
          delay={0}
        />
        <HeroMetric
          title="إيراد الشهر"
          value={metrics?.revenue || 0}
          fmt={v => formatCurrency(v)}
          change={metrics?.prevChg}
          changeSuffix="% عن الشهر السابق"
          sub={`${metrics?.totalOrders || 0} طلب · ${metrics?.delivered || 0} مسلّم`}
          color="#8B5CF6"
          progress={metrics?.monthGoalPct}
          onClick={() => onNavigate('reports')}
          delay={1}
        />
        <HeroMetric
          title="صافي الربح"
          value={metrics?.netProfit || 0}
          fmt={v => formatCurrency(v)}
          change={metrics?.profitMargin}
          changeSuffix="% هامش ربح"
          sub={`${formatCurrency(metrics?.opExp || 0)} مصاريف تشغيلية`}
          color={metrics?.netProfit >= 0 ? '#5DD8A4' : '#F87171'}
          onClick={() => onNavigate('accounting')}
          delay={2}
        />
      </div>

      {/* ══ TODAY'S ORDERS (LIVE FEED) ══════════════════════ */}
      <div style={{ marginBottom:16 }}>
        <LiveFeed orders={todayStream} onNavigate={onNavigate} />
      </div>

      {/* ══ PIPELINE FUNNEL + SMART INSIGHTS ════════════════ */}
      <div className="db-grid2r">
        <PipelineFunnel counts={pipelineCounts} onNavigate={onNavigate} />
        <SmartInsights insights={insights} onNavigate={onNavigate} metrics={metrics} newCusts={newCusts} />
      </div>

      {/* ══ 30-DAY REVENUE CHART ════════════════════════════ */}
      {chartData.length > 1 && <RevenueChart data={chartData} />}

      {/* ══ TOP PRODUCTS ════════════════════════════════════ */}
      <TopProductsPanel products={topProducts} />
    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   HERO METRIC CARD — animated counter + sparkline + progress
══════════════════════════════════════════════════════════ */
function HeroMetric({ title, value, fmt, change, changeSuffix, sub, color, sparkData, progress, onClick, delay }) {
  const isPos = change === null || change === undefined ? null : change >= 0

  return (
    <div
      className="hero-m"
      onClick={onClick}
      style={{
        background:'var(--bg-surface)',
        backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
        borderRadius:20, padding:'22px 22px 18px',
        border:`1px solid ${color}22`,
        borderTop:`2.5px solid ${color}`,
        boxShadow:`0 0 40px ${color}0d, var(--card-shadow)`,
        position:'relative', overflow:'hidden', cursor: onClick ? 'pointer' : 'default',
        animationDelay:`${delay * 0.06}s`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 0 56px ${color}20, var(--card-shadow-hover)` }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 0 40px ${color}0d, var(--card-shadow)` }}
    >
      {/* ambient glow */}
      <div style={{ position:'absolute', top:0, insetInlineStart:0, insetInlineEnd:0, height:60, background:`radial-gradient(ellipse at 50% 0%,${color}16,transparent 70%)`, pointerEvents:'none' }} />

      {/* title */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>{title}</div>

      {/* big value */}
      <div style={{ fontSize:28, fontWeight:900, color, fontFamily:'Inter,sans-serif', lineHeight:1, marginBottom:8 }}>
        <AnimNum to={value} fmt={fmt} />
      </div>

      {/* change badge */}
      {change !== null && change !== undefined && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 12px', borderRadius:999, marginBottom:8, fontSize:11, fontWeight:800, background: isPos ? 'rgba(93,216,164,0.15)' : 'rgba(248,113,113,0.15)', color: isPos ? '#5DD8A4' : '#F87171', border:`1px solid ${isPos ? 'rgba(93,216,164,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
          {isPos ? '↑' : '↓'} {Math.abs(change)}{changeSuffix}
        </div>
      )}

      {/* sub */}
      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>

      {/* progress bar (month vs prev) */}
      {progress !== undefined && (
        <div style={{ marginTop:12 }}>
          <div style={{ height:3, borderRadius:99, background:'var(--bg-hover)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(100, progress || 0)}%`, background:`linear-gradient(90deg,${color},${color}99)`, borderRadius:99, transition:'width 1s ease' }} />
          </div>
          <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:4 }}>{progress || 0}% من إيراد الشهر السابق</div>
        </div>
      )}

      {/* mini sparkline */}
      {sparkData && sparkData.length > 1 && (
        <div style={{ position:'absolute', bottom:0, insetInlineStart:0, insetInlineEnd:0, opacity:0.18, pointerEvents:'none' }}>
          <Sparkline data={sparkData} color={color} width={300} height={36} />
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   PIPELINE FUNNEL — visual horizontal bar per status
══════════════════════════════════════════════════════════ */
function PipelineFunnel({ counts, onNavigate }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const max   = Math.max(...Object.values(counts), 1)

  return (
    <div style={{
      background:'var(--bg-surface)',
      backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:20, padding:'20px 22px',
      border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
      boxShadow:'var(--card-shadow)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--text)', marginBottom:2 }}>مسار الطلبات</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{total} طلب إجمالي</div>
        </div>
        <button onClick={() => onNavigate('orders')} style={{ background:'none', border:'none', color:'var(--action)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          إدارة ←
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {PIPELINE.map((s, i) => {
          const count = counts[s.id] || 0
          const pct   = Math.round((count / max) * 100)
          const cv    = count > 0 ? s.color : undefined
          return (
            <div key={s.id} className="dash-pipeline-row">
              <div className="dash-pipeline-label" style={{ '--c': cv } as any}>{s.label}</div>
              <div className="dash-pipeline-track">
                <div className="dash-pipeline-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${s.color}99,${s.color})`, animationDelay:`${i * 0.07}s` }} />
              </div>
              <div className="dash-pipeline-count" style={{ '--c': cv } as any}>{count}</div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div style={{ display:'flex', gap:16, marginTop:18, paddingTop:14, borderTop:'1px solid var(--border)', flexWrap:'wrap' }}>
        {[
          { l:'مسلّم',  v:counts.delivered||0,     c:'#5DD8A4' },
          { l:'لم يتم', v:counts.not_delivered||0, c:'#F87171' },
          { l:'جارية',  v:(counts.new||0)+(counts.confirmed||0)+(counts.processing||0)+(counts.with_hayyak||0)+(counts.shipped||0), c:'#7EB8F7' },
        ].map(s => (
          <div key={s.l} className="dash-summary-stat" style={{ '--c': s.c } as any}>
            <div className="dash-summary-val">{s.v}</div>
            <div className="dash-summary-label">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   SMART INSIGHTS — auto-generated business observations
══════════════════════════════════════════════════════════ */
function SmartInsights({ insights, onNavigate, metrics, newCusts }) {
  return (
    <div style={{
      background:'var(--bg-surface)',
      backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:20, padding:'20px 18px',
      border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
      boxShadow:'var(--card-shadow)', display:'flex', flexDirection:'column',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'rgba(49,140,231,0.12)', border:'1px solid rgba(49,140,231,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>💡</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>تنبيهات ذكية</div>
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>مُحدَّثة لحظياً</div>
        </div>
      </div>

      {insights.length === 0 ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:12, flexDirection:'column', gap:8, padding:'20px 0' }}>
          <div style={{ fontSize:30 }}>✅</div>
          <div>كل شيء على ما يرام</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {insights.map((ins, i) => (
            <div
              key={i}
              className="dash-insight"
              data-clickable={ins.page ? '' : undefined}
              onClick={ins.page ? () => onNavigate(ins.page) : undefined}
              style={{ '--c': ins.color } as any}
            >
              <span className="dash-insight-icon">{ins.icon}</span>
              <span className="dash-insight-text">{ins.text}</span>
              {ins.page && <span className="dash-insight-arrow">←</span>}
            </div>
          ))}
        </div>
      )}

      {/* Quick stats footer */}
      <div style={{ marginTop:'auto', paddingTop:14, borderTop:'1px solid var(--border)', display:'flex', gap:12, flexWrap:'wrap' }}>
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#A78BFA', fontFamily:'Inter' }}>{newCusts}</div>
          <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>عميل جديد</div>
        </div>
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#5DD8A4', fontFamily:'Inter' }}>{metrics?.delivRate || 0}%</div>
          <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>معدل التسليم</div>
        </div>
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#F59E0B', fontFamily:'Inter' }}>{metrics?.pendingCODCount || 0}</div>
          <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>COD معلق</div>
        </div>
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   30-DAY REVENUE CHART — animated SVG with hover tooltip
══════════════════════════════════════════════════════════ */
function RevenueChart({ data: days }) {
  const pathRef  = useRef(null)
  const [drawn,  setDrawn]   = useState(false)
  const [tip,    setTip]     = useState(null)

  useEffect(() => {
    if (!pathRef.current || drawn) return
    const len = pathRef.current.getTotalLength()
    pathRef.current.style.strokeDasharray = `${len} ${len}`
    pathRef.current.style.strokeDashoffset = `${len}`
    const t = setTimeout(() => {
      if (pathRef.current) {
        pathRef.current.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.25,.46,.45,.94)'
        pathRef.current.style.strokeDashoffset = '0'
      }
      setDrawn(true)
    }, 200)
    return () => clearTimeout(t)
  }, [days])

  const W=800, H=130, PL=10, PR=10, PT=14, PB=32
  const maxV = Math.max(...days.map(d=>d.value), 1)
  const total = days.reduce((s,d) => s+d.value, 0)

  const pts = days.map((d,i) => ({
    x: PL + (i/(days.length-1))*(W-PL-PR),
    y: PT + (1-d.value/maxV)*(H-PT-PB),
  }))

  const line = pts.reduce((acc,pt,i) => {
    if (!i) return `M${pt.x},${pt.y}`
    const p = pts[i-1]; const cx = (p.x+pt.x)/2
    return `${acc} C${cx},${p.y} ${cx},${pt.y} ${pt.x},${pt.y}`
  }, '')
  const area = line + ` L${pts[pts.length-1].x},${H-PB} L${pts[0].x},${H-PB} Z`

  const labels = days.map((d,i)=>({...d,i,pt:pts[i]})).filter((_,i)=>!i||i===days.length-1||!(i%7))
  const maxI   = days.findIndex(d=>d.value===maxV)

  return (
    <div style={{
      background:'var(--bg-surface)', backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:20, padding:'20px 22px 14px',
      border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
      boxShadow:'var(--card-shadow)', marginBottom:14, position:'relative',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--text)', marginBottom:2 }}>الإيراد اليومي</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>آخر 30 يوم</div>
        </div>
        <div style={{ textAlign:'end' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#318CE7', fontFamily:'Inter' }}>{formatCurrency(total)}</div>
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>إجمالي الفترة</div>
        </div>
      </div>

      {/* Tooltip */}
      {tip && (
        <div style={{ position:'absolute', zIndex:20, top:tip.y, left:tip.x, transform:'translate(-50%,-110%)', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:'7px 12px', pointerEvents:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.35)', whiteSpace:'nowrap' }}>
          <div style={{ fontSize:13, fontWeight:900, color:'#318CE7', fontFamily:'Inter' }}>{formatCurrency(tip.value)}</div>
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{tip.label}</div>
        </div>
      )}

      <div style={{ position:'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', overflow:'visible', display:'block' }} onMouseLeave={()=>setTip(null)}>
          <defs>
            <linearGradient id="dba30" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#318CE7" stopOpacity="0.28"/>
              <stop offset="100%" stopColor="#318CE7" stopOpacity="0.01"/>
            </linearGradient>
            <filter id="glow30"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {[0.25,0.5,0.75,1].map(f=>(
            <line key={f} x1={PL} y1={PT+(1-f)*(H-PT-PB)} x2={W-PR} y2={PT+(1-f)*(H-PT-PB)} stroke="var(--border)" strokeWidth="0.7" strokeDasharray="3 4"/>
          ))}
          <path d={area} fill="url(#dba30)"/>
          <path ref={pathRef} d={line} fill="none" stroke="#318CE7" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow30)"/>
          {pts[maxI] && <><circle cx={pts[maxI].x} cy={pts[maxI].y} r={10} fill="rgba(49,140,231,0.12)"/><circle cx={pts[maxI].x} cy={pts[maxI].y} r={4.5} fill="#318CE7" style={{filter:'drop-shadow(0 0 5px rgba(49,140,231,0.9))'}}/></>}
          {pts.map((pt,i)=>(
            <circle key={i} cx={pt.x} cy={pt.y} r={12} fill="transparent" style={{cursor:'crosshair'}}
              onMouseEnter={e=>{
                const rect=e.target.closest('svg').getBoundingClientRect()
                setTip({ x:pt.x*(rect.width/W)+22, y:pt.y*(rect.height/H)+36, label:days[i].label, value:days[i].value })
              }}
            />
          ))}
          {labels.map(({label,pt})=>(
            <text key={label+pt.x} x={pt.x} y={H-6} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontFamily="Inter,sans-serif">{label}</text>
          ))}
        </svg>
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   TOP PRODUCTS — derived from order items this month
══════════════════════════════════════════════════════════ */
function TopProductsPanel({ products }) {
  const maxRev = Math.max(...products.map(p=>p.rev), 1)

  return (
    <div style={{
      background:'var(--bg-surface)', backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:20, padding:'20px 18px',
      border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
      boxShadow:'var(--card-shadow)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
        <span style={{ fontSize:20 }}>🏆</span>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>الأكثر مبيعاً</div>
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>هذا الشهر</div>
        </div>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:12 }}>لا توجد بيانات</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {products.map((p, i) => {
            const pct = Math.round((p.rev / maxRev) * 100)
            const colors = ['#318CE7','#8B5CF6','#F59E0B','#5DD8A4','#F87171']
            const c = colors[i % colors.length]
            return (
              <div key={p.name}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <div style={{ width:22, height:22, borderRadius:7, background:`${c}20`, border:`1px solid ${c}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:c, flexShrink:0, fontFamily:'Inter' }}>{i+1}</div>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:800, color:c, fontFamily:'Inter', flexShrink:0, marginRight:8 }}>{formatCurrency(p.rev)}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:'var(--bg-hover)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${c}80,${c})`, borderRadius:99, transition:'width 1s ease', transitionDelay:`${i*0.12}s` }} />
                </div>
                <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:3 }}>{p.qty} قطعة مباعة</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   LIVE FEED — today's orders with status colors
══════════════════════════════════════════════════════════ */
function LiveFeed({ orders, onNavigate }) {
  const statusMap = Object.fromEntries(PIPELINE.map(s=>[s.id,s]))

  return (
    <div style={{
      background:'var(--bg-surface)', backdropFilter:'blur(52px) saturate(1.9)', WebkitBackdropFilter:'blur(52px) saturate(1.9)',
      borderRadius:20, border:'1px solid var(--border-strong)', borderTopColor:'var(--glass-edge)',
      boxShadow:'var(--card-shadow)', display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#00E4B8', animation:'pulseDot 2s infinite' }} />
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>طلبات اليوم</div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>{orders.length} طلب</div>
          </div>
        </div>
        <button onClick={()=>onNavigate('orders')} style={{ background:'none', border:'none', color:'var(--action)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          عرض الكل ←
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, maxHeight:340 }}>
        {orders.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:10 }}>
            <div style={{ fontSize:36, opacity:0.35 }}>📭</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>لا توجد طلبات اليوم بعد</div>
          </div>
        ) : orders.map(o => {
          const s = statusMap[o.status] || { label:o.status, color:'#6B7280' }
          return (
            <div key={o.id} className="dash-feed-item" style={{ '--c': s.color } as any}>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="dash-feed-name">{o.customer_name || 'عميل'}</div>
                <div className="dash-feed-meta">
                  <span className="dash-feed-order-num">{o.order_number}</span>
                  {o.customer_city && <span>· {o.customer_city}</span>}
                  <span>· {timeAgo(o.created_at)}</span>
                </div>
              </div>
              <span className="dash-feed-badge">{s.label}</span>
              <div className="dash-feed-total">{formatCurrency(o.total||0)}</div>
            </div>
          )
        })}
      </div>

      {/* Quick actions footer */}
      <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
        {[
          { l:'+ طلب',    c:'#318CE7', p:'orders'     },
          { l:'+ مصروف',  c:'#F59E0B', p:'expenses'   },
          { l:'التقارير', c:'#5DD8A4', p:'reports'    },
          { l:'المحاسبة', c:'#8B5CF6', p:'accounting' },
        ].map(a => (
          <button key={a.l} onClick={()=>onNavigate(a.p)} className="dash-quick-btn" style={{ '--c': a.c } as any}>
            {a.l}
          </button>
        ))}
      </div>
    </div>
  )
}
