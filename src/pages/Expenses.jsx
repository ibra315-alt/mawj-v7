import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Modal, Input, Select, Textarea, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcEdit, IcDelete } from '../components/Icons'

/* ═══════════════════════════════════════════
   EXPENSE CATEGORIES
═══════════════════════════════════════════ */
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
  'أخرى',
]

/* paid_by values match partner names + company */
const PAID_BY = [
  { id: 'company',  label: 'حساب الشركة' },
  { id: 'ibrahim',  label: 'إبراهيم'      },
  { id: 'ihsan',    label: 'إحسان'        },
]

function paidByLabel(id) {
  return PAID_BY.find(p => p.id === id)?.label || id || 'حساب الشركة'
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function Expenses() {
  const [expenses,    setExpenses]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [filterCat,   setFilterCat]   = useState('all')
  const [filterPaid,  setFilterPaid]  = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await DB.list('expenses', { orderBy: 'date' })
      setExpenses(data.reverse())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete('expenses', deleteId)
      setExpenses(p => p.filter(e => e.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  async function toggleReimbursed(exp) {
    try {
      const updated = await DB.update('expenses', exp.id, { reimbursed: !exp.reimbursed })
      setExpenses(p => p.map(e => e.id === exp.id ? { ...e, reimbursed: updated.reimbursed } : e))
      toast(updated.reimbursed ? 'تم تسجيل الاسترداد ✓' : 'تم إلغاء الاسترداد')
    } catch { toast('فشل التحديث', 'error') }
  }

  const filtered = expenses.filter(e => {
    const matchCat  = filterCat  === 'all' || e.category === filterCat
    const matchPaid = filterPaid === 'all' || e.paid_by  === filterPaid
    return matchCat && matchPaid
  })

  // Stats
  const now       = new Date()
  const total     = filtered.reduce((s, e) => s + (e.amount || 0), 0)
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, e) => s + (e.amount || 0), 0)
  const unreimbursed = expenses
    .filter(e => e.paid_by !== 'company' && !e.reimbursed)
    .reduce((s, e) => s + (e.amount || 0), 0)

  // Per-person totals
  const byPerson = PAID_BY.map(p => ({
    ...p,
    total:       expenses.filter(e => e.paid_by === p.id).reduce((s, e) => s + (e.amount || 0), 0),
    unreimbursed: expenses.filter(e => e.paid_by === p.id && !e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0),
    count:       expenses.filter(e => e.paid_by === p.id).length,
  }))

  // Category breakdown
  const byCat = EXPENSE_CATEGORIES
    .map(c => ({ cat: c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const maxCat = byCat[0]?.total || 1

  if (loading) return (
    <div className="page">
      <PageHeader title="المصاريف" subtitle="جاري التحميل..." />
      <SkeletonStats count={3} />
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
        {[1,2,3].map(i => <SkeletonCard key={i} rows={1}/>)}
      </div>
    </div>
  )

  return (
    <div className="page">
      <PageHeader
        title="المصاريف"
        subtitle={`${expenses.length} قيد`}
        actions={
          <Btn onClick={() => { setEditItem(null); setShowForm(true) }} style={{ gap:6 }}>
            <IcPlus size={15}/> مصروف جديد
          </Btn>
        }
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'إجمالي المصاريف',   value: formatCurrency(total),        color:'var(--danger)' },
          { label:'هذا الشهر',         value: formatCurrency(thisMonth),     color:'#f59e0b' },
          { label:'غير مسترجع',        value: formatCurrency(unreimbursed),  color: unreimbursed > 0 ? 'var(--info-light)' : 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
            <div style={{ fontSize:11, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.2 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-person cards — click to filter */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:16 }}>
        {byPerson.map(p => (
          <div
            key={p.id}
            onClick={() => setFilterPaid(filterPaid === p.id ? 'all' : p.id)}
            style={{
              background: filterPaid === p.id ? 'rgba(0,228,184,0.06)' : 'var(--bg-surface)',
              border:`1.5px solid ${filterPaid === p.id ? 'rgba(0,228,184,0.3)' : 'var(--border)'}`,
              borderRadius:'var(--r-md)', padding:'12px 14px',
              cursor:'pointer', transition:'all 120ms', boxShadow:'var(--card-shadow)',
            }}
          >
            <div style={{ fontWeight:700, fontSize:13, color: filterPaid === p.id ? 'var(--action)' : 'var(--text)', marginBottom:4 }}>{p.label}</div>
            <div style={{ fontWeight:800, fontSize:15, color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(p.total)}</div>
            {p.id !== 'company' && p.unreimbursed > 0 && (
              <div style={{ fontSize:10, color:'var(--info-light)', marginTop:4 }}>
                غير مسترجع: {formatCurrency(p.unreimbursed)}
              </div>
            )}
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{p.count} قيد</div>
          </div>
        ))}
      </div>

      {/* Category bars */}
      {byCat.length > 0 && (
        <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:16, boxShadow:'var(--card-shadow)' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>توزيع المصاريف</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {byCat.map(({ cat, total: ct }) => (
              <div key={cat}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                  <span style={{ color:'var(--text-sec)' }}>{cat}</span>
                  <span style={{ fontWeight:700, color:'var(--text)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(ct)}</span>
                </div>
                <div style={{ height:4, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width:`${(ct / maxCat) * 100}%`, height:'100%', background:'linear-gradient(90deg,var(--danger),#ff6b7a)', borderRadius:99 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <select
          value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding:'7px 12px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}
        >
          <option value="all">كل الفئات</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterPaid} onChange={e => setFilterPaid(e.target.value)}
          style={{ padding:'7px 12px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}
        >
          <option value="all">كل الدافعين</option>
          {PAID_BY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {(filterCat !== 'all' || filterPaid !== 'all') && (
          <button
            onClick={() => { setFilterCat('all'); setFilterPaid('all') }}
            style={{ padding:'7px 12px', background:'none', border:'1.5px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}
          >
            مسح
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0
        ? <Empty title="لا يوجد مصاريف" action={<Btn onClick={() => setShowForm(true)}><IcPlus size={14}/> أضف مصروف</Btn>}/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(exp => (
              <ExpenseRow
                key={exp.id}
                exp={exp}
                onEdit={() => { setEditItem(exp); setShowForm(true) }}
                onDelete={() => setDeleteId(exp.id)}
                onToggleReimbursed={() => toggleReimbursed(exp)}
              />
            ))}
          </div>
        )
      }

      <ExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        onSaved={item => {
          setExpenses(p => editItem ? p.map(e => e.id === item.id ? item : e) : [item, ...p])
          setShowForm(false); setEditItem(null)
          toast(editItem ? 'تم التحديث ✓' : 'تم الإضافة ✓')
        }}
      />

      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} loading={deleting}
        message="سيتم حذف المصروف نهائياً."
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   EXPENSE ROW
═══════════════════════════════════════════ */
function ExpenseRow({ exp, onEdit, onDelete, onToggleReimbursed }) {
  const isPersonal    = exp.paid_by && exp.paid_by !== 'company'
  const needsRefund   = isPersonal && !exp.reimbursed

  return (
    <div style={{
      background:'var(--bg-surface)', borderRadius:'var(--r-md)',
      borderRight:`3px solid ${needsRefund ? 'var(--info-light)' : exp.is_subscription ? 'var(--action)' : 'var(--danger)'}`,
      boxShadow:'var(--card-shadow)', padding:'12px 14px',
      display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
      opacity: exp.reimbursed && isPersonal ? 0.65 : 1,
    }}>
      {/* Main info */}
      <div style={{ flex:1, minWidth:130 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:2 }}>
          {exp.is_subscription && <span style={{ fontSize:10, background:'rgba(0,228,184,0.12)', color:'var(--action)', borderRadius:4, padding:'1px 5px', marginLeft:5, fontWeight:700 }}>اشتراك</span>}
          {exp.title || exp.description || '—'}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:8 }}>
          <span>{formatDate(exp.date)}</span>
          {exp.category && <span>• {exp.category}</span>}
        </div>
        {exp.notes && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{exp.notes}</div>}
      </div>

      {/* Paid by badge */}
      <span style={{
        padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700, flexShrink:0,
        background: exp.paid_by === 'company'
          ? 'rgba(59,130,246,0.1)'
          : 'rgba(139,92,246,0.1)',
        color: exp.paid_by === 'company'
          ? '#3b82f6'
          : 'var(--info-light)',
      }}>
        {paidByLabel(exp.paid_by)}
      </span>

      {/* Reimbursed toggle — only for personal payments */}
      {isPersonal && (
        <button
          onClick={onToggleReimbursed}
          style={{
            padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, cursor:'pointer', border:'none', flexShrink:0,
            background: exp.reimbursed ? 'rgba(0,228,184,0.12)' : 'rgba(245,158,11,0.1)',
            color: exp.reimbursed ? 'var(--action)' : '#f59e0b',
          }}
          title={exp.reimbursed ? 'انقر لإلغاء الاسترداد' : 'انقر لتسجيل الاسترداد'}
        >
          {exp.reimbursed ? '✓ مسترجع' : '⏳ غير مسترجع'}
        </button>
      )}

      {/* Amount */}
      <span style={{ fontWeight:800, color:'var(--danger)', fontSize:15, fontFamily:'Inter,sans-serif', minWidth:70, textAlign:'left', flexShrink:0 }}>
        {formatCurrency(exp.amount)}
      </span>

      {/* Actions */}
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <Btn variant="ghost"  size="sm" onClick={onEdit}  ><IcEdit   size={13}/></Btn>
        <Btn variant="danger" size="sm" onClick={onDelete}><IcDelete size={13}/></Btn>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   EXPENSE FORM
═══════════════════════════════════════════ */
function ExpenseForm({ open, onClose, item, onSaved }) {
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    setForm(item ? { ...item } : {
      title:          '',
      amount:         '',
      category:       EXPENSE_CATEGORIES[0],
      paid_by:        'company',
      date:           new Date().toISOString().split('T')[0],
      reimbursed:     false,
      is_subscription: false,
      notes:          '',
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
      const saved = item
        ? await DB.update('expenses', item.id, payload)
        : await DB.insert('expenses', payload)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={item ? 'تعديل المصروف' : 'مصروف جديد'}
      width={460}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>{item ? 'حفظ التعديلات' : 'إضافة المصروف'}</Btn>
      </>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Input
          label="الوصف *"
          value={form.title || form.description || ''}
          onChange={e => set('title', e.target.value)}
          placeholder="وصف المصروف"
        />
        <Input label="المبلغ (د.إ) *" type="number" min="0" value={form.amount || ''} onChange={e => set('amount', e.target.value)}/>
        <Select label="الفئة" value={form.category || ''} onChange={e => set('category', e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label="دفع بواسطة" value={form.paid_by || 'company'} onChange={e => set('paid_by', e.target.value)}>
          {PAID_BY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={e => set('date', e.target.value)}/>

        {/* Reimbursed — only shown for personal payments */}
        {form.paid_by && form.paid_by !== 'company' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-hover)', borderRadius:'var(--r-md)' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>تم الاسترداد</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>هل تم إرجاع المبلغ للشخص؟</div>
            </div>
            <button
              onClick={() => set('reimbursed', !form.reimbursed)}
              style={{
                width:44, height:24, borderRadius:999, border:'none', cursor:'pointer',
                background: form.reimbursed ? 'var(--action)' : 'var(--border)',
                position:'relative', transition:'background 200ms',
              }}
            >
              <span style={{
                position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff',
                transition:'all 200ms', right: form.reimbursed ? 3 : 'auto', left: form.reimbursed ? 'auto' : 3,
              }}/>
            </button>
          </div>
        )}

        {/* Subscription toggle */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-hover)', borderRadius:'var(--r-md)' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>اشتراك شهري متكرر</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>مثال: Canva، Shopify، TikTok Ads...</div>
          </div>
          <button
            onClick={() => set('is_subscription', !form.is_subscription)}
            style={{
              width:44, height:24, borderRadius:999, border:'none', cursor:'pointer',
              background: form.is_subscription ? 'var(--action)' : 'var(--border)',
              position:'relative', transition:'background 200ms',
            }}
          >
            <span style={{
              position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff',
              transition:'all 200ms', right: form.is_subscription ? 3 : 'auto', left: form.is_subscription ? 'auto' : 3,
            }}/>
          </button>
        </div>

        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="أي تفاصيل إضافية..."/>
      </div>
    </Modal>
  )
}
