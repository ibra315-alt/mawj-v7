import React, { useState, useEffect } from 'react'
import { DB, Settings, generateOrderNumber, subscribeToOrders } from '../data/db'
import { formatCurrency, formatDate, SOURCE_LABELS, UAE_CITIES } from '../data/constants'
import { Btn, Badge, Modal, Input, Select, Textarea, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcSearch, IcEdit, IcDelete, IcEye, IcWhatsapp, IcSave, IcNote, IcRefresh } from '../components/Icons'
import PrintReceipt from '../components/PrintReceipt'
import Confetti from '../components/Confetti'

/* ═══════════════════════════════════════════════════════════
   PROFIT ENGINE — single source of truth for all calculations
   Rule: customer NEVER pays delivery. Mawj absorbs hayyak fee.
   gross_profit = revenue − product_cost − hayyak_fee
════════════════════════════════════════════════════════════ */
export function calcOrderProfit({ items = [], hayyak_fee = 25, discount = 0, is_replacement = false, is_not_delivered = false }) {
  const subtotal     = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0)
  const product_cost = items.reduce((s, i) => s + (parseFloat(i.cost)  || 0) * (parseInt(i.qty) || 1), 0)
  const fee          = parseFloat(hayyak_fee) || 0
  const disc         = parseFloat(discount)   || 0

  if (is_replacement || is_not_delivered) {
    // Customer pays 0 — we lose product cost + hayyak fee already paid
    return { subtotal: 0, product_cost, hayyak_fee: fee, total: 0, gross_profit: -(product_cost + fee) }
  }
  const total        = subtotal - disc
  const gross_profit = total - product_cost - fee
  return { subtotal, product_cost, hayyak_fee: fee, total, gross_profit }
}

/* ═══════════════════════════════════════════
   STATUS DEFINITIONS
═══════════════════════════════════════════ */
export const ORDER_STATUSES = [
  { id: 'new',           label: 'جديد',        color: '#7c3aed', emoji: '🆕' },
  { id: 'ready',         label: 'جاهز',        color: '#f59e0b', emoji: '✅' },
  { id: 'with_hayyak',   label: 'مع حياك',     color: '#3b82f6', emoji: '🚚' },
  { id: 'delivered',     label: 'تم التسليم',  color: '#10b981', emoji: '📦' },
  { id: 'not_delivered', label: 'لم يتم',      color: '#ef4444', emoji: '↩️' },
  { id: 'cancelled',     label: 'ملغي',        color: '#6b7280', emoji: '❌' },
]

function getStatus(id) {
  return ORDER_STATUSES.find(s => s.id === id) || { label: id || '—', color: '#6b7280', emoji: '•' }
}

