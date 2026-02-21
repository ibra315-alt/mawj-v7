import React, { useState, useEffect, useCallback } from 'react'
import { DB, Settings, generateOrderNumber, subscribeToOrders } from '../data/db'
import { formatCurrency, formatDate, SOURCE_LABELS, SOURCE_ICONS } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, toast } from '../components/ui'
import { IcPlus, IcSearch, IcFilter, IcGrid, IcList, IcEdit, IcDelete, IcEye, IcWhatsapp, IcClose, IcSave } from '../components/Icons'
import OrderCard from '../components/OrderCard'

export default function Orders({ user }) {
  const [orders, setOrders] = useState([])
  const [statuses, setStatuses] = useState([])
  const [products, setProducts] = useState([])
  const [couriers, setCouriers] = useState([])
  const [deliveryZones, setDeliveryZones] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('kanban') // kanban | list
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [viewOrder, setViewOrder] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadAll()
    const unsub = subscribeToOrders(() => loadOrders())
    return unsub
  }, [])

  async function loadAll() {
    try {
      const [ords, statusList, productList, business, discList] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at' }),
        Settings.get('statuses'),
        Settings.get('products'),
        Settings.get('business'),
        DB.list('discounts', { filters: [['active', 'eq', true]] }),
      ])
      setOrders(ords.reverse())
      setStatuses(statusList || [])
      setProducts(productList || [])
      setCouriers(business?.couriers || [])
      setDeliveryZones(business?.delivery_zones || [])
      setDiscounts(discList)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadOrders() {
    const ords = await DB.list('orders', { orderBy: 'created_at' })
    setOrders(ords.reverse())
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await DB.update('orders', id, {
        status: newStatus,
        updated_at: new Date().toISOString(),
        internal_notes: [
          ...(orders.find(o => o.id === id)?.internal_notes || []),
          { text: `تم تغيير الحالة إلى ${statuses.find(s => s.id === newStatus)?.label}`, time: new Date().toISOString() }
        ]
      })
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    } catch (err) { toast('فشل تحديث الحالة', 'error') }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await DB.delete('orders', deleteId)
      setOrders(prev => prev.filter(o => o.id !== deleteId))
      setDeleteId(null)
      toast('تم حذف الطلب')
    } catch (err) { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customer_name.includes(search) || o.order_number.includes(search) || o.customer_phone?.includes(search)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const matchSource = filterSource === 'all' || o.source === filterSource
    return matchSearch && matchStatus && matchSource
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <PageHeader
        title="الطلبات"
        subtitle={`${orders.length} طلب إجمالي • ${filtered.length} معروض`}
        actions={
          <>
            <Btn onClick={() => { setEditOrder(null); setShowForm(true) }} style={{ gap: 6 }}>
              <IcPlus size={16} /> طلب جديد
            </Btn>
          </>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IcSearch size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، رقم الطلب، الهاتف..."
            style={{ width: '100%', padding: '9px 36px 9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
          />
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer' }}>
          <option value="all">كل الحالات</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer' }}>
          <option value="all">كل المصادر</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          <button onClick={() => setViewMode('kanban')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: viewMode === 'kanban' ? 'var(--teal)' : 'transparent', color: viewMode === 'kanban' ? '#07080f' : 'var(--text-muted)', cursor: 'pointer' }}><IcGrid size={16} /></button>
          <button onClick={() => setViewMode('list')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: viewMode === 'list' ? 'var(--teal)' : 'transparent', color: viewMode === 'list' ? '#07080f' : 'var(--text-muted)', cursor: 'pointer' }}><IcList size={16} /></button>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
          {statuses.map(status => {
            const colOrders = filtered.filter(o => o.status === status.id)
            const colTotal = colOrders.reduce((s, o) => s + (o.total || 0), 0)
            return (
              <div key={status.id} style={{ minWidth: 280, flex: '0 0 280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: `${status.color}15`, border: `1px solid ${status.color}30`, borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: status.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: status.color }}>{status.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 7px', background: `${status.color}25`, borderRadius: 99, color: status.color }}>{colOrders.length}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(colTotal)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colOrders.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--bg-border)' }}>
                      لا يوجد طلبات
                    </div>
                  ) : (
                    colOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        statuses={statuses}
                        onView={() => { setViewOrder(order); setShowView(true) }}
                        onEdit={() => { setEditOrder(order); setShowForm(true) }}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <Empty title="لا يوجد طلبات" message="أضف طلباً جديداً للبدء" action={<Btn onClick={() => { setEditOrder(null); setShowForm(true) }}><IcPlus size={14} /> طلب جديد</Btn>} />
          ) : (
            filtered.map(order => {
              const statusObj = statuses.find(s => s.id === order.status) || { label: order.status, color: '#6b7280' }
              return (
                <div
                  key={order.id}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}
                  onClick={() => { setViewOrder(order); setShowView(true) }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,228,184,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bg-border)'}
                >
                  <div style={{ flex: '0 0 120px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{order.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.order_number}</div>
                  </div>
                  <Badge color={statusObj.color}>{statusObj.label}</Badge>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--text-sec)', minWidth: 100 }}>
                    {order.customer_city} • {SOURCE_LABELS[order.source] || ''}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 14 }}>{formatCurrency(order.total)}</div>
                  {order.profit !== undefined && (
                    <div style={{ fontSize: 12, color: order.profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {order.profit > 0 ? '+' : ''}{formatCurrency(order.profit)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm" onClick={() => { setEditOrder(order); setShowForm(true) }}><IcEdit size={14} /></Btn>
                    <Btn variant="danger" size="sm" onClick={() => setDeleteId(order.id)}><IcDelete size={14} /></Btn>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ORDER FORM MODAL */}
      <OrderForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditOrder(null) }}
        order={editOrder}
        statuses={statuses}
        products={products}
        couriers={couriers}
        deliveryZones={deliveryZones}
        discounts={discounts}
        onSaved={order => {
          if (editOrder) {
            setOrders(prev => prev.map(o => o.id === order.id ? order : o))
          } else {
            setOrders(prev => [order, ...prev])
          }
          setShowForm(false)
          setEditOrder(null)
          toast(editOrder ? 'تم تحديث الطلب' : 'تم إضافة الطلب')
        }}
        user={user}
      />

      {/* VIEW MODAL */}
      <OrderViewModal
        open={showView}
        onClose={() => { setShowView(false); setViewOrder(null) }}
        order={viewOrder}
        statuses={statuses}
        onEdit={() => { setEditOrder(viewOrder); setShowView(false); setShowForm(true) }}
        onStatusChange={async (id, status) => {
          await handleStatusChange(id, status)
          setViewOrder(prev => prev ? { ...prev, status } : prev)
        }}
      />

      {/* DELETE CONFIRM */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="سيتم حذف الطلب نهائياً ولا يمكن استعادته."
      />
    </div>
  )
}

// ─── ORDER FORM ──────────────────────────────────────────────
function OrderForm({ open, onClose, order, statuses, products, couriers, deliveryZones, discounts, onSaved, user }) {
  const isEdit = !!order
  const [form, setForm] = useState({})
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (order) {
        setForm({
          customer_name: order.customer_name || '',
          customer_phone: order.customer_phone || '',
          customer_city: order.customer_city || '',
          delivery_zone: order.delivery_zone || '',
          delivery_cost: order.delivery_cost || 0,
          source: order.source || 'instagram',
          status: order.status || 'new',
          courier: order.courier || '',
          tracking_number: order.tracking_number || '',
          expected_delivery: order.expected_delivery || '',
          notes: order.notes || '',
          discount_code: order.discount_code || '',
          discount_amount: order.discount_amount || 0,
        })
        setItems(order.items || [])
      } else {
        setForm({ source: 'instagram', status: statuses[0]?.id || 'new', delivery_cost: 0, discount_amount: 0 })
        setItems([])
      }
    }
  }, [open, order])

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: product.id, name: product.name, price: product.price, cost: product.cost, qty: 1 }]
    })
  }

  function removeItem(id) { setItems(prev => prev.filter(i => i.id !== id)) }
  function updateItemQty(id, qty) {
    if (qty <= 0) { removeItem(id); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0)
  const cost = items.reduce((s, i) => s + ((i.cost || 0) * i.qty), 0)
  const total = subtotal + (parseFloat(form.delivery_cost) || 0) - (parseFloat(form.discount_amount) || 0)
  const profit = total - cost - (parseFloat(form.delivery_cost) || 0)

  async function handleSave() {
    if (!form.customer_name) { toast('أدخل اسم العميل', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        items,
        subtotal,
        cost,
        total,
        profit,
        delivery_cost: parseFloat(form.delivery_cost) || 0,
        discount_amount: parseFloat(form.discount_amount) || 0,
        updated_at: new Date().toISOString(),
      }
      let saved
      if (isEdit) {
        saved = await DB.update('orders', order.id, payload)
      } else {
        const order_number = await generateOrderNumber()
        saved = await DB.insert('orders', { ...payload, order_number, created_by: user?.id })
      }
      onSaved(saved)
    } catch (err) {
      console.error(err)
      toast('فشل الحفظ: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function applyZone(cityName) {
    const zone = deliveryZones.find(z => z.city === cityName)
    if (zone) setField('delivery_cost', zone.cost)
    setField('customer_city', cityName)
    setField('delivery_zone', cityName)
  }

  function applyDiscount(code) {
    const disc = discounts.find(d => d.code === code && d.active)
    if (!disc) { toast('كود الخصم غير صحيح', 'error'); return }
    const amount = disc.type === 'percent' ? subtotal * disc.value / 100 : disc.value
    setField('discount_code', code)
    setField('discount_amount', Math.round(amount))
    toast(`تم تطبيق خصم ${disc.value}${disc.type === 'percent' ? '%' : ' د.إ'}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل الطلب' : 'طلب جديد'} maxWidth={680}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Input label="اسم العميل *" value={form.customer_name || ''} onChange={e => setField('customer_name', e.target.value)} placeholder="اسم العميل" />
        <Input label="رقم الهاتف" value={form.customer_phone || ''} onChange={e => setField('customer_phone', e.target.value)} placeholder="+971..." dir="ltr" />

        <Select label="المدينة" value={form.customer_city || ''} onChange={e => applyZone(e.target.value)}>
          <option value="">اختر المدينة</option>
          {deliveryZones.map(z => <option key={z.city} value={z.city}>{z.city} — {z.cost} د.إ</option>)}
        </Select>

        <Select label="مصدر الطلب" value={form.source || 'instagram'} onChange={e => setField('source', e.target.value)}>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>

        <Select label="الحالة" value={form.status || ''} onChange={e => setField('status', e.target.value)}>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>

        <Select label="الشركة الناقلة" value={form.courier || ''} onChange={e => setField('courier', e.target.value)}>
          <option value="">اختر شركة الشحن</option>
          {couriers.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Input label="رقم التتبع" value={form.tracking_number || ''} onChange={e => setField('tracking_number', e.target.value)} dir="ltr" />
        <Input label="تاريخ التسليم المتوقع" type="date" value={form.expected_delivery || ''} onChange={e => setField('expected_delivery', e.target.value)} />
      </div>

      {/* Products */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-sec)' }}>المنتجات</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              style={{ padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              + {p.name} ({formatCurrency(p.price)})
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(item.price)} × </span>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={e => updateItemQty(item.id, parseInt(e.target.value))}
                  style={{ width: 48, padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, textAlign: 'center', fontFamily: 'var(--font)' }}
                />
                <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13, minWidth: 70, textAlign: 'left' }}>{formatCurrency(item.price * item.qty)}</span>
                <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Input
          label="رسوم التوصيل (د.إ)"
          type="number"
          value={form.delivery_cost || ''}
          onChange={e => setField('delivery_cost', e.target.value)}
        />
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-sec)', fontWeight: 600, marginBottom: 6 }}>كود الخصم</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={form.discount_code || ''}
              onChange={e => setField('discount_code', e.target.value)}
              placeholder="PROMO2024"
              dir="ltr"
              style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)' }}
            />
            <Btn variant="secondary" size="sm" onClick={() => applyDiscount(form.discount_code)}>تطبيق</Btn>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>المجموع: <b style={{ color: 'var(--text)' }}>{formatCurrency(subtotal)}</b></span>
        <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>التوصيل: <b style={{ color: 'var(--text)' }}>{formatCurrency(form.delivery_cost || 0)}</b></span>
        {form.discount_amount > 0 && <span style={{ fontSize: 13, color: 'var(--red)' }}>خصم: -{formatCurrency(form.discount_amount)}</span>}
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)' }}>الإجمالي: {formatCurrency(total)}</span>
        <span style={{ fontSize: 13, color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
          ربح: {profit > 0 ? '+' : ''}{formatCurrency(profit)}
        </span>
      </div>

      <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} containerStyle={{ marginTop: 14 }} placeholder="أي ملاحظات إضافية..." />

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}><IcSave size={15} /> {isEdit ? 'حفظ التعديلات' : 'إضافة الطلب'}</Btn>
      </div>
    </Modal>
  )
}

// ─── ORDER VIEW MODAL ────────────────────────────────────────
function OrderViewModal({ open, onClose, order, statuses, onEdit, onStatusChange }) {
  if (!order) return null
  const statusObj = statuses?.find(s => s.id === order.status) || { label: order.status, color: '#6b7280' }

  function sendWhatsApp() {
    const phone = order.customer_phone?.replace(/\D/g, '')
    if (!phone) return
    const text = `مرحباً ${order.customer_name}،\nطلبكم رقم ${order.order_number}\nالحالة: ${statusObj.label}\nالإجمالي: ${formatCurrency(order.total)}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <Modal open={open} onClose={onClose} title={`طلب: ${order.order_number}`} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{order.customer_name}</div>
            {order.customer_phone && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{order.customer_phone}</div>}
          </div>
          <Badge color={statusObj.color} style={{ fontSize: 14 }}>{statusObj.label}</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {order.customer_city && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>المدينة: </span>{order.customer_city}</div>}
          {order.source && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>المصدر: </span>{SOURCE_LABELS[order.source]}</div>}
          {order.courier && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>الشركة الناقلة: </span>{order.courier}</div>}
          {order.tracking_number && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>رقم التتبع: </span><span dir="ltr">{order.tracking_number}</span></div>}
          {order.expected_delivery && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>التسليم المتوقع: </span>{formatDate(order.expected_delivery)}</div>}
          {order.discount_code && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>كود الخصم: </span>{order.discount_code}</div>}
        </div>

        {order.items?.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-sec)' }}>المنتجات</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13 }}>{item.name} × {item.qty}</span>
                  <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 14, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: 13 }}>المجموع: <b>{formatCurrency(order.subtotal)}</b></span>
          <span style={{ fontSize: 13 }}>التوصيل: <b>{formatCurrency(order.delivery_cost)}</b></span>
          {order.discount_amount > 0 && <span style={{ fontSize: 13, color: 'var(--red)' }}>خصم: -{formatCurrency(order.discount_amount)}</span>}
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--teal)' }}>الإجمالي: {formatCurrency(order.total)}</span>
          {order.profit !== undefined && (
            <span style={{ fontSize: 13, fontWeight: 700, color: order.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              ربح: {order.profit > 0 ? '+' : ''}{formatCurrency(order.profit)}
            </span>
          )}
        </div>

        {order.notes && (
          <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ملاحظات</div>
            <div style={{ fontSize: 13 }}>{order.notes}</div>
          </div>
        )}

        {/* Change status */}
        {statuses?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>تغيير الحالة</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {statuses.map(s => (
                <button
                  key={s.id}
                  onClick={() => onStatusChange?.(order.id, s.id)}
                  style={{ padding: '6px 14px', borderRadius: 99, border: `1px solid ${s.color}50`, background: order.status === s.id ? `${s.color}25` : 'transparent', color: s.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {order.customer_phone && (
            <Btn variant="ghost" onClick={sendWhatsApp} style={{ color: '#25d166', borderColor: 'rgba(37,211,102,0.3)' }}>
              <IcWhatsapp size={15} /> إرسال واتساب
            </Btn>
          )}
          <Btn variant="secondary" onClick={onEdit}><IcEdit size={15} /> تعديل الطلب</Btn>
        </div>
      </div>
    </Modal>
  )
}


