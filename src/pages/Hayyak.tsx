// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Modal, Input, Textarea, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcEdit, IcDelete, IcSearch, IcCheck, IcAlert } from '../components/Icons'
import useDebounce from '../hooks/useDebounce'
import type { PageProps } from '../types'

/* ═══════════════════════════════════════════════════════════
   HAYYAK PAGE v9 — Smart Redesign
   Concepts: 1 (Cash Flow River) + 2 (Reconciliation Cockpit)
             + 3 (Settlement Wizard) + 5 (Delivery Intelligence Hub)
═══════════════════════════════════════════════════════════ */

/* ─── Animation hooks ──────────────────────────────────── */
function useReveal(delay = 0) {
  const [v, setV] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setV(true), delay)
    return () => clearTimeout(t)
  }, [])
  return v
}

function useCountUp(target: number, dur = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, dur])
  return val
}

/* ─── Circle Gauge ─────────────────────────────────────── */
function CircleGauge({ value = 0, max = 100, size = 80, color = 'var(--action)', label = '', sublabel = '', glow = false, sw = 8 }) {
  const r    = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const pct  = max > 0 ? Math.min(value / max, 1) : 0
  const dash = circ * pct
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible', flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{
            transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)',
            filter: glow ? `drop-shadow(0 0 5px ${color})` : 'none',
          }}
        />
      </svg>
      {(sublabel || label) && (
        <div style={{ textAlign: 'center', marginTop: -2 }}>
          {sublabel && <div style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'Inter,sans-serif' }}>{sublabel}</div>}
          {label    && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>}
        </div>
      )}
    </div>
  )
}

/* ─── Flow Step (Cash Flow River) ──────────────────────── */
function FlowStep({ icon, label, value, color = 'var(--action)', pulse = false, isLast = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '14px 12px', borderRadius: 'var(--r-md)', textAlign: 'center', minWidth: 0,
        background: 'var(--bg-hover)',
        border: `1.5px solid ${pulse ? 'rgba(var(--warning-rgb),0.45)' : 'var(--border)'}`,
        boxShadow: pulse ? '0 0 18px rgba(var(--warning-rgb),0.18)' : 'none',
        animation: pulse ? 'hkPulse 2.5s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontSize: 18, lineHeight: 1 }}>{icon}</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 900, color, fontFamily: 'Inter,sans-serif', wordBreak: 'break-all' }}>{value}</div>
      </div>
      {!isLast && (
        <div style={{
          padding: '0 3px', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1,
          animation: 'hkFlow 1.8s ease-in-out infinite', flexShrink: 0,
        }}>←</div>
      )}
    </div>
  )
}

/* ─── Running Balance Chart (Concept 5) ────────────────── */
function RunningBalanceChart({ data }) {
  if (!data || data.length < 2) return (
    <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
      أضف تحويلين أو أكثر لعرض المخطط
    </div>
  )
  const W = 300, H = 72
  const maxV = Math.max(...data.map(d => d.cumulative), 1)
  const pts  = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (d.cumulative / maxV) * (H - 10) - 5,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 72, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="rbGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--action)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--action)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rbGrad)" />
      <path d={line} fill="none" stroke="var(--action)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--action)" stroke="var(--bg-surface)" strokeWidth="1.5" />
      ))}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════ */