/* ═══════════════════════════════════════════
   MAIN ORDERS PAGE
═══════════════════════════════════════════ */
export default function Orders({ user }) {
  const [orders,         setOrders]         = useState([])
  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [showForm,       setShowForm]       = useState(false)
  const [showView,       setShowView]       = useState(false)
  const [editOrder,      setEditOrder]      = useState(null)
  const [viewOrder,      setViewOrder]      = useState(null)
  const [deleteId,       setDeleteId]       = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const [confetti,       setConfetti]       = useState(false)
  const [quickStatusId,  setQuickStatusId]  = useState(null)
  const [replacementFor, setReplacementFor] = useState(null)

  useEffect(() => {
    loadAll()
    const unsub = subscribeToOrders(() => loadOrders())
    return unsub
  }, [])

  async function loadAll() {
    try {
      const [ords, prods] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at' }),
        Settings.get('products'),
      ])
      setOrders(ords.reverse())
      setProducts((prods || []).filter(p => p.active))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadOrders() {
    try {
      const ords = await DB.list('orders', { orderBy: 'created_at' })
      setOrders(ords.reverse())
    } catch {}
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const order = orders.find(o => o.id === id)
      let profitUpdate = {}

      if (order && newStatus === 'not_delivered') {
        const calc = calcOrderProfit({ items: order.items || [], hayyak_fee: order.hayyak_fee ?? 25, is_not_delivered: true })
        profitUpdate = { total: calc.total, gross_profit: calc.gross_profit, product_cost: calc.product_cost }
      } else if (order && newStatus === 'cancelled') {
        profitUpdate = { total: 0, gross_profit: 0 }
      }

      const payload = {
        status: newStatus,
        ...(newStatus === 'delivered' ? { delivery_date: new Date().toISOString().split('T')[0] } : {}),
        ...profitUpdate,
        internal_notes: [
          ...(order?.internal_notes || []),
          { text: `تم تغيير الحالة إلى ${getStatus(newStatus).label}`, time: new Date().toISOString() },
        ],
      }
      await DB.update('orders', id, payload)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload } : o))
      if (viewOrder?.id === id) setViewOrder(prev => ({ ...prev, ...payload }))

      if (newStatus === 'delivered') {
        setConfetti(true); setTimeout(() => setConfetti(false), 4000)
        toast('تم التسليم! 🎉')
      } else if (newStatus === 'not_delivered') {
        toast('تم تسجيل عدم التسليم — خسارة محتسبة', 'error')
      }
    } catch { toast('فشل تحديث الحالة', 'error') }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await DB.delete('orders', deleteId)
      setOrders(prev => prev.filter(o => o.id !== deleteId))
      setDeleteId(null)
      toast('تم حذف الطلب')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (o.customer_name  || '').includes(q)
      || (o.order_number   || '').toLowerCase().includes(q)
      || (o.customer_phone || '').includes(q)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  // Summary stats
  const totalProfit  = orders.reduce((s, o) => s + (o.gross_profit || 0), 0)
  const delivered    = orders.filter(o => o.status === 'delivered').length
  const inProgress   = orders.filter(o => ['new','ready','with_hayyak'].includes(o.status)).length

  if (loading) return (
    <div className="page">
      <PageHeader title="الطلبات" subtitle="جاري التحميل..." />
      <SkeletonStats count={4} />
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
        {[1,2,3,4,5].map(i => <SkeletonCard key={i} rows={2} />)}
      </div>
    </div>
  )

  return (
    <div className="page">
      <Confetti active={confetti} />

      <PageHeader
        title="الطلبات"
        subtitle={`${orders.length} طلب • ${filtered.length} معروض`}
        actions={
          <Btn onClick={() => { setEditOrder(null); setReplacementFor(null); setShowForm(true) }} style={{ gap:6 }}>
            <IcPlus size={16}/> طلب جديد
          </Btn>
        }
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'إجمالي',        value: orders.length,  color:'var(--text-muted)' },
          { label:'قيد التنفيذ',   value: inProgress,     color:'var(--info-light)' },
          { label:'تم التسليم',    value: delivered,      color:'var(--action)' },
          { label:'صافي الربح',    value: formatCurrency(totalProfit), color: totalProfit >= 0 ? 'var(--action)' : 'var(--danger)', small:true },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
            <div style={{ fontSize: s.small ? 10 : 18, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.2 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {[{ id:'all', label:'الكل', color:'var(--text-sec)' }, ...ORDER_STATUSES].map(chip => {
          const active = filterStatus === chip.id
          const count  = chip.id === 'all' ? orders.length : orders.filter(o => o.status === chip.id).length
          return (
            <button key={chip.id} onClick={() => setFilterStatus(chip.id)} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', flexShrink:0, borderRadius:'var(--r-pill)', border:'none',
              background: active ? 'var(--action-soft)' : 'var(--bg-surface)',
              color: active ? 'var(--action)' : 'var(--text-muted)',
              fontWeight: active ? 700 : 500, fontSize:12, cursor:'pointer',
              fontFamily:'inherit', boxShadow: active ? 'none' : 'var(--card-shadow)',
              transition:'all 120ms ease',
            }}>
              {!active && <span style={{ width:6, height:6, borderRadius:'50%', background:chip.color || '#6b7280', flexShrink:0 }}/>}
              {chip.label}
              <span style={{ padding:'1px 5px', borderRadius:999, fontSize:10, fontWeight:700, background: active ? 'rgba(0,228,184,0.15)' : 'var(--bg-hover)', color: active ? 'var(--action)' : 'var(--text-muted)' }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:14 }}>
        <IcSearch size={15} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو رقم الطلب أو الهاتف..."
          style={{ width:'100%', padding:'10px 34px 10px 12px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', boxShadow:'var(--card-shadow)' }}
        />
      </div>

      {/* Order list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.length === 0
          ? <Empty title="لا توجد طلبات" action={<Btn onClick={() => setShowForm(true)}><IcPlus size={14}/> طلب جديد</Btn>}/>
          : filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onView={() => { setViewOrder(order); setShowView(true) }}
              onEdit={() => { setEditOrder(order); setShowForm(true) }}
              onDelete={() => setDeleteId(order.id)}
              onStatusTap={() => setQuickStatusId(order.id)}
            />
          ))
        }
      </div>

      {/* Quick status picker */}
      {quickStatusId && (
        <QuickStatusPicker
          orderId={quickStatusId}
          currentStatus={orders.find(o => o.id === quickStatusId)?.status}
          onSelect={async (id, s) => { await handleStatusChange(id, s); setQuickStatusId(null) }}
          onClose={() => setQuickStatusId(null)}
          onReplacement={orderId => {
            setReplacementFor(orders.find(o => o.id === orderId))
            setEditOrder(null); setQuickStatusId(null); setShowForm(true)
          }}
        />
      )}

      {/* Order form */}
      <OrderForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditOrder(null); setReplacementFor(null) }}
        order={editOrder}
        replacementFor={replacementFor}
        products={products}
        user={user}
        onSaved={saved => {
          setOrders(prev => editOrder
            ? prev.map(o => o.id === saved.id ? saved : o)
            : [saved, ...prev]
          )
          setShowForm(false); setEditOrder(null); setReplacementFor(null)
          toast(editOrder ? 'تم تحديث الطلب ✓' : 'تم إضافة الطلب ✓')
        }}
      />

      {/* View modal */}
      <OrderViewModal
        open={showView}
        onClose={() => { setShowView(false); setViewOrder(null) }}
        order={viewOrder}
        onEdit={() => { setEditOrder(viewOrder); setShowView(false); setShowForm(true) }}
        onStatusChange={handleStatusChange}
        onReplacement={orig => { setReplacementFor(orig); setEditOrder(null); setShowView(false); setShowForm(true) }}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} loading={deleting}
        message="سيتم حذف الطلب نهائياً ولا يمكن استعادته."
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   ORDER CARD
═══════════════════════════════════════════ */
function OrderCard({ order, onView, onEdit, onDelete, onStatusTap }) {
  const status  = getStatus(order.status)
  const profit  = order.gross_profit ?? 0
  const isRepl  = order.is_replacement

  return (
    <div
      style={{
        background:'var(--bg-surface)', borderRadius:'var(--r-md)',
        borderRight:`3px solid ${isRepl ? '#f59e0b' : status.color}`,
        boxShadow:'var(--card-shadow)', overflow:'hidden', cursor:'pointer',
        transition:'box-shadow 120ms, transform 120ms',
        opacity: order.status === 'cancelled' ? 0.6 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--card-shadow-hover)'; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--card-shadow)'; e.currentTarget.style.transform='translateY(0)' }}
      onClick={onView}
    >
      <div style={{ padding:'12px 14px' }}>
        {/* Row 1: name + total */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
          <span style={{ fontWeight:800, fontSize:15, color: profit < 0 ? 'var(--danger)' : 'var(--action)', fontFamily:'Inter,sans-serif' }}>
            {formatCurrency(order.total || 0)}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {isRepl && <span style={{ fontSize:10, background:'rgba(245,158,11,0.15)', color:'#f59e0b', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>استبدال</span>}
            <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {order.customer_name || 'عميل'}
            </span>
          </div>
        </div>

        {/* Row 2: order number + status badge */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
          <span
            onClick={e => { e.stopPropagation(); onStatusTap() }}
            style={{ padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700, background:`${status.color}18`, color:status.color, cursor:'pointer' }}
          >
            {status.emoji} {status.label}
          </span>
          <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'Inter,monospace', fontWeight:600, direction:'ltr' }}>
            {order.order_number}
          </span>
        </div>

        {/* Row 3: phone + city + profit */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: order.items?.length ? 5 : 0 }}>
          <span style={{ fontSize:12, fontWeight:700, fontFamily:'Inter,sans-serif', color: profit >= 0 ? '#10b981' : 'var(--danger)' }}>
            {profit !== 0 ? `${profit > 0 ? '+' : ''}${formatCurrency(profit)}` : ''}
          </span>
          <div style={{ display:'flex', gap:8 }}>
            {order.customer_phone && <span style={{ fontSize:11, color:'var(--text-muted)', direction:'ltr' }}>{order.customer_phone}</span>}
            {order.customer_city  && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{order.customer_city}</span>}
          </div>
        </div>

        {/* Row 4: items */}
        {order.items?.length > 0 && (
          <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right', marginBottom:8 }}>
            {order.items.slice(0,3).map(i => `${i.name}${i.size ? ` (${i.size})` : ''} ×${i.qty}`).join(' · ')}
            {order.items.length > 3 && ` +${order.items.length-3}`}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:6, paddingTop:8, borderTop:'1px solid var(--border)', justifyContent:'flex-start' }} onClick={e => e.stopPropagation()}>
          <Btn variant="ghost"     size="sm" onClick={onView}  ><IcEye    size={13}/></Btn>
          <Btn variant="secondary" size="sm" onClick={onEdit}  ><IcEdit   size={13}/></Btn>
          <Btn variant="danger"    size="sm" onClick={onDelete}><IcDelete size={13}/></Btn>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ORDER FORM MODAL
═══════════════════════════════════════════ */
function OrderForm({ open, onClose, order, replacementFor, products, onSaved, user }) {
  const isEdit   = !!order
  const isRepl   = !!replacementFor && !order

  const [form,   setForm]   = useState({})
  const [items,  setItems]  = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (order) {
      setForm({
        customer_name:      order.customer_name     || '',
        customer_phone:     order.customer_phone    || '',
        customer_city:      order.customer_city     || '',
        customer_address:   order.customer_address  || '',
        hayyak_fee:         order.hayyak_fee        ?? 25,
        discount:           order.discount          || 0,
        status:             order.status            || 'new',
        source:             order.source            || 'instagram',
        notes:              order.notes             || '',
        order_date:         order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        is_replacement:     order.is_replacement    || false,
        replacement_for_id: order.replacement_for_id|| null,
      })
      setItems(order.items || [])
    } else if (isRepl) {
      setForm({
        customer_name:      replacementFor.customer_name    || '',
        customer_phone:     replacementFor.customer_phone   || '',
        customer_city:      replacementFor.customer_city    || '',
        customer_address:   replacementFor.customer_address || '',
        hayyak_fee:         25,
        discount:           0,
        status:             'with_hayyak',
        source:             replacementFor.source           || 'instagram',
        notes:              `استبدال للطلب ${replacementFor.order_number}`,
        order_date:         new Date().toISOString().split('T')[0],
        is_replacement:     true,
        replacement_for_id: replacementFor.id,
      })
      setItems((replacementFor.items || []).map(i => ({ ...i, engraving_notes:'' })))
    } else {
      setForm({
        customer_name:'', customer_phone:'', customer_city:'', customer_address:'',
        hayyak_fee:25, discount:0, status:'new', source:'instagram', notes:'',
        order_date: new Date().toISOString().split('T')[0],
        is_replacement:false, replacement_for_id:null,
      })
      setItems([])
    }
  }, [open, order, replacementFor])

  const setField = (k, v) => setForm(p => ({ ...p, [k]:v }))

  function addItem(product) {
    setItems(prev => {
      const key = `${product.id}__${product.size}`
      const existing = prev.find(i => `${i.id}__${i.size}` === key)
      if (existing) return prev.map(i => `${i.id}__${i.size}` === key ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id:product.id, name:product.name, size:product.size, price:product.price, cost:product.cost, qty:1, engraving_notes:'' }]
    })
  }
  function removeItem(idx) { setItems(p => p.filter((_,i) => i !== idx)) }
  function updateItem(idx, field, val) { setItems(p => p.map((it, i) => i === idx ? { ...it, [field]: val } : it)) }

  const calc = calcOrderProfit({
    items,
    hayyak_fee:     form.hayyak_fee,
    discount:       form.discount,
    is_replacement: form.is_replacement,
  })

  async function handleSave() {
    if (items.length === 0) { toast('أضف منتجاً واحداً على الأقل', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        customer_name:      form.customer_name,
        customer_phone:     form.customer_phone,
        customer_city:      form.customer_city,
        customer_address:   form.customer_address,
        status:             form.status,
        source:             form.source,
        notes:              form.notes,
        hayyak_fee:         calc.hayyak_fee,
        discount:           parseFloat(form.discount) || 0,
        items,
        subtotal:           calc.subtotal,
        product_cost:       calc.product_cost,
        total:              calc.total,
        gross_profit:       calc.gross_profit,
        is_replacement:     form.is_replacement || false,
        replacement_for_id: form.replacement_for_id || null,
        updated_at: new Date().toISOString(),
      }
      let saved
      if (isEdit) {
        saved = await DB.update('orders', order.id, payload)
      } else {
        const order_number = await generateOrderNumber()
        const created_at   = new Date(form.order_date || Date.now()).toISOString()
        saved = await DB.insert('orders', {
          ...payload, order_number, created_at, created_by: user?.id,
          internal_notes: [{ text: `تم إنشاء الطلب${form.is_replacement ? ' (استبدال)' : ''}`, time: new Date().toISOString() }],
        })
      }
      onSaved(saved)
    } catch (err) {
      toast('فشل الحفظ: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  const smallProds = products.filter(p => p.category === 'small')
  const largeProds = products.filter(p => p.category === 'large')

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'تعديل الطلب' : isRepl ? `استبدال — ${replacementFor?.order_number}` : 'طلب جديد'}
      width={700}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave} style={isRepl ? { background:'#f59e0b', color:'#000' } : {}}>
          <IcSave size={15}/> {isEdit ? 'حفظ التعديلات' : isRepl ? 'إرسال الاستبدال' : 'إضافة الطلب'}
        </Btn>
      </>}
    >
      {/* Replacement warning */}
      {isRepl && (
        <div style={{ marginBottom:16, padding:'10px 14px', background:'rgba(245,158,11,0.1)', border:'1.5px solid rgba(245,158,11,0.3)', borderRadius:'var(--r-md)', fontSize:13, color:'#f59e0b', fontWeight:700 }}>
          ⚠️ طلب استبدال مجاني — الربح سيكون سالباً (تكلفة + رسوم التوصيل)
        </div>
      )}

      {/* Customer info */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:16 }}>
        <Input label="اسم العميل"        value={form.customer_name    || ''} onChange={e => setField('customer_name',    e.target.value)} placeholder="اختياري"/>
        <Input label="رقم الهاتف"        value={form.customer_phone   || ''} onChange={e => setField('customer_phone',   e.target.value)} placeholder="+971..." dir="ltr"/>
        <Select label="الإمارة"           value={form.customer_city    || ''} onChange={e => setField('customer_city',    e.target.value)}>
          <option value="">اختر الإمارة</option>
          {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="العنوان التفصيلي"   value={form.customer_address || ''} onChange={e => setField('customer_address', e.target.value)} placeholder="الحي / الشارع..."/>
      </div>

      {/* Products picker */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:11, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>المنتجات</div>

        {smallProds.length > 0 && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, fontWeight:600 }}>صغير</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {smallProds.map(p => (
                <button key={p.id} onClick={() => addItem(p)} style={{ padding:'6px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text-sec)', fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 120ms' }}
                  onMouseEnter={e => { e.target.style.borderColor='var(--action)'; e.target.style.color='var(--action)' }}
                  onMouseLeave={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-sec)' }}
                >
                  + {p.name} <span style={{ fontSize:10, color:'var(--text-muted)' }}>{p.size}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {largeProds.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, fontWeight:600 }}>كبير</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {largeProds.map(p => (
                <button key={`${p.id}-${p.size}`} onClick={() => addItem(p)} style={{ padding:'6px 12px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text-sec)', fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 120ms' }}
                  onMouseEnter={e => { e.target.style.borderColor='var(--violet-light)'; e.target.style.color='var(--violet-light)' }}
                  onMouseLeave={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-sec)' }}
                >
                  + {p.name} <span style={{ fontSize:10, color:'var(--text-muted)' }}>{p.size}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        {items.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:'10px 12px', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.name}</span>
                    {item.size && <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:5 }}>({item.size})</span>}
                  </div>
                  {/* Editable price */}
                  <input
                    type="number" value={item.price}
                    onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                    style={{ width:65, padding:'4px 6px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, color:'var(--action)', fontSize:12, textAlign:'center', fontFamily:'Inter,sans-serif' }}
                  />
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>×</span>
                  <input
                    type="number" min="1" value={item.qty}
                    onChange={e => updateItem(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width:42, padding:'4px 6px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)', fontSize:13, textAlign:'center', fontFamily:'inherit' }}
                  />
                  <span style={{ fontWeight:700, color:'var(--action)', fontSize:13, minWidth:58, textAlign:'left', fontFamily:'Inter,sans-serif' }}>
                    {formatCurrency(item.price * item.qty)}
                  </span>
                  <button onClick={() => removeItem(idx)} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
                </div>
                {/* Engraving notes */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <IcNote size={12} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                  <input
                    value={item.engraving_notes || ''}
                    onChange={e => updateItem(idx, 'engraving_notes', e.target.value)}
                    placeholder="ملاحظات النقش — نص أو وصف الصورة..."
                    style={{ flex:1, padding:'6px 10px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:12, fontFamily:'inherit', outline:'none' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial fields */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12, marginBottom:14 }}>
        <Input
          label="رسوم حياك (يتحملها موج)" type="number" min="0"
          value={form.hayyak_fee ?? 25}
          onChange={e => setField('hayyak_fee', e.target.value)}
        />
        <Input label="خصم (د.إ)" type="number" min="0" value={form.discount || ''} onChange={e => setField('discount', e.target.value)}/>
        {!isEdit && <Input label="تاريخ الطلب" type="date" value={form.order_date || ''} onChange={e => setField('order_date', e.target.value)}/>}
        {!isEdit && (
          <Select label="المصدر" value={form.source || 'instagram'} onChange={e => setField('source', e.target.value)}>
            {Object.entries(SOURCE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        )}
      </div>

      {/* Live profit summary */}
      <div style={{
        padding:'12px 16px', borderRadius:'var(--r-md)', marginBottom:14,
        background: calc.gross_profit < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(0,228,184,0.06)',
        border:`1.5px solid ${calc.gross_profit < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(0,228,184,0.2)'}`,
        display:'flex', flexWrap:'wrap', gap:'6px 18px',
      }}>
        <span style={{ fontSize:13, color:'var(--text-sec)' }}>مبيعات: <b style={{ color:'var(--text)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(calc.subtotal)}</b></span>
        {parseFloat(form.discount) > 0 && <span style={{ fontSize:13, color:'var(--danger)' }}>خصم: −{formatCurrency(form.discount)}</span>}
        <span style={{ fontSize:13, color:'var(--text-sec)' }}>تكلفة: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(calc.product_cost)}</b></span>
        <span style={{ fontSize:13, color:'var(--text-sec)' }}>حياك: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(calc.hayyak_fee)}</b></span>
        <span style={{ fontSize:14, fontWeight:800, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>الإجمالي: {formatCurrency(calc.total)}</span>
        <span style={{ fontSize:14, fontWeight:800, fontFamily:'Inter,sans-serif', color: calc.gross_profit >= 0 ? 'var(--action)' : 'var(--danger)' }}>
          ربح: {calc.gross_profit >= 0 ? '+' : ''}{formatCurrency(calc.gross_profit)}
        </span>
      </div>

      <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="أي ملاحظات إضافية..."/>
    </Modal>
  )
}

/* ═══════════════════════════════════════════
   ORDER VIEW MODAL
═══════════════════════════════════════════ */
function OrderViewModal({ open, onClose, order, onEdit, onStatusChange, onReplacement }) {
  if (!order) return null
  const status = getStatus(order.status)
  const profit = order.gross_profit ?? 0

  function sendWhatsApp() {
    const phone = order.customer_phone?.replace(/\D/g,'')
    if (!phone) return
    const lines = [
      `مرحبا${order.customer_name ? ' ' + order.customer_name : ''}،`,
      `رقم طلبك: ${order.order_number}`,
      `الحالة: ${status.label}`,
      `الإجمالي: ${(order.total||0).toLocaleString()} درهم`,
      '',
      'شكراً لتسوقك مع موج 🌊',
    ].filter(Boolean)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  return (
    <Modal open={open} onClose={onClose} title={`طلب: ${order.order_number}`} maxWidth={560}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800 }}>{order.customer_name || 'عميل'}</div>
            {order.customer_phone && <div style={{ fontSize:13, color:'var(--text-muted)', direction:'ltr' }}>{order.customer_phone}</div>}
            {order.customer_city  && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{order.customer_city}{order.customer_address ? ` • ${order.customer_address}` : ''}</div>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <Badge color={status.color}>{status.emoji} {status.label}</Badge>
            {order.is_replacement && <Badge color="#f59e0b">استبدال</Badge>}
          </div>
        </div>

        {/* Items */}
        {order.items?.length > 0 && (
          <div>
            <div style={{ fontWeight:700, fontSize:11, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>المنتجات</div>
            {order.items.map((item, i) => (
              <div key={i} style={{ background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:'10px 12px', marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: item.engraving_notes ? 6 : 0 }}>
                  <span style={{ fontWeight:700, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(item.price * item.qty)}</span>
                  <div>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.name}</span>
                    {item.size && <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:5 }}>({item.size})</span>}
                    <span style={{ fontSize:12, color:'var(--text-muted)', marginRight:4 }}>× {item.qty}</span>
                  </div>
                </div>
                {item.engraving_notes && (
                  <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                    <IcNote size={12} style={{ color:'var(--text-muted)', marginTop:2, flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:'var(--text-sec)', fontStyle:'italic' }}>{item.engraving_notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Financial */}
        <div style={{
          padding:'12px 16px', borderRadius:'var(--r-md)',
          background: profit < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(0,228,184,0.06)',
          border:`1px solid ${profit < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(0,228,184,0.15)'}`,
          display:'flex', flexWrap:'wrap', gap:'6px 18px',
        }}>
          <span style={{ fontSize:13, color:'var(--text-sec)' }}>مبيعات: <b style={{ fontFamily:'Inter,sans-serif' }}>{formatCurrency(order.subtotal)}</b></span>
          {order.discount > 0 && <span style={{ fontSize:13, color:'var(--danger)' }}>خصم: −{formatCurrency(order.discount)}</span>}
          <span style={{ fontSize:13, color:'var(--text-sec)' }}>تكلفة: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(order.product_cost||0)}</b></span>
          <span style={{ fontSize:13, color:'var(--text-sec)' }}>حياك: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(order.hayyak_fee??25)}</b></span>
          <span style={{ fontSize:14, fontWeight:800, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>الإجمالي: {formatCurrency(order.total)}</span>
          <span style={{ fontSize:14, fontWeight:800, fontFamily:'Inter,sans-serif', color: profit >= 0 ? 'var(--action)' : 'var(--danger)' }}>
            ربح: {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </span>
        </div>

        {/* Status change */}
        <div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, fontWeight:600 }}>تغيير الحالة</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {ORDER_STATUSES.map(s => (
              <button key={s.id} onClick={() => onStatusChange?.(order.id, s.id)} style={{
                padding:'6px 14px', borderRadius:99,
                border:`1px solid ${order.status === s.id ? s.color : s.color+'30'}`,
                background: order.status === s.id ? `${s.color}20` : 'transparent',
                color: s.color, fontSize:12, fontWeight: order.status === s.id ? 800 : 500,
                cursor:'pointer', fontFamily:'inherit',
              }}>{s.emoji} {s.label}</button>
            ))}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ padding:12, background:'var(--bg-hover)', borderRadius:'var(--r-md)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>ملاحظات</div>
            <div style={{ fontSize:13 }}>{order.notes}</div>
          </div>
        )}

        {/* Timeline */}
        {order.internal_notes?.length > 0 && <OrderTimeline notes={order.internal_notes}/>}

        {/* Action buttons */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {order.customer_phone && (
            <Btn variant="ghost" onClick={sendWhatsApp} style={{ color:'#25d166', borderColor:'rgba(37,211,102,0.3)' }}>
              <IcWhatsapp size={15}/> واتساب
            </Btn>
          )}
          {order.status === 'delivered' && !order.is_replacement && (
            <Btn variant="ghost" onClick={() => onReplacement?.(order)} style={{ color:'#f59e0b', borderColor:'rgba(245,158,11,0.3)' }}>
              <IcRefresh size={15}/> إنشاء استبدال
            </Btn>
          )}
          <Btn variant="secondary" onClick={onEdit}><IcEdit size={15}/> تعديل</Btn>
          <PrintReceipt order={order} statuses={ORDER_STATUSES}/>
        </div>
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════
   ORDER TIMELINE
═══════════════════════════════════════════ */
function OrderTimeline({ notes }) {
  const sorted = [...notes].sort((a,b) => new Date(a.time) - new Date(b.time))
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>⏱ سجل الطلب</div>
      <div style={{ position:'relative', paddingRight:16 }}>
        <div style={{ position:'absolute', right:5, top:6, bottom:6, width:2, background:'linear-gradient(to bottom,var(--teal),var(--violet-light))', borderRadius:2, opacity:0.3 }}/>
        {sorted.map((note, i) => {
          const isLast = i === sorted.length - 1
          const d = new Date(note.time)
          return (
            <div key={i} style={{ display:'flex', gap:10, marginBottom: isLast ? 0 : 10, alignItems:'flex-start' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:3, background: isLast ? 'var(--teal)' : 'var(--violet-light)', border:'2px solid var(--bg)', boxShadow: isLast ? '0 0 8px var(--teal-glow)' : 'none' }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color: isLast ? 'var(--text)' : 'var(--text-sec)', fontWeight: isLast ? 700 : 400 }}>{note.text}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                  {d.toLocaleDateString('ar-AE', { month:'short', day:'numeric' })} • {d.toLocaleTimeString('ar-AE', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   QUICK STATUS PICKER (bottom sheet)
═══════════════════════════════════════════ */
function QuickStatusPicker({ orderId, currentStatus, onSelect, onClose, onReplacement }) {
  const canReplace = currentStatus === 'delivered'
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:998 }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:999,
        background:'var(--modal-bg)', border:'1.5px solid var(--border-strong)',
        borderRadius:'24px 24px 0 0', padding:'16px 20px env(safe-area-inset-bottom,20px)',
        animation:'slideUp 0.22s ease both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
        </div>
        <div style={{ fontWeight:800, fontSize:15, color:'var(--text)', marginBottom:14, textAlign:'center' }}>تغيير الحالة</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ORDER_STATUSES.map(s => (
            <button key={s.id} onClick={() => onSelect(orderId, s.id)} style={{
              padding:'13px 16px', borderRadius:'var(--r-lg)',
              border:`1.5px solid ${currentStatus === s.id ? s.color : 'var(--border)'}`,
              background: currentStatus === s.id ? `${s.color}18` : 'var(--bg-hover)',
              color: currentStatus === s.id ? s.color : 'var(--text)',
              cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight: currentStatus === s.id ? 800 : 500,
              display:'flex', alignItems:'center', gap:10, transition:'all 0.15s',
            }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0, boxShadow: currentStatus === s.id ? `0 0 8px ${s.color}` : 'none' }}/>
              {s.emoji} {s.label}
              {currentStatus === s.id && <span style={{ marginRight:'auto' }}>✓</span>}
            </button>
          ))}
          {canReplace && (
            <button onClick={() => onReplacement?.(orderId)} style={{
              padding:'13px 16px', borderRadius:'var(--r-lg)',
              border:'1.5px solid rgba(245,158,11,0.4)', background:'rgba(245,158,11,0.08)',
              color:'#f59e0b', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <IcRefresh size={15}/> إنشاء طلب استبدال
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }`}</style>
    </>
  )
}
