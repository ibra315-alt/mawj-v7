import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, StatCard, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit } from '../components/Icons'

// Who paid — fixed 3 options
const PAID_BY_OPTIONS = ['إبراهيم', 'إحسان', 'حساب الشركة']

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCat, setFilterCat]   = useState('all')
  const [filterPaid, setFilterPaid] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await DB.list('expenses', { orderBy:'date' })
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
    } catch { toast('فشل الحذف','error') }
    finally { setDeleting(false) }
  }

  const allFiltered = expenses.filter(e => {
    const matchCat  = filterCat  === 'all' || e.category === filterCat
    const matchPaid = filterPaid === 'all' || e.paid_by  === filterPaid
    return matchCat && matchPaid
  })

  const total      = allFiltered.reduce((s,e) => s+(e.amount||0), 0)
  const thisMonth  = expenses.filter(e => {
    const d=new Date(e.date), n=new Date()
    return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear()
  }).reduce((s,e)=>s+e.amount,0)

  // Per-person totals
  const byPerson = PAID_BY_OPTIONS.map(p => ({
    name: p,
    total: expenses.filter(e => e.paid_by === p).reduce((s,e)=>s+e.amount,0),
  }))

  const byCat = EXPENSE_CATEGORIES.map(c => ({
    cat:c, total:expenses.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0)
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh' }}><Spinner size={36}/></div>

  return (
    <div className="page">
      <PageHeader
        title="المصاريف"
        subtitle={`${expenses.length} قيد`}
        actions={<Btn onClick={() => { setEditItem(null); setShowForm(true) }}><IcPlus size={15}/> مصروف جديد</Btn>}
      />

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))', gap:12, marginBottom:24 }}>
        <StatCard label="إجمالي المصاريف"    value={formatCurrency(total)}     color="var(--red)" />
        <StatCard label="مصاريف هذا الشهر"  value={formatCurrency(thisMonth)} color="var(--amber)" />
        <StatCard label="عدد القيود"          value={expenses.length}           color="var(--blue)" />
      </div>

      {/* Per-person breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {byPerson.map(({ name, total:t }) => (
          <div key={name}
            onClick={() => setFilterPaid(filterPaid===name?'all':name)}
            style={{
              background: filterPaid===name ? 'rgba(0,228,184,0.06)' : 'var(--bg-hover)',
              border: `1.5px solid ${filterPaid===name?'rgba(0,228,184,0.3)':'var(--border)'}`,
              borderRadius:'var(--r-lg)', padding:'14px 16px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', transition:'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontWeight:700, fontSize:13, color: filterPaid===name?'var(--teal)':'var(--text)' }}>{name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {expenses.filter(e=>e.paid_by===name).length} قيد
              </div>
            </div>
            <div style={{ fontWeight:800, fontSize:15, color:'var(--red)' }}>{formatCurrency(t)}</div>
          </div>
        ))}
      </div>

      {/* Category bar chart */}
      {byCat.length > 0 && (
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>توزيع المصاريف بالفئة</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {byCat.map(({ cat, total:ct }) => (
              <div key={cat}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
                  <span>{cat}</span>
                  <span style={{ color:'var(--text-sec)', fontWeight:600 }}>{formatCurrency(ct)}</span>
                </div>
                <div style={{ height:5, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width:`${Math.min(100,(ct/total)*100)}%`, height:'100%', background:'linear-gradient(90deg,var(--red),#ff6b7a)', borderRadius:99, transition:'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{ padding:'8px 14px', background:'var(--bg-surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius-pill)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
          <option value="all">كل الفئات</option>
          {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)}
          style={{ padding:'8px 14px', background:'var(--bg-surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius-pill)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
          <option value="all">الكل</option>
          {PAID_BY_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* List */}
      {allFiltered.length === 0
        ? <Empty title="لا يوجد مصاريف" action={<Btn onClick={()=>setShowForm(true)}><IcPlus size={14}/> أضف مصروف</Btn>}/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {allFiltered.map(exp => (
              <div key={exp.id} style={{ background:'var(--bg-hover)', border:'1.5px solid var(--border)', borderRadius:'var(--r-lg)', padding:'13px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:130 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{exp.title}</div>
                  {exp.notes && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{exp.notes}</div>}
                </div>
                <Badge color="var(--amber)" style={{ fontSize:11 }}>{exp.category}</Badge>
                {exp.paid_by && (
                  <span style={{
                    padding:'3px 10px', borderRadius:'var(--radius-pill)', fontSize:11, fontWeight:700,
                    background: exp.paid_by==='حساب الشركة'?'rgba(59,130,246,0.12)':'rgba(139,92,246,0.12)',
                    color: exp.paid_by==='حساب الشركة'?'var(--blue)':'var(--violet)',
                    border:`1px solid ${exp.paid_by==='حساب الشركة'?'rgba(59,130,246,0.28)':'rgba(139,92,246,0.28)'}`,
                  }}>
                    {exp.paid_by}
                  </span>
                )}
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{formatDate(exp.date)}</span>
                <span style={{ fontWeight:800, color:'var(--red)', fontSize:15, minWidth:70, textAlign:'left' }}>{formatCurrency(exp.amount)}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <Btn variant="ghost" size="sm" onClick={() => { setEditItem(exp); setShowForm(true) }}><IcEdit size={14}/></Btn>
                  <Btn variant="danger" size="sm" onClick={() => setDeleteId(exp.id)}><IcDelete size={14}/></Btn>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <ExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        onSaved={item => {
          if (editItem) setExpenses(p => p.map(e=>e.id===item.id?item:e))
          else setExpenses(p => [item,...p])
          setShowForm(false); setEditItem(null)
          toast(editItem ? 'تم التحديث' : 'تم الإضافة')
        }}
      />
      <ConfirmModal open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete} loading={deleting} message="سيتم حذف المصروف نهائياً." />
    </div>
  )
}

function ExpenseForm({ open, onClose, item, onSaved }) {
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  useEffect(() => {
    if (open) setForm(item ? {...item} : {
      category: EXPENSE_CATEGORIES[0],
      paid_by: PAID_BY_OPTIONS[0],
      date: new Date().toISOString().split('T')[0],
      amount: '',
    })
  }, [open, item])

  async function handleSave() {
    if (!form.title || !form.amount) { toast('أدخل العنوان والمبلغ','error'); return }
    setSaving(true)
    try {
      let saved
      if (item) saved = await DB.update('expenses', item.id, form)
      else       saved = await DB.insert('expenses', form)
      onSaved(saved)
    } catch { toast('فشل الحفظ','error') }
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
        <Input label="العنوان *" value={form.title||''} onChange={e=>set('title',e.target.value)} placeholder="وصف المصروف" />
        <Input label="المبلغ (د.إ) *" type="number" value={form.amount||''} onChange={e=>set('amount',e.target.value)} />
        <Select label="الفئة" value={form.category||''} onChange={e=>set('category',e.target.value)}>
          {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label="دفع بواسطة" value={form.paid_by||PAID_BY_OPTIONS[0]} onChange={e=>set('paid_by',e.target.value)}>
          {PAID_BY_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}
        </Select>
        <Input label="التاريخ" type="date" value={form.date||''} onChange={e=>set('date',e.target.value)} />
        <Textarea label="ملاحظات" value={form.notes||''} onChange={e=>set('notes',e.target.value)} />
      </div>
    </Modal>
  )
}
