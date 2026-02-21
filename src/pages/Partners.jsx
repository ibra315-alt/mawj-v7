import React, { useState, useEffect } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, StatCard, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit } from '../components/Icons'

export default function Partners() {
  const [partners, setPartners] = useState([])
  const [capital, setCapital] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('capital')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteTable, setDeleteTable] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [partnerList, cap, with_] = await Promise.all([
        Settings.get('partners'),
        DB.list('capital_entries', { orderBy: 'date' }),
        DB.list('withdrawals', { orderBy: 'date' }),
      ])
      setPartners(partnerList || [])
      setCapital(cap.reverse())
      setWithdrawals(with_.reverse())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete(deleteTable, deleteId)
      if (deleteTable === 'capital_entries') setCapital(prev => prev.filter(c => c.id !== deleteId))
      else setWithdrawals(prev => prev.filter(w => w.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  const totalCapital = capital.reduce((s, c) => s + (c.type === 'deposit' ? c.amount : -c.amount), 0)
  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <PageHeader title="الشركاء" subtitle="رأس المال والمسحوبات" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" onClick={() => { setFormType('withdrawal'); setShowForm(true) }}>+ مسحوبات</Btn>
          <Btn onClick={() => { setFormType('capital'); setShowForm(true) }}><IcPlus size={15} /> رأس مال</Btn>
        </div>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي رأس المال" value={formatCurrency(totalCapital)} color="var(--teal)" />
        <StatCard label="إجمالي المسحوبات" value={formatCurrency(totalWithdrawals)} color="var(--red)" />
        <StatCard label="عدد الشركاء" value={partners.length} color="var(--violet)" />
      </div>

      {/* Partners summary */}
      {partners.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          {partners.map(name => {
            const partnerCap = capital.filter(c => c.partner_name === name).reduce((s, c) => s + (c.type === 'deposit' ? c.amount : -c.amount), 0)
            const partnerWith = withdrawals.filter(w => w.partner_name === name).reduce((s, w) => s + w.amount, 0)
            return (
              <Card key={name} style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--violet), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff' }}>
                    {name[0]}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>رأس المال</span>
                  <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{formatCurrency(partnerCap)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>المسحوبات</span>
                  <span style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13 }}>{formatCurrency(partnerWith)}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Capital entries */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>قيود رأس المال</h2>
        {capital.length === 0 ? <Empty title="لا يوجد قيود" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {capital.map(c => (
              <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.partner_name}</div>
                  {c.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.notes}</div>}
                </div>
                <Badge color={c.type === 'deposit' ? 'var(--green)' : 'var(--red)'}>{c.type === 'deposit' ? 'إيداع' : 'سحب'}</Badge>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(c.date)}</span>
                <span style={{ fontWeight: 800, color: c.type === 'deposit' ? 'var(--green)' : 'var(--red)', fontSize: 14 }}>{formatCurrency(c.amount)}</span>
                <Btn variant="danger" size="sm" onClick={() => { setDeleteId(c.id); setDeleteTable('capital_entries') }}><IcDelete size={13}/></Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawals */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>المسحوبات والرواتب</h2>
        {withdrawals.length === 0 ? <Empty title="لا يوجد مسحوبات" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withdrawals.map(w => (
              <div key={w.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{w.partner_name}</div>
                  {w.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.notes}</div>}
                </div>
                <Badge color="var(--amber)">{w.type === 'salary' ? 'راتب' : w.type === 'dividend' ? 'أرباح' : 'شخصي'}</Badge>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(w.date)}</span>
                <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 14 }}>{formatCurrency(w.amount)}</span>
                <Btn variant="danger" size="sm" onClick={() => { setDeleteId(w.id); setDeleteTable('withdrawals') }}><IcDelete size={13}/></Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      <PartnerForm
        open={showForm}
        onClose={() => setShowForm(false)}
        type={formType}
        partners={partners}
        onSaved={item => {
          if (formType === 'capital') setCapital(prev => [item, ...prev])
          else setWithdrawals(prev => [item, ...prev])
          setShowForm(false)
          toast('تم الإضافة')
        }}
      />
      <ConfirmModal open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteTable(null) }} onConfirm={handleDelete} loading={deleting} message="سيتم حذف القيد نهائياً." />
    </div>
  )
}

function PartnerForm({ open, onClose, type, partners, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (open) setForm({ partner_name: partners[0] || '', date: new Date().toISOString().split('T')[0], type: type === 'capital' ? 'deposit' : 'salary', amount: '' })
  }, [open, type])

  async function handleSave() {
    if (!form.partner_name || !form.amount) { toast('أدخل البيانات المطلوبة', 'error'); return }
    setSaving(true)
    try {
      const table = type === 'capital' ? 'capital_entries' : 'withdrawals'
      const saved = await DB.insert(table, form)
      onSaved(saved)
    } catch { toast('فشل الحفظ', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={type === 'capital' ? 'قيد رأس مال' : 'قيد مسحوبات'} maxWidth={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="الشريك" value={form.partner_name || ''} onChange={e => setField('partner_name', e.target.value)}>
          {partners.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
        {type === 'capital' ? (
          <Select label="النوع" value={form.type || 'deposit'} onChange={e => setField('type', e.target.value)}>
            <option value="deposit">إيداع</option>
            <option value="withdrawal">سحب</option>
          </Select>
        ) : (
          <Select label="النوع" value={form.type || 'salary'} onChange={e => setField('type', e.target.value)}>
            <option value="salary">راتب</option>
            <option value="personal">شخصي</option>
            <option value="dividend">أرباح</option>
          </Select>
        )}
        <Input label="المبلغ (د.إ)" type="number" value={form.amount || ''} onChange={e => setField('amount', e.target.value)} />
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
