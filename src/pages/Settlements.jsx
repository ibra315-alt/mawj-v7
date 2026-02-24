import React, { useState, useEffect } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, StatCard, Badge, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit } from '../components/Icons'

export default function Settlements() {
  const [settlements, setSettlements] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [data, partnerList] = await Promise.all([
        DB.list('settlements', { orderBy: 'date' }),
        Settings.get('partners'),
      ])
      setSettlements(data.reverse())
      setPartners(partnerList || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete('settlements', deleteId)
      setSettlements(prev => prev.filter(s => s.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  const totalIncome = settlements.filter(s => s.type === 'income').reduce((s, i) => s + i.amount, 0)
  const totalExpense = settlements.filter(s => s.type === 'expense').reduce((s, i) => s + i.amount, 0)
  const net = totalIncome - totalExpense

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <PageHeader
        title="التسويات"
        subtitle={`${settlements.length} قيد`}
        actions={<Btn onClick={() => { setEditItem(null); setShowForm(true) }}><IcPlus size={15} /> قيد جديد</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي الدخل" value={formatCurrency(totalIncome)} color="var(--green)" />
        <StatCard label="إجمالي الصرف" value={formatCurrency(totalExpense)} color="var(--red)" />
        <StatCard label="الصافي" value={formatCurrency(net)} color={net >= 0 ? 'var(--teal)' : 'var(--red)'} />
      </div>

      {settlements.length === 0 ? <Empty title="لا يوجد تسويات" action={<Btn onClick={() => setShowForm(true)}><IcPlus size={14}/> أضف قيد</Btn>} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {settlements.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-surface)', border: 'none', borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.partner_name}</div>
                {s.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.notes}</div>}
              </div>
              <Badge color={s.type === 'income' ? 'var(--green)' : 'var(--red)'}>{s.type === 'income' ? 'دخل' : 'صرف'}</Badge>
              {s.category && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.category}</span>}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(s.date)}</span>
              <span style={{ fontWeight: 800, color: s.type === 'income' ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>{s.type === 'income' ? '+' : '-'}{formatCurrency(s.amount)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm" onClick={() => { setEditItem(s); setShowForm(true) }}><IcEdit size={14}/></Btn>
                <Btn variant="danger" size="sm" onClick={() => setDeleteId(s.id)}><IcDelete size={14}/></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <SettlementForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        partners={partners}
        onSaved={item => {
          if (editItem) setSettlements(prev => prev.map(s => s.id === item.id ? item : s))
          else setSettlements(prev => [item, ...prev])
          setShowForm(false)
          setEditItem(null)
          toast(editItem ? 'تم التحديث' : 'تم الإضافة')
        }}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} message="سيتم حذف القيد نهائياً." />
    </div>
  )
}

function SettlementForm({ open, onClose, item, partners, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (open) setForm(item ? { ...item } : { type: 'income', date: new Date().toISOString().split('T')[0], partner_name: partners[0] || '', amount: '' })
  }, [open, item])

  async function handleSave() {
    if (!form.partner_name || !form.amount) { toast('أدخل الشريك والمبلغ', 'error'); return }
    setSaving(true)
    try {
      let saved
      if (item) saved = await DB.update('settlements', item.id, form)
      else saved = await DB.insert('settlements', form)
      onSaved(saved)
    } catch { toast('فشل الحفظ', 'error') }
    finally { setSaving(false) }
  }

  const PARTNERS = ['إبراهيم', 'إحسان', 'حساب الشركة']
  return (
    <Modal open={open} onClose={onClose} title={item ? 'تعديل القيد' : 'قيد جديد'} width={440}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>{item ? 'حفظ التعديلات' : 'إضافة القيد'}</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="الشريك / المصدر" value={form.partner_name || ''} onChange={e => setField('partner_name', e.target.value)}>
          {PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
          <option value="أخرى">أخرى</option>
        </Select>
        <Select label="النوع" value={form.type || 'income'} onChange={e => setField('type', e.target.value)}>
          <option value="income">دخل</option>
          <option value="expense">صرف</option>
        </Select>
        <Input label="المبلغ (د.إ)" type="number" value={form.amount || ''} onChange={e => setField('amount', e.target.value)} />
        <Input label="الفئة / السبب" value={form.category || ''} onChange={e => setField('category', e.target.value)} placeholder="مثال: مبيعات، راتب، مسحوبات..." />
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)} />
        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} />
      </div>
    </Modal>
  )
}
