// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Modal, Input, Select, Textarea, Spinner, Empty, ConfirmModal, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit } from '../components/Icons'
import type { PageProps } from '../types'

/* ═══════════════════════════════════════════════════════
   PARTNERS v9 — All 5 Concepts
   ▸ Concept 1: Scorecards with Contribution Rings
   ▸ Concept 2: Equity Evolution Line Chart (SVG)
   ▸ Concept 3: Transaction Timeline Feed
   ▸ Concept 4: Financial Calendar Heatmap
   ▸ Concept 5: Capital vs Withdrawals Race + Runway
═══════════════════════════════════════════════════════ */

/* ─────────────────────── CONSTANTS ─────────────────────── */
const PARTNERS = ['إبراهيم', 'إحسان']
const P_COLOR  = { 'إبراهيم': '#318CE7', 'إحسان': '#8b5cf6' }
const P_SOFT   = { 'إبراهيم': 'rgba(49,140,231,0.10)', 'إحسان': 'rgba(139,92,246,0.10)' }
const P_ID     = { 'إبراهيم': 'ibrahim', 'إحسان': 'ihsan' }

const CAPITAL_TYPES = [
  { value: 'opening',    label: 'رصيد افتتاحي' },
  { value: 'deposit',    label: 'إيداع رأس مال' },
  { value: 'withdrawal', label: 'سحب رأس مال'   },
]
const WITHDRAWAL_TYPES = [
  { value: 'salary',        label: 'راتب'          },
  { value: 'dividend',      label: 'توزيع أرباح'  },
  { value: 'personal',      label: 'سحب شخصي'     },
  { value: 'reimbursement', label: 'استرداد مصروف'},
]

/* ─────────────────────── HELPERS ─────────────────────── */
function typeLabel(type) {
  return [...CAPITAL_TYPES, ...WITHDRAWAL_TYPES].find(t => t.value === type)?.label || type
}
function typeColor(type) {
  if (type === 'deposit' || type === 'opening') return 'var(--action)'
  if (['withdrawal','salary','dividend','personal'].includes(type)) return 'var(--danger)'
  return 'var(--warning)'
}
function mKey(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function mShort(k) {
  if (!k) return ''
  const [y, m] = k.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('ar-AE', { month: 'short' })
}
function mFull(k) {
  if (!k) return ''
  const [y, m] = k.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('ar-AE', { month: 'long', year: 'numeric' })
}
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days < 30)  return `منذ ${days} يوم`
  if (days < 365) return `منذ ${Math.floor(days / 30)} شهر`
  return `منذ ${Math.floor(days / 365)} سنة`
}

function getPartnerStats(name, capital, withdrawals, expenses) {
  const myCap  = capital.filter(c => c.partner_name === name)
  const myWith = withdrawals.filter(w => w.partner_name === name)
  const myExp  = expenses.filter(e =>
    (e.paid_by === 'ibrahim' && name === 'إبراهيم') ||
    (e.paid_by === 'ihsan'   && name === 'إحسان')
  )
  const opening      = myCap.filter(c => c.type === 'opening').reduce((s, c) => s + (c.amount || 0), 0)
  const capitalIn    = myCap.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
  const capitalOut   = myCap.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)
  const totalWith    = myWith.filter(w => w.type !== 'reimbursement').reduce((s, w) => s + (w.amount || 0), 0)
  const expPaid      = myExp.reduce((s, e) => s + (e.amount || 0), 0)
  const reimbursed   = myExp.filter(e => e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0)
  const unreimbursed = expPaid - reimbursed
  const totalCapital = opening + capitalIn - capitalOut
  const netEquity    = totalCapital - totalWith + unreimbursed
  // Withdrawal breakdown by type
  const byType = {}
  WITHDRAWAL_TYPES.filter(t => t.value !== 'reimbursement').forEach(t => {
    byType[t.value] = myWith.filter(w => w.type === t.value).reduce((s, w) => s + (w.amount || 0), 0)
  })
  const lastDate = [...myCap, ...myWith].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
  return { opening, capitalIn, capitalOut, totalWith, totalCapital, expPaid, reimbursed, unreimbursed, netEquity, byType, lastDate }
}

/* ─────────────────────── HOOKS ─────────────────────── */
function useCountUp(target) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (typeof target !== 'number') return
    const start = performance.now()
    const dur   = 1500
    function tick(now) {
      const p = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(target * e))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    setVal(0)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return val
}
function useReveal() {
  const [r, setR] = useState(false)
  useEffect(() => { const t = setTimeout(() => setR(true), 200); return () => clearTimeout(t) }, [])
  return r
}

