// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Modal, Input, Select, Textarea, Empty, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcEdit, IcDelete } from '../components/Icons'
import useDeleteRecord from '../hooks/useDeleteRecord'
import type { PageProps } from '../types'

/* ── constants ───────────────────────────────────────────── */
export const EXPENSE_CATEGORIES = [
  'مواد تغليف',
  'إعلانات وتسويق',
  'اشتراكات شهرية',
  'رسوم تحويل حياك',
  'مستلزمات مكتبية',
  'إيجار',
  'اتصالات',
  'صيانة',
  'مشتريات',
  'دين خارجي',   // external personal debts between partners
  'أخرى',
]

const PAID_BY = [
  { id: 'company',  label: 'حساب الشركة', color: '#34d399', initial: 'ش' },
  { id: 'ibrahim',  label: 'إبراهيم',      color: '#318CE7', initial: 'إ' },
  { id: 'ihsan',    label: 'إحسان',        color: '#8b5cf6', initial: 'ح' },
]

const CAT_COLOR = {
  'إعلانات وتسويق':   '#318CE7',
  'اشتراكات شهرية':   '#8b5cf6',
  'مواد تغليف':        '#f59e0b',
  'رسوم تحويل حياك':  '#34d399',
  'مستلزمات مكتبية':  '#64748b',
  'إيجار':             '#ef4444',
  'اتصالات':           '#06b6d4',
  'صيانة':             '#f97316',
  'مشتريات':           '#ec4899',
  'دين خارجي':         '#a855f7',
  'أخرى':              '#94a3b8',
}
const catColor = c => CAT_COLOR[c] || '#94a3b8'
const paidByLabel = id => PAID_BY.find(p => p.id === id)?.label || id || 'حساب الشركة'
const personInfo  = id => PAID_BY.find(p => p.id === id) || PAID_BY[0]

function getLast6Months() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('ar-AE', { month: 'short' }) }
  })
}

