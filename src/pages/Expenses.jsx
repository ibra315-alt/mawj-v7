import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, StatCard, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit, IcExpenses } from '../components/Icons'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCat, setFilterCat] = useState('all')

  useEffect(() => { loadExpenses() }, [])

  async function loadExpenses() {
    try {
      const data = await DB.list('expenses', { orderBy: 'date' })
      setExpenses(data.reverse())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete('expenses', deleteId)
      setExpenses(prev => prev.filter(e => e.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  const filtered = expenses.filter(e => filterCat === 'all' || e.category === filterCat)
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0)
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).reduce((s, e) => s + e.amount, 0)

  const byCat = EXPENSE_CATEGORIES.map(c => ({
    cat: c,
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <PageHeader
        title="المصاريف"
        subtitle={`${expenses.length} قيد`}
        actions={<Btn onClick={() => { setEditItem(null); setShowForm(true) }}><IcPlus size={15} /> مصروف جديد</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي المصاريف" value={formatCurrency(total)} color="var(--red)" />
        <StatCard label="مصاريف هذا الشهر" value={formatCurrency(thisMonth)} color="var(--amber)" />
        <StatCard label="عدد القيود" value={expenses.length} color="var(--blue)" />
      </div>

      {/* Category breakdown */}
      {byCat.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>توزيع المصاريف</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byCat.map(({ cat, total: catTotal }) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>{cat}</span>
                  <span style={{ color: 'var(--text-sec)' }}>{formatCurrency(catTotal)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-border)', borderRadius: 99 }}>
                  <div style={{ width: `${Math.min(100, (catTotal / total) * 100)}%`, height: '100%', background: 'var(--red)', borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer' }}>
          <option value="all">كل الفئات</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <Empty title="لا يوجد مصاريف" action={<Btn onClick={() => setShowForm(true)}><IcPlus size={14}/> أضف مصروف</Btn>} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(exp => (
            <div key={exp.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{exp.title}</div>
                {exp.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{exp.notes}</div>}
              </div>
              <Badge color="var(--amber)" style={{ fontSize: 11 }}>{exp.category}</Badge>
              {exp.paid_by && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.paid_by}</span>}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(exp.date)}</span>
              <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 15 }}>{formatCurrency(exp.amount)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm" onClick={() => { setEditItem(exp); setShowForm(true) }}><IcEdit size={14}/></Btn>
                <Btn variant="danger" size="sm" onClick={() => setDeleteId(exp.id)}><IcDelete size={14}/></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <ExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        onSaved={item => {
          if (editItem) setExpenses(prev => prev.map(e => e.id === item.id ? item : e))
          else setExpenses(prev => [item, ...prev])
          setShowForm(false)
          setEditItem(null)
          toast(editItem ? 'تم التحديث' : 'تم الإضافة')
        }}
      />

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} message="سيتم حذف المصروف نهائياً." />
    </div>
  )
}

function ExpenseForm({ open, onClose, item, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : { category: 'أخرى', date: new Date().toISOString().split('T')[0], amount: '' })
    }
  }, [open, item])

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.title || !form.amount) { toast('أدخل العنوان والمبلغ', 'error'); return }
    setSaving(true)
    try {
      let saved
      if (item) saved = await DB.update('expenses', item.id, form)
      else saved = await DB.insert('expenses', form)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'تعديل المصروف' : 'مصروف جديد'} maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="العنوان *" value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="وصف المصروف" />
        <Input label="المبلغ (د.إ) *" type="number" value={form.amount || ''} onChange={e => setField('amount', e.target.value)} />
        <Select label="الفئة" value={form.category || 'أخرى'} onChange={e => setField('category', e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="دفع بواسطة" value={form.paid_by || ''} onChange={e => setField('paid_by', e.target.value)} placeholder="اسم الشخص" />
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)} />
        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn loading={saving} onClick={handleSave}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  )
}
