// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Spinner, toast } from '../components/ui'
import type { PageProps } from '../types'

/* ═══════════════════════════════════════════════════════
   ACCOUNTING v9 — Mawj Crystal Gifts
   ▸ Tab 1: الملخص   — Command Center + Health Score
   ▸ Tab 2: التدفق   — Cash Flow River
   ▸ Tab 3: الشراكة  — Partner Dashboard (Ibrahim/Ihsan)
   ▸ Tab 4: شهري     — Time Machine + Monthly Table
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────── HELPERS ─────────────────────────────── */

function mKey(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function mLabel(k) {
  if (!k) return ''
  const [y, m] = k.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('ar-AE', { month: 'long', year: 'numeric' })
}
function mShort(k) {
  if (!k) return ''
  const [y, m] = k.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('ar-AE', { month: 'short' })
}
function allKeys(orders, expenses, remittances) {
  const s = new Set()
  orders.forEach(x => s.add(mKey(x.created_at)))
  expenses.forEach(x => s.add(mKey(x.date)))
  remittances.forEach(x => s.add(mKey(x.date)))
  return [...s].filter(Boolean).sort().reverse()
}
function inMonth(arr, field, key) {
  if (key === 'all') return arr
  return arr.filter(x => mKey(x[field]) === key)
}
function calcPnL(orders, expenses) {
  const ao = orders.filter(o => o.status !== 'cancelled')
  const revenue = ao.filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o) => s + (o.total || 0), 0)
  const discount = ao.reduce((s, o) => s + (o.discount || 0), 0)
  const netRevenue = revenue - discount
  const productCost = ao.reduce((s, o) => s + (o.product_cost || 0), 0)
  const hayyakFees = ao.filter(o => ['delivered', 'not_delivered'].includes(o.status) || o.is_replacement).reduce((s, o) => s + (o.hayyak_fee || 25), 0)
  const grossProfit = ao.reduce((s, o) => s + (o.gross_profit || 0), 0)
  const opExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netProfit = grossProfit - opExpenses
  const margin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0
  const transferFees = expenses.filter(e => e.category === 'رسوم تحويل حياك').reduce((s, e) => s + (e.amount || 0), 0)
  return { revenue, discount, netRevenue, productCost, hayyakFees, grossProfit, opExpenses, netProfit, margin, transferFees }
}

/* ─────────────────────────────── HOOKS ─────────────────────────────── */

function useCountUp(target) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (typeof target !== 'number') return
    const start = performance.now()
    const dur = 1400
    function tick(now) {
      const p = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(target * e))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    setVal(0)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])
  return val
}

function useChartMount() {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 200); return () => clearTimeout(t) }, [])
  return ready
}

/* ─────────────────────────────── SUB-COMPONENTS ─────────────────────────────── */

function CircleGauge({ pct = 0, size = 110, color = 'var(--action)', label, sub, glow = false }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const [off, setOff] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOff(circ * (1 - Math.max(0, Math.min(1, pct)))), 150)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          filter={glow ? `drop-shadow(0 0 8px ${color})` : 'none'}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34,1.4,0.64,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {label !== undefined && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: size * 0.21, color, lineHeight: 1 }}>{label}</span>
        )}
        {sub && <span style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.3, textAlign: 'center', padding: '0 6px' }}>{sub}</span>}
      </div>
    </div>
  )
}