function groupByDate(expenses) {
  const now = new Date()
  const today     = now.toDateString()
  const yesterday = new Date(now - 86400000).toDateString()
  const groups = {}
  expenses.forEach(e => {
    const d   = new Date(e.date || e.created_at)
    const key = d.toDateString() === today     ? 'اليوم'
              : d.toDateString() === yesterday  ? 'أمس'
              : d.toLocaleDateString('ar-AE', { weekday:'short', month:'short', day:'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return Object.entries(groups)
}

/* ── main page ───────────────────────────────────────────── */
export default function Expenses(_: PageProps) {
  const [expenses,    setExpenses]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [filterCat,   setFilterCat]   = useState('all')
  const [filterPaid,  setFilterPaid]  = useState('all')
  const [activeTab,   setActiveTab]   = useState('expenses')
  const [budget,      setBudget]      = useState(5000)
  const [editBudget,  setEditBudget]  = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const { deleteId, setDeleteId, deleting, handleDelete } = useDeleteRecord('expenses', setExpenses)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await DB.list('expenses', { orderBy: 'date' })
      setExpenses(data.reverse())
    } catch (e) { console.error(e); toast('خطأ في تحميل المصروفات', 'error') }
    finally { setLoading(false) }
  }

  async function toggleReimbursed(exp) {
    try {
      const nowDate = new Date().toISOString().split('T')[0]
      const marking = !exp.reimbursed
      const updated = await DB.update('expenses', exp.id, {
        reimbursed:         marking,
        reimbursement_date: marking ? nowDate : null,
      })
      setExpenses(p => p.map(e => e.id === exp.id ? { ...e, ...updated } : e))
      if (marking) {
        const partnerName = exp.paid_by === 'ibrahim' ? 'إبراهيم'
                          : exp.paid_by === 'ihsan'   ? 'إحسان' : null
        if (partnerName) {
          await DB.insert('withdrawals', {
            partner_name: partnerName, type: 'reimbursement',
            amount: exp.amount, date: nowDate,
            notes: `استرداد: ${exp.title || exp.description || exp.category || ''}`,
          }).catch(() => {})
        }
        toast('تم تسجيل الاسترداد ✓')
      } else {
        toast('تم إلغاء الاسترداد')
      }
    } catch { toast('فشل التحديث', 'error') }
  }

  async function settleAllDebts(personId) {
    const pending = expenses.filter(e => e.paid_by === personId && !e.reimbursed)
    if (pending.length === 0) { toast('لا يوجد ديون معلقة'); return }
    const nowDate = new Date().toISOString().split('T')[0]
    const info    = personInfo(personId)
    const total   = pending.reduce((s, e) => s + (e.amount || 0), 0)
    try {
      await Promise.all(pending.map(e =>
        DB.update('expenses', e.id, { reimbursed: true, reimbursement_date: nowDate })
      ))
      if (personId !== 'company') {
        await DB.insert('withdrawals', {
          partner_name: info.label, type: 'reimbursement', amount: total, date: nowDate,
          notes: `تسوية ${pending.length} قيد دفعة واحدة`,
        }).catch(() => {})
      }
      setExpenses(prev => prev.map(e =>
        e.paid_by === personId && !e.reimbursed
          ? { ...e, reimbursed: true, reimbursement_date: nowDate }
          : e
      ))
      toast(`تمت التسوية الكاملة: ${formatCurrency(total)} ✓`)
    } catch { toast('فشلت التسوية', 'error') }
  }

  /* ── computations ────────────────────────────────────────── */
  const now       = new Date()
  const thisMonth = now.getMonth()
  const thisYear  = now.getFullYear()
  const daysElapsed  = now.getDate()
  const daysInMonth  = new Date(thisYear, thisMonth + 1, 0).getDate()

  const monthlyExp = useMemo(() => expenses.filter(e => {
    if (!e.date) return false
    const d = new Date(e.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }), [expenses])

  const prevMonthExp = useMemo(() => {
    const pd = new Date(thisYear, thisMonth - 1, 1)
    return expenses.filter(e => {
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getMonth() === pd.getMonth() && d.getFullYear() === pd.getFullYear()
    })
  }, [expenses])

  const thisMonthTotal = monthlyExp.reduce((s, e)     => s + (e.amount || 0), 0)
  const prevMonthTotal = prevMonthExp.reduce((s, e)   => s + (e.amount || 0), 0)
  const dailyAvg       = daysElapsed > 0 ? thisMonthTotal / daysElapsed : 0
  const projected      = Math.round(dailyAvg * daysInMonth)
  const budgetPct      = budget > 0 ? Math.min(100, Math.round((thisMonthTotal / budget) * 100)) : 0
  const monthTrend     = prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0

  const sixMonths = useMemo(() => getLast6Months().map(m => ({
    ...m,
    total: expenses.filter(e => {
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getMonth() === m.month && d.getFullYear() === m.year
    }).reduce((s, e) => s + (e.amount || 0), 0),
  })), [expenses])
  const maxMonth = Math.max(...sixMonths.map(m => m.total), 1)

  const byCat = useMemo(() => EXPENSE_CATEGORIES.map(c => {
    const total     = expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0)
    const prevTotal = prevMonthExp.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0)
    return { cat: c, total, prevTotal }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total), [expenses, prevMonthExp])
  const maxCat = byCat[0]?.total || 1

  const subscriptions = useMemo(() =>
    expenses.filter(e => e.is_subscription).sort((a, b) => (b.amount || 0) - (a.amount || 0))
  , [expenses])
  const monthlySubTotal = subscriptions.reduce((s, e) => s + (e.amount || 0), 0)

  const byPerson = useMemo(() => {
    const map = {}
    PAID_BY.forEach(p => { map[p.id] = { ...p, total: 0, unreimbursed: 0, count: 0, debts: [], externalDebts: [] } })
    expenses.forEach(e => {
      const m = map[e.paid_by] || map['company']
      m.total += (e.amount || 0); m.count++
      if (e.paid_by !== 'company' && !e.reimbursed) {
        m.unreimbursed += (e.amount || 0)
        if (e.category === 'دين خارجي') m.externalDebts.push(e)
        else m.debts.push(e)
      }
    })
    return PAID_BY.map(p => map[p.id])
  }, [expenses])

  const totalUnreimbursed = byPerson.reduce((s, p) => s + p.unreimbursed, 0)
  const totalDebtItems    = byPerson.filter(p => p.id !== 'company').reduce((s, p) => s + p.debts.length + p.externalDebts.length, 0)

  const filtered = useMemo(() => expenses.filter(e => {
    const matchCat  = filterCat  === 'all' || e.category === filterCat
    const matchPaid = filterPaid === 'all' || e.paid_by  === filterPaid
    return matchCat && matchPaid
  }), [expenses, filterCat, filterPaid])

  const alerts = useMemo(() => {
    const list = []
    byCat.forEach(c => {
      if (c.prevTotal > 0) {
        const inc = ((c.total - c.prevTotal) / c.prevTotal) * 100
        if (inc >= 50) list.push({ type: 'spike', cat: c.cat, pct: Math.round(inc) })
      }
    })
    if (thisMonthTotal > budget && budget > 0) list.push({ type: 'overbudget', excess: thisMonthTotal - budget })
    return list
  }, [byCat, thisMonthTotal, budget])

  const TABS = [
    { id: 'expenses',      icon: '🔥', label: 'المصاريف',   count: expenses.filter(e => !e.is_subscription).length },
    { id: 'subscriptions', icon: '🔄', label: 'الاشتراكات', count: subscriptions.length },
    { id: 'debts',         icon: '💳', label: 'المديونيات', count: totalDebtItems },
  ]

  if (loading) return (
    <div className="exp-page">
      <SkeletonStats count={3} />
      <SkeletonCard rows={4} />
      <div style={{ marginTop:16 }}><SkeletonCard rows={4} /></div>
      <div style={{ marginTop:16 }}><SkeletonCard rows={4} /></div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes expFadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes expSpin   { to { transform:rotate(360deg) } }

        /* ── page ── */
        .exp-page { padding: 20px 16px 140px; }

        /* ── top row ── */
        .exp-toprow  { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; }
        .exp-title   { font-size:20px; font-weight:900; color:var(--text-primary); line-height:1.2; }
        .exp-sub     { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .exp-new-btn {
          display:flex; align-items:center; gap:6px;
          padding:9px 14px; border-radius:12px; border:none;
          background:var(--action); color:#fff; font-weight:800; font-size:13px;
          cursor:pointer; font-family:var(--font); flex-shrink:0;
        }

        /* ── tabs ── */
        .exp-tabs { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; margin-bottom:14px; padding-bottom:2px; }
        .exp-tabs::-webkit-scrollbar { display:none; }
        .exp-tab {
          display:flex; align-items:center; gap:5px;
          padding:9px 16px; border-radius:999px; border:1.5px solid var(--border);
          background:var(--bg-surface); color:var(--text-secondary);
          font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap;
          font-family:var(--font); transition:all 0.15s; flex-shrink:0;
        }
        .exp-tab.on { background:var(--action); border-color:var(--action); color:#fff; }
        .exp-tab-count { font-size:10px; padding:1px 5px; border-radius:999px; background:var(--bg-elevated); color:var(--text-muted); }
        .exp-tab.on .exp-tab-count { background:rgba(255,255,255,0.25); color:#fff; }

        /* ── hero burn ── */
        .exp-hero {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:18px; padding:16px; margin-bottom:12px;
          animation: expFadeUp 0.4s ease-out both;
        }
        .exp-hero-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; gap:8px; }
        .exp-hero-label  { font-size:11px; color:var(--text-muted); margin-bottom:3px; }
        .exp-hero-amount { font-size:26px; font-weight:900; color:var(--text-primary); font-family:'Inter',sans-serif; line-height:1; }
        .exp-hero-trend {
          display:flex; align-items:center; gap:3px;
          padding:4px 9px; border-radius:999px; font-size:10px; font-weight:800; flex-shrink:0;
        }
        .exp-budget-track { height:8px; background:var(--bg-elevated); border-radius:999px; overflow:hidden; margin-bottom:6px; }
        .exp-budget-fill  { height:100%; border-radius:999px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .exp-budget-row   { display:flex; justify-content:space-between; align-items:center; }
        .exp-budget-pct   { font-size:11px; font-weight:800; font-family:'Inter',sans-serif; }
        .exp-budget-edit  { font-size:10px; color:var(--text-muted); cursor:pointer; border:none; background:none; font-family:var(--font); padding:0; }
        .exp-projected    { font-size:10px; color:var(--text-muted); margin-top:5px; }

        /* ── KPI stats ── */
        .exp-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
        .exp-stat {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:14px; padding:11px 13px;
          animation: expFadeUp 0.4s ease-out both;
        }
        .exp-stat-val { font-size:14px; font-weight:900; font-family:'Inter',sans-serif; color:var(--text-primary); line-height:1; }
        .exp-stat-lbl { font-size:10px; color:var(--text-muted); margin-top:3px; }

        /* ── alerts ── */
        .exp-alert {
          display:flex; align-items:center; gap:8px;
          padding:9px 12px; border-radius:12px; margin-bottom:8px;
          font-size:11px; font-weight:700;
          animation: expFadeUp 0.3s ease-out both;
        }

        /* ── 6-month chart ── */
        .exp-chart {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:16px; padding:14px; margin-bottom:12px;
        }
        .exp-chart-title { font-size:12px; font-weight:800; color:var(--text-secondary); margin-bottom:10px; }
        .exp-bars         { display:flex; gap:5px; align-items:flex-end; height:54px; }
        .exp-bar-wrap     { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; height:100%; }
        .exp-bar-track    { flex:1; width:100%; display:flex; align-items:flex-end; background:var(--bg-elevated); border-radius:6px; overflow:hidden; }
        .exp-bar-fill     { width:100%; border-radius:6px; }
        .exp-bar-lbl      { font-size:9px; color:var(--text-muted); white-space:nowrap; }

        /* ── category intelligence ── */
        .exp-cats { background:var(--bg-surface); border:1.5px solid var(--border); border-radius:16px; padding:14px; margin-bottom:12px; }
        .exp-cats-title { font-size:12px; font-weight:800; color:var(--text-secondary); margin-bottom:10px; }
        .exp-cat-row { margin-bottom:9px; }
        .exp-cat-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
        .exp-cat-name { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--text-primary); }
        .exp-cat-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .exp-cat-right { display:flex; align-items:center; gap:6px; }
        .exp-cat-amt  { font-size:11px; font-weight:800; font-family:'Inter',sans-serif; color:var(--text-primary); }
        .exp-cat-trend { font-size:9px; font-weight:800; padding:1px 5px; border-radius:999px; }
        .exp-cat-track { height:4px; background:var(--bg-elevated); border-radius:999px; overflow:hidden; }
        .exp-cat-fill  { height:100%; border-radius:999px; }

        /* ── filters ── */
        .exp-filters { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin-bottom:10px; padding-bottom:2px; }
        .exp-filters::-webkit-scrollbar { display:none; }
        .exp-chip {
          padding:5px 12px; border-radius:999px; font-size:11px; font-weight:700;
          border:1.5px solid var(--border); background:var(--bg-surface);
          color:var(--text-secondary); cursor:pointer; white-space:nowrap;
          font-family:var(--font); transition:all 0.15s; flex-shrink:0;
        }
        .exp-chip.on { background:var(--action); border-color:var(--action); color:#fff; }

        /* ── timeline groups ── */
        .exp-group-hd {
          display:flex; align-items:center; gap:8px;
          font-size:10px; font-weight:800; color:var(--text-muted);
          padding:4px 0 6px; letter-spacing:0.5px;
        }
        .exp-group-line { flex:1; height:1px; background:var(--border); }
        .exp-group-total { font-size:10px; font-weight:900; font-family:'Inter',sans-serif; color:#ef4444; }

        /* ── expense row ── */
        .exp-row {
          display:flex; align-items:center; gap:10px;
          padding:11px 13px; background:var(--bg-surface);
          border:1.5px solid var(--border); border-radius:13px;
          margin-bottom:6px; position:relative; overflow:hidden;
          transition:box-shadow 0.15s;
          animation: expFadeUp 0.35s ease-out both;
        }
        .exp-row::before {
          content:''; position:absolute; inset-inline-start:0; top:0; bottom:0; width:3px;
        }
        .exp-row:hover { box-shadow:0 4px 16px rgba(0,0,0,0.12); }
        .exp-row-body { flex:1; min-width:0; }
        .exp-row-title { font-size:12px; font-weight:800; color:var(--text-primary); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .exp-row-meta  { font-size:10px; color:var(--text-muted); margin-top:2px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
        .exp-row-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
        .exp-row-amount { font-size:13px; font-weight:900; font-family:'Inter',sans-serif; color:#ef4444; }
        .exp-badge {
          font-size:9px; font-weight:700; padding:2px 6px; border-radius:999px;
          border:none; cursor:pointer; font-family:var(--font);
        }
        .exp-actions { display:flex; gap:3px; }
        .exp-icon-btn {
          width:24px; height:24px; border:1.5px solid var(--border); border-radius:7px;
          background:transparent; color:var(--text-muted); cursor:pointer;
          display:flex; align-items:center; justify-content:center; transition:all 0.15s;
        }
        .exp-icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
        .exp-icon-btn.del:hover { background:rgba(239,68,68,0.1); color:#ef4444; border-color:#ef4444; }

        /* ── subscriptions ── */
        .exp-sub-hero {
          background:linear-gradient(135deg, rgba(139,92,246,0.1), rgba(49,140,231,0.07));
          border:1.5px solid rgba(139,92,246,0.3);
          border-radius:18px; padding:16px; margin-bottom:12px;
          animation: expFadeUp 0.4s ease-out both;
        }
        .exp-sub-amount { font-size:26px; font-weight:900; font-family:'Inter',sans-serif; color:var(--text-primary); }
        .exp-sub-label  { font-size:11px; color:var(--text-muted); margin-bottom:4px; }
        .exp-sub-annual { font-size:13px; font-weight:800; color:#8b5cf6; font-family:'Inter',sans-serif; margin-top:4px; }
        .exp-sub-tile {
          display:flex; align-items:center; gap:10px;
          padding:11px 13px; background:var(--bg-surface);
          border:1.5px solid var(--border); border-radius:13px;
          margin-bottom:6px; animation: expFadeUp 0.35s ease-out both;
        }
        .exp-sub-icon { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px; background:rgba(139,92,246,0.1); }
        .exp-sub-name { font-size:12px; font-weight:800; color:var(--text-primary); }
        .exp-sub-cat  { font-size:10px; color:var(--text-muted); }
        .exp-sub-amts { margin-inline-start:auto; text-align:left; flex-shrink:0; }
        .exp-sub-mo   { font-size:12px; font-weight:900; font-family:'Inter',sans-serif; color:#8b5cf6; }
        .exp-sub-yr   { font-size:9px; color:var(--text-muted); font-family:'Inter',sans-serif; }

        /* ═══ DEBTS ═══ */
        .debt-net {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:16px; padding:16px; margin-bottom:14px;
          animation: expFadeUp 0.3s ease-out both;
        }
        .debt-net-title { font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:12px; letter-spacing:0.3px; }
        .debt-net-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .debt-net-name  { font-size:12px; font-weight:800; color:var(--text-primary); width:54px; flex-shrink:0; }
        .debt-net-track { flex:1; height:8px; background:var(--bg-elevated); border-radius:999px; overflow:hidden; }
        .debt-net-fill  { height:100%; border-radius:999px; }
        .debt-net-amt   { font-size:12px; font-weight:900; font-family:'Inter',sans-serif; flex-shrink:0; min-width:80px; text-align:left; }
        .debt-net-zero  { font-size:11px; font-weight:700; color:var(--text-muted); text-align:center; padding:8px; }

        /* person card */
        .debt-card {
          background:var(--bg-surface); border:1.5px solid var(--border);
          border-radius:18px; overflow:hidden; margin-bottom:14px;
          animation: expFadeUp 0.4s ease-out both;
        }
        .debt-card-head {
          padding:14px 16px; display:flex; align-items:center; gap:12px;
          border-bottom:1px solid var(--border);
        }
        .debt-avatar {
          width:44px; height:44px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:18px; font-weight:900; color:#fff;
        }
        .debt-person-name { font-size:15px; font-weight:900; color:var(--text-primary); }
        .debt-person-sub  { font-size:10px; color:var(--text-muted); margin-top:1px; }
        .debt-card-amount { margin-inline-start:auto; text-align:left; }
        .debt-card-total  { font-size:20px; font-weight:900; font-family:'Inter',sans-serif; }
        .debt-card-lbl    { font-size:9px; color:var(--text-muted); }

        /* settle button */
        .debt-settle {
          display:flex; align-items:center; justify-content:center; gap:6px;
          margin:10px 14px; padding:10px; border-radius:12px; border:none;
          font-size:12px; font-weight:800; cursor:pointer; font-family:var(--font);
          transition:all 0.15s; width:calc(100% - 28px);
        }

        /* section header inside card */
        .debt-section-hd {
          padding:8px 16px 4px;
          font-size:10px; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;
          display:flex; align-items:center; justify-content:space-between;
        }

        /* debt item row */
        .debt-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 16px; border-top:1px solid var(--border);
          transition:background 0.12s;
        }
        .debt-item:hover { background:var(--bg-hover); }
        .debt-item-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .debt-item-body { flex:1; min-width:0; }
        .debt-item-name { font-size:11px; font-weight:700; color:var(--text-primary); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .debt-item-date { font-size:9px; color:var(--text-muted); margin-top:1px; }
        .debt-item-right { display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0; }
        .debt-item-amt  { font-size:12px; font-weight:900; font-family:'Inter',sans-serif; color:var(--text-primary); }
        .debt-item-tag  { font-size:9px; font-weight:700; padding:1px 5px; border-radius:999px; }
        .debt-reimburse {
          font-size:9px; font-weight:700; padding:3px 8px; border-radius:999px;
          cursor:pointer; border:1.5px solid; font-family:var(--font);
          background:transparent; transition:all 0.15s; flex-shrink:0;
        }
        .debt-reimburse:hover { background:rgba(52,211,153,0.12); }

        /* add external debt button */
        .debt-add-btn {
          display:flex; align-items:center; justify-content:center; gap:6px;
          padding:11px 16px; margin:8px 14px;
          border-radius:12px; border:1.5px dashed var(--border);
          background:transparent; color:var(--text-muted);
          font-size:12px; font-weight:700; cursor:pointer; font-family:var(--font);
          transition:all 0.15s; width:calc(100% - 28px);
        }
        .debt-add-btn:hover { border-color:#a855f7; color:#a855f7; background:rgba(168,85,247,0.05); }

        /* empty debt card */
        .debt-settled { padding:20px 16px; text-align:center; color:var(--text-muted); font-size:12px; }

        /* ── desktop ── */
        @media (min-width: 769px) {
          .exp-page     { padding: 24px 32px 80px; }
          .exp-stats    { grid-template-columns: repeat(4, 1fr); gap:12px; }
          .exp-stat-val { font-size:17px; }
          .exp-hero-amount { font-size:32px; }
          .exp-sub-amount  { font-size:32px; }
          .debt-card-total { font-size:24px; }
        }
      `}</style>

      <div className="exp-page">

        {/* ── Top Row ── */}
        <div className="exp-toprow">
          <div>
            <div className="exp-title">المصاريف</div>
            <div className="exp-sub">{expenses.length} قيد · {PAID_BY.length} حسابات</div>
          </div>
          <button className="exp-new-btn" onClick={() => { setEditItem(null); setShowForm(true) }}>
            <IcPlus size={14} /> مصروف جديد
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="exp-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`exp-tab ${activeTab === t.id ? 'on' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
              <span className="exp-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* ═══════════════════ TAB: EXPENSES ═══════════════════ */}
        {activeTab === 'expenses' && (<>

          {/* Hero burn rate */}
          <div className="exp-hero">
            <div className="exp-hero-top">
              <div>
                <div className="exp-hero-label">مصاريف هذا الشهر</div>
                <div className="exp-hero-amount">{formatCurrency(thisMonthTotal)}</div>
              </div>
              {prevMonthTotal > 0 && (
                <div className="exp-hero-trend" style={{
                  background: monthTrend > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.12)',
                  color: monthTrend > 0 ? '#ef4444' : '#34d399',
                }}>
                  {monthTrend > 0 ? '↑' : '↓'} {Math.abs(Math.round(monthTrend))}% عن الشهر السابق
                </div>
              )}
            </div>
            <div className="exp-budget-track">
              <div className="exp-budget-fill" style={{
                width: budgetPct + '%',
                background: budgetPct >= 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : '#34d399',
              }} />
            </div>
            <div className="exp-budget-row">
              <span className="exp-budget-pct" style={{
                color: budgetPct >= 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : '#34d399',
              }}>
                {budgetPct}% من الميزانية
              </span>
              {editBudget ? (
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  <input
                    value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                    placeholder={budget.toString()}
                    style={{ width:70, padding:'2px 6px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-primary)', fontSize:11, fontFamily:'Inter,sans-serif', outline:'none' }}
                    onKeyDown={e => { if (e.key === 'Enter') { setBudget(parseFloat(budgetInput) || budget); setEditBudget(false) } }}
                    autoFocus
                  />
                  <button onClick={() => { setBudget(parseFloat(budgetInput) || budget); setEditBudget(false) }} style={{ fontSize:10, padding:'2px 8px', borderRadius:6, border:'none', background:'var(--action)', color:'#fff', cursor:'pointer', fontFamily:'var(--font)' }}>✓</button>
                  <button onClick={() => setEditBudget(false)} style={{ fontSize:10, padding:'2px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>✕</button>
                </div>
              ) : (
                <button className="exp-budget-edit" onClick={() => { setBudgetInput(budget.toString()); setEditBudget(true) }}>
                  الميزانية: {formatCurrency(budget)} ✏️
                </button>
              )}
            </div>
            <div className="exp-projected">
              متوقع نهاية الشهر: {formatCurrency(projected)} · {daysInMonth - daysElapsed} يوم متبقٍ
            </div>
          </div>

          {/* KPI Stats */}
          <div className="exp-stats">
            <div className="exp-stat" style={{ animationDelay:'0ms', borderColor: '#ef444440' }}>
              <div className="exp-stat-val" style={{ color:'#ef4444' }}>{formatCurrency(thisMonthTotal)}</div>
              <div className="exp-stat-lbl">هذا الشهر</div>
            </div>
            <div className="exp-stat" style={{ animationDelay:'50ms', borderColor: totalUnreimbursed > 0 ? '#a855f740' : undefined }}>
              <div className="exp-stat-val" style={{ color: totalUnreimbursed > 0 ? '#a855f7' : undefined }}>{formatCurrency(totalUnreimbursed)}</div>
              <div className="exp-stat-lbl">غير مسترجع</div>
            </div>
            <div className="exp-stat" style={{ animationDelay:'100ms' }}>
              <div className="exp-stat-val" style={{ color:'var(--text-muted)', fontSize:12 }}>{formatCurrency(prevMonthTotal)}</div>
              <div className="exp-stat-lbl">الشهر السابق</div>
            </div>
            <div className="exp-stat" style={{ animationDelay:'150ms' }}>
              <div className="exp-stat-val">{expenses.length}</div>
              <div className="exp-stat-lbl">إجمالي القيود</div>
            </div>
          </div>

          {/* Smart Alerts */}
          {alerts.map((a, i) => a.type === 'spike' ? (
            <div key={i} className="exp-alert" style={{ background:'rgba(245,158,11,0.08)', border:'1.5px solid rgba(245,158,11,0.25)', color:'#f59e0b', animationDelay: i * 40 + 'ms' }}>
              ⚡ <span><b>{a.cat}</b>: ارتفع {a.pct}% مقارنةً بالشهر السابق</span>
            </div>
          ) : (
            <div key={i} className="exp-alert" style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.25)', color:'#ef4444', animationDelay: i * 40 + 'ms' }}>
              🚨 <span>تجاوزت الميزانية بـ <b>{formatCurrency(a.excess)}</b></span>
            </div>
          ))}

          {/* 6-Month Bar Chart */}
          {sixMonths.some(m => m.total > 0) && (
            <div className="exp-chart">
              <div className="exp-chart-title">آخر 6 أشهر</div>
              <div className="exp-bars">
                {sixMonths.map((m, i) => {
                  const pct = (m.total / maxMonth) * 100
                  const isCur = m.month === thisMonth && m.year === thisYear
                  return (
                    <div key={i} className="exp-bar-wrap">
                      <div className="exp-bar-track">
                        <div className="exp-bar-fill" style={{ height: pct + '%', background: isCur ? '#ef4444' : 'rgba(239,68,68,0.25)', minHeight: m.total > 0 ? 3 : 0 }} />
                      </div>
                      <div className="exp-bar-lbl" style={{ color: isCur ? '#ef4444' : undefined, fontWeight: isCur ? 800 : undefined }}>{m.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Category Intelligence */}
          {byCat.length > 0 && (
            <div className="exp-cats">
              <div className="exp-cats-title">توزيع المصاريف بالفئة</div>
              {byCat.map(({ cat, total: ct, prevTotal: pt }) => {
                const pct   = (ct / maxCat) * 100
                const trend = pt > 0 ? Math.round(((ct - pt) / pt) * 100) : null
                return (
                  <div key={cat} className="exp-cat-row">
                    <div className="exp-cat-head">
                      <div className="exp-cat-name">
                        <div className="exp-cat-dot" style={{ background: catColor(cat) }} />
                        {cat}
                      </div>
                      <div className="exp-cat-right">
                        {trend !== null && (
                          <span className="exp-cat-trend" style={{ background: trend > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: trend > 0 ? '#ef4444' : '#34d399' }}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                          </span>
                        )}
                        <span className="exp-cat-amt">{formatCurrency(ct)}</span>
                      </div>
                    </div>
                    <div className="exp-cat-track">
                      <div className="exp-cat-fill" style={{ width: pct + '%', background: catColor(cat) }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Filter chips */}
          <div className="exp-filters">
            <button className={`exp-chip ${filterCat === 'all' && filterPaid === 'all' ? 'on' : ''}`} onClick={() => { setFilterCat('all'); setFilterPaid('all') }}>الكل</button>
            {PAID_BY.map(p => (
              <button key={p.id} className={`exp-chip ${filterPaid === p.id ? 'on' : ''}`} onClick={() => setFilterPaid(filterPaid === p.id ? 'all' : p.id)} style={filterPaid === p.id ? { background: p.color, borderColor: p.color } : {}}>
                {p.label}
              </button>
            ))}
            {byCat.map(({ cat }) => (
              <button key={cat} className={`exp-chip ${filterCat === cat ? 'on' : ''}`} onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)} style={filterCat === cat ? { background: catColor(cat), borderColor: catColor(cat) } : {}}>
                {cat}
              </button>
            ))}
          </div>

          {/* Timeline Feed */}
          {filtered.length === 0 ? (
            <Empty title="لا يوجد مصاريف" action={
              <button className="exp-new-btn" onClick={() => setShowForm(true)}><IcPlus size={14} /> أضف مصروف</button>
            } />
          ) : groupByDate(filtered).map(([dateLabel, group]) => (
            <div key={dateLabel}>
              <div className="exp-group-hd">
                {dateLabel}
                <div className="exp-group-line" />
                <span className="exp-group-total">{formatCurrency(group.reduce((s, e) => s + (e.amount || 0), 0))}</span>
              </div>
              {group.map((exp, i) => {
                const pInfo   = personInfo(exp.paid_by)
                const isPersonal = exp.paid_by && exp.paid_by !== 'company'
                return (
                  <div key={exp.id} className="exp-row" style={{ animationDelay: i * 30 + 'ms' }}>
                    <div style={{ position:'absolute', insetInlineStart:0, top:0, bottom:0, width:3, background: catColor(exp.category), borderRadius:'3px 0 0 3px' }} />
                    <div className="exp-row-body">
                      <div className="exp-row-title">
                        {exp.is_subscription && <span style={{ fontSize:9, background:'rgba(139,92,246,0.12)', color:'#8b5cf6', borderRadius:4, padding:'1px 4px', marginInlineEnd:5, fontWeight:700 }}>اشتراك</span>}
                        {exp.title || exp.description || '—'}
                      </div>
                      <div className="exp-row-meta">
                        <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:pInfo.color, display:'inline-block' }} />
                          {pInfo.label}
                        </span>
                        {exp.category && <span>· {exp.category}</span>}
                        {exp.notes && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:100 }}>· {exp.notes}</span>}
                      </div>
                    </div>
                    <div className="exp-row-right">
                      <div className="exp-row-amount">{formatCurrency(exp.amount)}</div>
                      <div style={{ display:'flex', gap:4 }}>
                        {isPersonal && (
                          <button
                            className="exp-badge"
                            onClick={() => toggleReimbursed(exp)}
                            style={{
                              background: exp.reimbursed ? 'rgba(52,211,153,0.12)' : 'rgba(168,85,247,0.12)',
                              color: exp.reimbursed ? '#34d399' : '#a855f7',
                            }}
                          >
                            {exp.reimbursed ? '✓ مسترجع' : '⏳ معلق'}
                          </button>
                        )}
                        <div className="exp-actions">
                          <button className="exp-icon-btn" onClick={() => { setEditItem(exp); setShowForm(true) }}><IcEdit size={11} /></button>
                          <button className="exp-icon-btn del" onClick={() => setDeleteId(exp.id)}><IcDelete size={11} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

        </>)}

        {/* ═══════════════════ TAB: SUBSCRIPTIONS ═══════════════════ */}
        {activeTab === 'subscriptions' && (<>

          <div className="exp-sub-hero">
            <div className="exp-sub-label">إجمالي الاشتراكات الشهرية</div>
            <div className="exp-sub-amount">{formatCurrency(monthlySubTotal)}</div>
            <div className="exp-sub-annual">= {formatCurrency(monthlySubTotal * 12)} سنوياً 📆</div>
          </div>

          {subscriptions.length === 0 ? (
            <Empty title="لا يوجد اشتراكات" action={
              <button className="exp-new-btn" onClick={() => { setEditItem({ is_subscription: true }); setShowForm(true) }}><IcPlus size={14} /> أضف اشتراكاً</button>
            } />
          ) : subscriptions.map((exp, i) => (
            <div key={exp.id} className="exp-sub-tile" style={{ animationDelay: i * 40 + 'ms' }}>
              <div className="exp-sub-icon">🔄</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="exp-sub-name">{exp.title || exp.description || '—'}</div>
                <div className="exp-sub-cat">{exp.category} · {paidByLabel(exp.paid_by)}</div>
              </div>
              <div className="exp-sub-amts">
                <div className="exp-sub-mo">{formatCurrency(exp.amount)}<span style={{ fontSize:9, fontWeight:400, color:'var(--text-muted)' }}>/شهر</span></div>
                <div className="exp-sub-yr">{formatCurrency((exp.amount || 0) * 12)}/سنة</div>
              </div>
              <div className="exp-actions">
                <button className="exp-icon-btn" onClick={() => { setEditItem(exp); setShowForm(true) }}><IcEdit size={11} /></button>
                <button className="exp-icon-btn del" onClick={() => setDeleteId(exp.id)}><IcDelete size={11} /></button>
              </div>
            </div>
          ))}

        </>)}

        {/* ═══════════════════ TAB: DEBTS ═══════════════════ */}
        {activeTab === 'debts' && (<>

          {/* Net Balance Summary */}
          <DebtNetSummary byPerson={byPerson} />

          {/* Per-person debt cards */}
          {byPerson.filter(p => p.id !== 'company').map((person, idx) => (
            <DebtPersonCard
              key={person.id}
              person={person}
              animDelay={idx * 80}
              onSettle={() => settleAllDebts(person.id)}
              onReimburse={toggleReimbursed}
              onEdit={exp => { setEditItem(exp); setShowForm(true) }}
              onDelete={exp => setDeleteId(exp.id)}
              onAddDebt={() => {
                setEditItem({ paid_by: person.id, category: 'دين خارجي', is_subscription: false })
                setShowForm(true)
              }}
            />
          ))}

        </>)}

      </div>

      {/* ── Modals ── */}
      <ExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        onSaved={item => {
          setExpenses(p => editItem && editItem.id
            ? p.map(e => e.id === item.id ? item : e)
            : [item, ...p])
          setShowForm(false); setEditItem(null)
          toast(editItem && editItem.id ? 'تم التحديث ✓' : 'تم الإضافة ✓')
        }}
      />
      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} loading={deleting}
        message="سيتم حذف المصروف نهائياً."
      />
    </>
  )
}

/* ── DebtNetSummary ──────────────────────────────────────── */
function DebtNetSummary({ byPerson }) {
  const partners    = byPerson.filter(p => p.id !== 'company' && p.unreimbursed > 0)
  const maxUnreimb  = Math.max(...partners.map(p => p.unreimbursed), 1)
  const totalOwed   = partners.reduce((s, p) => s + p.unreimbursed, 0)

  return (
    <div className="debt-net">
      <div className="debt-net-title">ملخص المستحقات — من تَدين الشركة له؟</div>
      {partners.length === 0 ? (
        <div className="debt-net-zero">✅ لا توجد مستحقات معلقة — الحسابات مسوّاة</div>
      ) : (
        <>
          {partners.map(p => (
            <div key={p.id} className="debt-net-row">
              <div className="debt-net-name" style={{ color: p.color }}>{p.label}</div>
              <div className="debt-net-track">
                <div className="debt-net-fill" style={{ width: (p.unreimbursed / maxUnreimb) * 100 + '%', background: p.color }} />
              </div>
              <div className="debt-net-amt" style={{ color: p.color }}>{formatCurrency(p.unreimbursed)}</div>
            </div>
          ))}
          <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>إجمالي المستحقات</span>
            <span style={{ fontSize:14, fontWeight:900, fontFamily:'Inter,sans-serif', color:'#ef4444' }}>{formatCurrency(totalOwed)}</span>
          </div>
        </>
      )}
    </div>
  )
}

/* ── DebtPersonCard ──────────────────────────────────────── */
function DebtPersonCard({ person, animDelay, onSettle, onReimburse, onEdit, onDelete, onAddDebt }) {
  const hasDebts = person.debts.length > 0 || person.externalDebts.length > 0
  const totalAll = person.debts.reduce((s, e) => s + (e.amount || 0), 0) +
                   person.externalDebts.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div className="debt-card" style={{ animationDelay: animDelay + 'ms', borderColor: hasDebts ? person.color + '50' : undefined }}>
      {/* Head */}
      <div className="debt-card-head" style={{ background: hasDebts ? person.color + '08' : undefined }}>
        <div className="debt-avatar" style={{ background: person.color }}>
          {person.initial}
        </div>
        <div>
          <div className="debt-person-name">{person.label}</div>
          <div className="debt-person-sub">
            {hasDebts ? `${person.debts.length + person.externalDebts.length} قيد معلق` : 'لا توجد مستحقات ✅'}
          </div>
        </div>
        <div className="debt-card-amount">
          <div className="debt-card-total" style={{ color: hasDebts ? '#ef4444' : '#34d399' }}>
            {formatCurrency(totalAll)}
          </div>
          <div className="debt-card-lbl">مستحق</div>
        </div>
      </div>

      {/* Settle all button */}
      {hasDebts && (
        <button
          className="debt-settle"
          onClick={onSettle}
          style={{ background: person.color + '15', color: person.color, border: `1.5px solid ${person.color}40` }}
        >
          ✓ تسوية كاملة — {formatCurrency(totalAll)}
        </button>
      )}

      {/* Business expense debts */}
      {person.debts.length > 0 && (
        <>
          <div className="debt-section-hd">
            <span>مصاريف الشركة غير المسترجعة</span>
            <span style={{ fontFamily:'Inter,sans-serif', color:'#ef4444' }}>{formatCurrency(person.debts.reduce((s, e) => s + (e.amount || 0), 0))}</span>
          </div>
          {person.debts.map(exp => (
            <div key={exp.id} className="debt-item">
              <div className="debt-item-dot" style={{ background: catColor(exp.category) }} />
              <div className="debt-item-body">
                <div className="debt-item-name">{exp.title || exp.description || '—'}</div>
                <div className="debt-item-date">{formatDate(exp.date)} · {exp.category}</div>
              </div>
              <div className="debt-item-right">
                <div className="debt-item-amt">{formatCurrency(exp.amount)}</div>
                <span className="debt-item-tag" style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444' }}>مصروف شركة</span>
              </div>
              <button className="debt-reimburse" style={{ color:'#34d399', borderColor:'#34d39940' }} onClick={() => onReimburse(exp)}>✓ سُدّد</button>
            </div>
          ))}
        </>
      )}

      {/* External / personal debts */}
      {person.externalDebts.length > 0 && (
        <>
          <div className="debt-section-hd">
            <span>ديون خارجية / شخصية</span>
            <span style={{ fontFamily:'Inter,sans-serif', color:'#a855f7' }}>{formatCurrency(person.externalDebts.reduce((s, e) => s + (e.amount || 0), 0))}</span>
          </div>
          {person.externalDebts.map(exp => (
            <div key={exp.id} className="debt-item">
              <div className="debt-item-dot" style={{ background:'#a855f7' }} />
              <div className="debt-item-body">
                <div className="debt-item-name">{exp.title || exp.description || 'دين خارجي'}</div>
                <div className="debt-item-date">{formatDate(exp.date)}{exp.notes ? ` · ${exp.notes}` : ''}</div>
              </div>
              <div className="debt-item-right">
                <div className="debt-item-amt" style={{ color:'#a855f7' }}>{formatCurrency(exp.amount)}</div>
                <span className="debt-item-tag" style={{ background:'rgba(168,85,247,0.12)', color:'#a855f7' }}>دين خارجي</span>
              </div>
              <div style={{ display:'flex', gap:3 }}>
                <button className="debt-reimburse" style={{ color:'#34d399', borderColor:'#34d39940' }} onClick={() => onReimburse(exp)}>✓ سُدّد</button>
                <button className="exp-icon-btn" onClick={() => onEdit(exp)} style={{ width:22, height:22 }}><IcEdit size={10} /></button>
                <button className="exp-icon-btn del" onClick={() => onDelete(exp)} style={{ width:22, height:22 }}><IcDelete size={10} /></button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Empty state */}
      {!hasDebts && (
        <div className="debt-settled">لا توجد مستحقات معلقة لهذا الشخص ✅</div>
      )}

      {/* Add external debt */}
      <button className="debt-add-btn" onClick={onAddDebt}>
        <IcPlus size={13} /> أضف دين خارجي لـ {person.label}
      </button>
    </div>
  )
}

/* ── ExpenseForm ─────────────────────────────────────────── */
function ExpenseForm({ open, onClose, item, onSaved }) {
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    setForm(item && item.id ? { ...item } : {
      title: '',
      amount: '',
      category: item?.category || EXPENSE_CATEGORIES[0],
      paid_by: item?.paid_by || 'company',
      date: new Date().toISOString().split('T')[0],
      reimbursed: false,
      is_subscription: item?.is_subscription || false,
      notes: '',
    })
  }, [open, item])

  async function handleSave() {
    if (!form.title && !form.description) { toast('أدخل وصف المصروف', 'error'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('أدخل المبلغ', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        reimbursed: form.paid_by === 'company' ? false : (form.reimbursed || false),
      }
      const saved = (item && item.id)
        ? await DB.update('expenses', item.id, payload)
        : await DB.insert('expenses', payload)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={item && item.id ? 'تعديل المصروف' : 'مصروف جديد'}
      width={460}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>{item && item.id ? 'حفظ التعديلات' : 'إضافة المصروف'}</Btn>
      </>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Input label="الوصف *" value={form.title || form.description || ''} onChange={e => set('title', e.target.value)} placeholder="وصف المصروف" />
        <Input label="المبلغ (د.إ) *" type="number" min="0" value={form.amount || ''} onChange={e => set('amount', e.target.value)} />
        <Select label="الفئة" value={form.category || ''} onChange={e => set('category', e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label="دفع بواسطة" value={form.paid_by || 'company'} onChange={e => set('paid_by', e.target.value)}>
          {PAID_BY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} />

        {form.paid_by && form.paid_by !== 'company' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-hover)', borderRadius:'var(--r-md)' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>تم السداد / الاسترداد</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>هل تم إرجاع المبلغ؟</div>
            </div>
            <button onClick={() => set('reimbursed', !form.reimbursed)} style={{ width:44, height:24, borderRadius:999, border:'none', cursor:'pointer', background: form.reimbursed ? 'var(--action)' : 'var(--border)', position:'relative', transition:'background 200ms' }}>
              <span style={{ position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'all 200ms', insetInlineEnd: form.reimbursed ? 3 : 'auto', insetInlineStart: form.reimbursed ? 'auto' : 3 }} />
            </button>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-hover)', borderRadius:'var(--r-md)' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>اشتراك شهري متكرر</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>مثال: Canva، Shopify، TikTok Ads...</div>
          </div>
          <button onClick={() => set('is_subscription', !form.is_subscription)} style={{ width:44, height:24, borderRadius:999, border:'none', cursor:'pointer', background: form.is_subscription ? 'var(--action)' : 'var(--border)', position:'relative', transition:'background 200ms' }}>
            <span style={{ position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'all 200ms', insetInlineEnd: form.is_subscription ? 3 : 'auto', insetInlineStart: form.is_subscription ? 'auto' : 3 }} />
          </button>
        </div>

        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="أي تفاصيل إضافية..." />
      </div>
    </Modal>
  )
}
