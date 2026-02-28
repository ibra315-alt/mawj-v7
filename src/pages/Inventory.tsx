// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Btn, Modal, Input, Select, Textarea, Spinner, Empty, ConfirmModal, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit, IcAlert } from '../components/Icons'
import useDeleteRecord from '../hooks/useDeleteRecord'
import type { PageProps } from '../types'

/* ── helpers ─────────────────────────────────────────────── */
function marginInfo(item) {
  if (!item.cost_price || !item.sell_price || item.cost_price <= 0)
    return { pct: null, label: '—', color: 'var(--text-muted)' }
  const pct = ((item.sell_price - item.cost_price) / item.sell_price) * 100
  const r = Math.round(pct)
  if (r >= 40) return { pct: r, label: r + '%', color: '#34d399' }
  if (r >= 20) return { pct: r, label: r + '%', color: '#f59e0b' }
  return { pct: r, label: r + '%', color: '#ef4444' }
}

function stockHealth(item) {
  const qty = item.stock_qty || 0
  const thr = item.low_stock_threshold || 5
  if (qty === 0) return { color: '#ef4444', label: 'نفد', pct: 0 }
  if (qty <= thr)
    return { color: '#f59e0b', label: 'منخفض', pct: Math.round(Math.min(98, (qty / (thr * 2)) * 100)) }
  const max = Math.max(thr * 6, qty)
  return { color: '#34d399', label: 'متاح', pct: Math.round(Math.min(98, (qty / max) * 100)) }
}

function calcDaysLeft(item, velocity) {
  const v = velocity.get(item.name) || 0
  if (v === 0 || !(item.stock_qty > 0)) return null
  return Math.floor(item.stock_qty / (v / 30))
}