/* ─────────────────────── MICRO COMPONENTS ─────────────────────── */
function CircleGauge({ pct = 0, size = 100, color = 'var(--action)', label, sub, glow = false }) {
  const r    = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const [off, setOff] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOff(circ * (1 - Math.max(0, Math.min(1, pct)))), 160)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          filter={glow ? `drop-shadow(0 0 7px ${color})` : 'none'}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34,1.4,0.64,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {label !== undefined && <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: size * 0.22, color, lineHeight: 1 }}>{label}</span>}
        {sub && <span style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.3, textAlign: 'center', padding: '0 4px' }}>{sub}</span>}
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
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: h / 2,
        transition: `width 1.3s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
        boxShadow: glow ? `0 0 10px ${color}55` : 'none' }} />
    </div>
  )
}

/* ─────────────────────── EQUITY LINE CHART ─────────────────────── */
function EquityChart({ histories }) {
  const ready = useReveal()
  const W = 400, H = 180
  const PAD = { t: 16, r: 10, b: 28, l: 10 }

  const allPts = histories.flatMap(h => h.points)
  if (allPts.length < 2) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
      أضف معاملات لعرض منحنى الأسهم
    </div>
  )

  const allDates  = allPts.map(p => new Date(p.date).getTime())
  const allEquity = allPts.map(p => p.equity)
  const minDate = Math.min(...allDates)
  const maxDate = Math.max(...allDates)
  const minEq   = Math.min(0, ...allEquity)
  const maxEq   = Math.max(0, ...allEquity, 1)
  const dRange  = maxDate - minDate || 1
  const eRange  = maxEq - minEq || 1

  const toX = (date) => PAD.l + (new Date(date).getTime() - minDate) / dRange * (W - PAD.l - PAD.r)
  const toY = (eq)   => H - PAD.b - (eq - minEq) / eRange * (H - PAD.t - PAD.b)
  const zY  = toY(0)

  function makeLine(pts) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.date).toFixed(1)},${toY(p.equity).toFixed(1)}`).join(' ')
  }
  function makeArea(pts, color) {
    if (pts.length < 2) return ''
    const lastX = toX(pts.at(-1).date)
    const firstX = toX(pts[0].date)
    return `${makeLine(pts)} L${lastX.toFixed(1)},${zY.toFixed(1)} L${firstX.toFixed(1)},${zY.toFixed(1)} Z`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        {histories.map(h => (
          <linearGradient key={h.name} id={`grad_${h.name}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={P_COLOR[h.name]} stopOpacity={0.25} />
            <stop offset="100%" stopColor={P_COLOR[h.name]} stopOpacity={0}    />
          </linearGradient>
        ))}
      </defs>

      {/* Zero line */}
      <line x1={PAD.l} y1={zY} x2={W - PAD.r} y2={zY} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />

      {/* Area fills */}
      {histories.map(h => h.points.length >= 2 && (
        <path key={`area_${h.name}`} d={makeArea(h.points, P_COLOR[h.name])} fill={`url(#grad_${h.name})`} />
      ))}

      {/* Lines */}
      {histories.map((h, hi) => h.points.length >= 2 && (
        <path key={`line_${h.name}`}
          d={makeLine(h.points)} stroke={P_COLOR[h.name]} strokeWidth={2.5}
          fill="none" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="1400" strokeDashoffset={ready ? 0 : 1400}
          style={{ transition: `stroke-dashoffset 2s ease-out ${hi * 300}ms` }} />
      ))}

      {/* End dots */}
      {histories.map(h => h.points.length > 0 && (
        <circle key={`dot_${h.name}`}
          cx={toX(h.points.at(-1).date)} cy={toY(h.points.at(-1).equity)}
          r={5} fill={P_COLOR[h.name]}
          filter={`drop-shadow(0 0 5px ${P_COLOR[h.name]})`} />
      ))}

      {/* X-axis labels (first & last date) */}
      {allDates.length >= 2 && (
        <>
          <text x={PAD.l} y={H - 4} fill="var(--text-muted)" fontSize={9} textAnchor="start">{formatDate(new Date(minDate).toISOString())}</text>
          <text x={W - PAD.r} y={H - 4} fill="var(--text-muted)" fontSize={9} textAnchor="end">{formatDate(new Date(maxDate).toISOString())}</text>
        </>
      )}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',  label: 'نظرة عامة', icon: '💼' },
  { id: 'chart',     label: 'المنحنى',   icon: '📈' },
  { id: 'timeline',  label: 'السجل',     icon: '📋' },
  { id: 'calendar',  label: 'التقويم',   icon: '📅' },
]

export default function Partners(_: PageProps) {
  const [capital,     setCapital]     = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [expenses,    setExpenses]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('overview')
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState('capital')
  const [editItem,    setEditItem]    = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleteTable, setDeleteTable] = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [cap, with_, exp] = await Promise.all([
        DB.list('capital_entries', { orderBy: 'date' }),
        DB.list('withdrawals',     { orderBy: 'date' }),
        DB.list('expenses',        { orderBy: 'date' }),
      ])
      setCapital(cap.reverse())
      setWithdrawals(with_.reverse())
      setExpenses(exp)
    } catch (err) { console.error(err); toast('خطأ في تحميل بيانات الشركاء', 'error') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete(deleteTable, deleteId)
      if (deleteTable === 'capital_entries') setCapital(p => p.filter(c => c.id !== deleteId))
      else setWithdrawals(p => p.filter(w => w.id !== deleteId))
      setDeleteId(null); setDeleteTable(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  function openForm(mode, item = null) {
    setFormMode(mode); setEditItem(item); setShowForm(true)
  }

  /* ── Per-partner stats ── */
  const stats = useMemo(() =>
    Object.fromEntries(PARTNERS.map(n => [n, getPartnerStats(n, capital, withdrawals, expenses)]))
  , [capital, withdrawals, expenses])

  /* ── Equity evolution histories (for chart) ── */
  const equityHistories = useMemo(() => PARTNERS.map(name => {
    const events = []
    capital.filter(c => c.partner_name === name).forEach(c => {
      events.push({ date: c.date, val: c.type === 'withdrawal' ? -(c.amount || 0) : (c.amount || 0) })
    })
    withdrawals.filter(w => w.partner_name === name && w.type !== 'reimbursement').forEach(w => {
      events.push({ date: w.date, val: -(w.amount || 0) })
    })
    events.sort((a, b) => new Date(a.date) - new Date(b.date))
    let cum = 0
    const points = []
    events.forEach(e => { cum += e.val; points.push({ date: e.date, equity: cum }) })
    return { name, points }
  }), [capital, withdrawals])

  /* ── All transactions (for timeline) ── */
  const allHistory = useMemo(() => [
    ...capital.map(c => ({
      ...c, _table: 'capital_entries',
      _val: c.type === 'withdrawal' ? -(c.amount || 0) : (c.amount || 0),
    })),
    ...withdrawals.map(w => ({ ...w, _table: 'withdrawals', _val: -(w.amount || 0) })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))
  , [capital, withdrawals])

  /* ── Heatmap (last 12 months) ── */
  const heatmapMonths = useMemo(() => {
    const byMonth = {}
    const addToMonth = (key, inVal, outVal) => {
      if (!byMonth[key]) byMonth[key] = { key, in: 0, out: 0, entries: [] }
      byMonth[key].in  += inVal
      byMonth[key].out += outVal
    }
    capital.forEach(c => {
      const key = mKey(c.date)
      if (c.type === 'withdrawal') addToMonth(key, 0, c.amount || 0)
      else addToMonth(key, c.amount || 0, 0)
    })
    withdrawals.forEach(w => addToMonth(mKey(w.date), 0, w.amount || 0))

    // Build last 12 months array
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { key, short: mShort(key), full: mFull(key), ...(byMonth[key] || { in: 0, out: 0 }) }
    })
  }, [capital, withdrawals])

  /* ── Runway calculation ── */
  const runway = useMemo(() => {
    const totalEquity = PARTNERS.reduce((s, n) => s + stats[n].netEquity, 0)
    const months = [...new Set([...capital.map(c => mKey(c.date)), ...withdrawals.map(w => mKey(w.date))])].filter(Boolean)
    const monthCount = Math.max(1, months.length)
    const totalWith = withdrawals.filter(w => w.type !== 'reimbursement').reduce((s, w) => s + (w.amount || 0), 0)
    const monthlyRate = totalWith / monthCount
    return {
      monthlyRate,
      months: monthlyRate > 0 ? (totalEquity / monthlyRate) : Infinity,
      totalEquity,
      totalCapitalIn: capital.filter(c => c.type !== 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0),
      totalWith,
    }
  }, [stats, capital, withdrawals])

  const hasNoData = capital.length === 0 && withdrawals.length === 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36} />
    </div>
  )

  return (
    <div className="prt-page">
      <style>{CSS}</style>

      {/* ── Hero: equity per partner ── */}
      <div className="prt-hero">
        {PARTNERS.map(name => {
          const s     = stats[name]
          const color = P_COLOR[name]
          return (
            <div key={name} className="prt-hero-card" style={{ borderTop: `3px solid ${color}`, background: P_SOFT[name] }}>
              <div className="prt-hero-avatar" style={{ background: color }}>{name[0]}</div>
              <div className="prt-hero-info">
                <div className="prt-hero-name" style={{ color }}>{name}</div>
                <EquityCountUp value={s.netEquity} color={color} />
                <div className="prt-hero-sub">
                  {s.lastDate ? `آخر نشاط: ${timeAgo(s.lastDate)}` : 'لا توجد معاملات'}
                </div>
              </div>
            </div>
          )
        })}

        {/* Equity gap */}
        {(() => {
          const gap = Math.abs(stats['إبراهيم'].netEquity - stats['إحسان'].netEquity)
          const leader = stats['إبراهيم'].netEquity >= stats['إحسان'].netEquity ? 'إبراهيم' : 'إحسان'
          if (gap < 1) return null
          return (
            <div className="prt-gap-badge" style={{ background: P_SOFT[leader], color: P_COLOR[leader] }}>
              👑 {leader} متقدم بـ {formatCurrency(gap)}
            </div>
          )
        })()}
      </div>

      {/* ── Action buttons ── */}
      <div className="prt-actions">
        <button className="prt-action-btn prt-action-primary" onClick={() => openForm('capital')}>
          <span>＋</span> رأس مال
        </button>
        <button className="prt-action-btn prt-action-secondary" onClick={() => openForm('withdrawal')}>
          <span>−</span> مسحوبات
        </button>
      </div>

      {/* ── No data prompt ── */}
      {hasNoData && (
        <div className="prt-empty-prompt">
          <div className="prt-empty-icon">📋</div>
          <div className="prt-empty-title">لم يتم تسجيل رأس المال بعد</div>
          <div className="prt-empty-sub">أضف الرصيد الافتتاحي لكل شريك لتظهر حقوق الملكية بشكل صحيح</div>
          <button className="prt-action-btn prt-action-primary" style={{ marginTop: 12 }} onClick={() => openForm('capital')}>
            إضافة رصيد افتتاحي
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="prt-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`prt-tab${tab === t.id ? ' prt-tab-active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="prt-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div key={tab} className="prt-content">
        {tab === 'overview' && (
          <OverviewTab stats={stats} runway={runway} capital={capital} withdrawals={withdrawals} />
        )}
        {tab === 'chart' && (
          <ChartTab histories={equityHistories} stats={stats} />
        )}
        {tab === 'timeline' && (
          <TimelineTab allHistory={allHistory} onDelete={(id, table) => { setDeleteId(id); setDeleteTable(table) }} />
        )}
        {tab === 'calendar' && (
          <CalendarTab months={heatmapMonths} capital={capital} withdrawals={withdrawals} />
        )}
      </div>

      {/* ── Modals ── */}
      <PartnerForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        mode={formMode}
        editItem={editItem}
        onSaved={item => {
          if (formMode === 'capital') setCapital(p => [item, ...p.filter(x => x.id !== item.id)])
          else setWithdrawals(p => [item, ...p.filter(x => x.id !== item.id)])
          setShowForm(false); setEditItem(null)
          toast('تم الحفظ ✓')
        }}
      />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteTable(null) }}
        onConfirm={handleDelete}
        loading={deleting}
        message="سيتم حذف القيد نهائياً."
      />
    </div>
  )
}