export default function Hayyak(_: PageProps) {
  const [orders,      setOrders]      = useState([])
  const [remittances, setRemittances] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('overview')
  const [search,      setSearch]      = useState('')
  const debouncedSearch = useDebounce(search)
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [groupBy,     setGroupBy]     = useState('none')
  const [showWizard,  setShowWizard]  = useState(false)
  const [editRemit,   setEditRemit]   = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [ords, remits] = await Promise.all([
        DB.list('orders',              { orderBy: 'created_at' }),
        DB.list('hayyak_remittances',  { orderBy: 'date' }),
      ])
      setOrders(ords)
      setRemittances(remits.reverse())
    } catch (e) { console.error(e); toast('خطأ في تحميل الطلبات', 'error') }
    finally { setLoading(false) }
  }

  /* ── Core stats ─────────────────────────────────────── */
  const stats = useMemo(() => {
    const delivered     = orders.filter(o => o.status === 'delivered')
    const pendingOrders = delivered.filter(o => !o.hayyak_remittance_id)
    const settledOrders = delivered.filter(o =>  o.hayyak_remittance_id)
    const notDelivered  = orders.filter(o => o.status === 'not_delivered')
    const allNonCanc    = orders.filter(o => o.status !== 'cancelled')

    const totalCOD        = delivered.reduce(    (s, o) => s + (o.total        || 0), 0)
    const pendingCOD      = pendingOrders.reduce((s, o) => s + (o.total        || 0), 0)
    const totalHayyakFees = orders
      .filter(o => ['delivered', 'not_delivered'].includes(o.status))
      .reduce((s, o) => s + (o.hayyak_fee || 0), 0)
    const bankReceived  = remittances.reduce((s, r) => s + (r.bank_received || 0), 0)
    const transferFees  = remittances.reduce((s, r) => s + (r.transfer_fee  || 0), 0)
    const totalLoss     = notDelivered.reduce((s, o) => s + Math.abs(o.gross_profit || 0), 0)

    const oldestAge = pendingOrders.length > 0
      ? Math.max(...pendingOrders.map(o => {
          const d = o.delivery_date || o.order_date || o.created_at?.split('T')[0]
          return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0
        }))
      : 0

    return {
      deliveredCount:   delivered.length,
      pendingCount:     pendingOrders.length,
      settledCount:     settledOrders.length,
      notDeliveredCount: notDelivered.length,
      totalCOD, pendingCOD, bankReceived, transferFees,
      totalHayyakFees, totalLoss, oldestAge,
      pendingOrders, settledOrders,
      deliveryRate: allNonCanc.length
        ? Math.round(delivered.length / allNonCanc.length * 100)
        : 0,
    }
  }, [orders, remittances])

  /* ── City stats (Concept 5) ─────────────────────────── */
  const cityStats = useMemo(() => {
    const map: Record<string, any> = {}
    orders.forEach(o => {
      if (!['delivered', 'not_delivered'].includes(o.status)) return
      const city = o.customer_city || 'غير محدد'
      if (!map[city]) map[city] = { city, total: 0, delivered: 0, cod: 0 }
      map[city].total++
      if (o.status === 'delivered') { map[city].delivered++; map[city].cod += o.total || 0 }
    })
    return Object.values(map)
      .map(c => ({ ...c, rate: c.total > 0 ? Math.round(c.delivered / c.total * 100) : 0 }))
      .sort((a, b) => b.cod - a.cod)
      .slice(0, 6)
  }, [orders])

  /* ── Running balance (Concept 5) ────────────────────── */
  const remitHistory = useMemo(() => {
    const sorted = [...remittances].sort((a, b) => a.date.localeCompare(b.date))
    let cum = 0
    return sorted.map(r => { cum += r.bank_received || 0; return { ...r, cumulative: cum } })
  }, [remittances])

  /* ── Delete remittance ──────────────────────────────── */
  async function handleDeleteRemittance() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const linked = orders.filter(o => o.hayyak_remittance_id === deleteId)
      await Promise.all(linked.map(o => DB.update('orders', o.id, { hayyak_remittance_id: null })))
      await DB.delete('hayyak_remittances', deleteId)
      setOrders(prev => prev.map(o => o.hayyak_remittance_id === deleteId ? { ...o, hayyak_remittance_id: null } : o))
      setRemittances(prev => prev.filter(r => r.id !== deleteId))
      setDeleteId(null)
      toast('تم حذف التحويل وإلغاء ربط الطلبات')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  /* ── Filtered & grouped pending ─────────────────────── */
  const filteredPending = stats.pendingOrders.filter(o => {
    const q = debouncedSearch.toLowerCase()
    const matchQ = !q
      || (o.customer_name  || '').includes(q)
      || (o.order_number   || '').toLowerCase().includes(q)
      || (o.customer_phone || '').includes(q)
    const oDate = o.delivery_date || o.order_date || o.created_at?.split('T')[0] || ''
    return matchQ && (!dateFrom || oDate >= dateFrom) && (!dateTo || oDate <= dateTo)
  })

  function groupOrders(list) {
    if (groupBy === 'city') {
      const map = {}
      list.forEach(o => { const k = o.customer_city || 'غير محدد'; if (!map[k]) map[k] = []; map[k].push(o) })
      return Object.entries(map).sort((a: any, b: any) => b[1].length - a[1].length)
    }
    if (groupBy === 'date') {
      const map = {}
      list.forEach(o => { const k = o.delivery_date || o.order_date || o.created_at?.split('T')[0] || 'غير محدد'; if (!map[k]) map[k] = []; map[k].push(o) })
      return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
    }
    return [['all', list]]
  }
  const groupedPending = groupOrders(filteredPending)

  /* ── Loading skeleton ───────────────────────────────── */
  if (loading) return (
    <div className="page">
      <PageHeader title="حياك للشحن" subtitle="جاري التحميل..." />
      <SkeletonStats count={4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {[1, 2, 3].map(i => <SkeletonCard key={i} rows={2} />)}
      </div>
    </div>
  )

  /* ── Helpers ────────────────────────────────────────── */
  const drColor  = stats.deliveryRate >= 80 ? 'var(--action)' : stats.deliveryRate >= 60 ? 'var(--warning)' : 'var(--danger)'
  const ageColor = stats.oldestAge >= 14 ? 'var(--danger)' : stats.oldestAge >= 7 ? 'var(--warning)' : 'var(--action)'
  const TABS = [
    { id: 'overview',    label: 'نظرة عامة' },
    { id: 'pending',     label: 'COD المعلق' },
    { id: 'remittances', label: 'التحويلات' },
  ]

  return (
    <div className="page">
      {/* CSS keyframes */}
      <style>{`
        @keyframes hkPulse { 0%,100%{opacity:1} 50%{opacity:0.75} }
        @keyframes hkFlow  { 0%,100%{opacity:0.3;transform:translateX(3px)} 50%{opacity:1;transform:translateX(-3px)} }
        @keyframes hkIn    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>

      {/* ── Header ────────────────────────────────────── */}
      <PageHeader
        title="حياك للشحن"
        subtitle={`${stats.pendingCount} طلب معلق · ${formatCurrency(stats.pendingCOD)} COD`}
        actions={
          <Btn onClick={() => { setEditRemit(null); setShowWizard(true) }} style={{ gap: 6 }}>
            <IcPlus size={16} /> تحويل جديد
          </Btn>
        }
      />

      {/* ── Pending COD alert ─────────────────────────── */}
      {stats.pendingCOD > 0 && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: 'rgba(var(--warning-rgb),0.07)',
          border: '1.5px solid rgba(var(--warning-rgb),0.25)',
          borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <IcAlert size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-sec)' }}>
            <b style={{ color: 'var(--warning)', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(stats.pendingCOD)}</b>
            {' '}لدى حياك من{' '}
            <b>{stats.pendingCount}</b> طلب مسلّم — لم تُحوَّل بعد
          </span>
          <Btn size="sm" onClick={() => setTab('pending')}
            style={{ background: 'rgba(var(--warning-rgb),0.12)', color: 'var(--warning)', border: 'none' }}>
            عرض الطلبات
          </Btn>
        </div>
      )}

      {/* ── Tab pills ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-hover)', borderRadius: 'var(--r-md)', padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'linear-gradient(135deg,var(--action),var(--action-deep))' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text-muted)',
            fontWeight: tab === t.id ? 800 : 500, fontSize: 13, fontFamily: 'inherit',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>
            {t.label}
            {t.id === 'pending' && stats.pendingCount > 0 && (
              <span style={{
                marginInlineStart: 5, padding: '1px 5px', borderRadius: 999,
                fontSize: 10, fontWeight: 900,
                background: 'rgba(var(--warning-rgb),0.2)', color: 'var(--warning)',
              }}>
                {stats.pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════ OVERVIEW ════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'hkIn 0.35s ease' }}>

          {/* Concept 1 — Cash Flow River */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              رحلة المال
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <FlowStep icon="🚚" label="طلبات مسلّمة"  value={stats.deliveredCount} color="var(--action)" />
              <FlowStep icon="💰" label="إجمالي COD"    value={formatCurrency(stats.totalCOD)} color="var(--text)" />
              <FlowStep icon="⏳" label="لدى حياك"      value={formatCurrency(stats.pendingCOD)} color="var(--warning)" pulse={stats.pendingCOD > 0} />
              <FlowStep icon="🏦" label="وصل للبنك"     value={formatCurrency(stats.bankReceived)} color="var(--action)" isLast />
            </div>
          </div>

          {/* Concept 2 — Reconciliation Cockpit */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              لوحة المطابقة
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
              {/* Left: delivery rate CircleGauge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CircleGauge
                  value={stats.deliveryRate} max={100} size={100} color={drColor} sw={9} glow
                  sublabel={`${stats.deliveryRate}%`} label="معدل التسليم"
                />
                {stats.oldestAge > 0 && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, textAlign: 'center',
                    background: `rgba(var(--${stats.oldestAge >= 14 ? 'danger' : stats.oldestAge >= 7 ? 'warning' : 'action'}-rgb),0.1)`,
                    color: ageColor,
                  }}>
                    أقدم طلب: {stats.oldestAge} يوم
                  </div>
                )}
              </div>

              {/* Right: KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[
                  { label: 'مسلّمة',       value: stats.deliveredCount,               color: 'var(--action)' },
                  { label: 'لم تسلّم',     value: stats.notDeliveredCount,            color: 'var(--danger)' },
                  { label: 'رسوم حياك',    value: formatCurrency(stats.totalHayyakFees), color: 'var(--danger)',   small: true },
                  { label: 'رسوم تحويل',   value: formatCurrency(stats.transferFees),    color: 'var(--text-sec)', small: true },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-hover)', borderRadius: 'var(--r-md)', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: s.small ? 12 : 22, fontWeight: 900, color: s.color, fontFamily: 'Inter,sans-serif', lineHeight: 1.2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent remittances */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>آخر التحويلات</div>
              {remittances.length > 3 && (
                <button onClick={() => setTab('remittances')}
                  style={{ fontSize: 12, color: 'var(--action)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  عرض الكل
                </button>
              )}
            </div>
            {remittances.length === 0
              ? <Empty title="لا يوجد تحويلات بعد"
                  action={<Btn size="sm" onClick={() => { setEditRemit(null); setShowWizard(true) }}><IcPlus size={13} /> تحويل جديد</Btn>} />
              : remittances.slice(0, 4).map(r => (
                  <RemittanceRow
                    key={r.id} remit={r}
                    orderCount={orders.filter(o => o.hayyak_remittance_id === r.id).length}
                    compact
                  />
                ))
            }
          </div>
        </div>
      )}

      {/* ════════════ PENDING COD ════════════ */}
      {tab === 'pending' && (
        <div style={{ animation: 'hkIn 0.35s ease' }}>
          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'طلبات معلقة', value: stats.pendingCount, color: 'var(--warning)' },
              { label: 'COD المعلق',  value: formatCurrency(stats.pendingCOD), color: 'var(--warning)', small: true },
              { label: 'رسوم حياك',   value: formatCurrency(stats.pendingOrders.reduce((s, o) => s + (o.hayyak_fee || 0), 0)), color: 'var(--danger)', small: true },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', padding: '10px 12px', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
                <div style={{ fontSize: s.small ? 12 : 22, fontWeight: 900, color: s.color, fontFamily: 'Inter,sans-serif', lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
              <IcSearch size={14} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
                style={{ width: '100%', padding: '9px 12px 9px 32px', paddingInlineEnd: search ? 36 : 12, background: 'var(--bg-surface)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', boxShadow: 'var(--card-shadow)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, padding:4, lineHeight:1 }}>✕</button>
              )}
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="من تاريخ"
              style={{ padding: '9px 10px', background: 'var(--bg-surface)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-sm)', color: dateFrom ? 'var(--text)' : 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', boxShadow: 'var(--card-shadow)' }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="حتى تاريخ"
              style={{ padding: '9px 10px', background: 'var(--bg-surface)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-sm)', color: dateTo ? 'var(--text)' : 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', boxShadow: 'var(--card-shadow)' }} />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
              style={{ padding: '9px 10px', background: 'var(--bg-surface)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', boxShadow: 'var(--card-shadow)' }}>
              <option value="none">بدون تجميع</option>
              <option value="city">حسب الإمارة</option>
              <option value="date">حسب التاريخ</option>
            </select>
            {(search || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
                style={{ padding: '9px 12px', background: 'var(--bg-surface)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✕
              </button>
            )}
          </div>

          {filteredPending.length === 0
            ? <Empty title="لا يوجد COD معلق 🎉" subtitle="كل التحويلات مكتملة" />
            : (
              <>
                <div style={{
                  marginBottom: 12, padding: '10px 14px',
                  background: 'rgba(var(--action-rgb),0.05)',
                  border: '1px solid rgba(var(--action-rgb),0.15)',
                  borderRadius: 'var(--r-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>استلمت تحويلاً من حياك؟</span>
                  <Btn size="sm" onClick={() => { setEditRemit(null); setShowWizard(true) }}>
                    <IcPlus size={13} /> سجّل تحويلاً
                  </Btn>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groupedPending.map(([groupKey, groupOrds]) => (
                    <div key={groupKey}>
                      {groupBy !== 'none' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{groupKey}</div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span>{groupOrds.length} طلب</span>
                            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>COD: {formatCurrency(groupOrds.reduce((s, o) => s + (o.total || 0), 0))}</span>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {groupOrds.map(order => <PendingOrderRow key={order.id} order={order} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>
      )}

      {/* ════════════ REMITTANCES ════════════ */}
      {tab === 'remittances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'hkIn 0.35s ease' }}>

          {/* Concept 5 — Running balance chart */}
          {remitHistory.length >= 2 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  رصيد مستلم تراكمي
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--action)', fontFamily: 'Inter,sans-serif' }}>
                  {formatCurrency(stats.bankReceived)}
                </div>
              </div>
              <RunningBalanceChart data={remitHistory} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{formatDate(remitHistory[0]?.date)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{formatDate(remitHistory[remitHistory.length - 1]?.date)}</div>
              </div>
            </div>
          )}

          {/* Concept 5 — City delivery grid */}
          {cityStats.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                أداء التسليم بالإمارة
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(105px,1fr))', gap: 10 }}>
                {cityStats.map(c => {
                  const col = c.rate >= 80 ? 'var(--action)' : c.rate >= 60 ? 'var(--warning)' : 'var(--danger)'
                  return (
                    <div key={c.city} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', background: 'var(--bg-hover)', borderRadius: 'var(--r-md)' }}>
                      <CircleGauge value={c.rate} max={100} size={60} color={col} sw={6} sublabel={`${c.rate}%`} label={c.city} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--action)', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(c.cod)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{c.delivered}/{c.total} طلب</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Remittances list */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'عدد التحويلات', value: remittances.length,               color: 'var(--text-sec)' },
                { label: 'إجمالي استُلم', value: formatCurrency(stats.bankReceived), color: 'var(--action)',   small: true },
                { label: 'رسوم تحويل',    value: formatCurrency(stats.transferFees), color: 'var(--danger)',   small: true },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', padding: '10px 12px', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
                  <div style={{ fontSize: s.small ? 12 : 22, fontWeight: 900, color: s.color, fontFamily: 'Inter,sans-serif', lineHeight: 1.2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {remittances.length === 0
              ? <Empty title="لا يوجد تحويلات بعد"
                  action={<Btn onClick={() => { setEditRemit(null); setShowWizard(true) }}><IcPlus size={14} /> تحويل جديد</Btn>} />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {remittances.map(r => (
                    <RemittanceRow
                      key={r.id} remit={r}
                      orderCount={orders.filter(o => o.hayyak_remittance_id === r.id).length}
                      onEdit={() => { setEditRemit(r); setShowWizard(true) }}
                      onDelete={() => setDeleteId(r.id)}
                    />
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* Concept 3 — Settlement Wizard */}
      <SettlementWizard
        open={showWizard}
        onClose={() => { setShowWizard(false); setEditRemit(null) }}
        remit={editRemit}
        pendingOrders={stats.pendingOrders}
        onSaved={(remit, selectedIds) => {
          if (editRemit) {
            setRemittances(prev => prev.map(r => r.id === remit.id ? remit : r))
          } else {
            setRemittances(prev => [remit, ...prev])
            setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, hayyak_remittance_id: remit.id } : o))
          }
          setShowWizard(false); setEditRemit(null)
          toast(editRemit ? 'تم تحديث التحويل ✓' : `تم تسجيل التحويل — ${selectedIds.length} طلب مسوّى ✓`)
        }}
      />

      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteRemittance} loading={deleting}
        message="سيتم حذف التحويل وإلغاء ربطه بالطلبات. لا يمكن التراجع."
        itemName={remittances.find(r => r.id === deleteId)?.label || remittances.find(r => r.id === deleteId)?.date}
        itemDetail={remittances.find(r => r.id === deleteId)?.bank_received ? formatCurrency(remittances.find(r => r.id === deleteId).bank_received) : undefined}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   PENDING ORDER ROW (with age badge)
═══════════════════════════════════════════ */
function PendingOrderRow({ order }) {
  const net = (order.total || 0) - (order.hayyak_fee || 0)
  const d   = order.delivery_date || order.order_date || order.created_at?.split('T')[0]
  const age = d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null
  const ageKey = !age ? 'action' : age >= 14 ? 'danger' : age >= 7 ? 'warning' : 'action'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: 'var(--bg-surface)', borderRadius: 'var(--r-md)',
      borderInlineStart: '3px solid var(--warning)', boxShadow: 'var(--card-shadow)',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 100 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
          {order.customer_name || 'عميل'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', direction: 'ltr', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>{order.order_number}</span>
          {order.customer_city && <span style={{ direction: 'rtl' }}>• {order.customer_city}</span>}
          {d && <span>• {formatDate(d)}</span>}
        </div>
      </div>

      {age !== null && (
        <div style={{
          padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 800,
          background: `rgba(var(--${ageKey}-rgb),0.1)`,
          color: `var(--${ageKey})`,
        }}>
          {age} يوم
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', minWidth: 56 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>رسوم</div>
          <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
            −{formatCurrency(order.hayyak_fee || 0)}
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>COD</div>
          <div style={{ fontWeight: 800, color: 'var(--warning)', fontSize: 14, fontFamily: 'Inter,sans-serif' }}>
            {formatCurrency(order.total || 0)}
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>صافي</div>
          <div style={{ fontWeight: 800, color: 'var(--action)', fontSize: 14, fontFamily: 'Inter,sans-serif' }}>
            {formatCurrency(net)}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   REMITTANCE ROW
═══════════════════════════════════════════ */
function RemittanceRow({ remit, orderCount, onEdit, onDelete, compact }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--bg-surface)', borderRadius: 'var(--r-md)',
      borderInlineStart: '3px solid var(--action)', boxShadow: 'var(--card-shadow)',
      flexWrap: 'wrap', marginBottom: compact ? 8 : 0,
    }}>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
          {formatDate(remit.date)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {orderCount > 0 && <span>{orderCount} طلب مسوّى</span>}
          {remit.transfer_fee > 0 && <span style={{ color: 'var(--danger)' }}>رسوم بنكية: {formatCurrency(remit.transfer_fee)}</span>}
          {remit.notes && <span>{remit.notes}</span>}
        </div>
      </div>

      {remit.total_cod > 0 && (
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>COD</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-sec)', fontFamily: 'Inter,sans-serif' }}>
            {formatCurrency(remit.total_cod)}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', minWidth: 90 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>استُلم فعلياً</div>
        <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--action)', fontFamily: 'Inter,sans-serif' }}>
          {formatCurrency(remit.bank_received)}
        </div>
      </div>

      {!compact && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Btn variant="ghost"  size="sm" onClick={onEdit}  ><IcEdit   size={13} /></Btn>
          <Btn variant="danger" size="sm" onClick={onDelete}><IcDelete size={13} /></Btn>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   SETTLEMENT WIZARD — Concept 3
   3-step flow (2 steps in edit mode)
   Step 1 (new):  Select orders
   Step 2 (new) / Step 1 (edit): Enter amounts
   Step 3 (new) / Step 2 (edit): Review & confirm
═══════════════════════════════════════════ */
function SettlementWizard({ open, onClose, remit, pendingOrders, onSaved }) {
  const isEdit    = !!remit
  const STEPS     = isEdit ? 2 : 3
  const stepLabels = isEdit ? ['التفاصيل', 'مراجعة'] : ['الطلبات', 'التفاصيل', 'مراجعة']

  const [step,        setStep]        = useState(1)
  const [form,        setForm]        = useState<any>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (!open) { setStep(1); return }
    const today = new Date().toISOString().split('T')[0]
    if (remit) {
      setForm({ date: remit.date || today, bank_received: remit.bank_received || 0, transfer_fee: remit.transfer_fee || 0, notes: remit.notes || '' })
      setSelectedIds([])
    } else {
      setForm({ date: today, bank_received: '', transfer_fee: 0, notes: '' })
      setSelectedIds(pendingOrders.map(o => o.id))
    }
    setStep(1)
  }, [open, remit])

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function toggleOrder(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function selectAll() {
    setSelectedIds(prev => prev.length === pendingOrders.length ? [] : pendingOrders.map(o => o.id))
  }

  const selectedOrders = pendingOrders.filter(o => selectedIds.includes(o.id))
  const totalCOD       = selectedOrders.reduce((s, o) => s + (o.total       || 0), 0)
  const totalHayyakFee = selectedOrders.reduce((s, o) => s + (o.hayyak_fee  || 0), 0)
  const expectedNet    = totalCOD - totalHayyakFee
  const bankReceived   = parseFloat(form.bank_received) || 0
  const transferFee    = parseFloat(form.transfer_fee)  || 0
  const difference     = bankReceived - (expectedNet - transferFee)
  const isBalanced     = Math.abs(difference) < 5

  const isOrdersStep  = !isEdit && step === 1
  const isAmountsStep = (!isEdit && step === 2) || (isEdit && step === 1)
  const isReviewStep  = (!isEdit && step === 3) || (isEdit && step === 2)

  function canNext() {
    if (isOrdersStep)  return selectedIds.length > 0
    if (isAmountsStep) return !!(form.date && bankReceived > 0)
    return true
  }

  async function handleSave() {
    if (!form.date)          { toast('اختر تاريخ التحويل', 'error'); return }
    if (bankReceived <= 0)   { toast('أدخل المبلغ المستلم من البنك', 'error'); return }
    if (!isEdit && selectedIds.length === 0) { toast('اختر طلباً واحداً على الأقل', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        date: form.date, bank_received: bankReceived, transfer_fee: transferFee,
        total_cod: totalCOD, hayyak_fees: totalHayyakFee, difference, notes: form.notes,
      }
      let saved
      if (isEdit) {
        saved = await DB.update('hayyak_remittances', remit.id, payload)
        onSaved(saved, [])
      } else {
        saved = await DB.insert('hayyak_remittances', payload)
        await Promise.all(selectedIds.map(id => DB.update('orders', id, { hayyak_remittance_id: saved.id })))
        if (transferFee > 0) {
          await DB.insert('expenses', {
            date: form.date, amount: transferFee, category: 'رسوم تحويل حياك',
            description: `رسوم التحويل البنكي — ${form.date}`,
            paid_by: 'company', reimbursed: false, created_at: new Date().toISOString(),
          }).catch(() => {})
        }
        onSaved(saved, selectedIds)
      }
    } catch (e: any) { toast('فشل الحفظ: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  /* Step indicator */
  const StepDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
      {stepLabels.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, transition: 'all 0.3s',
              background: i + 1 < step ? 'rgba(var(--action-rgb),0.15)' : i + 1 === step ? 'var(--action)' : 'var(--bg-hover)',
              color: i + 1 === step ? '#fff' : i + 1 < step ? 'var(--action)' : 'var(--text-muted)',
              border: i + 1 < step ? '2px solid var(--action)' : '2px solid transparent',
              boxShadow: i + 1 === step ? '0 0 12px rgba(var(--action-rgb),0.4)' : 'none',
            }}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 9, color: i + 1 === step ? 'var(--text)' : 'var(--text-muted)', fontWeight: i + 1 === step ? 700 : 400 }}>
              {label}
            </div>
          </div>
          {i < STEPS - 1 && (
            <div style={{
              width: 36, height: 2, flexShrink: 0, marginBottom: 16,
              background: i + 1 < step ? 'var(--action)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'تعديل التحويل' : 'تسجيل تحويل من حياك'}
      width={600}
      footer={<>
        {step > 1 && <Btn variant="ghost" onClick={() => setStep(s => s - 1)}>السابق</Btn>}
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        {step < STEPS
          ? <Btn onClick={() => setStep(s => s + 1)} disabled={!canNext()}>التالي</Btn>
          : <Btn loading={saving} onClick={handleSave}><IcCheck size={15} /> {isEdit ? 'حفظ التعديلات' : 'تأكيد التحويل'}</Btn>
        }
      </>}
    >
      <StepDots />

      {/* ── Step 1 (new): Select Orders ── */}
      {isOrdersStep && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              الطلبات المشمولة ({selectedIds.length} من {pendingOrders.length})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAll} style={{ fontSize: 11, color: 'var(--action)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                {selectedIds.length === pendingOrders.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
              {form.date && (
                <button
                  onClick={() => setSelectedIds(pendingOrders.filter(o => {
                    const d = o.delivery_date || o.order_date || o.created_at?.split('T')[0] || ''
                    return d <= form.date
                  }).map(o => o.id))}
                  style={{ fontSize: 11, color: 'var(--warning)', background: 'rgba(var(--warning-rgb),0.08)', border: '1px solid rgba(var(--warning-rgb),0.2)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  ≤ {form.date}
                </button>
              )}
            </div>
          </div>

          {/* Date filter for quick pre-selection */}
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)}
              style={{ padding: '7px 10px', background: 'var(--bg-surface)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-sm)', color: form.date ? 'var(--text)' : 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>تاريخ التحويل (لفلترة الطلبات)</span>
          </div>

          {pendingOrders.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>لا يوجد طلبات مسلّمة معلقة</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {pendingOrders.map(order => {
                  const sel = selectedIds.includes(order.id)
                  return (
                    <div key={order.id} onClick={() => toggleOrder(order.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: sel ? 'rgba(var(--action-rgb),0.06)' : 'var(--bg-hover)',
                      border: `1.5px solid ${sel ? 'rgba(var(--action-rgb),0.25)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 120ms',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: sel ? 'var(--action)' : 'transparent',
                        border: `2px solid ${sel ? 'var(--action)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms',
                      }}>
                        {sel && <IcCheck size={11} style={{ color: '#fff' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.customer_name || 'عميل'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', direction: 'ltr', display: 'flex', gap: 8 }}>
                          <span>{order.order_number}</span>
                          {order.delivery_date && <span>• {formatDate(order.delivery_date)}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 60 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>رسوم حياك</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', fontFamily: 'Inter,sans-serif' }}>
                          {formatCurrency(order.hayyak_fee || 0)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>COD</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: sel ? 'var(--action)' : 'var(--text-sec)', fontFamily: 'Inter,sans-serif' }}>
                          {formatCurrency(order.total || 0)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }

          {selectedIds.length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(var(--action-rgb),0.06)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{selectedIds.length} طلب · COD إجمالي:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--action)', fontFamily: 'Inter,sans-serif' }}>{formatCurrency(totalCOD)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2 (new) / Step 1 (edit): Amounts ── */}
      {isAmountsStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="تاريخ التحويل *" type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)} />
          <Input
            label="المبلغ المستلم من البنك (د.إ) *"
            type="number" min="0" value={form.bank_received || ''} onChange={e => setField('bank_received', e.target.value)}
            hint="الرقم الفعلي في كشف الحساب"
          />
          <Input
            label="رسوم التحويل البنكي (د.إ)"
            type="number" min="0" value={form.transfer_fee || ''} onChange={e => setField('transfer_fee', e.target.value)}
            hint="تُسجَّل تلقائياً كمصروف"
          />
          <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="رقم الإيصال أو أي ملاحظة..." />
        </div>
      )}

      {/* ── Step 3 (new) / Step 2 (edit): Review ── */}
      {isReviewStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Big verification card */}
          <div style={{
            padding: '20px', borderRadius: 'var(--r-lg)',
            background: isBalanced ? 'rgba(var(--action-rgb),0.06)' : 'rgba(var(--warning-rgb),0.08)',
            border: `2px solid ${isBalanced ? 'rgba(var(--action-rgb),0.25)' : 'rgba(var(--warning-rgb),0.35)'}`,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{isBalanced ? '✅' : '⚠️'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isBalanced ? 'الأرقام متطابقة' : 'يوجد فرق — تحقق من الأرقام'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'إجمالي COD',      value: formatCurrency(totalCOD),       color: 'var(--text)' },
                { label: 'رسوم حياك',        value: `−${formatCurrency(totalHayyakFee)}`, color: 'var(--danger)' },
                { label: 'الصافي المتوقع',   value: formatCurrency(expectedNet),    color: 'var(--text)' },
                { label: 'المستلم فعلياً',   value: formatCurrency(bankReceived),   color: 'var(--action)' },
                ...(transferFee > 0 ? [{ label: 'رسوم تحويل بنكي', value: `−${formatCurrency(transferFee)}`, color: 'var(--danger)' }] : []),
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: s.color, fontFamily: 'Inter,sans-serif' }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '12px', borderRadius: 'var(--r-md)', textAlign: 'center',
              background: isBalanced ? 'rgba(var(--action-rgb),0.08)' : 'rgba(var(--warning-rgb),0.1)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>الفرق</div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Inter,sans-serif', color: isBalanced ? 'var(--action)' : 'var(--warning)' }}>
                {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                {isBalanced && <span style={{ fontSize: 16, marginInlineStart: 8 }}>✓</span>}
              </div>
              {!isBalanced && (
                <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 6 }}>
                  الفرق يزيد عن 5 د.إ — تحقق من المبلغ أو الطلبات المختارة
                </div>
              )}
            </div>
          </div>

          {/* Details summary */}
          <div style={{ padding: '14px', background: 'var(--bg-hover)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>التاريخ</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{formatDate(form.date)}</span>
            </div>
            {!isEdit && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>الطلبات المشمولة</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{selectedIds.length} طلب</span>
              </div>
            )}
            {form.notes && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>ملاحظات</span>
                <span style={{ fontSize: 12, color: 'var(--text-sec)', textAlign: 'start' }}>{form.notes}</span>
              </div>
            )}
            {transferFee > 0 && (
              <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(var(--action-rgb),0.06)', borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--action)' }}>
                💡 سيُسجَّل تلقائياً: رسوم تحويل بنكي {formatCurrency(transferFee)} كمصروف تشغيلي
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