function abcColors(cls) {
  if (cls === 'A') return { color: '#318CE7', bg: 'rgba(49,140,231,0.15)' }
  if (cls === 'B') return { color: '#34d399', bg: 'rgba(52,211,153,0.15)' }
  return { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' }
}

/* ── main component ──────────────────────────────────────── */
export default function Inventory(_: PageProps) {
  const [items,         setItems]         = useState([])
  const [suppliers,     setSuppliers]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [search,        setSearch]        = useState('')
  const [activeFilter,  setActiveFilter]  = useState('all')
  const [movements,     setMovements]     = useState([])
  const [movesItem,     setMovesItem]     = useState(null)
  const [movesExpanded, setMovesExpanded] = useState(false)
  const [adjustId,      setAdjustId]      = useState(null)
  const [adjustDelta,   setAdjustDelta]   = useState('')
  const [adjustNote,    setAdjustNote]    = useState('')
  const [velocity,      setVelocity]      = useState(new Map())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [inv, sups, recentOrders] = await Promise.all([
        DB.list('inventory', { orderBy: 'name', asc: true }),
        DB.list('suppliers'),
        DB.list('orders', { orderBy: 'created_at', asc: false, limit: 300 }),
      ])
      setItems(inv)
      setSuppliers(sups)

      // velocity: units sold per product name in last 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      const vel = new Map()
      for (const order of recentOrders) {
        if (!order.items || !Array.isArray(order.items)) continue
        if (['returned', 'cancelled'].includes(order.status)) continue
        if (new Date(order.created_at).getTime() < cutoff) break
        for (const it of order.items) {
          const nm = it.name || it.product_name || ''
          if (nm) vel.set(nm, (vel.get(nm) || 0) + (it.qty || 1))
        }
      }
      setVelocity(vel)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const { deleteId, setDeleteId, deleting, handleDelete } = useDeleteRecord('inventory', setItems)

  async function adjustStock(id, delta, note = '') {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newQty = Math.max(0, item.stock_qty + delta)
    try {
      await DB.update('inventory', id, { stock_qty: newQty })
      setItems(prev => prev.map(i => i.id === id ? { ...i, stock_qty: newQty } : i))
      const move = {
        id: Date.now().toString(), itemId: id, itemName: item.name,
        delta, qty: newQty, note, time: new Date().toISOString(),
      }
      setMovements(prev => [move, ...prev].slice(0, 200))
    } catch { toast('فشل التحديث', 'error') }
  }

  function openAdjustModal(id) {
    setAdjustId(id); setAdjustDelta(''); setAdjustNote('')
  }

  async function handleAdjustSubmit() {
    const delta = parseInt(adjustDelta)
    if (isNaN(delta) || delta === 0) { toast('كمية غير صحيحة', 'error'); return }
    const note = adjustNote || (delta > 0 ? 'إضافة مخزون' : 'خصم مخزون')
    await adjustStock(adjustId, delta, note)
    toast(`تم تعديل المخزون: ${delta > 0 ? '+' : ''}${delta}`)
    setAdjustId(null)
  }

  /* ── ABC classification (by inventory value) ─────────── */
  const abcItems = useMemo(() => {
    const active = items.filter(i => i.active)
    const sorted = active
      .map(i => ({ ...i, invValue: (i.stock_qty || 0) * (i.cost_price || 0) }))
      .sort((a, b) => b.invValue - a.invValue)
    const total = sorted.reduce((s, i) => s + i.invValue, 0)
    let cum = 0
    return sorted.map(item => {
      cum += item.invValue
      const pct = total > 0 ? (cum / total) * 100 : 100
      return { ...item, abcClass: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C' }
    })
  }, [items])

  /* ── filtered items ──────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = abcItems
    if (search) list = list.filter(i =>
      i.name?.includes(search) || i.sku?.includes(search) || i.category?.includes(search)
    )
    if (activeFilter === 'A')    list = list.filter(i => i.abcClass === 'A')
    else if (activeFilter === 'B')    list = list.filter(i => i.abcClass === 'B')
    else if (activeFilter === 'C')    list = list.filter(i => i.abcClass === 'C')
    else if (activeFilter === 'low')  list = list.filter(i => i.stock_qty <= (i.low_stock_threshold || 5))
    else if (activeFilter === 'zero') list = list.filter(i => !i.stock_qty)
    return list
  }, [abcItems, search, activeFilter])

  /* ── KPIs ─────────────────────────────────────────────── */
  const activeItems = items.filter(i => i.active)
  const totalValue  = activeItems.reduce((s, i) => s + (i.stock_qty || 0) * (i.cost_price || 0), 0)
  const totalRevPot = activeItems.reduce((s, i) => s + (i.stock_qty || 0) * (i.sell_price || 0), 0)
  const lowCount    = activeItems.filter(i => (i.stock_qty || 0) <= (i.low_stock_threshold || 5)).length
  const zeroCount   = activeItems.filter(i => !i.stock_qty).length
  const aCount      = abcItems.filter(i => i.abcClass === 'A').length
  const bCount      = abcItems.filter(i => i.abcClass === 'B').length
  const cCount      = abcItems.filter(i => i.abcClass === 'C').length
  const totalN      = activeItems.length || 1
  const abcBarA     = Math.round((aCount / totalN) * 100)
  const abcBarB     = Math.round((bCount / totalN) * 100)

  const FILTERS = [
    { id: 'all',  label: 'الكل',    count: activeItems.length },
    { id: 'A',    label: 'صنف A',   count: aCount },
    { id: 'B',    label: 'صنف B',   count: bCount },
    { id: 'C',    label: 'صنف C',   count: cCount },
    { id: 'low',  label: 'منخفض',   count: lowCount },
    { id: 'zero', label: 'نفد',     count: zeroCount },
  ]

  const movesToShow = movesItem
    ? movements.filter(m => m.itemId === movesItem)
    : movements

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Spinner size={36} />
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes invFadeUp {
          from { opacity:0; transform:translateY(10px) }
          to   { opacity:1; transform:translateY(0) }
        }

        /* ── page ── */
        .inv-page { padding: 20px 16px 140px; }

        /* ── top row ── */
        .inv-toprow {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; margin-bottom:16px;
        }
        .inv-title  { font-size:20px; font-weight:900; color:var(--text-primary); line-height:1.2; }
        .inv-sub    { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .inv-top-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; }

        /* ── stats grid ── */
        .inv-stats {
          display:grid; grid-template-columns:1fr 1fr;
          gap:8px; margin-bottom:14px;
        }
        .inv-stat {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:14px; padding:12px 13px;
          display:flex; flex-direction:column; gap:2px;
          animation: invFadeUp 0.4s ease-out both;
        }
        .inv-stat-val {
          font-size:17px; font-weight:900; color:var(--text-primary);
          font-family:'Inter',sans-serif; line-height:1;
        }
        .inv-stat-lbl { font-size:11px; color:var(--text-muted); margin-top:2px; }

        /* ── ABC bar ── */
        .inv-abc-wrap {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:14px; padding:12px 14px; margin-bottom:10px;
          animation: invFadeUp 0.4s 0.1s ease-out both;
        }
        .inv-abc-label { font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:7px; }
        .inv-abc-track {
          height:7px; border-radius:999px; display:flex; gap:2px;
          background:var(--bg-elevated); overflow:hidden; margin-bottom:6px;
        }
        .inv-abc-seg { height:100%; border-radius:999px; }
        .inv-abc-legend { display:flex; gap:12px; flex-wrap:wrap; }
        .inv-abc-leg { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--text-secondary); }
        .inv-abc-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

        /* ── alerts ── */
        .inv-alert {
          display:flex; align-items:center; gap:10px;
          padding:10px 13px; border-radius:13px; margin-bottom:8px;
        }
        .inv-alert-icon { font-size:15px; flex-shrink:0; }
        .inv-alert-body { flex:1; min-width:0; }
        .inv-alert-title { font-size:12px; font-weight:800; }
        .inv-alert-names { font-size:10px; color:var(--text-muted); margin-top:1px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .inv-alert-btn {
          font-size:11px; font-weight:700; padding:5px 11px; border-radius:999px;
          border:1.5px solid; cursor:pointer; font-family:var(--font); flex-shrink:0;
          background:transparent;
        }

        /* ── filters ── */
        .inv-filters {
          display:flex; gap:6px; overflow-x:auto; scrollbar-width:none;
          padding-bottom:2px; margin-bottom:10px;
        }
        .inv-filters::-webkit-scrollbar { display:none; }
        .inv-chip {
          display:flex; align-items:center; gap:5px;
          padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700;
          border:1.5px solid var(--border); background:var(--bg-surface);
          color:var(--text-secondary); cursor:pointer; white-space:nowrap;
          font-family:var(--font); transition:all 0.15s; flex-shrink:0;
        }
        .inv-chip.on    { background:var(--action); border-color:var(--action); color:#fff; }
        .inv-chip.on-warn  { background:rgba(245,158,11,0.15); border-color:#f59e0b; color:#f59e0b; }
        .inv-chip.on-danger { background:rgba(239,68,68,0.15); border-color:#ef4444; color:#ef4444; }
        .inv-chip-count {
          font-size:10px; padding:0 5px; border-radius:999px;
          background:var(--bg-elevated); color:var(--text-muted);
        }
        .inv-chip.on .inv-chip-count,
        .inv-chip.on-warn .inv-chip-count,
        .inv-chip.on-danger .inv-chip-count {
          background:rgba(255,255,255,0.25); color:inherit;
        }

        /* ── search ── */
        .inv-search-wrap { position:relative; margin-bottom:12px; }
        .inv-search {
          width:100%; box-sizing:border-box;
          padding-top:10px; padding-bottom:10px;
          padding-inline-start:36px; padding-inline-end:12px;
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:12px; color:var(--text-primary);
          font-size:13px; font-family:var(--font); outline:none;
        }
        .inv-search:focus { border-color:var(--action); }
        .inv-search-ico {
          position:absolute; inset-inline-start:11px; top:50%;
          transform:translateY(-50%); color:var(--text-muted); pointer-events:none;
        }

        /* ── grid ── */
        .inv-grid {
          display:grid; grid-template-columns:1fr 1fr; gap:10px;
        }

        /* ── product tile ── */
        .inv-tile {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:16px; padding:13px; display:flex; flex-direction:column;
          gap:9px; position:relative; overflow:hidden;
          transition:box-shadow 0.2s, border-color 0.2s, transform 0.2s;
          animation: invFadeUp 0.4s ease-out both;
        }
        .inv-tile-accent {
          position:absolute; inset-inline-start:0; top:0; bottom:0;
          width:3px; border-radius:3px 0 0 3px;
        }
        .inv-tile:hover {
          box-shadow:0 8px 32px rgba(0,0,0,0.16);
          transform:translateY(-2px);
        }
        .inv-tile-top { display:flex; align-items:flex-start; justify-content:space-between; gap:6px; }
        .inv-tile-name {
          font-size:12px; font-weight:800; color:var(--text-primary); line-height:1.3;
          flex:1; min-width:0; overflow:hidden;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
        }
        .inv-tile-badges { display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0; }
        .inv-badge-abc {
          font-size:9px; font-weight:900; padding:2px 6px;
          border-radius:6px; letter-spacing:0.5px;
        }
        .inv-badge-margin {
          font-size:9px; font-weight:800; padding:2px 6px; border-radius:6px;
        }
        .inv-tile-sku { font-size:9px; color:var(--text-muted); font-family:'Inter',sans-serif; }

        /* health bar */
        .inv-health { display:flex; flex-direction:column; gap:3px; }
        .inv-health-track {
          height:5px; background:var(--bg-elevated); border-radius:999px; overflow:hidden;
        }
        .inv-health-fill { height:100%; border-radius:999px; }
        .inv-health-row { display:flex; justify-content:space-between; align-items:center; }
        .inv-health-label { font-size:9px; font-weight:700; }
        .inv-health-pct  { font-size:9px; color:var(--text-muted); font-family:'Inter',sans-serif; }

        /* quantity + stepper */
        .inv-qty-row { display:flex; align-items:flex-end; justify-content:space-between; gap:4px; }
        .inv-qty-big {
          font-size:26px; font-weight:900; line-height:1;
          font-family:'Inter',sans-serif;
        }
        .inv-qty-unit { font-size:9px; color:var(--text-muted); margin-top:2px; }
        .inv-stepper {
          display:flex; align-items:center;
          background:var(--bg-elevated); border:1.5px solid var(--border);
          border-radius:10px; overflow:hidden;
        }
        .inv-step-btn {
          width:26px; height:26px; border:none; background:transparent;
          color:var(--text-primary); font-size:16px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-family:'Inter',sans-serif; font-weight:900;
          transition:background 0.15s; flex-shrink:0;
        }
        .inv-step-btn:hover { background:var(--bg-hover); }
        .inv-step-val {
          min-width:26px; text-align:center;
          font-size:11px; font-weight:800; font-family:'Inter',sans-serif;
          color:var(--text-primary);
        }

        /* meta row */
        .inv-meta { display:flex; align-items:center; justify-content:space-between; gap:4px; }
        .inv-rev  { font-size:10px; color:var(--text-muted); }
        .inv-days {
          display:flex; align-items:center; gap:2px;
          font-size:9px; font-weight:800; padding:2px 7px; border-radius:999px;
        }

        /* action row */
        .inv-actions {
          display:flex; align-items:center; justify-content:flex-end;
          gap:4px; padding-top:6px; border-top:1px solid var(--border);
        }
        .inv-icon-btn {
          width:26px; height:26px; border:1.5px solid var(--border);
          border-radius:8px; background:transparent; color:var(--text-secondary);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:all 0.15s; font-size:11px; font-family:'Inter',sans-serif; font-weight:800;
        }
        .inv-icon-btn:hover { background:var(--bg-hover); border-color:var(--action); color:var(--action); }
        .inv-icon-btn.del:hover { background:rgba(239,68,68,0.1); border-color:#ef4444; color:#ef4444; }
        .inv-icon-btn.adj:hover { background:rgba(49,140,231,0.1); border-color:#318CE7; color:#318CE7; }

        /* ── movement log ── */
        .inv-moves {
          margin-top:16px; background:var(--bg-surface);
          border:1.5px solid var(--border); border-radius:16px; overflow:hidden;
        }
        .inv-moves-head {
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 14px; cursor:pointer; user-select:none;
        }
        .inv-moves-head-left { display:flex; align-items:center; gap:8px; }
        .inv-moves-head-title { font-size:13px; font-weight:800; color:var(--text-primary); }
        .inv-moves-count {
          font-size:10px; font-weight:700; padding:1px 7px;
          border-radius:999px; background:var(--action); color:#fff;
        }
        .inv-moves-chevron { font-size:11px; color:var(--text-muted); transition:transform 0.2s; }
        .inv-moves-list {
          padding:8px; display:flex; flex-direction:column; gap:4px;
          max-height:320px; overflow-y:auto;
        }
        .inv-move-row {
          display:flex; align-items:center; gap:8px;
          padding:8px 10px; border-radius:10px; background:var(--bg-elevated);
        }
        .inv-move-ico { font-size:13px; flex-shrink:0; }
        .inv-move-body { flex:1; min-width:0; }
        .inv-move-name {
          font-size:11px; font-weight:700; color:var(--text-primary);
          overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
        }
        .inv-move-note { font-size:9px; color:var(--text-muted); margin-top:1px; }
        .inv-move-right { text-align:start; flex-shrink:0; }
        .inv-move-delta { font-size:12px; font-weight:900; font-family:'Inter',sans-serif; }
        .inv-move-time  { font-size:9px; color:var(--text-muted); margin-top:1px; }
        .inv-move-remain {
          padding:2px 7px; background:var(--bg-surface); border-radius:999px;
          font-size:9px; color:var(--text-muted); flex-shrink:0;
        }
        .inv-moves-empty { text-align:center; padding:20px; color:var(--text-muted); font-size:12px; }
        .inv-moves-filter-clear {
          font-size:10px; padding:2px 8px; border-radius:999px;
          border:1px solid var(--border); background:var(--bg-elevated);
          color:var(--text-muted); cursor:pointer; font-family:var(--font);
        }

        /* ── new order btn ── */
        .inv-new-btn {
          display:flex; align-items:center; gap:6px;
          padding:9px 14px; border-radius:12px; border:none;
          background:var(--action); color:#fff;
          font-weight:800; font-size:13px; cursor:pointer;
          font-family:var(--font); flex-shrink:0;
        }
        .inv-moves-btn {
          display:flex; align-items:center; gap:5px;
          padding:7px 11px; border-radius:10px; border:1.5px solid var(--border);
          background:var(--bg-surface); color:var(--text-secondary);
          font-size:11px; font-weight:700; cursor:pointer; font-family:var(--font);
        }

        /* ── desktop ── */
        @media (min-width: 769px) {
          .inv-page  { padding: 24px 32px 80px; }
          .inv-stats { grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:16px; }
          .inv-stat-val { font-size:20px; }
          .inv-grid  { grid-template-columns: repeat(3, 1fr); gap:14px; }
          .inv-tile-name { font-size:13px; }
          .inv-qty-big { font-size:30px; }
        }
        @media (min-width: 1280px) {
          .inv-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <div className="inv-page">

        {/* ── Top Row ── */}
        <div className="inv-toprow">
          <div>
            <div className="inv-title">المخزون</div>
            <div className="inv-sub">{activeItems.length} منتج نشط</div>
          </div>
          <div className="inv-top-actions">
            {movements.length > 0 && (
              <button className="inv-moves-btn" onClick={() => { setMovesItem(null); setMovesExpanded(v => !v) }}>
                <span>📋</span>
                <span className="inv-moves-count">{movements.length}</span>
              </button>
            )}
            <button className="inv-new-btn" onClick={() => { setEditItem(null); setShowForm(true) }}>
              <IcPlus size={14} /> منتج جديد
            </button>
          </div>
        </div>

        {/* ── KPI Stats ── */}
        <div className="inv-stats">
          <div className="inv-stat" style={{ animationDelay:'0ms' }}>
            <div className="inv-stat-val">{activeItems.length}</div>
            <div className="inv-stat-lbl">إجمالي المنتجات</div>
          </div>
          <div className="inv-stat" style={{ animationDelay:'50ms', borderColor: 'rgba(49,140,231,0.3)' }}>
            <div className="inv-stat-val" style={{ color:'var(--action)', fontSize:13 }}>{formatCurrency(totalValue)}</div>
            <div className="inv-stat-lbl">تكلفة المخزون</div>
          </div>
          <div className="inv-stat" style={{ animationDelay:'100ms', borderColor: lowCount > 0 ? 'rgba(245,158,11,0.35)' : undefined }}>
            <div className="inv-stat-val" style={{ color: lowCount > 0 ? '#f59e0b' : undefined }}>{lowCount}</div>
            <div className="inv-stat-lbl">مخزون منخفض</div>
          </div>
          <div className="inv-stat" style={{ animationDelay:'150ms', borderColor: zeroCount > 0 ? 'rgba(239,68,68,0.35)' : undefined }}>
            <div className="inv-stat-val" style={{ color: zeroCount > 0 ? '#ef4444' : undefined }}>{zeroCount}</div>
            <div className="inv-stat-lbl">نفد من المخزون</div>
          </div>
        </div>

        {/* ── ABC Distribution Bar ── */}
        {activeItems.length > 0 && (
          <div className="inv-abc-wrap">
            <div className="inv-abc-label">تحليل ABC — توزيع قيمة المخزون</div>
            <div className="inv-abc-track">
              <div className="inv-abc-seg" style={{ width: abcBarA + '%', background: '#318CE7' }} />
              <div className="inv-abc-seg" style={{ width: abcBarB + '%', background: '#34d399' }} />
              <div className="inv-abc-seg" style={{ flex: 1, background: '#64748b' }} />
            </div>
            <div className="inv-abc-legend">
              <div className="inv-abc-leg">
                <div className="inv-abc-dot" style={{ background:'#318CE7' }} />
                A · {aCount} منتج · 80% القيمة
              </div>
              <div className="inv-abc-leg">
                <div className="inv-abc-dot" style={{ background:'#34d399' }} />
                B · {bCount} · 15%
              </div>
              <div className="inv-abc-leg">
                <div className="inv-abc-dot" style={{ background:'#64748b' }} />
                C · {cCount} · 5%
              </div>
            </div>
          </div>
        )}

        {/* ── Smart Alerts ── */}
        {zeroCount > 0 && (
          <div className="inv-alert" style={{ background:'rgba(239,68,68,0.07)', border:'1.5px solid rgba(239,68,68,0.25)' }}>
            <div className="inv-alert-icon">🚫</div>
            <div className="inv-alert-body">
              <div className="inv-alert-title" style={{ color:'#ef4444' }}>{zeroCount} منتج نفد مخزونه</div>
              <div className="inv-alert-names">
                {activeItems.filter(i => !i.stock_qty).slice(0, 4).map(i => i.name).join(' · ')}
                {zeroCount > 4 ? ` +${zeroCount - 4}` : ''}
              </div>
            </div>
            <button
              className="inv-alert-btn"
              onClick={() => setActiveFilter('zero')}
              style={{ color:'#ef4444', borderColor:'rgba(239,68,68,0.4)' }}
            >
              عرض
            </button>
          </div>
        )}
        {lowCount - zeroCount > 0 && (
          <div className="inv-alert" style={{ background:'rgba(245,158,11,0.07)', border:'1.5px solid rgba(245,158,11,0.25)', marginBottom:12 }}>
            <div className="inv-alert-icon">⚡</div>
            <div className="inv-alert-body">
              <div className="inv-alert-title" style={{ color:'#f59e0b' }}>{lowCount - zeroCount} منتج يقترب من النفاد</div>
              <div className="inv-alert-names">
                {activeItems
                  .filter(i => i.stock_qty > 0 && i.stock_qty <= (i.low_stock_threshold || 5))
                  .slice(0, 4).map(i => i.name).join(' · ')}
              </div>
            </div>
            <button
              className="inv-alert-btn"
              onClick={() => setActiveFilter('low')}
              style={{ color:'#f59e0b', borderColor:'rgba(245,158,11,0.4)' }}
            >
              عرض
            </button>
          </div>
        )}

        {/* ── Filter Chips ── */}
        <div className="inv-filters">
          {FILTERS.map(f => {
            const isOn = activeFilter === f.id
            let cls = 'inv-chip'
            if (isOn) cls += f.id === 'zero' ? ' on-danger' : f.id === 'low' ? ' on-warn' : ' on'
            return (
              <button key={f.id} className={cls} onClick={() => setActiveFilter(isOn ? 'all' : f.id)}>
                {f.label}
                <span className="inv-chip-count">{f.count}</span>
              </button>
            )
          })}
        </div>

        {/* ── Search ── */}
        <div className="inv-search-wrap">
          <span className="inv-search-ico">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            className="inv-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، SKU، الفئة..."
          />
        </div>

        {/* ── Product Grid ── */}
        {filtered.length === 0 ? (
          <Empty
            title={search || activeFilter !== 'all' ? 'لا توجد نتائج' : 'لا يوجد منتجات'}
            action={
              !search && activeFilter === 'all' ? (
                <button className="inv-new-btn" onClick={() => { setEditItem(null); setShowForm(true) }}>
                  <IcPlus size={14} /> أضف منتج
                </button>
              ) : null
            }
          />
        ) : (
          <div className="inv-grid">
            {filtered.map((item, idx) => (
              <ProductTile
                key={item.id}
                item={item}
                velocity={velocity}
                animDelay={Math.min(idx * 40, 300)}
                onAdjust={delta => adjustStock(item.id, delta)}
                onEdit={() => { setEditItem(item); setShowForm(true) }}
                onDelete={() => setDeleteId(item.id)}
                onAdjustModal={() => openAdjustModal(item.id)}
                onShowMoves={() => { setMovesItem(item.id); setMovesExpanded(true) }}
              />
            ))}
          </div>
        )}

        {/* ── Movement Log ── */}
        {movements.length > 0 && (
          <div className="inv-moves">
            <div className="inv-moves-head" onClick={() => setMovesExpanded(v => !v)}>
              <div className="inv-moves-head-left">
                <span>📋</span>
                <span className="inv-moves-head-title">سجل حركات المخزون</span>
                <span className="inv-moves-count">{movements.length}</span>
                {movesItem && (
                  <button
                    className="inv-moves-filter-clear"
                    onClick={e => { e.stopPropagation(); setMovesItem(null) }}
                  >
                    عرض الكل ✕
                  </button>
                )}
              </div>
              <span className="inv-moves-chevron" style={{ transform: movesExpanded ? 'rotate(180deg)' : 'none' }}>
                ▼
              </span>
            </div>
            {movesExpanded && (
              <div className="inv-moves-list">
                {movesToShow.length === 0 ? (
                  <div className="inv-moves-empty">لا توجد حركات لهذا المنتج</div>
                ) : movesToShow.map(m => (
                  <MovementRow key={m.id} move={m} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <InventoryForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        suppliers={suppliers}
        onSaved={saved => {
          if (editItem) setItems(prev => prev.map(i => i.id === saved.id ? saved : i))
          else setItems(prev => [saved, ...prev])
          setShowForm(false); setEditItem(null)
          toast(editItem ? 'تم التحديث' : 'تمت الإضافة')
        }}
      />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="سيتم حذف المنتج نهائياً."
      />
      <Modal
        open={!!adjustId}
        onClose={() => setAdjustId(null)}
        title={`تعديل مخزون: ${items.find(i => i.id === adjustId)?.name || ''}`}
        width={380}
        footer={<>
          <Btn variant="ghost" onClick={() => setAdjustId(null)}>إلغاء</Btn>
          <Btn onClick={handleAdjustSubmit}>تأكيد التعديل</Btn>
        </>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input
            label="الكمية (+ للإضافة، - للخصم)"
            type="number"
            value={adjustDelta}
            onChange={e => setAdjustDelta(e.target.value)}
            placeholder="مثال: 5 أو -3"
          />
          <Input
            label="ملاحظة (اختياري)"
            value={adjustNote}
            onChange={e => setAdjustNote(e.target.value)}
            placeholder="سبب التعديل..."
          />
        </div>
      </Modal>
    </>
  )
}

/* ── ProductTile ─────────────────────────────────────────── */
function ProductTile({ item, velocity, animDelay, onAdjust, onEdit, onDelete, onAdjustModal, onShowMoves }) {
  const health  = stockHealth(item)
  const margin  = marginInfo(item)
  const daysLeft = calcDaysLeft(item, velocity)
  const revPot  = (item.stock_qty || 0) * (item.sell_price || 0)
  const abc     = abcColors(item.abcClass)

  return (
    <div
      className="inv-tile"
      style={{ animationDelay: animDelay + 'ms' } as React.CSSProperties}
    >
      {/* accent stripe */}
      <div
        className="inv-tile-accent"
        style={{ background: item.abcClass === 'A' ? '#318CE7' : item.abcClass === 'B' ? '#34d399' : 'transparent' }}
      />

      {/* name + badges */}
      <div className="inv-tile-top">
        <div style={{ flex:1, minWidth:0 }}>
          <div className="inv-tile-name">{item.name}</div>
          {item.sku && <div className="inv-tile-sku">{item.sku}</div>}
        </div>
        <div className="inv-tile-badges">
          <span className="inv-badge-abc" style={{ color: abc.color, background: abc.bg }}>
            {item.abcClass}
          </span>
          {margin.pct !== null && (
            <span className="inv-badge-margin" style={{ color: margin.color, background: margin.color + '22' }}>
              {margin.label}
            </span>
          )}
        </div>
      </div>

      {/* health bar */}
      <div className="inv-health">
        <div className="inv-health-track">
          <div
            className="inv-health-fill"
            style={{ width: health.pct + '%', background: health.color }}
          />
        </div>
        <div className="inv-health-row">
          <span className="inv-health-label" style={{ color: health.color }}>{health.label}</span>
          <span className="inv-health-pct">{health.pct}%</span>
        </div>
      </div>

      {/* big qty + stepper */}
      <div className="inv-qty-row">
        <div>
          <div className="inv-qty-big" style={{ color: health.color }}>{item.stock_qty ?? 0}</div>
          <div className="inv-qty-unit">وحدة</div>
        </div>
        <div className="inv-stepper">
          <button className="inv-step-btn" onClick={() => onAdjust(-1)}>−</button>
          <div className="inv-step-val">{item.stock_qty ?? 0}</div>
          <button className="inv-step-btn" onClick={() => onAdjust(1)}>+</button>
        </div>
      </div>

      {/* revenue potential + days to stockout */}
      <div className="inv-meta">
        {revPot > 0 && (
          <span className="inv-rev">💰 {formatCurrency(revPot)}</span>
        )}
        {daysLeft !== null && (
          <span
            className="inv-days"
            style={{
              background: daysLeft <= 7  ? 'rgba(239,68,68,0.12)'  :
                          daysLeft <= 14 ? 'rgba(245,158,11,0.12)' : 'rgba(52,211,153,0.12)',
              color:      daysLeft <= 7  ? '#ef4444' : daysLeft <= 14 ? '#f59e0b' : '#34d399',
            }}
          >
            ⚡ {daysLeft} يوم
          </span>
        )}
      </div>

      {/* action buttons */}
      <div className="inv-actions">
        <button className="inv-icon-btn" onClick={onShowMoves} title="سجل الحركات">📋</button>
        <button className="inv-icon-btn adj" onClick={onAdjustModal} title="تعديل الكمية">±</button>
        <button className="inv-icon-btn" onClick={onEdit} title="تعديل المنتج">
          <IcEdit size={11} />
        </button>
        <button className="inv-icon-btn del" onClick={onDelete} title="حذف المنتج">
          <IcDelete size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── MovementRow ─────────────────────────────────────────── */
function MovementRow({ move }) {
  const d = new Date(move.time)
  const isAdd = move.delta > 0
  return (
    <div className="inv-move-row">
      <span className="inv-move-ico">{isAdd ? '📦' : '📤'}</span>
      <div className="inv-move-body">
        <div className="inv-move-name">{move.itemName}</div>
        {move.note && <div className="inv-move-note">{move.note}</div>}
      </div>
      <div className="inv-move-right">
        <div className="inv-move-delta" style={{ color: isAdd ? '#34d399' : '#ef4444' }}>
          {isAdd ? '+' : ''}{move.delta}
        </div>
        <div className="inv-move-time">
          {d.toLocaleDateString('ar-AE', { month:'short', day:'numeric' })}
          {' '}
          {d.toLocaleTimeString('ar-AE', { hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>
      <div className="inv-move-remain">{move.qty} متبقي</div>
    </div>
  )
}

/* ── InventoryForm ────────────────────────────────────────── */
function InventoryForm({ open, onClose, item, suppliers, onSaved }) {
  const [form, setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (open) setForm(item
      ? { ...item }
      : { active: true, stock_qty: 0, low_stock_threshold: 5, cost_price: 0, sell_price: 0 }
    )
  }, [open, item])

  async function handleSave() {
    if (!form.name) { toast('أدخل اسم المنتج', 'error'); return }
    setSaving(true)
    try {
      const saved = item
        ? await DB.update('inventory', item.id, form)
        : await DB.insert('inventory', form)
      onSaved(saved)
    } catch (err) {
      toast('فشل الحفظ: ' + (err.message || ''), 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={item ? 'تعديل المنتج' : 'منتج جديد'}
      width={500}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>{item ? 'حفظ التعديلات' : 'إضافة المنتج'}</Btn>
      </>}
    >
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
        <Input label="اسم المنتج *" value={form.name || ''} onChange={e => setField('name', e.target.value)} placeholder="اسم المنتج" containerStyle={{ gridColumn:'1 / -1' }} />
        <Input label="رمز SKU" value={form.sku || ''} onChange={e => setField('sku', e.target.value)} dir="ltr" placeholder="CRY-001" />
        <Input label="الفئة" value={form.category || ''} onChange={e => setField('category', e.target.value)} placeholder="كريستال، هدايا..." />
        <Input label="سعر التكلفة (د.إ)" type="number" value={form.cost_price || ''} onChange={e => setField('cost_price', e.target.value)} />
        <Input label="سعر البيع (د.إ)" type="number" value={form.sell_price || ''} onChange={e => setField('sell_price', e.target.value)} />
        <Input label="الكمية الحالية" type="number" value={form.stock_qty ?? 0} onChange={e => setField('stock_qty', parseInt(e.target.value) || 0)} />
        <Input label="حد التنبيه (منخفض)" type="number" value={form.low_stock_threshold ?? 5} onChange={e => setField('low_stock_threshold', parseInt(e.target.value) || 5)} />
        {suppliers.length > 0 && (
          <Select label="المورد" value={form.supplier_id || ''} onChange={e => setField('supplier_id', e.target.value)} containerStyle={{ gridColumn:'1 / -1' }}>
            <option value="">لا يوجد مورد</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} containerStyle={{ gridColumn:'1 / -1' }} />
      </div>
    </Modal>
  )
}