function AnimBar({ pct = 0, color = 'var(--action)', h = 8, delay = 0, glow = false }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(1, pct)) * 100), delay + 120)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div style={{ height: h, borderRadius: h / 2, background: 'var(--bg-hover)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${w}%`, background: color, borderRadius: h / 2,
        transition: `width 1.3s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
        boxShadow: glow ? `0 0 10px ${color}55` : 'none',
      }} />
    </div>
  )
}

/* ─────────────────────────────── MAIN COMPONENT ─────────────────────────────── */

const TABS = [
  { id: 'summary',  label: 'الملخص',  icon: '📊' },
  { id: 'cash',     label: 'التدفق',  icon: '💸' },
  { id: 'partners', label: 'الشراكة', icon: '🤝' },
  { id: 'monthly',  label: 'شهري',    icon: '📅' },
]

export default function Accounting(_: PageProps) {
  const [orders,      setOrders]      = useState([])
  const [remittances, setRemittances] = useState([])
  const [expenses,    setExpenses]    = useState([])
  const [capital,     setCapital]     = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [partners,    setPartners]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('summary')
  const [monthFilter, setMonthFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      DB.list('orders',             { orderBy: 'created_at' }),
      DB.list('hayyak_remittances', { orderBy: 'date' }),
      DB.list('expenses',           { orderBy: 'date' }),
      DB.list('capital_entries',    { orderBy: 'date' }),
      DB.list('withdrawals',        { orderBy: 'date' }),
      Settings.get('partners'),
    ]).then(([o, r, e, c, w, p]) => {
      setOrders(o); setRemittances(r); setExpenses(e)
      setCapital(c); setWithdrawals(w)
      setPartners(p || [{ id: 'p_001', name: 'إبراهيم', share: 50 }, { id: 'p_002', name: 'إحسان', share: 50 }])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  /* All-time P&L (used across tabs) */
  const pnlAll = useMemo(() => calcPnL(orders, expenses), [orders, expenses])

  /* Month-filtered P&L (for summary tab) */
  const filtOrders   = useMemo(() => inMonth(orders,   'created_at', monthFilter), [orders,   monthFilter])
  const filtExpenses = useMemo(() => inMonth(expenses,  'date',       monthFilter), [expenses, monthFilter])
  const pnl = useMemo(() => calcPnL(filtOrders, filtExpenses), [filtOrders, filtExpenses])

  /* Cash position (all-time) */
  const cash = useMemo(() => {
    const bankFromHayyak  = remittances.reduce((s, r) => s + (r.bank_received   || 0), 0)
    const capitalDeposits = capital.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
    const totalIn         = bankFromHayyak + capitalDeposits
    const companyExpenses = expenses.filter(e => e.paid_by === 'company' || !e.paid_by).reduce((s, e) => s + (e.amount || 0), 0)
    const totalWithdraw   = withdrawals.reduce((s, w) => s + (w.amount || 0), 0)
    const capitalWithdraw = capital.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)
    const totalOut        = companyExpenses + totalWithdraw + capitalWithdraw
    const unreimbursed    = expenses.filter(e => e.paid_by && e.paid_by !== 'company' && !e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0)
    const estimatedCash   = totalIn - totalOut - unreimbursed
    const pendingCOD      = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id).reduce((s, o) => s + (o.total || 0), 0)
    const pendingFees     = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id).reduce((s, o) => s + (o.hayyak_fee || 25), 0)
    return { bankFromHayyak, capitalDeposits, totalIn, companyExpenses, totalWithdraw, capitalWithdraw, totalOut, unreimbursed, estimatedCash, pendingCOD, pendingFees, expectedFromHayyak: pendingCOD - pendingFees }
  }, [orders, remittances, expenses, capital, withdrawals])

  /* Financial Health Score (0–100) */
  const health = useMemo(() => {
    // Margin score (40 pts) — target: >30%
    const mScore = Math.min(40, Math.max(0, (pnlAll.margin / 40) * 40))
    // Expense ratio score (20 pts) — lower op expenses relative to gross is better
    const expRatio = pnlAll.grossProfit > 0 ? pnlAll.opExpenses / pnlAll.grossProfit : 1
    const eScore = Math.min(20, Math.max(0, (1 - Math.min(1, expRatio)) * 20))
    // Cash coverage (20 pts) — months of expenses covered
    const keys = allKeys(orders, expenses, remittances)
    const monthlyExp = keys.length > 0 ? pnlAll.opExpenses / keys.length : 0
    const covMonths = monthlyExp > 0 ? Math.min(4, cash.estimatedCash / monthlyExp) / 4 : 0.5
    const cScore = Math.max(0, covMonths) * 20
    // Growth score (20 pts) — last month vs previous
    let gScore = 10
    if (keys.length >= 2) {
      const cur  = calcPnL(inMonth(orders, 'created_at', keys[0]), inMonth(expenses, 'date', keys[0])).netProfit
      const prev = calcPnL(inMonth(orders, 'created_at', keys[1]), inMonth(expenses, 'date', keys[1])).netProfit
      if (cur > prev && cur > 0) gScore = 20
      else if (cur > 0) gScore = 13
      else gScore = 3
    }
    const total = Math.round(Math.max(0, mScore + eScore + cScore + gScore))
    const label = total >= 80 ? 'ممتاز' : total >= 60 ? 'جيد' : total >= 40 ? 'متوسط' : 'يحتاج تحسين'
    const color = total >= 80 ? 'var(--action)' : total >= 60 ? 'var(--success)' : total >= 40 ? 'var(--warning)' : 'var(--danger)'
    return { total, mScore: Math.round(mScore), eScore: Math.round(eScore), cScore: Math.round(Math.max(0,cScore)), gScore: Math.round(gScore), label, color }
  }, [pnlAll, cash, orders, expenses, remittances])

  const monthKeys = useMemo(() => allKeys(orders, expenses, remittances), [orders, expenses, remittances])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36} />
    </div>
  )

  return (
    <div className="acc-page">
      <style>{CSS}</style>

      {/* ── Tab bar ── */}
      <div className="acc-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`acc-tab${tab === t.id ? ' acc-tab-active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="acc-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div key={tab} className="acc-content">
        {tab === 'summary'  && <SummaryTab  pnl={pnl} pnlAll={pnlAll} health={health} monthFilter={monthFilter} setMonthFilter={setMonthFilter} monthKeys={monthKeys} />}
        {tab === 'cash'     && <CashTab2    cash={cash} orders={orders} expenses={expenses} remittances={remittances} />}
        {tab === 'partners' && <PartnersTab2 orders={orders} expenses={expenses} capital={capital} withdrawals={withdrawals} partners={partners} pnlAll={pnlAll} />}
        {tab === 'monthly'  && <MonthlyTab2 orders={orders} expenses={expenses} remittances={remittances} monthKeys={monthKeys} />}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 1 — SUMMARY (Command Center + Health Score)
══════════════════════════════════════════════════════ */
function SummaryTab({ pnl, pnlAll, health, monthFilter, setMonthFilter, monthKeys }) {
  const animNet  = useCountUp(pnl.netProfit)
  const animRev  = useCountUp(pnl.netRevenue)
  const animGros = useCountUp(pnl.grossProfit)
  const animExp  = useCountUp(pnl.opExpenses)

  const waterfallMax = Math.max(
    pnl.netRevenue, pnl.productCost + pnl.hayyakFees, pnl.opExpenses, Math.abs(pnl.netProfit), 1
  )

  const FACTORS = [
    { label: 'هامش الربح',    score: health.mScore, max: 40, color: 'var(--action)',  detail: `${pnl.margin.toFixed(1)}%` },
    { label: 'نسبة المصاريف', score: health.eScore, max: 20, color: '#60a5fa',        detail: pnl.grossProfit > 0 ? (pnl.opExpenses / pnl.grossProfit * 100).toFixed(0) + '%' : '-' },
    { label: 'غطاء السيولة',  score: health.cScore, max: 20, color: 'var(--success)', detail: '' },
    { label: 'مسار النمو',    score: health.gScore, max: 20, color: 'var(--warning)', detail: '' },
  ]

  const WATERFALL = [
    { label: 'صافي الإيرادات',     v: pnl.netRevenue,   c: 'var(--action)', sign: '' },
    { label: 'تكلفة المنتجات',     v: pnl.productCost,  c: 'var(--danger)', sign: '−' },
    { label: 'رسوم حياك',          v: pnl.hayyakFees,   c: '#f97316',       sign: '−' },
    { label: 'الربح الإجمالي',     v: pnl.grossProfit,  c: pnl.grossProfit >= 0 ? 'var(--action)' : 'var(--danger)', sign: pnl.grossProfit >= 0 ? '' : '' },
    { label: 'مصاريف تشغيلية',    v: pnl.opExpenses,   c: 'var(--danger)', sign: '−' },
    { label: 'صافي الربح',         v: pnl.netProfit,    c: pnl.netProfit >= 0 ? 'var(--action)' : 'var(--danger)', sign: pnl.netProfit >= 0 ? '+' : '' },
  ]

  return (
    <div>
      {/* Hero: gauge + net profit */}
      <div className="acc-hero">
        <CircleGauge pct={health.total / 100} size={118} color={health.color} label={health.total} sub={health.label} glow />
        <div className="acc-hero-right">
          <div className="acc-hero-label">صافي الربح {monthFilter === 'all' ? '(كل الوقت)' : `— ${mLabel(monthFilter)}`}</div>
          <div className="acc-hero-amount" style={{ color: pnl.netProfit >= 0 ? 'var(--action)' : 'var(--danger)' }}>
            {pnl.netProfit >= 0 ? '+' : ''}{formatCurrency(animNet)}
          </div>
          <div className="acc-hero-margin">
            هامش:&nbsp;
            <strong style={{ fontFamily: 'Inter', color: pnl.margin >= 20 ? 'var(--action)' : pnl.margin >= 0 ? 'var(--warning)' : 'var(--danger)' }}>
              {pnl.margin.toFixed(1)}%
            </strong>
          </div>
          <div className="acc-health-pill" style={{ background: `${health.color}18`, color: health.color }}>
            تقييم الصحة: {health.total}/100 — {health.label}
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="acc-kpis">
        {[
          { l: 'الإيرادات',   val: animRev,  raw: pnl.netRevenue,  c: 'var(--action)' },
          { l: 'ربح إجمالي',  val: animGros, raw: pnl.grossProfit, c: pnl.grossProfit >= 0 ? 'var(--action)' : 'var(--danger)' },
          { l: 'المصاريف',    val: animExp,  raw: pnl.opExpenses,  c: 'var(--danger)' },
          { l: 'صافي الربح',  val: Math.abs(animNet), raw: pnl.netProfit, c: pnl.netProfit >= 0 ? 'var(--action)' : 'var(--danger)' },
        ].map(k => (
          <div key={k.l} className="acc-kpi">
            <div className="acc-kpi-val" style={{ color: k.c }}>{k.raw < 0 ? '−' : ''}{formatCurrency(k.val)}</div>
            <div className="acc-kpi-label">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Month filter chips */}
      <div className="acc-chips-scroll">
        {[{ k: 'all', l: 'كل الوقت' }, ...monthKeys.map(k => ({ k, l: mLabel(k) }))].map(m => (
          <button key={m.k} className={`acc-chip${monthFilter === m.k ? ' active' : ''}`} onClick={() => setMonthFilter(m.k)}>
            {m.l}
          </button>
        ))}
      </div>

      {/* Health score factors */}
      <div className="acc-card">
        <div className="acc-section-title">مؤشرات الصحة المالية</div>
        {FACTORS.map((f, i) => (
          <div key={f.label} className="acc-factor-row">
            <div className="acc-factor-label">
              <span>{f.label}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {f.detail && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter' }}>{f.detail}</span>}
                <span style={{ fontFamily: 'Inter', color: f.color, fontWeight: 800 }}>{f.score}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{f.max}</span></span>
              </div>
            </div>
            <AnimBar pct={f.score / f.max} color={f.color} h={10} delay={i * 100} glow />
          </div>
        ))}
      </div>

      {/* Waterfall P&L chart */}
      <div className="acc-card">
        <div className="acc-section-title">شلال الأرباح والخسائر</div>
        <div className="acc-waterfall">
          {WATERFALL.map((row, i) => (
            <div key={i} className="acc-wf-row">
              <div className="acc-wf-label">{row.label}</div>
              <div className="acc-wf-bar">
                <AnimBar pct={Math.abs(row.v) / waterfallMax} color={row.c} h={22} delay={i * 90} />
              </div>
              <div className="acc-wf-val" style={{ color: row.c }}>{row.sign}{formatCurrency(Math.abs(row.v))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 2 — CASH FLOW RIVER
══════════════════════════════════════════════════════ */
function CashTab2({ cash, orders, expenses, remittances }) {
  const animCash = useCountUp(cash.estimatedCash)
  const animIn   = useCountUp(cash.totalIn)
  const animOut  = useCountUp(cash.totalOut)
  const chartReady = useChartMount()

  /* Last 6 months data for bar chart */
  const monthKeys = useMemo(() => allKeys(orders, expenses, remittances).slice(0, 6).reverse(), [orders, expenses, remittances])
  const monthlyData = useMemo(() => monthKeys.map(k => ({
    key: k, label: mShort(k),
    cash:     inMonth(remittances, 'date',        k).reduce((s, r) => s + (r.bank_received || 0), 0),
    exps:     inMonth(expenses,    'date',        k).reduce((s, e) => s + (e.amount        || 0), 0),
    revenue:  inMonth(orders,      'created_at',  k).filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o) => s + (o.total || 0), 0),
  })), [monthKeys, orders, expenses, remittances])
  const chartMax = Math.max(...monthlyData.flatMap(d => [d.cash, d.exps, d.revenue]), 1)

  /* Smart alerts */
  const alerts = useMemo(() => {
    const a = []
    if (cash.estimatedCash < 0)         a.push({ t: 'danger',  m: '⚠️ الرصيد التقديري سالب — راجع التدفق النقدي فوراً' })
    if (cash.unreimbursed > 500)         a.push({ t: 'warning', m: `💳 الشركة مدينة للشركاء بـ ${formatCurrency(cash.unreimbursed)} (مصاريف غير مسترجعة)` })
    if (cash.expectedFromHayyak > 0)     a.push({ t: 'info',    m: `⏳ في الطريق من حياك: ${formatCurrency(cash.expectedFromHayyak)}` })
    const expRatio = cash.totalIn > 0 ? cash.totalOut / cash.totalIn : 0
    if (expRatio > 0.9 && cash.totalIn > 0) a.push({ t: 'danger', m: `📉 الصرف ${(expRatio * 100).toFixed(0)}% من الدخل — مخاطرة عالية` })
    return a
  }, [cash])

  const flowTotal = Math.max(cash.totalIn + cash.totalOut, 1)

  return (
    <div>
      {/* Cash balance hero */}
      <div className="acc-cash-hero" style={{
        background:   cash.estimatedCash >= 0 ? 'rgba(49,140,231,0.06)'  : 'rgba(239,68,68,0.06)',
        border: `1.5px solid ${cash.estimatedCash >= 0 ? 'rgba(49,140,231,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}>
        <div className="acc-cash-label">الرصيد التقديري في البنك</div>
        <div className="acc-cash-amount" style={{ color: cash.estimatedCash >= 0 ? 'var(--action)' : 'var(--danger)' }}>
          {cash.estimatedCash >= 0 ? '+' : ''}{formatCurrency(animCash)}
        </div>
        <div className="acc-cash-sub">حياك + رأس المال − المصاريف − المسحوبات</div>
      </div>

      {/* Smart alerts */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {alerts.map((a, i) => (
            <div key={i} className={`acc-alert acc-alert-${a.t}`}>{a.m}</div>
          ))}
        </div>
      )}

      {/* Flow River */}
      <div className="acc-card">
        <div className="acc-section-title">مسار التدفق النقدي</div>
        <div className="acc-flow-totals">
          <div className="acc-flow-total-in">
            <div className="acc-flow-total-label" style={{ color: 'var(--action)' }}>دخل نقدي</div>
            <div className="acc-flow-total-val" style={{ color: 'var(--action)' }}>{formatCurrency(animIn)}</div>
          </div>
          <div className="acc-flow-total-divider">⇄</div>
          <div className="acc-flow-total-out">
            <div className="acc-flow-total-label" style={{ color: 'var(--danger)' }}>صرف نقدي</div>
            <div className="acc-flow-total-val" style={{ color: 'var(--danger)' }}>{formatCurrency(animOut)}</div>
          </div>
        </div>

        {/* IN streams */}
        <div className="acc-stream-section">
          <div className="acc-stream-header" style={{ color: 'var(--action)' }}>↑ المداخيل</div>
          {[
            { l: 'تحويلات حياك',  v: cash.bankFromHayyak,  c: 'var(--action)' },
            { l: 'رأس مال مودع',  v: cash.capitalDeposits, c: '#60a5fa' },
          ].map((row, i) => (
            <div key={i} className="acc-stream-row">
              <span className="acc-stream-label">{row.l}</span>
              <div style={{ flex: 1 }}><AnimBar pct={row.v / flowTotal} color={row.c} h={14} delay={i * 100} glow /></div>
              <span className="acc-stream-val" style={{ color: row.c }}>{formatCurrency(row.v)}</span>
            </div>
          ))}
        </div>

        {/* OUT streams */}
        <div className="acc-stream-section" style={{ marginTop: 12 }}>
          <div className="acc-stream-header" style={{ color: 'var(--danger)' }}>↓ المصاريف</div>
          {[
            { l: 'مصاريف الشركة',  v: cash.companyExpenses,  c: 'var(--danger)' },
            { l: 'مسحوبات الشركاء', v: cash.totalWithdraw,   c: '#f97316' },
            ...(cash.capitalWithdraw > 0 ? [{ l: 'سحب رأس مال', v: cash.capitalWithdraw, c: '#ef4444' }] : []),
          ].map((row, i) => (
            <div key={i} className="acc-stream-row">
              <span className="acc-stream-label">{row.l}</span>
              <div style={{ flex: 1 }}><AnimBar pct={row.v / flowTotal} color={row.c} h={14} delay={i * 100} /></div>
              <span className="acc-stream-val" style={{ color: row.c }}>−{formatCurrency(row.v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly bar chart */}
      {monthlyData.length > 0 && (
        <div className="acc-card">
          <div className="acc-section-title">الاتجاه الشهري (آخر 6 أشهر)</div>
          <div className="acc-mchart-wrap">
            {monthlyData.map((d, i) => (
              <div key={d.key} className="acc-mchart-col">
                <div className="acc-mchart-bars">
                  <div className="acc-mchart-bar" style={{ height: chartReady ? `${(d.revenue / chartMax) * 90}%` : '0%', background: 'var(--action)', opacity: 0.3, transition: `height 1.1s cubic-bezier(0.34,1.2,0.64,1) ${i*60}ms` }} />
                  <div className="acc-mchart-bar" style={{ height: chartReady ? `${(d.cash    / chartMax) * 90}%` : '0%', background: 'var(--action)',              transition: `height 1.1s cubic-bezier(0.34,1.2,0.64,1) ${i*60+100}ms` }} />
                  <div className="acc-mchart-bar" style={{ height: chartReady ? `${(d.exps    / chartMax) * 90}%` : '0%', background: 'var(--danger)',              transition: `height 1.1s cubic-bezier(0.34,1.2,0.64,1) ${i*60+200}ms` }} />
                </div>
                <div className="acc-mchart-label">{d.label}</div>
              </div>
            ))}
          </div>
          <div className="acc-legend">
            <span><span className="acc-legend-dot" style={{ background: 'var(--action)', opacity: 0.3 }} />إيرادات</span>
            <span><span className="acc-legend-dot" style={{ background: 'var(--action)' }} />نقد حياك</span>
            <span><span className="acc-legend-dot" style={{ background: 'var(--danger)' }} />مصاريف</span>
          </div>
        </div>
      )}

      {/* Pending from Hayyak */}
      {cash.expectedFromHayyak > 0 && (
        <div className="acc-card" style={{ border: '1.5px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.03)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warning)', marginBottom: 10 }}>⏳ متوقع من حياك (قيد التسوية)</div>
          {[
            { l: 'COD المعلق',         v: cash.pendingCOD,           c: 'var(--text)',    s: '' },
            { l: 'رسوم حياك المتوقعة', v: cash.pendingFees,          c: 'var(--danger)', s: '−' },
            { l: 'الصافي المتوقع',      v: cash.expectedFromHayyak,  c: 'var(--warning)',s: '' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: `${i === 2 ? '10px 0 0' : '5px 0'}`, borderTop: i === 2 ? '1px solid rgba(245,158,11,0.2)' : 'none', marginTop: i === 2 ? 6 : 0 }}>
              <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{r.l}</span>
              <span style={{ fontFamily: 'Inter', fontWeight: i === 2 ? 900 : 600, color: r.c }}>{r.s}{formatCurrency(r.v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Unreimbursed */}
      {cash.unreimbursed > 0 && (
        <div className="acc-card" style={{ border: '1.5px solid rgba(167,139,250,0.25)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#a78bfa', marginBottom: 6 }}>💳 مصاريف شخصية غير مسترجعة</div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Inter', color: '#a78bfa' }}>{formatCurrency(cash.unreimbursed)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>الشركة مدينة للشركاء بهذا المبلغ — يُطرح من الرصيد النقدي</div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 3 — PARTNER DASHBOARD
══════════════════════════════════════════════════════ */
const P_COLOR = { 'إبراهيم': '#318CE7', 'إحسان': '#8b5cf6' }
const P_SOFT  = { 'إبراهيم': 'rgba(49,140,231,0.08)', 'إحسان': 'rgba(139,92,246,0.08)' }

function PartnersTab2({ orders, expenses, capital, withdrawals, partners, pnlAll }) {
  const animNet = useCountUp(pnlAll.netProfit)

  const partnerData = useMemo(() => partners.map(p => {
    const share       = (p.share || 50) / 100
    const myCapital   = capital.filter(c => c.partner_id === p.id || c.partner_name === p.name)
    const myWithdraw  = withdrawals.filter(w => w.partner_id === p.id || w.partner_name === p.name)
    const myExpenses  = expenses.filter(e =>
      (e.paid_by === 'ibrahim' && p.name === 'إبراهيم') ||
      (e.paid_by === 'ihsan'   && p.name === 'إحسان')
    )
    const capitalIn    = myCapital.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
    const capitalOut   = myCapital.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)
    const totalWithdraw= myWithdraw.filter(w => w.type !== 'reimbursement').reduce((s, w) => s + (w.amount || 0), 0)
    const profitShare  = pnlAll.netProfit * share
    const expensePaid  = myExpenses.reduce((s, e) => s + (e.amount || 0), 0)
    const reimbursed   = myExpenses.filter(e => e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0)
    const unreimbursed = expensePaid - reimbursed
    const netEquity    = capitalIn - capitalOut + profitShare - totalWithdraw + unreimbursed
    const maxVal       = Math.max(capitalIn, Math.abs(profitShare), totalWithdraw, expensePaid, 1)
    return { ...p, share, capitalIn, capitalOut, totalWithdraw, profitShare, expensePaid, reimbursed, unreimbursed, netEquity, maxVal }
  }), [partners, pnlAll, capital, withdrawals, expenses])

  const maxEquity = Math.max(...partnerData.map(p => Math.abs(p.netEquity)), 1)
  const leader    = partnerData.length > 0 ? partnerData.reduce((a, b) => a.netEquity > b.netEquity ? a : b) : null

  return (
    <div>
      {/* Total profit summary */}
      <div className="acc-card">
        <div className="acc-section-title">توزيع الأرباح</div>
        <div className="acc-partner-header">
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>إجمالي صافي الربح (كل الوقت)</div>
            <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'Inter', color: pnlAll.netProfit >= 0 ? 'var(--action)' : 'var(--danger)' }}>
              {pnlAll.netProfit >= 0 ? '+' : ''}{formatCurrency(animNet)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {partners.map(p => {
              const color = P_COLOR[p.name] || 'var(--action)'
              const share = (p.share || 50) / 100
              return (
                <div key={p.id} style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: P_SOFT[p.name] || 'var(--bg-hover)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color, marginBottom: 4, fontSize: 16 }}>
                    {p.name.charAt(0)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'Inter', color }}>{formatCurrency(Math.abs(pnlAll.netProfit * share))}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.share}%</div>
                </div>
              )
            })}
          </div>
        </div>
        {leader && (
          <div className="acc-leader-badge" style={{ background: P_SOFT[leader.name], color: P_COLOR[leader.name] || 'var(--action)' }}>
            👑 {leader.name} لديه أعلى صافي حقوق ملكية
          </div>
        )}
      </div>

      {/* Per-partner cards */}
      <div className="acc-partner-cards">
        {partnerData.map(p => {
          const color    = P_COLOR[p.name]  || 'var(--action)'
          const soft     = P_SOFT[p.name]   || 'rgba(49,140,231,0.08)'
          const equityPct = Math.abs(p.netEquity) / maxEquity

          const breakdownItems = [
            { l: 'رأس مال مودع',            v: p.capitalIn,     c: 'var(--action)', s: '+' },
            ...(p.capitalOut > 0 ? [{ l: 'سحب رأس مال', v: p.capitalOut, c: 'var(--danger)', s: '−' }] : []),
            { l: `حصة الأرباح (${Math.round(p.share * 100)}%)`, v: p.profitShare,   c: color,           s: p.profitShare >= 0 ? '+' : '' },
            ...(p.totalWithdraw > 0 ? [{ l: 'مسحوبات', v: p.totalWithdraw, c: 'var(--danger)', s: '−' }] : []),
            ...(p.expensePaid > 0   ? [{ l: 'مصاريف شخصية', v: p.expensePaid, c: '#a78bfa', s: '+' }] : []),
          ]

          return (
            <div key={p.id} className="acc-partner-card" style={{ borderTop: `3px solid ${color}` }}>
              {/* Card header */}
              <div className="acc-partner-card-header" style={{ background: soft }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 20 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(p.share * 100)}% من الأرباح</div>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Inter', color, marginTop: 8 }}>
                    {p.netEquity >= 0 ? '+' : ''}{formatCurrency(p.netEquity)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>صافي حقوق الملكية</div>
                </div>
                <CircleGauge pct={equityPct} size={92} color={color} label={`${Math.round(equityPct * 100)}%`} glow />
              </div>

              {/* Breakdown bars */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>التفاصيل</div>
                {breakdownItems.map((row, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sec)', marginBottom: 4 }}>
                      <span>{row.l}</span>
                      <span style={{ fontFamily: 'Inter', color: row.c, fontWeight: 700 }}>{row.s}{formatCurrency(Math.abs(row.v))}</span>
                    </div>
                    <AnimBar pct={Math.abs(row.v) / p.maxVal} color={row.c} h={7} delay={i * 80} />
                  </div>
                ))}
              </div>

              {/* Unreimbursed note */}
              {p.unreimbursed > 0 && (
                <div style={{ padding: '10px 16px', background: soft, fontSize: 12, color: 'var(--text-sec)', borderTop: '1px solid var(--border)' }}>
                  الشركة مدينة لـ{p.name} بـ <strong style={{ fontFamily: 'Inter', color }}>{formatCurrency(p.unreimbursed)}</strong> (مصاريف غير مسترجعة)
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 4 — MONTHLY TIME MACHINE
══════════════════════════════════════════════════════ */
function MonthlyTab2({ orders, expenses, remittances, monthKeys }) {
  const [selected, setSelected] = useState(monthKeys[0] || null)
  const chartReady = useChartMount()

  const rows = useMemo(() => monthKeys.map(k => {
    const mo = inMonth(orders,      'created_at', k).filter(o => o.status !== 'cancelled')
    const me = inMonth(expenses,    'date',        k)
    const mr = inMonth(remittances, 'date',        k)
    const revenue     = mo.filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o) => s + (o.total || 0), 0)
    const productCost = mo.reduce((s, o) => s + (o.product_cost || 0), 0)
    const hayyakFees  = mo.reduce((s, o) => s + (o.hayyak_fee   || 0), 0)
    const grossProfit = mo.reduce((s, o) => s + (o.gross_profit  || 0), 0)
    const opExpenses  = me.reduce((s, e) => s + (e.amount        || 0), 0)
    const netProfit   = grossProfit - opExpenses
    const cashReceived= mr.reduce((s, r) => s + (r.bank_received || 0), 0)
    return { key: k, label: mLabel(k), short: mShort(k), revenue, productCost, hayyakFees, grossProfit, opExpenses, netProfit, cashReceived, ordersCount: mo.length }
  }), [monthKeys, orders, expenses, remittances])

  const sel = rows.find(r => r.key === selected) || rows[0] || null

  /* Chart uses last 8 months in chronological order */
  const chartRows = [...rows].slice(0, 8).reverse()
  const chartMax  = Math.max(...chartRows.flatMap(r => [r.revenue, Math.abs(r.netProfit)]), 1)

  const best  = rows.length > 0 ? rows.reduce((a, b) => a.netProfit > b.netProfit ? a : b) : null
  const worst = rows.length > 0 ? rows.reduce((a, b) => a.netProfit < b.netProfit ? a : b) : null

  if (rows.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>لا توجد بيانات شهرية بعد</div>
  )

  return (
    <div>
      {/* Best / Worst badges */}
      {rows.length >= 2 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div className="acc-bw best">
            <span>🏆 أفضل شهر</span>
            <strong>{best?.short}</strong>
            <span style={{ fontFamily: 'Inter' }}>{formatCurrency(best?.netProfit || 0)}</span>
          </div>
          <div className="acc-bw worst">
            <span>📉 أقل شهر</span>
            <strong>{worst?.short}</strong>
            <span style={{ fontFamily: 'Inter' }}>{formatCurrency(worst?.netProfit || 0)}</span>
          </div>
        </div>
      )}

      {/* Month chips (horizontal scroll) */}
      <div className="acc-chips-scroll" style={{ marginBottom: 12 }}>
        {rows.map(r => (
          <button key={r.key}
            className={`acc-mchip${selected === r.key ? ' active' : ''}`}
            style={selected === r.key ? { background: 'var(--action)', color: '#fff', borderColor: 'var(--action)' } : {}}
            onClick={() => setSelected(r.key)}
          >
            <div className="acc-mchip-name">{r.short}</div>
            <div className="acc-mchip-profit" style={{ color: selected === r.key ? 'rgba(255,255,255,0.8)' : r.netProfit >= 0 ? 'var(--action)' : 'var(--danger)' }}>
              {r.netProfit >= 0 ? '+' : ''}{formatCurrency(Math.abs(r.netProfit)).replace('AED', '').trim()}
            </div>
          </button>
        ))}
      </div>

      {/* 8-month comparison chart */}
      {chartRows.length > 1 && (
        <div className="acc-card">
          <div className="acc-section-title">مقارنة الأداء (آخر 8 أشهر)</div>
          <div className="acc-mchart-wrap">
            {chartRows.map((r, i) => (
              <div key={r.key} className="acc-mchart-col" onClick={() => setSelected(r.key)} style={{ cursor: 'pointer' }}>
                <div className="acc-mchart-bars">
                  <div style={{ flex: 1, borderRadius: '2px 2px 0 0', minHeight: 2, background: 'var(--action)', opacity: 0.28, transition: `height 1.1s cubic-bezier(0.34,1.2,0.64,1) ${i*50}ms`, height: chartReady ? `${(r.revenue / chartMax) * 90}%` : '0%' }} />
                  <div style={{ flex: 1, borderRadius: '2px 2px 0 0', minHeight: 2, background: r.netProfit >= 0 ? 'var(--action)' : 'var(--danger)', transition: `height 1.1s cubic-bezier(0.34,1.2,0.64,1) ${i*50+100}ms`, height: chartReady ? `${(Math.abs(r.netProfit) / chartMax) * 90}%` : '0%' }} />
                </div>
                <div style={{ fontSize: 9, color: r.key === selected ? 'var(--action)' : 'var(--text-muted)', fontWeight: r.key === selected ? 800 : 400, marginTop: 4, whiteSpace: 'nowrap', textAlign: 'center' }}>{r.short}</div>
              </div>
            ))}
          </div>
          <div className="acc-legend" style={{ marginTop: 8 }}>
            <span><span className="acc-legend-dot" style={{ background: 'var(--action)', opacity: 0.3 }} />إيرادات</span>
            <span><span className="acc-legend-dot" style={{ background: 'var(--action)' }} />صافي الربح</span>
          </div>
        </div>
      )}

      {/* Selected month P&L detail */}
      {sel && (
        <div className="acc-card">
          <div className="acc-section-title">{sel.label}</div>
          <div className="acc-kpis" style={{ marginBottom: 16 }}>
            {[
              { l: 'الإيرادات',   v: sel.revenue,      c: 'var(--action)' },
              { l: 'ربح إجمالي',  v: sel.grossProfit,  c: sel.grossProfit >= 0 ? 'var(--action)' : 'var(--danger)' },
              { l: 'المصاريف',    v: sel.opExpenses,   c: 'var(--danger)' },
              { l: 'صافي الربح',  v: sel.netProfit,    c: sel.netProfit >= 0 ? 'var(--action)' : 'var(--danger)' },
            ].map(k => (
              <div key={k.l} className="acc-kpi">
                <div className="acc-kpi-val" style={{ color: k.c }}>{formatCurrency(k.v)}</div>
                <div className="acc-kpi-label">{k.l}</div>
              </div>
            ))}
          </div>
          {[
            { l: 'مبيعات المنتجات',     v: sel.revenue,     s: '',  c: 'var(--text)',    b: false },
            { l: 'تكلفة المنتجات',      v: sel.productCost, s: '−', c: 'var(--danger)', b: false },
            { l: 'رسوم توصيل حياك',    v: sel.hayyakFees,  s: '−', c: 'var(--danger)', b: false },
            { l: 'الربح الإجمالي',      v: sel.grossProfit, s: sel.grossProfit >= 0 ? '+' : '', c: sel.grossProfit >= 0 ? 'var(--action)' : 'var(--danger)', b: true },
            { l: 'مصاريف تشغيلية',     v: sel.opExpenses,  s: '−', c: 'var(--danger)', b: false },
            { l: 'صافي الربح',          v: sel.netProfit,   s: sel.netProfit >= 0 ? '+' : '', c: sel.netProfit >= 0 ? 'var(--action)' : 'var(--danger)', b: true },
            { l: 'نقد مستلم من حياك',  v: sel.cashReceived,s: '',  c: 'var(--success)', b: false },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderTop: r.b ? '1px solid var(--border)' : 'none', marginTop: r.b ? 4 : 0, fontWeight: r.b ? 800 : 500 }}>
              <span style={{ color: 'var(--text-sec)' }}>{r.l}</span>
              <span style={{ fontFamily: 'Inter', color: r.c }}>{r.s}{formatCurrency(Math.abs(r.v))}</span>
            </div>
          ))}
          <div style={{ padding: '10px 0 0', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', marginTop: 4 }}>
            عدد الطلبات: <strong style={{ fontFamily: 'Inter' }}>{sel.ordersCount}</strong>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="acc-card">
        <div className="acc-section-title">جدول شامل</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="acc-table">
            <thead>
              <tr>
                {['الشهر', 'طلبات', 'إيرادات', 'ربح إجمالي', 'مصاريف', 'صافي الربح', 'نقد حياك'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className={selected === r.key ? 'acc-tr-sel' : ''} onClick={() => setSelected(r.key)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.label}</td>
                  <td style={{ fontFamily: 'Inter', color: 'var(--text-sec)' }}>{r.ordersCount}</td>
                  <td style={{ fontFamily: 'Inter', color: 'var(--action)' }}>{formatCurrency(r.revenue)}</td>
                  <td style={{ fontFamily: 'Inter', color: r.grossProfit >= 0 ? 'var(--action)' : 'var(--danger)' }}>{formatCurrency(r.grossProfit)}</td>
                  <td style={{ fontFamily: 'Inter', color: 'var(--danger)' }}>−{formatCurrency(r.opExpenses)}</td>
                  <td style={{ fontFamily: 'Inter', color: r.netProfit >= 0 ? 'var(--action)' : 'var(--danger)', fontWeight: 800 }}>{r.netProfit >= 0 ? '+' : ''}{formatCurrency(r.netProfit)}</td>
                  <td style={{ fontFamily: 'Inter', color: 'var(--success)' }}>{formatCurrency(r.cashReceived)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────── CSS ─────────────────────────────── */
const CSS = `
/* ── Page ── */
.acc-page { padding: 16px 16px 140px; }
@media (min-width: 769px) { .acc-page { padding: 24px 32px 80px; } }

/* ── Tabs ── */
.acc-tabs {
  display: flex; gap: 4px;
  background: var(--bg-hover);
  border-radius: var(--r-md);
  padding: 4px; margin-bottom: 20px;
}
.acc-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border: none; border-radius: 8px; background: transparent;
  color: var(--text-muted); font-size: 11px; font-weight: 600;
  font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.acc-tab-active {
  background: linear-gradient(135deg, var(--action), var(--action-deep));
  color: #fff; box-shadow: 0 2px 12px rgba(49,140,231,0.35);
}
.acc-tab-icon { font-size: 14px; }

/* ── Content animation ── */
.acc-content > div { animation: accFadeIn 0.35s var(--ease-out) both; }
@keyframes accFadeIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}

/* ── Card ── */
.acc-card {
  background: var(--bg-surface); border-radius: var(--r-md);
  padding: 14px 16px; box-shadow: var(--card-shadow);
  margin-bottom: 12px; border: 1px solid var(--border);
}
.acc-section-title {
  font-size: 11px; font-weight: 800; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 14px;
}

/* ── Shared Chips ── */
.acc-chips-scroll {
  display: flex; gap: 6px; overflow-x: auto;
  padding-bottom: 4px; margin-bottom: 12px; scrollbar-width: none;
}
.acc-chips-scroll::-webkit-scrollbar { display: none; }
.acc-chip {
  padding: 6px 12px; flex-shrink: 0; border-radius: var(--r-pill); border: none;
  background: var(--bg-surface); color: var(--text-muted); font-size: 12px;
  font-weight: 500; cursor: pointer; font-family: inherit; white-space: nowrap;
  transition: all 0.2s; box-shadow: var(--card-shadow);
}
.acc-chip.active { background: var(--action-soft); color: var(--action); font-weight: 700; }

/* ── KPIs ── */
.acc-kpis {
  display: grid; grid-template-columns: repeat(2,1fr);
  gap: 8px; margin-bottom: 12px;
}
@media (min-width: 769px) { .acc-kpis { grid-template-columns: repeat(4,1fr); } }
.acc-kpi {
  background: var(--bg-surface); border-radius: var(--r-md);
  padding: 12px; text-align: center; box-shadow: var(--card-shadow); border: 1px solid var(--border);
}
.acc-kpi-val   { font-size: 13px; font-weight: 900; font-family: Inter,sans-serif; line-height: 1.2; }
.acc-kpi-label { font-size: 10px; color: var(--text-muted); margin-top: 3px; }

/* ── Summary Hero ── */
.acc-hero {
  display: flex; align-items: center; gap: 20px;
  background: var(--bg-surface); border-radius: var(--r-md);
  padding: 20px 16px; margin-bottom: 12px;
  box-shadow: var(--card-shadow); border: 1px solid var(--border);
}
.acc-hero-right   { flex: 1; min-width: 0; }
.acc-hero-label   { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.acc-hero-amount  { font-size: 28px; font-weight: 900; font-family: Inter,sans-serif; line-height: 1.1; }
.acc-hero-margin  { font-size: 13px; color: var(--text-sec); margin-top: 6px; }
.acc-health-pill  { display: inline-block; padding: 3px 10px; border-radius: var(--r-pill); font-size: 11px; font-weight: 700; margin-top: 8px; }

/* ── Factor rows ── */
.acc-factor-row   { margin-bottom: 13px; }
.acc-factor-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: var(--text-sec); }

/* ── Waterfall ── */
.acc-waterfall    { display: flex; flex-direction: column; gap: 8px; }
.acc-wf-row       { display: flex; align-items: center; gap: 8px; }
.acc-wf-label     { width: 88px; font-size: 10px; color: var(--text-muted); text-align: right; flex-shrink: 0; line-height: 1.3; }
.acc-wf-bar       { flex: 1; }
.acc-wf-val       { width: 100px; font-family: Inter,sans-serif; font-weight: 700; font-size: 11px; text-align: left; flex-shrink: 0; }

/* ── Cash Hero ── */
.acc-cash-hero   { border-radius: var(--r-md); padding: 22px 20px; text-align: center; margin-bottom: 12px; }
.acc-cash-label  { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.acc-cash-amount { font-size: 38px; font-weight: 900; font-family: Inter,sans-serif; }
.acc-cash-sub    { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

/* ── Alerts ── */
.acc-alert { padding: 10px 14px; border-radius: var(--r-md); font-size: 12px; font-weight: 600; }
.acc-alert-danger  { background: rgba(239,68,68,0.08);  border: 1px solid rgba(239,68,68,0.25);  color: var(--danger); }
.acc-alert-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); color: var(--warning); }
.acc-alert-info    { background: rgba(49,140,231,0.08); border: 1px solid rgba(49,140,231,0.25); color: var(--action); }

/* ── Flow River ── */
.acc-flow-totals { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 0 4px; }
.acc-flow-total-in  { text-align: right; }
.acc-flow-total-out { text-align: right; }
.acc-flow-total-label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.acc-flow-total-val   { font-size: 20px; font-weight: 900; font-family: Inter,sans-serif; }
.acc-flow-total-divider { font-size: 22px; color: var(--text-muted); }
.acc-stream-section { }
.acc-stream-header  { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.acc-stream-row     { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.acc-stream-label   { width: 84px; font-size: 11px; color: var(--text-muted); text-align: right; flex-shrink: 0; }
.acc-stream-val     { width: 92px; font-family: Inter,sans-serif; font-weight: 700; font-size: 11px; text-align: left; flex-shrink: 0; }

/* ── Chart (shared) ── */
.acc-mchart-wrap {
  display: flex; gap: 4px; align-items: flex-end; height: 110px;
}
.acc-mchart-col  { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; cursor: pointer; }
.acc-mchart-bars { flex: 1; display: flex; gap: 2px; align-items: flex-end; width: 100%; }
.acc-mchart-bar  { flex: 1; border-radius: 2px 2px 0 0; min-height: 2px; }
.acc-mchart-label { font-size: 9px; color: var(--text-muted); white-space: nowrap; margin-top: 4px; }
.acc-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.acc-legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-inline-end: 4px; }

/* ── Partner Tab ── */
.acc-partner-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 12px; }
.acc-leader-badge { padding: 6px 14px; border-radius: var(--r-pill); font-size: 12px; font-weight: 700; display: inline-block; }
.acc-partner-cards { display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 769px) { .acc-partner-cards { flex-direction: row; } .acc-partner-card { flex: 1; } }
.acc-partner-card { background: var(--bg-surface); border-radius: var(--r-md); overflow: hidden; box-shadow: var(--card-shadow); }
.acc-partner-card-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }

/* ── Monthly Tab ── */
.acc-bw { flex: 1; display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: var(--r-md); font-size: 11px; }
.acc-bw strong { font-size: 14px; }
.acc-bw span:last-child { font-weight: 800; }
.acc-bw.best  { background: rgba(49,140,231,0.08);  border: 1px solid rgba(49,140,231,0.2);  color: var(--action); }
.acc-bw.worst { background: rgba(239,68,68,0.06);   border: 1px solid rgba(239,68,68,0.2);   color: var(--danger); }

.acc-mchip {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-md);
  background: var(--bg-surface); cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.acc-mchip-name   { font-size: 11px; font-weight: 700; white-space: nowrap; }
.acc-mchip-profit { font-size: 10px; font-weight: 700; }

/* ── Table ── */
.acc-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 600px; background: var(--bg-surface); border-radius: var(--r-md); overflow: hidden; }
.acc-table thead tr { background: var(--bg-hover); }
.acc-table th { padding: 10px 12px; text-align: right; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); white-space: nowrap; }
.acc-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.acc-table tr:hover td { background: var(--bg-hover); }
.acc-tr-sel td { background: rgba(49,140,231,0.06) !important; }
`