/* ── Equity count-up display ── */
function EquityCountUp({ value, color }) {
  const anim = useCountUp(value)
  return (
    <div className="prt-hero-equity" style={{ color: value >= 0 ? color : 'var(--danger)' }}>
      {value >= 0 ? '+' : '−'}{formatCurrency(Math.abs(anim))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 1 — OVERVIEW (Concepts 1 + 5)
══════════════════════════════════════════════════════ */
function OverviewTab({ stats, runway, capital, withdrawals }) {
  const totalCapIn  = PARTNERS.reduce((s, n) => s + stats[n].capitalIn + stats[n].opening, 0)
  const totalWithd  = PARTNERS.reduce((s, n) => s + stats[n].totalWith, 0)
  const raceMax     = Math.max(totalCapIn, totalWithd, 1)

  return (
    <div>
      {/* Concept 1: Scorecards with contribution rings */}
      <div className="prt-scorecards">
        {PARTNERS.map(name => {
          const s     = stats[name]
          const color = P_COLOR[name]
          const soft  = P_SOFT[name]
          const totalIn  = s.opening + s.capitalIn
          const ringPct  = totalCapIn > 0 ? totalIn / totalCapIn : 0.5
          const withMax  = Math.max(s.totalWith, 1)
          const byTypeMax= Math.max(...Object.values(s.byType), 1)

          return (
            <div key={name} className="prt-scorecard" style={{ borderTop: `3px solid ${color}` }}>
              {/* Header with ring */}
              <div className="prt-scorecard-header" style={{ background: soft }}>
                <div>
                  <div className="prt-scorecard-name" style={{ color }}>{name}</div>
                  <div className="prt-scorecard-equity" style={{ color: s.netEquity >= 0 ? color : 'var(--danger)' }}>
                    {s.netEquity >= 0 ? '+' : ''}{formatCurrency(s.netEquity)}
                  </div>
                  <div className="prt-scorecard-sub">صافي حقوق الملكية</div>
                </div>
                <CircleGauge
                  pct={ringPct} size={88} color={color}
                  label={`${Math.round(ringPct * 100)}%`}
                  sub="من رأس المال" glow
                />
              </div>

              {/* Capital waterfall */}
              <div className="prt-scorecard-body">
                <div className="prt-scorecard-section-title">رأس المال</div>
                {[
                  ...(s.opening > 0    ? [{ l: 'رصيد افتتاحي', v: s.opening,     c: '#a78bfa', max: totalIn }] : []),
                  ...(s.capitalIn > 0  ? [{ l: 'إيداعات',      v: s.capitalIn,   c: color,     max: totalIn }] : []),
                  ...(s.capitalOut > 0 ? [{ l: 'سحب رأس مال',  v: s.capitalOut,  c: 'var(--danger)', max: totalIn }] : []),
                ].map((row, i) => (
                  <div key={i} className="prt-bar-row">
                    <span className="prt-bar-label">{row.l}</span>
                    <div style={{ flex: 1 }}><AnimBar pct={row.v / row.max} color={row.c} h={8} delay={i * 80} /></div>
                    <span className="prt-bar-val" style={{ color: row.c }}>{formatCurrency(row.v)}</span>
                  </div>
                ))}

                {/* Withdrawals breakdown */}
                {s.totalWith > 0 && (
                  <>
                    <div className="prt-scorecard-section-title" style={{ marginTop: 12 }}>المسحوبات</div>
                    {WITHDRAWAL_TYPES.filter(t => t.value !== 'reimbursement' && s.byType[t.value] > 0).map((t, i) => (
                      <div key={t.value} className="prt-bar-row">
                        <span className="prt-bar-label">{t.label}</span>
                        <div style={{ flex: 1 }}><AnimBar pct={s.byType[t.value] / byTypeMax} color="var(--danger)" h={8} delay={i * 80} /></div>
                        <span className="prt-bar-val" style={{ color: 'var(--danger)' }}>{formatCurrency(s.byType[t.value])}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Unreimbursed */}
                {s.unreimbursed > 0 && (
                  <div className="prt-unreimb">
                    الشركة مدينة لك بـ <strong style={{ fontFamily: 'Inter', color }}>{formatCurrency(s.unreimbursed)}</strong>
                  </div>
                )}

                {/* Last activity */}
                {s.lastDate && (
                  <div className="prt-last-activity">
                    <span className="prt-activity-dot" style={{ background: color }} />
                    آخر نشاط {timeAgo(s.lastDate)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Concept 5: Race + Runway */}
      <div className="prt-card">
        <div className="prt-section-title">سباق رأس المال</div>

        {/* Race bars per partner */}
        {PARTNERS.map((name, i) => {
          const s     = stats[name]
          const color = P_COLOR[name]
          const totalIn = s.opening + s.capitalIn
          return (
            <div key={name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, color: 'var(--text-sec)' }}>
                <span style={{ fontWeight: 800, color }}>{name}</span>
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatCurrency(totalIn)} <span style={{ color: 'var(--danger)' }}>/ {formatCurrency(s.totalWith)}</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 52, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>أودع</span>
                  <AnimBar pct={totalIn / raceMax} color={color} h={12} delay={i * 150} glow />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 52, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>سحب</span>
                  <AnimBar pct={s.totalWith / raceMax} color="var(--danger)" h={12} delay={i * 150 + 100} />
                </div>
              </div>
            </div>
          )
        })}

        {/* Runway indicator */}
        <div className="prt-runway">
          <div className="prt-runway-label">
            <span>⏱ مدة الاستمرارية بالمعدل الحالي</span>
            <span className="prt-runway-months" style={{
              color: runway.months === Infinity ? 'var(--action)' : runway.months > 6 ? 'var(--action)' : runway.months > 3 ? 'var(--warning)' : 'var(--danger)'
            }}>
              {runway.months === Infinity ? '∞' : runway.months.toFixed(1)} شهر
            </span>
          </div>
          <AnimBar
            pct={runway.months === Infinity ? 1 : Math.min(1, runway.months / 12)}
            color={runway.months > 6 ? 'var(--action)' : runway.months > 3 ? 'var(--warning)' : 'var(--danger)'}
            h={10} glow
          />
          {runway.monthlyRate > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              متوسط المسحوبات الشهرية: <strong style={{ fontFamily: 'Inter' }}>{formatCurrency(Math.round(runway.monthlyRate))}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 2 — CHART (Concept 2)
══════════════════════════════════════════════════════ */
function ChartTab({ histories, stats }) {
  return (
    <div>
      {/* Chart */}
      <div className="prt-card">
        <div className="prt-section-title">منحنى حقوق الملكية عبر الزمن</div>
        <EquityChart histories={histories} />

        {/* Legend */}
        <div className="prt-chart-legend">
          {PARTNERS.map(name => (
            <div key={name} className="prt-legend-item">
              <span className="prt-legend-dot" style={{ background: P_COLOR[name] }} />
              <span style={{ color: P_COLOR[name], fontWeight: 700 }}>{name}</span>
              <span style={{ fontFamily: 'Inter', color: stats[name].netEquity >= 0 ? P_COLOR[name] : 'var(--danger)', fontSize: 11 }}>
                {stats[name].netEquity >= 0 ? '+' : ''}{formatCurrency(stats[name].netEquity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Equity milestones */}
      {PARTNERS.map(name => {
        const h     = histories.find(x => x.name === name)
        const color = P_COLOR[name]
        if (!h || h.points.length === 0) return null
        const maxPt = h.points.reduce((a, b) => a.equity > b.equity ? a : b)
        const minPt = h.points.reduce((a, b) => a.equity < b.equity ? a : b)
        return (
          <div key={name} className="prt-card prt-milestones" style={{ borderInlineStart: `3px solid ${color}` }}>
            <div className="prt-section-title" style={{ color }}>{name} — أبرز النقاط</div>
            <div className="prt-milestone-row">
              <div className="prt-milestone">
                <div className="prt-milestone-label">🏔 أعلى رصيد</div>
                <div className="prt-milestone-val" style={{ color: 'var(--action)' }}>{formatCurrency(maxPt.equity)}</div>
                <div className="prt-milestone-date">{formatDate(maxPt.date)}</div>
              </div>
              <div className="prt-milestone">
                <div className="prt-milestone-label">📉 أدنى رصيد</div>
                <div className="prt-milestone-val" style={{ color: minPt.equity < 0 ? 'var(--danger)' : 'var(--text-sec)' }}>{formatCurrency(minPt.equity)}</div>
                <div className="prt-milestone-date">{formatDate(minPt.date)}</div>
              </div>
              <div className="prt-milestone">
                <div className="prt-milestone-label">📊 الرصيد الحالي</div>
                <div className="prt-milestone-val" style={{ color: stats[name].netEquity >= 0 ? color : 'var(--danger)' }}>{formatCurrency(stats[name].netEquity)}</div>
                <div className="prt-milestone-date">الآن</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 3 — TIMELINE (Concept 3)
══════════════════════════════════════════════════════ */
function TimelineTab({ allHistory, onDelete }) {
  const [filter, setFilter] = useState('all')

  const FILTERS = [
    { id: 'all',        label: 'الكل'      },
    { id: 'capital',    label: 'رأس مال'   },
    { id: 'withdrawal', label: 'مسحوبات'   },
    { id: 'إبراهيم',   label: 'إبراهيم'   },
    { id: 'إحسان',     label: 'إحسان'     },
  ]

  const filtered = useMemo(() => {
    if (filter === 'all')        return allHistory
    if (filter === 'capital')    return allHistory.filter(x => x._table === 'capital_entries')
    if (filter === 'withdrawal') return allHistory.filter(x => x._table === 'withdrawals')
    return allHistory.filter(x => x.partner_name === filter)
  }, [allHistory, filter])

  /* Group by month */
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(item => {
      const key = mKey(item.date)
      if (!groups[key]) groups[key] = { key, label: mFull(key), items: [], net: 0 }
      groups[key].items.push(item)
      groups[key].net += item._val
    })
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
  }, [filtered])

  if (allHistory.length === 0) return (
    <Empty title="لا يوجد معاملات بعد" />
  )

  return (
    <div>
      {/* Filter chips */}
      <div className="prt-chips-scroll">
        {FILTERS.map(f => (
          <button key={f.id} className={`prt-chip${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Count badge */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        {filtered.length} معاملة
      </div>

      {/* Timeline grouped by month */}
      {grouped.map(group => (
        <div key={group.key} className="prt-tl-group">
          {/* Month header */}
          <div className="prt-tl-month-header">
            <span className="prt-tl-month-label">{group.label}</span>
            <span className="prt-tl-month-net" style={{ color: group.net >= 0 ? 'var(--action)' : 'var(--danger)' }}>
              {group.net >= 0 ? '+' : ''}{formatCurrency(Math.abs(group.net))}
            </span>
          </div>

          {/* Entries */}
          <div className="prt-tl-entries">
            {group.items.map(item => {
              const isIn    = item._val > 0
              const color   = P_COLOR[item.partner_name] || 'var(--action)'
              const tColor  = typeColor(item.type)
              return (
                <div key={`${item._table}-${item.id}`} className="prt-tl-entry" style={{ borderInlineStart: `3px solid ${isIn ? 'var(--action)' : 'var(--danger)'}` }}>
                  <div className="prt-tl-entry-left">
                    <div className="prt-tl-partner" style={{ color }}>{item.partner_name}</div>
                    <div className="prt-tl-type-pill" style={{ background: `${tColor}18`, color: tColor, border: `1px solid ${tColor}30` }}>
                      {typeLabel(item.type)}
                    </div>
                    {item.notes && <div className="prt-tl-notes">{item.notes}</div>}
                  </div>
                  <div className="prt-tl-entry-right">
                    <div className="prt-tl-amount" style={{ color: isIn ? 'var(--action)' : 'var(--danger)' }}>
                      {isIn ? '+' : '−'}{formatCurrency(Math.abs(item.amount || 0))}
                    </div>
                    <div className="prt-tl-date">{formatDate(item.date)}</div>
                    <button className="prt-delete-btn" onClick={() => onDelete(item.id, item._table)}>
                      <IcDelete size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 4 — CALENDAR HEATMAP (Concept 4)
══════════════════════════════════════════════════════ */
function CalendarTab({ months, capital, withdrawals }) {
  const [selected, setSelected] = useState(null)

  const maxActivity = Math.max(...months.map(m => Math.max(m.in, m.out)), 1)

  function cellColor(m) {
    const net = m.in - m.out
    if (m.in === 0 && m.out === 0) return 'var(--bg-hover)'
    if (net >= 0) {
      const intensity = Math.min(1, m.in / maxActivity)
      return `rgba(49,140,231,${0.1 + intensity * 0.5})`
    } else {
      const intensity = Math.min(1, m.out / maxActivity)
      return `rgba(239,68,68,${0.1 + intensity * 0.5})`
    }
  }
  function cellBorder(m) {
    const net = m.in - m.out
    if (m.in === 0 && m.out === 0) return '1px solid var(--border)'
    if (net >= 0) return '1px solid rgba(49,140,231,0.35)'
    return '1px solid rgba(239,68,68,0.35)'
  }

  const selMonth = months.find(m => m.key === selected)
  const selEntries = selected ? [
    ...capital.filter(c => mKey(c.date) === selected).map(c => ({ ...c, _table: 'capital_entries', _val: c.type === 'withdrawal' ? -(c.amount||0) : (c.amount||0) })),
    ...withdrawals.filter(w => mKey(w.date) === selected).map(w => ({ ...w, _table: 'withdrawals', _val: -(w.amount||0) })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)) : []

  return (
    <div>
      {/* Legend */}
      <div className="prt-cal-legend">
        <div className="prt-cal-legend-item">
          <div className="prt-cal-swatch" style={{ background: 'rgba(49,140,231,0.5)' }} />
          <span>إيداع</span>
        </div>
        <div className="prt-cal-legend-item">
          <div className="prt-cal-swatch" style={{ background: 'rgba(239,68,68,0.5)' }} />
          <span>سحب</span>
        </div>
        <div className="prt-cal-legend-item">
          <div className="prt-cal-swatch" style={{ background: 'var(--bg-hover)' }} />
          <span>لا يوجد</span>
        </div>
      </div>

      {/* 12-month grid */}
      <div className="prt-cal-grid">
        {months.map(m => {
          const net      = m.in - m.out
          const isActive = m.in > 0 || m.out > 0
          return (
            <button
              key={m.key}
              className={`prt-cal-cell${selected === m.key ? ' selected' : ''}`}
              style={{ background: cellColor(m), border: selected === m.key ? `2px solid ${net >= 0 ? '#318CE7' : '#ef4444'}` : cellBorder(m) }}
              onClick={() => setSelected(selected === m.key ? null : m.key)}
            >
              <div className="prt-cal-cell-label">{m.short}</div>
              {isActive && (
                <div className="prt-cal-cell-net" style={{ color: net >= 0 ? '#318CE7' : '#ef4444' }}>
                  {net >= 0 ? '+' : ''}{Math.abs(net) >= 1000 ? `${(Math.abs(net)/1000).toFixed(0)}k` : Math.abs(net).toFixed(0)}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected month entries */}
      {selMonth && (
        <div className="prt-card prt-cal-detail">
          <div className="prt-section-title">{selMonth.full}</div>
          <div className="prt-cal-detail-stats">
            <div><span style={{ color: 'var(--action)' }}>+{formatCurrency(selMonth.in)}</span> <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>إيداع</span></div>
            <div><span style={{ color: 'var(--danger)' }}>−{formatCurrency(selMonth.out)}</span> <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>سحب</span></div>
            <div style={{ color: (selMonth.in - selMonth.out) >= 0 ? 'var(--action)' : 'var(--danger)', fontWeight: 800, fontFamily: 'Inter' }}>
              {(selMonth.in - selMonth.out) >= 0 ? '+' : ''}{formatCurrency(selMonth.in - selMonth.out)}
            </div>
          </div>

          {selEntries.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>لا توجد معاملات في هذا الشهر</div>
            : selEntries.map(item => {
              const isIn   = item._val > 0
              const color  = P_COLOR[item.partner_name] || 'var(--action)'
              const tColor = typeColor(item.type)
              return (
                <div key={`${item._table}-${item.id}`} className="prt-cal-entry">
                  <div className="prt-tl-partner" style={{ color, fontSize: 12 }}>{item.partner_name}</div>
                  <div className="prt-tl-type-pill" style={{ background: `${tColor}18`, color: tColor, border: `1px solid ${tColor}30` }}>
                    {typeLabel(item.type)}
                  </div>
                  {item.notes && <span className="prt-tl-notes">{item.notes}</span>}
                  <div className="prt-cal-entry-amount" style={{ color: isIn ? 'var(--action)' : 'var(--danger)' }}>
                    {isIn ? '+' : '−'}{formatCurrency(Math.abs(item.amount || 0))}
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* Year summary */}
      <div className="prt-card">
        <div className="prt-section-title">ملخص السنة</div>
        <div className="prt-year-summary">
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>إجمالي الإيداعات</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Inter', color: 'var(--action)' }}>
              +{formatCurrency(months.reduce((s, m) => s + m.in, 0))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>إجمالي السحوبات</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Inter', color: 'var(--danger)' }}>
              −{formatCurrency(months.reduce((s, m) => s + m.out, 0))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>أنشط شهر</div>
            {(() => {
              const best = months.reduce((a, b) => (a.in + a.out) > (b.in + b.out) ? a : b)
              return <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{best.short}</div>
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   FORM MODAL (preserved logic, refreshed style)
══════════════════════════════════════════════════════ */
function PartnerForm({ open, onClose, mode, editItem, onSaved }) {
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editItem) { setForm(editItem) }
    else {
      setForm({
        partner_name: PARTNERS[0],
        date:         new Date().toISOString().split('T')[0],
        type:         mode === 'capital' ? 'deposit' : 'salary',
        amount:       '',
        notes:        '',
      })
    }
  }, [open, mode, editItem])

  async function handleSave() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('أدخل مبلغاً صحيحاً', 'error'); return }
    setSaving(true)
    try {
      const table   = mode === 'capital' ? 'capital_entries' : 'withdrawals'
      const payload = { partner_name: form.partner_name, type: form.type, amount: parseFloat(form.amount), date: form.date, notes: form.notes || '' }
      const saved   = editItem ? await DB.update(table, editItem.id, payload) : await DB.insert(table, payload)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  const isCapital = mode === 'capital'
  const TYPE_HINTS = { opening: 'رصيد قبل بدء النظام', deposit: 'إضافة رأس مال جديد', withdrawal: 'سحب جزء من رأس المال' }

  return (
    <Modal
      open={open} onClose={onClose}
      title={isCapital ? (editItem ? 'تعديل قيد رأس مال' : 'قيد رأس مال جديد') : (editItem ? 'تعديل مسحوبات' : 'قيد مسحوبات جديد')}
      width={420}
      footer={<><Btn variant="ghost" onClick={onClose}>إلغاء</Btn><Btn loading={saving} onClick={handleSave}>حفظ</Btn></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="الشريك" value={form.partner_name || ''} onChange={e => set('partner_name', e.target.value)}>
          {PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select label="النوع" value={form.type || ''} onChange={e => set('type', e.target.value)}>
          {(isCapital ? CAPITAL_TYPES : WITHDRAWAL_TYPES).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        {isCapital && form.type && TYPE_HINTS[form.type] && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--r-sm)', marginTop: -6 }}>
            {TYPE_HINTS[form.type]}
          </div>
        )}
        <Input label="المبلغ (د.إ)" type="number" min="0" value={form.amount || ''} onChange={e => set('amount', e.target.value)} />
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} />
        <Textarea label="ملاحظات (اختياري)" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════ */
const CSS = `
/* ── Page ── */
.prt-page { padding: 16px 16px 140px; }
@media (min-width: 769px) { .prt-page { padding: 24px 32px 80px; } }

/* ── Content animation ── */
.prt-content > div { animation: prtFade 0.35s var(--ease-out) both; }
@keyframes prtFade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

/* ── Hero ── */
.prt-hero {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; margin-bottom: 12px;
}
@media (min-width: 769px) { .prt-hero { grid-template-columns: 1fr 1fr; } }
.prt-hero-card {
  border-radius: var(--r-md); padding: 14px;
  display: flex; align-items: center; gap: 10px;
  box-shadow: var(--card-shadow);
}
.prt-hero-avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 18px; color: #fff;
}
.prt-hero-info   { flex: 1; min-width: 0; }
.prt-hero-name   { font-size: 12px; font-weight: 800; }
.prt-hero-equity { font-size: 16px; font-weight: 900; font-family: Inter,sans-serif; }
.prt-hero-sub    { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.prt-gap-badge {
  grid-column: 1 / -1; padding: 8px 14px; border-radius: var(--r-pill);
  font-size: 12px; font-weight: 700; text-align: center;
}

/* ── Actions ── */
.prt-actions { display: flex; gap: 8px; margin-bottom: 14px; }
.prt-action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: var(--r-md); border: none; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 700; transition: all 0.2s;
}
.prt-action-primary  { background: linear-gradient(135deg, var(--action), var(--action-deep)); color: #fff; box-shadow: 0 4px 16px rgba(49,140,231,0.35); }
.prt-action-secondary { background: var(--bg-surface); color: var(--text-sec); border: 1px solid var(--border); }
.prt-action-btn:active { transform: scale(0.96); }

/* ── Empty prompt ── */
.prt-empty-prompt {
  text-align: center; padding: 24px 20px;
  background: var(--bg-surface); border-radius: var(--r-md);
  border: 1.5px dashed rgba(167,139,250,0.35); margin-bottom: 14px;
}
.prt-empty-icon  { font-size: 32px; margin-bottom: 8px; }
.prt-empty-title { font-size: 14px; font-weight: 800; color: #a78bfa; margin-bottom: 4px; }
.prt-empty-sub   { font-size: 12px; color: var(--text-muted); }

/* ── Tabs ── */
.prt-tabs {
  display: flex; gap: 4px; background: var(--bg-hover);
  border-radius: var(--r-md); padding: 4px; margin-bottom: 16px;
}
.prt-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border: none; border-radius: 8px; background: transparent;
  color: var(--text-muted); font-size: 11px; font-weight: 600;
  font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.prt-tab-active { background: linear-gradient(135deg,var(--action),var(--action-deep)); color:#fff; box-shadow:0 2px 12px rgba(49,140,231,0.35); }
.prt-tab-icon   { font-size: 14px; }

/* ── Card ── */
.prt-card {
  background: var(--bg-surface); border-radius: var(--r-md);
  padding: 14px 16px; box-shadow: var(--card-shadow);
  margin-bottom: 12px; border: 1px solid var(--border);
}
.prt-section-title {
  font-size: 11px; font-weight: 800; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 14px;
}

/* ── Scorecards ── */
.prt-scorecards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
@media (min-width: 769px) { .prt-scorecards { flex-direction: row; } .prt-scorecard { flex: 1; } }
.prt-scorecard { background: var(--bg-surface); border-radius: var(--r-md); overflow: hidden; box-shadow: var(--card-shadow); }
.prt-scorecard-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.prt-scorecard-name   { font-size: 12px; font-weight: 800; margin-bottom: 2px; }
.prt-scorecard-equity { font-size: 22px; font-weight: 900; font-family: Inter,sans-serif; }
.prt-scorecard-sub    { font-size: 10px; color: var(--text-muted); }
.prt-scorecard-body   { padding: 12px 16px; }
.prt-scorecard-section-title { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.prt-bar-row  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.prt-bar-label { width: 72px; font-size: 10px; color: var(--text-muted); text-align: right; flex-shrink: 0; }
.prt-bar-val   { width: 80px; font-family: Inter,sans-serif; font-weight: 700; font-size: 11px; text-align: left; flex-shrink: 0; }
.prt-unreimb   { padding: 8px 10px; background: rgba(167,139,250,0.08); border-radius: var(--r-sm); font-size: 11px; color: var(--text-muted); margin-top: 8px; }
.prt-last-activity { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); margin-top: 10px; }
.prt-activity-dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* ── Runway ── */
.prt-runway       { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
.prt-runway-label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-sec); margin-bottom: 8px; }
.prt-runway-months{ font-weight: 900; font-family: Inter,sans-serif; font-size: 16px; }

/* ── Chart tab ── */
.prt-chart-legend { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
.prt-legend-item  { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.prt-legend-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.prt-milestones   { }
.prt-milestone-row{ display: flex; gap: 12px; flex-wrap: wrap; }
.prt-milestone    { flex: 1; min-width: 80px; text-align: center; padding: 8px; background: var(--bg-hover); border-radius: var(--r-sm); }
.prt-milestone-label{ font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
.prt-milestone-val  { font-size: 14px; font-weight: 900; font-family: Inter,sans-serif; }
.prt-milestone-date { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

/* ── Timeline tab ── */
.prt-chips-scroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; scrollbar-width: none; }
.prt-chips-scroll::-webkit-scrollbar { display: none; }
.prt-chip { padding: 6px 12px; flex-shrink: 0; border-radius: var(--r-pill); border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-muted); font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; white-space: nowrap; transition: all 0.2s; }
.prt-chip.active { background: var(--action-soft); color: var(--action); font-weight: 700; border-color: transparent; }

.prt-tl-group   { margin-bottom: 16px; }
.prt-tl-month-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px; }
.prt-tl-month-label  { font-size: 12px; font-weight: 800; color: var(--text-sec); }
.prt-tl-month-net    { font-size: 13px; font-weight: 800; font-family: Inter,sans-serif; }
.prt-tl-entries { display: flex; flex-direction: column; gap: 6px; }
.prt-tl-entry {
  background: var(--bg-surface); border-radius: var(--r-md); padding: 10px 12px;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  box-shadow: var(--card-shadow); border: 1px solid var(--border);
}
.prt-tl-entry-left  { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.prt-tl-entry-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.prt-tl-partner   { font-size: 11px; font-weight: 800; }
.prt-tl-type-pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.prt-tl-notes     { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
.prt-tl-amount    { font-weight: 900; font-size: 13px; font-family: Inter,sans-serif; }
.prt-tl-date      { font-size: 10px; color: var(--text-muted); }
.prt-delete-btn   { background: none; border: none; cursor: pointer; color: var(--danger); opacity: 0.6; padding: 2px; display: flex; align-items: center; transition: opacity 0.2s; }
.prt-delete-btn:hover { opacity: 1; }

/* ── Calendar tab ── */
.prt-cal-legend { display: flex; gap: 12px; margin-bottom: 12px; font-size: 11px; color: var(--text-muted); }
.prt-cal-legend-item { display: flex; align-items: center; gap: 5px; }
.prt-cal-swatch { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.prt-cal-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 6px; margin-bottom: 14px;
}
@media (min-width: 769px) { .prt-cal-grid { grid-template-columns: repeat(6, 1fr); } }
.prt-cal-cell {
  aspect-ratio: 1; border-radius: var(--r-md); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; font-family: inherit; transition: all 0.2s; min-height: 52px;
}
.prt-cal-cell:active { transform: scale(0.94); }
.prt-cal-cell.selected { box-shadow: 0 0 0 2px var(--action); }
.prt-cal-cell-label { font-size: 10px; font-weight: 700; color: var(--text-sec); }
.prt-cal-cell-net   { font-size: 9px; font-weight: 900; font-family: Inter,sans-serif; }
.prt-cal-detail     { }
.prt-cal-detail-stats { display: flex; gap: 16px; margin-bottom: 14px; font-size: 14px; font-weight: 800; font-family: Inter,sans-serif; flex-wrap: wrap; }
.prt-cal-entry { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.prt-cal-entry:last-child { border-bottom: none; }
.prt-cal-entry-amount { margin-inline-start: auto; font-weight: 900; font-size: 13px; font-family: Inter,sans-serif; }
.prt-year-summary { display: flex; gap: 12px; flex-wrap: wrap; }
.prt-year-summary > div { flex: 1; min-width: 90px; }
`
