// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcDelete, IcEdit, IcPhone, IcWhatsapp } from '../components/Icons'
import type { PageProps } from '../types'

export default function Suppliers(_: PageProps) {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [purchases, setPurchases] = useState({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [sups, purs] = await Promise.all([
        DB.list('suppliers', { orderBy: 'name', asc: true }),
        DB.list('supplier_purchases', { orderBy: 'date' }),
      ])
      setSuppliers(sups.filter(s => s.active))
      const purMap = {}
      purs.forEach(p => {
        if (!purMap[p.supplier_id]) purMap[p.supplier_id] = []
        purMap[p.supplier_id].push(p)
      })
      setPurchases(purMap)
    } catch (err) { console.error(err); toast('خطأ في تحميل الموردين', 'error') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.update('suppliers', deleteId, { active: false })
      setSuppliers(prev => prev.filter(s => s.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="page" style={{ paddingBottom:140 }}>
      <SkeletonStats count={2} />
      <SkeletonCard rows={3} />
      <div style={{ marginTop:16 }}><SkeletonCard rows={3} /></div>
    </div>
  )

  return (
    <div className="page">
      <PageHeader
        title="الموردون"
        subtitle={`${suppliers.length} مورد`}
        actions={<Btn onClick={() => { setEditItem(null); setShowForm(true) }}><IcPlus size={15} /> مورد جديد</Btn>}
      />

      {suppliers.length === 0 ? <Empty title="لا يوجد موردون" action={<Btn onClick={() => setShowForm(true)}><IcPlus size={14}/> أضف مورد</Btn>} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {suppliers.map(sup => {
            const supPurchases = purchases[sup.id] || []
            const totalPurchases = supPurchases.reduce((s, p) => s + p.total, 0)
            return (
              <Card key={sup.id} hover glow="var(--violet)">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{sup.name}</div>
                    {sup.city && <Badge color="var(--violet)" style={{ fontSize: 10 }}>{sup.city}{sup.country ? ` — ${sup.country}` : ''}</Badge>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ghost" size="sm" onClick={() => { setEditItem(sup); setShowForm(true) }}><IcEdit size={13}/></Btn>
                    <Btn variant="danger" size="sm" onClick={() => setDeleteId(sup.id)}><IcDelete size={13}/></Btn>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--violet)' }}>{supPurchases.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>مشتريات</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>{formatCurrency(totalPurchases)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>إجمالي</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sup.phone && (
                    <>
                      <a href={`tel:${sup.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'var(--bg-surface)', border: 'none', borderRadius: 6, color: 'var(--text-sec)', fontSize: 12 }}>
                        <IcPhone size={12} /> {sup.phone}
                      </a>
                      <a href={`https://wa.me/${sup.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 6, color: 'var(--whatsapp)', fontSize: 12 }}>
                        <IcWhatsapp size={12} />
                      </a>
                    </>
                  )}
                </div>

                {sup.notes && (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 6, fontSize: 12, color: 'var(--text-sec)' }}>
                    {sup.notes}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <SupplierForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        onSaved={item => {
          if (editItem) setSuppliers(prev => prev.map(s => s.id === item.id ? item : s))
          else setSuppliers(prev => [...prev, item])
          setShowForm(false)
          setEditItem(null)
          toast(editItem ? 'تم التحديث' : 'تم الإضافة')
        }}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} message="سيتم حذف المورد نهائياً." itemName={suppliers.find(s => s.id === deleteId)?.name} />
    </div>
  )
}

function SupplierForm({ open, onClose, item, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (open) setForm(item ? { ...item } : { country: 'UAE', active: true })
  }, [open, item])

  async function handleSave() {
    if (!form.name) { toast('أدخل اسم المورد', 'error'); return }
    setSaving(true)
    try {
      let saved
      if (item) saved = await DB.update('suppliers', item.id, form)
      else saved = await DB.insert('suppliers', form)
      onSaved(saved)
    } catch { toast('فشل الحفظ', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'تعديل المورد' : 'مورد جديد'} width={440}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>{item ? 'حفظ التعديلات' : 'إضافة المورد'}</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="اسم المورد *" value={form.name || ''} onChange={e => setField('name', e.target.value)} />
        <Input label="رقم الهاتف" value={form.phone || ''} onChange={e => setField('phone', e.target.value)} dir="ltr" />
        <Input label="البريد الإلكتروني" type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} dir="ltr" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
          <Input label="المدينة" value={form.city || ''} onChange={e => setField('city', e.target.value)} />
          <Input label="الدولة" value={form.country || ''} onChange={e => setField('country', e.target.value)} />
        </div>
        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} />
      </div>
    </Modal>
  )
}
