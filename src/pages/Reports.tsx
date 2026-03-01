// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Spinner } from '../components/ui'
import { IcWhatsapp } from '../components/Icons'
import type { PageProps } from '../types'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function monthRange(year, month) {
  return { start: new Date(year, month, 1), end: new Date(year, month+1, 0, 23, 59, 59) }
}
function pct(num, den) { return den > 0 ? ((num / den) * 100).toFixed(1) : '0.0' }
function pctNum(num, den) { return den > 0 ? (num / den) * 100 : 0 }

// ── Hooks ──────────────────────────────────────────────────────────────────
function useReveal(delay = 150) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return visible
}

function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(target * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return val
}

// ── SVG helpers ─────────────────────────────────────────────────────────────
function svgPoints(pts, W, H, maxV) {
  const n = pts.length
  if (n < 2) return { line: '', area: '' }
  const xs = pts.map((_, i) => (i / (n - 1)) * W)
  const ys = pts.map(v => H - (v / (maxV || 1)) * (H * 0.88) - H * 0.04)
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = line + ` L${xs[n-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`
  return { line, area, xs, ys }
}

// ── CircleGauge ─────────────────────────────────────────────────────────────
function CircleGauge({ value, max, color = 'var(--action)', size = 72, label, sublabel, glow }) {
  const visible = useReveal(200)
  const r = (size / 2) * 0.72
  const circ = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  const dash = visible ? ratio * circ : 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:'visible' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={size * 0.1}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={size * 0.1}
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{
          transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)',
          filter: glow ? `drop-shadow(0 0 4px ${color})` : 'none',
        }}
      />
      {label && (
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fill="var(--text)" fontSize={size * 0.18} fontWeight={900} fontFamily="Inter,sans-serif">
          {label}
        </text>
      )}
      {sublabel && (
        <text x={size/2} y={size/2 + size * 0.2} textAnchor="middle" dominantBaseline="central"
          fill="var(--text-muted)" fontSize={size * 0.12} fontFamily="Almarai,sans-serif">
          {sublabel}
        </text>
      )}
    </svg>
  )
}

// ── TrendBadge ───────────────────────────────────────────────────────────────
function TrendBadge({ current, prev }) {
  if (prev === 0 && current === 0) return null
  const delta = prev > 0 ? ((current - prev) / prev) * 100 : 0
  const up = delta >= 0
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:2,
      padding:'2px 7px', borderRadius:99, fontSize:10, fontWeight:800, fontFamily:'Inter,sans-serif',
      background: up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      color: up ? '#10b981' : '#ef4444',
    }}>
      {up ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

// ── HeroKPI ──────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, currency, trend, color = 'var(--action)', accent }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  const display = currency ? formatCurrency(animated) : (typeof value === 'number' ? animated : value)

  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px',
      boxShadow: 'var(--card-shadow)', borderTop: `3px solid ${accent || color}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'Inter,sans-serif', lineHeight: 1 }}>
        {display}
      </div>
      {trend && <TrendBadge current={trend.current} prev={trend.prev}/>}
    </div>
  )
}

// ── DailyChart (SVG area + hot day dots) ────────────────────────────────────
function DailyChart({ data }) {
  const visible = useReveal(300)
  const W = 340, H = 90
  const vals = data.map(d => d.revenue)
  const maxV = Math.max(...vals, 1)
  const hotThreshold = maxV * 0.7
  const { line, area, xs, ys } = svgPoints(vals, W, H, maxV)

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 240, height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="rptDayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--action)" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="var(--action)" stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#rptDayGrad)"/>}
        {line && (
          <path d={line} fill="none" stroke="var(--action)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s' }}
          />
        )}
        {xs && data.map((d, i) => d.revenue >= hotThreshold && (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={4} fill="var(--action)"
            style={{ filter: 'drop-shadow(0 0 5px var(--action))' }}
          />
        ))}
      </svg>
    </div>
  )
}

// ── RevenueRiver (12-month triple-area SVG) ──────────────────────────────────
function RevenueRiver({ months }) {
  const [hovered, setHovered] = useState(null)
  const W = 360, H = 120
  const maxV = Math.max(...months.map(m => m.revenue), 1)
  const revPts = months.map(m => m.revenue)
  const gpPts  = months.map(m => Math.max(m.grossProfit, 0))
  const expPts = months.map(m => m.expenses)

  const rev = svgPoints(revPts, W, H, maxV)
  const gp  = svgPoints(gpPts,  W, H, maxV)
  const exp = svgPoints(expPts, W, H, maxV)

  const recordIdx = months.reduce((best, m, i) => m.revenue > months[best].revenue ? i : best, 0)

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', minWidth: 280, height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="rRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#318CE7" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#318CE7" stopOpacity="0.02"/>
          </linearGradient>
          <linearGradient id="rGpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02"/>
          </linearGradient>
          <linearGradient id="rExpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {rev.area && <path d={rev.area} fill="url(#rRevGrad)"/>}
        {gp.area  && <path d={gp.area}  fill="url(#rGpGrad)"/>}
        {exp.area && <path d={exp.area} fill="url(#rExpGrad)"/>}
        {rev.line && <path d={rev.line} fill="none" stroke="#318CE7" strokeWidth="1.8" strokeLinejoin="round"/>}
        {gp.line  && <path d={gp.line}  fill="none" stroke="#10b981" strokeWidth="1.2" strokeLinejoin="round" strokeDasharray="4,3"/>}

        {rev.xs && months.map((m, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} style={{ cursor: 'pointer' }}>
            <circle
              cx={rev.xs[i]} cy={rev.ys[i]} r={i === recordIdx ? 6 : 3.5}
              fill={i === recordIdx ? '#f59e0b' : '#318CE7'}
              stroke={i === hovered ? '#fff' : 'none'} strokeWidth={1.5}
              style={{ filter: i === recordIdx ? 'drop-shadow(0 0 5px #f59e0b)' : 'none' }}
            />
            <rect x={rev.xs[i] - 14} y={0} width={28} height={H} fill="transparent"/>
          </g>
        ))}

        {hovered !== null && rev.xs && (
          <line x1={rev.xs[hovered]} y1={0} x2={rev.xs[hovered]} y2={H}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4"/>
        )}
      </svg>

      {/* Month labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingInline: 2, marginTop: 4 }}>
        {months.map((m, i) => (
          <div key={i} style={{
            fontSize: 9, textAlign: 'center', lineHeight: 1.2,
            color: i === recordIdx ? '#f59e0b' : 'var(--text-muted)',
            fontWeight: i === recordIdx ? 800 : 400,
          }}>
            {m.label}
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      {hovered !== null && (
        <div style={{
          position: 'absolute', top: 8, insetInlineStart: 8,
          background: 'var(--bg-surface)', borderRadius: 'var(--r-md)',
          padding: '8px 12px', boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border)', fontSize: 11, pointerEvents: 'none', zIndex: 10,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{months[hovered].label} {months[hovered].year}</div>
          <div style={{ color: '#318CE7' }}>مبيعات: {formatCurrency(months[hovered].revenue)}</div>
          <div style={{ color: '#10b981' }}>ربح إجمالي: {formatCurrency(months[hovered].grossProfit)}</div>
          <div style={{ color: '#ef4444' }}>مصاريف: {formatCurrency(months[hovered].expenses)}</div>
          <div style={{ color: 'var(--text-muted)', fontFamily: 'Inter,sans-serif' }}>{months[hovered].orderCount} طلب</div>
        </div>
      )}
    </div>
  )
}

// ── Podium (top 3 visual) ────────────────────────────────────────────────────
function Podium({ top3 }) {
  const heights = [100, 70, 55]
  const colors  = ['#f59e0b', '#94a3b8', '#cd7c3a']
  const emojis  = ['🥇', '🥈', '🥉']
  const order   = [1, 0, 2] // silver left, gold center, bronze right

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, padding: '16px 0', direction: 'ltr' }}>
      {order.map(idx => {
        const p = top3[idx]
        if (!p) return <div key={idx} style={{ width: 90 }}/>
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: idx === 0 ? 22 : 16 }}>{emojis[idx]}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', maxWidth: 90, lineHeight: 1.3, direction: 'rtl', color: 'var(--text)' }}>
              {p.name}
              {p.size ? <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10 }}>{p.size}</span> : null}
            </div>
            <div style={{ fontSize: 11, color: colors[idx], fontWeight: 900, fontFamily: 'Inter,sans-serif' }}>
              {formatCurrency(p.revenue)}
            </div>
            <div style={{
              width: idx === 0 ? 88 : 72,
              height: heights[idx],
              background: `linear-gradient(180deg,${colors[idx]},${colors[idx]}99)`,
              borderRadius: '8px 8px 0 0',
              boxShadow: `0 0 20px ${colors[idx]}55`,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
            }}>
              <span style={{ fontSize: idx === 0 ? 22 : 17, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>
                #{idx + 1}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Reports(_: PageProps) {
  const [orders,   setOrders]   = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('overview')
  const [selMonth, setSelMonth] = useState(new Date().getMonth())
  const [selYear,  setSelYear]  = useState(new Date().getFullYear())
  const [prodSort, setProdSort] = useState('revenue')

  useEffect(() => {
    Promise.all([
      DB.list('orders',   { orderBy: 'created_at' }),
      DB.list('expenses', { orderBy: 'date' }),
    ]).then(([o, e]) => { setOrders(o); setExpenses(e) })
    .finally(() => setLoading(false))
  }, [])

  // ── Current-month metrics ────────────────────────────────────────────────
  const {
    monthOrders, monthExpenses, delivered, replacements, notDelivered,
    revenue, grossProfit, hayyakFees, productCost, totalExp, netProfit,
    deliveryRate, replaceRate, dailyData, maxDay, daysInMonth, cities, maxCity,
  } = useMemo(() => {
    const { start, end } = monthRange(selYear, selMonth)
    const mOrders   = orders.filter(o => { const d = new Date(o.order_date||o.created_at); return d >= start && d <= end })
    const mExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end })

    const del    = mOrders.filter(o => o.status === 'delivered' || o.status === 'تم')
    const repl   = mOrders.filter(o => o.is_replacement)
    const notDel = mOrders.filter(o => o.status === 'not_delivered' || o.status === 'لم يتم')

    const rev   = mOrders.reduce((s, o) => s + (o.total||0), 0)
    const gp    = mOrders.reduce((s, o) => s + (o.gross_profit||0), 0)
    const hFees = mOrders.reduce((s, o) => s + (o.hayyak_fee||0), 0)
    const pCost = mOrders.reduce((s, o) => s + (o.product_cost||0), 0)
    const tExp  = mExpenses.reduce((s, e) => s + (e.amount||0), 0)

    const days = new Date(selYear, selMonth + 1, 0).getDate()
    const dayMap = Array.from({ length: days }, () => ({ revenue: 0, count: 0 }))
    mOrders.forEach(o => {
      const day = new Date(o.order_date||o.created_at).getDate() - 1
      if (day >= 0 && day < days) { dayMap[day].revenue += (o.total||0); dayMap[day].count++ }
    })
    const daily = dayMap.map((d, i) => ({ day: i + 1, ...d }))
    const mDay  = Math.max(...daily.map(d => d.revenue), 1)

    const cMap = {}
    mOrders.forEach(o => {
      const c = o.customer_city || 'غير محدد'
      if (!cMap[c]) cMap[c] = { count: 0, revenue: 0, delivered: 0 }
      cMap[c].count++
      cMap[c].revenue += (o.total||0)
      if (o.status === 'delivered' || o.status === 'تم') cMap[c].delivered++
    })
    const cList = Object.entries(cMap).sort((a, b) => b[1].count - a[1].count)
    const mCity = Math.max(...cList.map(([, d]) => d.count), 1)

    return {
      monthOrders: mOrders, monthExpenses: mExpenses,
      delivered: del, replacements: repl, notDelivered: notDel,
      revenue: rev, grossProfit: gp, hayyakFees: hFees, productCost: pCost,
      totalExp: tExp, netProfit: gp - tExp,
      deliveryRate: pct(del.length, mOrders.length),
      replaceRate:  pct(repl.length, mOrders.length),
      dailyData: daily, maxDay: mDay, daysInMonth: days,
      cities: cList, maxCity: mCity,
    }
  }, [orders, expenses, selYear, selMonth])

  // ── Previous month (for trend) ────────────────────────────────────────────
  const prevMonth = useMemo(() => {
    const d = new Date(selYear, selMonth - 1, 1)
    const { start, end } = monthRange(d.getFullYear(), d.getMonth())
    const mOrds = orders.filter(o => { const dd = new Date(o.order_date||o.created_at); return dd >= start && dd <= end })
    const mExps = expenses.filter(e => { const dd = new Date(e.date); return dd >= start && dd <= end })
    const rev = mOrds.reduce((s, o) => s + (o.total||0), 0)
    const gp  = mOrds.reduce((s, o) => s + (o.gross_profit||0), 0)
    const exp = mExps.reduce((s, e) => s + (e.amount||0), 0)
    return { revenue: rev, grossProfit: gp, netProfit: gp - exp, orders: mOrds.length }
  }, [orders, expenses, selYear, selMonth])

  // ── 12-month P&L (Revenue River) ──────────────────────────────────────────
  const pnlMonths = useMemo(() => {
    const result = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(selYear, selMonth - i, 1)
      const y = d.getFullYear(), m = d.getMonth()
      const { start, end } = monthRange(y, m)
      const mOrds = orders.filter(o => { const dd = new Date(o.order_date||o.created_at); return dd >= start && dd <= end })
      const mExps = expenses.filter(e => { const dd = new Date(e.date); return dd >= start && dd <= end })
      const rev    = mOrds.reduce((s, o) => s + (o.total||0), 0)
      const gp     = mOrds.reduce((s, o) => s + (o.gross_profit||0), 0)
      const hayyak = mOrds.reduce((s, o) => s + (o.hayyak_fee||0), 0)
      const exp    = mExps.reduce((s, e) => s + (e.amount||0), 0)
      const repl   = mOrds.filter(o => o.is_replacement).length
      result.push({
        label: MONTHS[m].slice(0, 3), month: m, year: y,
        revenue: rev, grossProfit: gp, hayyak, expenses: exp,
        netProfit: gp - exp, orderCount: mOrds.length,
        replacements: repl,
        replaceRate: mOrds.length > 0 ? ((repl / mOrds.length) * 100).toFixed(1) : '0.0',
      })
    }
    return result
  }, [orders, expenses, selMonth, selYear])

  // ── YTD summary ───────────────────────────────────────────────────────────
  const { ytdRevenue, ytdGP, ytdExp, ytdNet, ytdRepl, expCategories, totalYtdExp, maxExpCat } = useMemo(() => {
    const yOrds = orders.filter(o => new Date(o.order_date||o.created_at).getFullYear() === selYear)
    const yExps = expenses.filter(e => new Date(e.date).getFullYear() === selYear)
    const rev  = yOrds.reduce((s, o) => s + (o.total||0), 0)
    const gp   = yOrds.reduce((s, o) => s + (o.gross_profit||0), 0)
    const exp  = yExps.reduce((s, e) => s + (e.amount||0), 0)
    const repl = yOrds.filter(o => o.is_replacement).length
    const catMap = {}
    yExps.forEach(e => { const cat = e.category||'أخرى'; if (!catMap[cat]) catMap[cat] = 0; catMap[cat] += (e.amount||0) })
    const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    return {
      ytdRevenue: rev, ytdGP: gp, ytdExp: exp, ytdNet: gp - exp, ytdRepl: repl,
      expCategories: cats,
      totalYtdExp: cats.reduce((s, [, v]) => s + v, 0),
      maxExpCat: Math.max(...cats.map(([, v]) => v), 1),
    }
  }, [orders, expenses, selYear])

  // ── Product profitability ─────────────────────────────────────────────────
  const { sortedProducts, totalProductRevenue } = useMemo(() => {
    const pMap = {}
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      const items = o.items || []
      const itemCount = items.reduce((s, i) => s + (parseInt(i.qty) || 1), 0)
      const orderHayyak = parseFloat(o.hayyak_fee) || 0
      items.forEach(item => {
        const key = `${item.name}${item.size ? '—' + item.size : ''}`
        if (!pMap[key]) pMap[key] = { name: item.name, size: item.size||'', qty: 0, revenue: 0, cost: 0, profit: 0 }
        const qty = parseInt(item.qty) || 1
        const rev  = (parseFloat(item.price)||0) * qty
        const cost = (parseFloat(item.cost)||0) * qty
        const hayyakShare = itemCount > 0 ? (orderHayyak * qty / itemCount) : 0
        pMap[key].qty += qty
        pMap[key].revenue += rev
        pMap[key].cost += cost
        if (o.is_replacement || o.status === 'not_delivered') {
          pMap[key].profit -= (cost + hayyakShare)
        } else {
          pMap[key].profit += (rev - cost - hayyakShare)
        }
      })
    })
    const all = Object.values(pMap).map(p => ({
      ...p,
      margin:   p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0',
      avgPrice: p.qty > 0 ? p.revenue / p.qty : 0,
    }))
    const sorted = [...all].sort((a, b) => {
      if (prodSort === 'revenue') return b.revenue - a.revenue
      if (prodSort === 'qty')     return b.qty - a.qty
      if (prodSort === 'profit')  return b.profit - a.profit
      return parseFloat(b.margin) - parseFloat(a.margin)
    })
    return { sortedProducts: sorted, totalProductRevenue: all.reduce((s, p) => s + p.revenue, 0) }
  }, [orders, prodSort])

  // ── Replacements + problem cities ─────────────────────────────────────────
  const { allReplacements, allNotDelivered, totalReplCost, totalNDCost, problemCities } = useMemo(() => {
    const repl   = orders.filter(o => o.is_replacement)
    const notDel = orders.filter(o => o.status === 'not_delivered' || o.status === 'لم يتم')

    const cityMap = {}
    orders.forEach(o => {
      const c = o.customer_city || 'غير محدد'
      if (!cityMap[c]) cityMap[c] = { total: 0, repl: 0, notDel: 0 }
      cityMap[c].total++
      if (o.is_replacement) cityMap[c].repl++
      if (o.status === 'not_delivered' || o.status === 'لم يتم') cityMap[c].notDel++
    })
    const probCities = Object.entries(cityMap)
      .filter(([, d]) => d.total >= 3)
      .map(([city, d]) => ({ city, ...d, failRate: ((d.repl + d.notDel) / d.total) * 100 }))
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 8)

    return {
      allReplacements: repl, allNotDelivered: notDel,
      totalReplCost: repl.reduce((s, o) => s + Math.abs(o.gross_profit||0), 0),
      totalNDCost:   notDel.reduce((s, o) => s + Math.abs(o.gross_profit||0), 0),
      problemCities: probCities,
    }
  }, [orders])

  // ── WhatsApp share ────────────────────────────────────────────────────────
  function shareWhatsApp() {
    const text = `تقرير ${MONTHS[selMonth]} ${selYear}\n\nالمبيعات: ${formatCurrency(revenue)}\nالطلبات: ${monthOrders.length} (تسليم ${deliveryRate}%)\nربح إجمالي: ${formatCurrency(grossProfit)}\nصافي الربح: ${formatCurrency(netProfit)}\nاستبدالات: ${replacements.length} (${replaceRate}%)`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36}/>
    </div>
  )

  const TABS = [
    { id: 'overview',  label: 'عامة' },
    { id: 'pnl',       label: 'الأرباح' },
    { id: 'products',  label: 'المنتجات' },
    { id: 'returns',   label: 'المخاطر' },
  ]

  const overallReplRate = orders.length > 0 ? (allReplacements.length / orders.length) * 100 : 0
  const recordMonth = pnlMonths.length > 0 ? pnlMonths.reduce((best, m) => m.revenue > best.revenue ? m : best, pnlMonths[0]) : null

  return (
    <div style={{ padding: '16px 16px 140px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text)' }}>التقارير</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>تحليلات ذكية شاملة</p>
        </div>
        <button onClick={shareWhatsApp} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', background: 'rgba(37,211,102,0.1)',
          border: '1px solid rgba(37,211,102,0.3)', borderRadius: 'var(--r-md)',
          color: '#25d366', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
        }}>
          <IcWhatsapp size={15}/> مشاركة
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-hover)', borderRadius: 'var(--r-md)', padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'linear-gradient(135deg,var(--action),#1e6fbf)' : 'transparent',
            color: tab === t.id ? '#ffffff' : 'var(--text-muted)',
            fontWeight: tab === t.id ? 800 : 500, fontSize: 12, fontFamily: 'inherit', transition: 'all 120ms',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — EXECUTIVE COMMAND CENTER + GEOGRAPHIC INTEL
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          {/* Month selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))} style={{
              padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={{
              padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Hero KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            <HeroKPI
              label="إجمالي المبيعات" value={revenue} currency
              accent="#318CE7" color="var(--action)"
              trend={{ current: revenue, prev: prevMonth.revenue }}
            />
            <HeroKPI
              label="الربح الإجمالي" value={grossProfit} currency
              accent="#10b981" color="#10b981"
              trend={{ current: grossProfit, prev: prevMonth.grossProfit }}
            />
            <HeroKPI
              label="صافي الربح" value={netProfit} currency
              accent={netProfit >= 0 ? '#10b981' : '#ef4444'}
              color={netProfit >= 0 ? '#10b981' : '#ef4444'}
              trend={{ current: netProfit, prev: prevMonth.netProfit }}
            />
            <HeroKPI
              label="عدد الطلبات" value={monthOrders.length}
              accent="#8b5cf6" color="#8b5cf6"
              trend={{ current: monthOrders.length, prev: prevMonth.orders }}
            />
          </div>

          {/* Quick-stats strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'نسبة التسليم',  value: `${deliveryRate}%`,       color: parseFloat(deliveryRate) >= 85 ? '#10b981' : 'var(--warning)' },
              { label: 'الاستبدالات',   value: `${replaceRate}%`,        color: parseFloat(replaceRate) > 10 ? '#ef4444' : 'var(--text-muted)' },
              { label: 'رسوم حياك',     value: formatCurrency(hayyakFees), color: '#ef4444' },
              { label: 'تكلفة المنتجات', value: formatCurrency(productCost), color: 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)',
                boxShadow: 'var(--card-shadow)', flex: '1 0 110px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: 'Inter,sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Daily SVG chart */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>المبيعات اليومية — {MONTHS[selMonth]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                أعلى يوم: <span style={{ fontFamily: 'Inter,sans-serif', color: 'var(--action)', fontWeight: 700 }}>{formatCurrency(maxDay)}</span>
              </div>
            </div>
            <DailyChart data={dailyData}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>1</span><span>{Math.floor(daysInMonth / 2)}</span><span>{daysInMonth}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--action)', display: 'inline-block', boxShadow: '0 0 5px var(--action)' }}/>
              أيام الذروة (أعلى 30% من المبيعات)
            </div>
          </div>

          {/* Geographic Intelligence */}
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>
            التوزيع الجغرافي
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginInlineStart: 8 }}>
              {cities.length} إمارة / مدينة
            </span>
          </div>

          {cities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>لا توجد بيانات</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {cities.slice(0, 8).map(([city, data]) => {
                const citySharePct = pctNum(data.count, monthOrders.length)
                const delRate = data.count > 0 ? (data.delivered / data.count) * 100 : 0
                const isGood = delRate >= 85

                return (
                  <div key={city} style={{
                    background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)',
                    padding: '14px 12px', boxShadow: 'var(--card-shadow)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
                  }}>
                    <CircleGauge
                      value={citySharePct} max={100}
                      color="var(--action)" size={64}
                      label={`${citySharePct.toFixed(0)}%`} glow
                    />
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{city}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>{data.count}</span> طلب
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter,sans-serif' }}>
                      {formatCurrency(data.revenue)}
                    </div>
                    <div style={{
                      padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      background: isGood ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: isGood ? '#10b981' : '#ef4444',
                    }}>
                      تسليم {delRate.toFixed(0)}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — REVENUE RIVER (12-MONTH P&L)
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'pnl' && (
        <>
          {/* Year selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={{
              padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* YTD hero strip */}
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)',
            padding: '18px 20px', marginBottom: 20, boxShadow: 'var(--card-shadow)',
            display: 'flex', flexWrap: 'wrap', gap: '14px 32px', borderTop: '3px solid var(--action)',
          }}>
            {[
              { label: `مبيعات ${selYear}`, value: formatCurrency(ytdRevenue), color: 'var(--action)' },
              { label: 'ربح إجمالي',        value: formatCurrency(ytdGP),      color: '#10b981' },
              { label: 'مصاريف',            value: formatCurrency(ytdExp),      color: '#ef4444' },
              { label: 'صافي الربح',        value: formatCurrency(ytdNet),      color: ytdNet >= 0 ? '#10b981' : '#ef4444' },
              { label: 'استبدالات',         value: ytdRepl,                     color: 'var(--warning)' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'Inter,sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue River chart */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>نهر الإيرادات — 12 شهر</div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
                {[
                  { color: '#318CE7', label: 'مبيعات' },
                  { color: '#10b981', label: 'ربح إجمالي (مقطع)' },
                  { color: '#ef4444', label: 'مصاريف' },
                ].map(l => (
                  <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }}/>
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Record month badge */}
            {recordMonth && recordMonth.revenue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>🏆</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                  أفضل شهر: {recordMonth.label} {recordMonth.year} — {formatCurrency(recordMonth.revenue)}
                </span>
              </div>
            )}

            <RevenueRiver months={pnlMonths}/>
          </div>

          {/* 6-month summary table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 16, overflowX: 'auto' }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>ملخص آخر 6 أشهر</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 480 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['الشهر', 'الطلبات', 'المبيعات', 'الربح الإجمالي', 'المصاريف', 'الصافي', 'الهامش'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pnlMonths.slice(-6).map((m, i) => (
                  <tr key={i} style={{ opacity: m.revenue === 0 ? 0.45 : 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: 'var(--text)' }}>{m.label}</td>
                    <td style={{ padding: '8px', color: 'var(--text-sec)', fontFamily: 'Inter,sans-serif' }}>{m.orderCount}</td>
                    <td style={{ padding: '8px', color: '#318CE7', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>{formatCurrency(m.revenue)}</td>
                    <td style={{ padding: '8px', color: '#10b981', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(m.grossProfit)}</td>
                    <td style={{ padding: '8px', color: '#ef4444', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(m.expenses)}</td>
                    <td style={{ padding: '8px', fontWeight: 800, fontFamily: 'Inter,sans-serif', color: m.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                      {m.netProfit >= 0 ? '+' : ''}{formatCurrency(m.netProfit)}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--warning)', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>
                      {m.revenue > 0 ? pct(m.netProfit, m.revenue) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expense categories */}
          {expCategories.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
                المصاريف حسب الفئة ({selYear})
              </div>
              {expCategories.map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-sec)' }}>{cat}</span>
                    <span style={{ fontWeight: 700, color: '#ef4444', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(amt)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-hover)', borderRadius: 99 }}>
                    <div style={{ width: `${(amt / maxExpCat) * 100}%`, height: '100%', background: '#ef4444', borderRadius: 99, transition: 'width 0.4s ease', opacity: 0.7 }}/>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>الإجمالي</span>
                <span style={{ fontWeight: 900, color: '#ef4444', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(totalYtdExp)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — PRODUCT PODIUM
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <>
          {/* Sort chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { value: 'revenue', label: 'الأعلى مبيعاً' },
              { value: 'qty',     label: 'الأكثر كمية' },
              { value: 'profit',  label: 'الأعلى ربحاً' },
              { value: 'margin',  label: 'أعلى هامش' },
            ].map(s => (
              <button key={s.value} onClick={() => setProdSort(s.value)} style={{
                padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${prodSort === s.value ? 'var(--action)' : 'var(--border)'}`,
                background: prodSort === s.value ? 'rgba(49,140,231,0.1)' : 'var(--bg-hover)',
                color: prodSort === s.value ? 'var(--action)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: prodSort === s.value ? 800 : 500,
              }}>{s.label}</button>
            ))}
          </div>

          {sortedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 700 }}>لا يوجد بيانات منتجات بعد</div>
            </div>
          ) : (
            <>
              {/* Award badges */}
              {sortedProducts.length >= 2 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '6px 12px', borderRadius: 999,
                    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b',
                    fontSize: 11, fontWeight: 800,
                  }}>
                    ⭐ نجم المبيعات: {sortedProducts[0].name}
                  </div>
                  {(() => {
                    const vk = [...sortedProducts].sort((a, b) => b.qty - a.qty)[0]
                    return (
                      <div style={{
                        padding: '6px 12px', borderRadius: 999,
                        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6',
                        fontSize: 11, fontWeight: 800,
                      }}>
                        📦 ملك الكميات: {vk.name}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Podium */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, textAlign: 'center', marginBottom: 4, color: 'var(--text)' }}>
                  منصة التتويج 🏆
                </div>
                <Podium top3={sortedProducts.slice(0, 3)}/>
              </div>

              {/* Full ranked list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedProducts.map((p, i) => {
                  const share = totalProductRevenue > 0 ? (p.revenue / totalProductRevenue) * 100 : 0
                  const marginPct = parseFloat(p.margin)
                  const rankColors = [
                    'linear-gradient(135deg,#f59e0b,#fbbf24)',
                    'linear-gradient(135deg,#94a3b8,#cbd5e1)',
                    'linear-gradient(135deg,#cd7c3a,#d4a35a)',
                  ]
                  const borderColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c3a' : 'var(--border)'

                  return (
                    <div key={`${p.name}-${p.size}`} style={{
                      background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px',
                      boxShadow: i === 0 ? '0 0 20px rgba(49,140,231,0.1), var(--card-shadow)' : 'var(--card-shadow)',
                      borderInlineStart: `3px solid ${borderColor}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                          background: i < 3 ? rankColors[i] : 'var(--bg-hover)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, fontSize: 12, color: i < 3 ? '#fff' : 'var(--text-muted)',
                        }}>
                          {i < 3 ? `#${i + 1}` : i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>
                          {p.size && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.size}</div>}
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--action)', fontFamily: 'Inter,sans-serif' }}>
                          {formatCurrency(p.revenue)}
                        </div>
                      </div>

                      {/* Stat chips */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {[
                          { label: 'الكمية',      value: `${p.qty} وحدة`,           color: 'var(--text-sec)' },
                          { label: 'الربح',       value: formatCurrency(p.profit),   color: p.profit >= 0 ? '#10b981' : '#ef4444' },
                          { label: 'الهامش',      value: `${p.margin}%`,             color: marginPct > 30 ? '#10b981' : marginPct > 10 ? 'var(--warning)' : '#ef4444' },
                          { label: 'سعر الوحدة', value: formatCurrency(p.avgPrice),  color: 'var(--text-muted)' },
                        ].map(s => (
                          <div key={s.label} style={{ padding: '4px 9px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
                            <span style={{ fontWeight: 700, color: s.color, fontFamily: 'Inter,sans-serif' }}>{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Revenue share bar */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                          <span>حصة المبيعات</span>
                          <span style={{ fontFamily: 'Inter,sans-serif' }}>{share.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 99 }}>
                          <div style={{ width: `${share}%`, height: '100%', background: 'linear-gradient(90deg,var(--action),#1e6fbf)', borderRadius: 99, transition: 'width 0.5s ease' }}/>
                        </div>
                      </div>

                      {/* Margin bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                          <span>هامش الربح</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 99 }}>
                          <div style={{
                            width: `${Math.min(Math.max(marginPct, 0), 100)}%`, height: '100%', borderRadius: 99, transition: 'width 0.5s ease',
                            background: marginPct > 30 ? '#10b981' : marginPct > 10 ? '#f59e0b' : '#ef4444',
                          }}/>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4 — LOSS INTELLIGENCE CENTER
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'returns' && (
        <>
          {/* Loss Meter + KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, marginBottom: 20, alignItems: 'start' }}>
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)',
              padding: '20px 16px', boxShadow: 'var(--card-shadow)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-sec)' }}>مقياس الخسارة</div>
              <CircleGauge
                value={overallReplRate} max={30}
                color={overallReplRate > 15 ? '#ef4444' : overallReplRate > 7 ? '#f59e0b' : '#10b981'}
                size={100}
                label={`${overallReplRate.toFixed(1)}%`}
                sublabel="استبدال"
                glow
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                {overallReplRate <= 5 ? '✅ ممتاز' : overallReplRate <= 10 ? '⚠️ مقبول' : '🔴 يحتاج تدخل'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'إجمالي الاستبدالات', value: allReplacements.length, sub: `${pct(allReplacements.length, orders.length)}% من الكل`, color: '#ef4444' },
                { label: 'تكلفة الاستبدالات',  value: formatCurrency(totalReplCost), color: '#ef4444' },
                { label: 'لم يتم التسليم',      value: allNotDelivered.length, sub: `${pct(allNotDelivered.length, orders.length)}% من الكل`, color: '#f59e0b' },
                { label: 'تكلفة لم يتم',        value: formatCurrency(totalNDCost), color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', padding: '12px', boxShadow: 'var(--card-shadow)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.color, fontFamily: 'Inter,sans-serif' }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Monthly replacement trend */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
              تطور معدل الاستبدال شهرياً
            </div>
            {pnlMonths.filter(m => m.orderCount > 0).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>لا توجد بيانات</div>
            ) : pnlMonths.filter(m => m.orderCount > 0).map((m, i) => {
              const rate = parseFloat(m.replaceRate)
              const isBad = rate > 10
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>{m.label} {m.year}</span>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'Inter,sans-serif' }}>{m.orderCount} طلب</span>
                      <span style={{ fontWeight: 700, fontFamily: 'Inter,sans-serif', color: isBad ? '#ef4444' : '#10b981' }}>
                        {m.replacements} ({m.replaceRate}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 99 }}>
                    <div style={{
                      width: `${Math.min(rate * 5, 100)}%`, height: '100%', borderRadius: 99, transition: 'width 0.4s ease',
                      background: isBad ? '#ef4444' : '#10b981',
                      boxShadow: isBad ? '0 0 6px rgba(239,68,68,0.4)' : 'none',
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Problem cities */}
          {problemCities.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
                المناطق الأكثر مشكلة
              </div>
              {problemCities.map((city, i) => (
                <div key={city.city} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: i < problemCities.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#ef4444',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{city.city}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ fontFamily: 'Inter,sans-serif' }}>{city.total}</span> طلب ·&nbsp;
                      <span style={{ fontFamily: 'Inter,sans-serif', color: '#ef4444' }}>{city.repl}</span> استبدال ·&nbsp;
                      <span style={{ fontFamily: 'Inter,sans-serif', color: '#f59e0b' }}>{city.notDel}</span> لم يتم
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 99,
                    background: city.failRate > 20 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: city.failRate > 20 ? '#ef4444' : '#f59e0b',
                    fontSize: 12, fontWeight: 800, fontFamily: 'Inter,sans-serif',
                  }}>
                    {city.failRate.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Replacement list */}
          {allReplacements.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
                قائمة الاستبدالات
                <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginInlineStart: 6 }}>({allReplacements.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allReplacements.slice(0, 20).map(o => (
                  <div key={o.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    background: 'var(--bg-hover)', borderRadius: 'var(--r-md)',
                    borderInlineStart: '2px solid #ef4444', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>{o.order_number}</span>
                    <span style={{ fontSize: 12, flex: 1, fontWeight: 700, color: 'var(--text)' }}>{o.customer_name||'—'}</span>
                    {o.customer_city && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customer_city}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.order_date || formatDate(o.created_at)}</span>
                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
                      {formatCurrency(Math.abs(o.gross_profit||0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not-delivered list */}
          {allNotDelivered.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
                لم يتم التسليم
                <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginInlineStart: 6 }}>({allNotDelivered.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allNotDelivered.slice(0, 20).map(o => (
                  <div key={o.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    background: 'var(--bg-hover)', borderRadius: 'var(--r-md)',
                    borderInlineStart: '2px solid #f59e0b', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>{o.order_number}</span>
                    <span style={{ fontSize: 12, flex: 1, fontWeight: 700, color: 'var(--text)' }}>{o.customer_name||'—'}</span>
                    {o.customer_city && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customer_city}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.order_date || formatDate(o.created_at)}</span>
                    <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
                      {formatCurrency(o.total||0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allReplacements.length === 0 && allNotDelivered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>لا يوجد استبدالات أو طلبات غير مسلّمة</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>أداء مثالي 🎉</div>
            </div>
          )}
        </>
      )}

    </div>
  )
}
