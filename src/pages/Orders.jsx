import React, { useState, useEffect, useCallback } from 'react'
import { DB, Settings, generateOrderNumber } from '../data/db'
import { subscribeOrders } from '../data/realtime'
import { formatCurrency, formatDate, SOURCE_LABELS, SOURCE_ICONS } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcSearch, IcFilter, IcGrid, IcList, IcEdit, IcDelete, IcEye, IcWhatsapp, IcClose, IcSave } from '../components/Icons'
import OrderCard from '../components/OrderCard'
import PrintReceipt from '../components/PrintReceipt'
import Confetti from '../components/Confetti'

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
  const [deleting, setDeleting]     = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [repeatOrder, setRepeatOrder]   = useState(null)
  const [templates, setTemplates]       = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [quickStatusId, setQuickStatusId] = useState(null) // order id with open status picker

  useEffect(() => {
    loadAll()
    const unsub = subscribeOrders(() => loadOrders())
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
      const tmplList = await Settings.get('order_templates')
      setOrders(ords.reverse())
      setStatuses(statusList || [])
      setProducts(productList || [])
      setCouriers(business?.couriers || [])
      setDeliveryZones(business?.delivery_zones || [])
      setDiscounts(discList)
      setTemplates(tmplList || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadOrders() {
    const ords = await DB.list('orders', { orderBy: 'created_at' })
    setOrders(ords.reverse())
  }

  const [confetti, setConfetti] = useState(false)

  async function handleStatusChange(id, newStatus) {
    try {
      const deliveryDate = newStatus === 'delivered' ? new Date().toISOString().split('T')[0] : undefined
      const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        internal_notes: [
          ...(orders.find(o => o.id === id)?.internal_notes || []),
          { text: `تم تغيير الحالة إلى ${statuses.find(s => s.id === newStatus)?.label}`, time: new Date().toISOString() }
        ],
        ...(deliveryDate ? { delivery_date: deliveryDate } : {}),
      }
      await DB.update('orders', id, updatePayload)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, ...(deliveryDate ? { delivery_date: deliveryDate } : {}) } : o))
      // 🎉 Confetti when order marked delivered
      if (newStatus === 'delivered') {
        setConfetti(true)
        setTimeout(() => setConfetti(false), 4000)
        toast('تم التسليم! 🎉')
      }
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

  async function saveTemplate(order) {
    const name = prompt('اسم القالب (مثال: طقم كريستال دبي):')
    if (!name?.trim()) return
    const tmpl = {
      id: Date.now().toString(),
      name: name.trim(),
      items: order.items || [],
      customer_city: order.customer_city || '',
      delivery_zone: order.delivery_zone || '',
      delivery_cost: order.delivery_cost || 0,
      source: order.source || 'instagram',
    }
    const updated = [...templates, tmpl]
    await Settings.set('order_templates', updated)
    Settings.clearCache('order_templates')
    setTemplates(updated)
    toast('تم حفظ القالب ✓')
  }

  async function deleteTemplate(id) {
    const updated = templates.filter(t => t.id !== id)
    await Settings.set('order_templates', updated)
    Settings.clearCache('order_templates')
    setTemplates(updated)
    toast('تم حذف القالب')
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customer_name.includes(search) || o.order_number.includes(search) || o.customer_phone?.includes(search)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const matchSource = filterSource === 'all' || o.source === filterSource
    return matchSearch && matchStatus && matchSource
  })

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
        subtitle={`${orders.length} طلب إجمالي • ${filtered.length} معروض`}
        actions={
          <>
            {templates.length > 0 && (
              <Btn variant="secondary" onClick={() => setShowTemplates(true)} style={{ gap:6 }}>
                📋 قوالب
              </Btn>
            )}
            <Btn onClick={() => { setEditOrder(null); setRepeatOrder(null); setShowForm(true) }} style={{ gap: 6 }}>
              <IcPlus size={16} /> طلب جديد
            </Btn>
          </>
        }
      />

      {/* ── Stats bar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'إجمالي', value: orders.length, color:'var(--blue)' },
          { label:'إيرادات', value: formatCurrency(orders.reduce((s,o)=>s+(o.total||0),0)), color:'var(--teal)' },
          { label:'معلق', value: orders.filter(o=>!['delivered','returned','cancelled'].includes(o.status)).length, color:'var(--amber)' },
          { label:'مسلم', value: orders.filter(o=>o.status==='delivered').length, color:'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-glass)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-sm)', padding:'10px 12px', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:15, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter + View toggle row ── */}
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        {/* View mode toggle */}
        <div style={{ display:'flex', gap:2, background:'var(--bg-glass)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-sm)', padding:3, flexShrink:0 }}>
          <button onClick={() => setViewMode('list')} style={{ padding:'6px 10px', borderRadius:6, border:'none', background:viewMode==='list'?'var(--teal)':'transparent', color:viewMode==='list'?'#050c1a':'var(--text-muted)', cursor:'pointer' }}><IcList size={15}/></button>
          <button onClick={() => setViewMode('kanban')} style={{ padding:'6px 10px', borderRadius:6, border:'none', background:viewMode==='kanban'?'var(--teal)':'transparent', color:viewMode==='kanban'?'#050c1a':'var(--text-muted)', cursor:'pointer' }}><IcGrid size={15}/></button>
        </div>
        {/* Filter button */}
        <button onClick={() => setShowFilters(true)} style={{
          position:'relative', padding:'10px 12px', background:'var(--bg-glass)',
          border:`1.5px solid ${(filterStatus!=='all'||filterSource!=='all') ? 'var(--teal)' : 'var(--glass-border)'}`,
          borderRadius:'var(--radius-sm)', color:(filterStatus!=='all'||filterSource!=='all') ? 'var(--teal)' : 'var(--text-sec)',
          cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0,
        }}>
          <IcFilter size={16}/>
          {(filterStatus!=='all'||filterSource!=='all') && (
            <span style={{ position:'absolute', top:-5, right:-5, width:16, height:16, borderRadius:'50%', background:'var(--teal)', color:'#050c1a', fontSize:9, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {(filterStatus!=='all'?1:0)+(filterSource!=='all'?1:0)}
            </span>
          )}
        </button>
        {/* Search */}
        <div style={{ position:'relative', flex:1 }}>
          <IcSearch size={15} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث..."
            style={{ width:'100%', padding:'10px 34px 10px 12px', background:'var(--bg-glass)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13, fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' }}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {(filterStatus!=='all' || filterSource!=='all') && (
        <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
          {filterStatus!=='all' && (
            <span style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', background:'var(--teal-faint)', border:'1px solid var(--glass-border-teal)', borderRadius:999, fontSize:11, color:'var(--teal)', fontWeight:700 }}>
              {statuses.find(s=>s.id===filterStatus)?.label}
              <button onClick={()=>setFilterStatus('all')} style={{ background:'none', border:'none', color:'var(--teal)', cursor:'pointer', fontSize:13, lineHeight:1, padding:0 }}>✕</button>
            </span>
          )}
          {filterSource!=='all' && (
            <span style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', background:'var(--violet-faint)', border:'1px solid var(--glass-border)', borderRadius:999, fontSize:11, color:'var(--violet-light)', fontWeight:700 }}>
              {SOURCE_LABELS[filterSource]}
              <button onClick={()=>setFilterSource('all')} style={{ background:'none', border:'none', color:'var(--violet-light)', cursor:'pointer', fontSize:13, lineHeight:1, padding:0 }}>✕</button>
            </span>
          )}
          <button onClick={()=>{setFilterStatus('all');setFilterSource('all')}} style={{ padding:'4px 10px', background:'none', border:'1px solid var(--glass-border)', borderRadius:999, fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
            مسح الكل
          </button>
        </div>
      )}

      {/* ── Bottom Sheet Filters ── */}
      <BottomSheetFilters
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterSource={filterSource}
        setFilterSource={setFilterSource}
        statuses={statuses}
      />

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          statuses={statuses}
          orders={filtered}
          onStatusChange={handleStatusChange}
          onView={order => { setViewOrder(order); setShowView(true) }}
          onEdit={order => { setEditOrder(order); setShowForm(true) }}
        />
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.length === 0 ? (
            <Empty title="لا يوجد طلبات" action={<Btn onClick={() => { setEditOrder(null); setShowForm(true) }}><IcPlus size={14}/> طلب جديد</Btn>} />
          ) : (
            filtered.map(order => {
              const statusObj = statuses.find(s => s.id === order.status) || { label: order.status, color: '#6b7280' }
              return (
                <div key={order.id} onClick={() => { setViewOrder(order); setShowView(true) }}
                  style={{ background:'var(--bg-glass)', border:`1.5px solid var(--glass-border)`, borderRadius:'var(--radius)', padding:'14px 16px', cursor:'pointer', borderRight:`3px solid ${statusObj.color}` }}
                >
                  {/* Row 1: order number + status + total */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', fontWeight:600 }}>{order.order_number}</span>
                      {/* Tap status badge to quick-change */}
                      <span
                        onClick={e => { e.stopPropagation(); setQuickStatusId(order.id) }}
                        style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:`${statusObj.color}22`, color:statusObj.color, border:`1px solid ${statusObj.color}44`, cursor:'pointer', userSelect:'none' }}
                      >
                        {statusObj.label} <span style={{fontSize:9,opacity:0.7}}>▼</span>
                      </span>
                    </div>
                    <span style={{ fontWeight:900, fontSize:15, color:'var(--teal)' }}>{formatCurrency(order.total)}</span>
                  </div>
                  {/* Row 2: phone + city */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:order.items?.length ? 8 : 0 }}>
                    {order.customer_phone && <span style={{ fontSize:13, fontWeight:700, direction:'ltr' }}>{order.customer_phone}</span>}
                    {order.customer_city && <span style={{ fontSize:12, color:'var(--text-muted)' }}>📍 {order.customer_city}</span>}
                    {order.profit !== undefined && (
                      <span style={{ fontSize:12, fontWeight:700, color: order.profit >= 0 ? 'var(--green)' : 'var(--red)', marginRight:'auto' }}>
                        ربح: {order.profit > 0 ? '+' : ''}{formatCurrency(order.profit)}
                      </span>
                    )}
                  </div>
                  {/* Row 3: products */}
                  {order.items?.length > 0 && (
                    <div style={{ fontSize:11, color:'var(--text-sec)', marginBottom:8 }}>
                      {order.items.slice(0,3).map(i=>`${i.name} ×${i.qty}`).join(' · ')}
                      {order.items.length > 3 && ` +${order.items.length-3}`}
                    </div>
                  )}
                  {/* Row 4: actions */}
                  <div style={{ display:'flex', gap:6, marginTop:4 }} onClick={e => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm" onClick={() => { setViewOrder(order); setShowView(true) }}><IcEye size={13}/> عرض</Btn>
                    <Btn variant="secondary" size="sm" onClick={() => { setEditOrder(order); setShowForm(true) }}><IcEdit size={13}/> تعديل</Btn>
                    <Btn variant="danger" size="sm" onClick={() => setDeleteId(order.id)}><IcDelete size={13}/></Btn>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TEMPLATES MODAL */}
      <OrderTemplatesModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        templates={templates}
        onUse={tmpl => { setRepeatOrder(tmpl); setShowTemplates(false); setShowForm(true) }}
        onDelete={deleteTemplate}
      />

      {/* QUICK STATUS PICKER */}
      {quickStatusId && (
        <QuickStatusPicker
          orderId={quickStatusId}
          statuses={statuses}
          currentStatus={orders.find(o=>o.id===quickStatusId)?.status}
          onSelect={async (id, status) => { await handleStatusChange(id, status); setQuickStatusId(null) }}
          onClose={() => setQuickStatusId(null)}
        />
      )}

      {/* ORDER FORM MODAL */}
      <OrderForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditOrder(null); setRepeatOrder(null) }}
        order={editOrder}
        repeatFrom={repeatOrder}
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
        onRepeat={order => { setRepeatOrder(order); setShowView(false); setShowForm(true) }}
        onSaveTemplate={saveTemplate}
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
function OrderForm({ open, onClose, order, statuses, products, couriers, deliveryZones, discounts, onSaved, user, repeatFrom }) {
  const isEdit = !!order
  const [form, setForm] = useState({})
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [dupWarning, setDupWarning]   = useState(null)
  const [aiText, setAiText]           = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [showAi, setShowAi]           = useState(false)

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
          courier: 'Hayyak',
          tracking_number: order.tracking_number || '',
          delivery_date: order.delivery_date || '',
          notes: order.notes || '',
          discount_code: order.discount_code || '',
          discount_amount: order.discount_amount || 0,
        })
        setItems(order.items || [])
      } else if (repeatFrom) {
        // Pre-fill from repeated order — but fresh status/number
        setForm({
          customer_name: repeatFrom.customer_name || '',
          customer_phone: repeatFrom.customer_phone || '',
          customer_city: repeatFrom.customer_city || '',
          delivery_zone: repeatFrom.delivery_zone || '',
          delivery_cost: repeatFrom.delivery_cost || 0,
          source: repeatFrom.source || 'instagram',
          status: statuses[0]?.id || 'new',
          courier: 'Hayyak',
          tracking_number: '',
          delivery_date: '',
          notes: '',
          discount_code: '',
          discount_amount: 0,
        })
        setItems(repeatFrom.items || [])
      } else {
        setForm({ source: 'instagram', status: statuses[0]?.id || 'new', delivery_cost: 0, discount_amount: 0 })
        setItems([])
      }
      setDupWarning(null)
    }
  }, [open, order, repeatFrom])

  async function checkDuplicate(phone) {
    if (!phone || phone.length < 8) return
    try {
      const all = await DB.list('orders')
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent = all.filter(o =>
        o.customer_phone === phone &&
        new Date(o.created_at) > cutoff &&
        (!order || o.id !== order.id)
      )
      if (recent.length > 0) {
        setDupWarning(`⚠️ هذا الرقم لديه ${recent.length} طلب خلال آخر 24 ساعة`)
      } else {
        setDupWarning(null)
      }
    } catch { setDupWarning(null) }
  }

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

  async function handleAiFill() {
    if (!aiText.trim()) return
    setAiLoading(true)
    try {
      const { supabase } = await import('../data/db')
      const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
      const productList = products.map(p => `${p.name} (${p.price} د.إ)`).join(', ')
      const zoneList = deliveryZones?.map(z => `${z.city} (${z.cost} د.إ)`).join(', ') || ''

      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          max_tokens: 500,
          system: `أنت مساعد لإدخال الطلبات. استخرج من النص: اسم العميل، رقم الهاتف، المدينة، المنتجات مع الكمية، المصدر.
المنتجات المتاحة: ${productList}
مناطق التوصيل: ${zoneList}
رد بـ JSON فقط هكذا بدون أي نص آخر:
{"customer_name":"","customer_phone":"","customer_city":"","source":"instagram","items":[{"name":"","qty":1}]}`,
          messages: [{ role:'user', content: aiText }]
        })
      })
      const data = await res.json()
      const text = data?.content?.[0]?.text || ''
      const clean = text.replace(/\`\`\`json|\`\`\`/g,'').trim()
      const parsed = JSON.parse(clean)

      if (parsed.customer_name) setField('customer_name', parsed.customer_name)
      if (parsed.customer_phone) setField('customer_phone', parsed.customer_phone)
      if (parsed.source) setField('source', parsed.source)
      if (parsed.customer_city) {
        const zone = deliveryZones?.find(z => z.city === parsed.customer_city)
        setField('customer_city', parsed.customer_city)
        if (zone) setField('delivery_cost', zone.cost)
      }
      if (parsed.items?.length > 0) {
        const newItems = parsed.items.flatMap(ai => {
          const prod = products.find(p => p.name.includes(ai.name) || ai.name.includes(p.name))
          if (!prod) return []
          return [{ id:prod.id, name:prod.name, price:prod.price, cost:prod.cost, qty:ai.qty||1 }]
        })
        if (newItems.length > 0) setItems(newItems)
      }
      setShowAi(false)
      setAiText('')
      toast('✨ تم تعبئة النموذج')
    } catch(e) {
      toast('فشل AI: ' + (e.message||''), 'error')
    } finally { setAiLoading(false) }
  }

  async function handleSave() {
    // customer_name is optional
    setSaving(true)
    try {
      // Convert empty date strings to null so Postgres doesn't reject them
      const cleanDates = obj => {
        const DATE_FIELDS = ['delivery_date', 'created_at', 'updated_at']
        const out = { ...obj }
        DATE_FIELDS.forEach(k => {
          if (out[k] === '' || out[k] === undefined) out[k] = null
        })
        return out
      }

      // Remove fields that don't exist in DB schema
      const { order_date, ...formClean } = form

      const payload = cleanDates({
        ...formClean,
        items,
        subtotal,
        cost,
        total,
        profit,
        delivery_cost: parseFloat(form.delivery_cost) || 0,
        discount_amount: parseFloat(form.discount_amount) || 0,
        updated_at: new Date().toISOString(),
      })
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل الطلب' : 'طلب جديد'} width={680}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}><IcSave size={15} /> {isEdit ? 'حفظ التعديلات' : 'إضافة الطلب'}</Btn>
      </>}
    >
      {/* ✨ AI fill panel */}
      <div style={{ marginBottom:16 }}>
        {!showAi ? (
          <button onClick={() => setShowAi(true)} style={{
            display:'flex', alignItems:'center', gap:8, padding:'9px 14px',
            background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(0,228,184,0.1))',
            border:'1.5px solid rgba(124,58,237,0.3)', borderRadius:'var(--radius-sm)',
            color:'var(--violet-light,#a78bfa)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700,
          }}>
            ✨ تعبئة بالذكاء الاصطناعي
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>— اكتب الطلب بلغة طبيعية</span>
          </button>
        ) : (
          <div style={{ padding:'12px 14px', background:'rgba(124,58,237,0.08)', border:'1.5px solid rgba(124,58,237,0.25)', borderRadius:'var(--radius-sm)' }}>
            <div style={{ fontSize:12, color:'var(--violet-light,#a78bfa)', fontWeight:700, marginBottom:8 }}>
              ✨ مثال: "طلب من سارة 0501234567 دبي طقم كريستال ملكي × 2"
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={aiText} onChange={e=>setAiText(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleAiFill()}
                placeholder="اكتب تفاصيل الطلب..."
                autoFocus
                style={{ flex:1, padding:'9px 12px', background:'var(--bg-glass)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13, fontFamily:'var(--font)', outline:'none' }}
              />
              <Btn onClick={handleAiFill} loading={aiLoading} style={{ background:'var(--violet)', border:'none', flexShrink:0 }}>تعبئة</Btn>
              <Btn variant="ghost" onClick={() => { setShowAi(false); setAiText('') }} style={{ flexShrink:0 }}>✕</Btn>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        <div>
          <Input label="رقم الهاتف" value={form.customer_phone || ''} onChange={e => { setField('customer_phone', e.target.value); checkDuplicate(e.target.value) }} placeholder="+971..." dir="ltr" />
          {dupWarning && (
            <div style={{ fontSize:11, color:'var(--amber,#f59e0b)', marginTop:4, padding:'6px 10px', background:'rgba(245,158,11,0.08)', borderRadius:8, border:'1px solid rgba(245,158,11,0.2)' }}>
              {dupWarning}
            </div>
          )}
        </div>

        <Select label="المدينة" value={form.customer_city || ''} onChange={e => applyZone(e.target.value)}>
          <option value="">اختر المدينة</option>
          {deliveryZones.map(z => <option key={z.city} value={z.city}>{z.city} — {z.cost} د.إ</option>)}
        </Select>

        <Select label="الحالة" value={form.status || ''} onChange={e => setField('status', e.target.value)}>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>

        <div>
          <label style={{fontSize:11,fontWeight:600,color:'var(--text-sec)',letterSpacing:'0.03em',display:'block',marginBottom:5}}>الشركة الناقلة</label>
          <div style={{padding:'9px 12px',background:'var(--bg-surface)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--text-sec)',display:'flex',alignItems:'center',gap:8}}>
            <span>🚚</span> <span style={{fontWeight:600,color:'var(--teal)'}}>Hayyak</span>
          </div>
        </div>

        <Input label="رقم التتبع" value={form.tracking_number || ''} onChange={e => setField('tracking_number', e.target.value)} dir="ltr" />
        {isEdit && form.delivery_date && (
          <div style={{ padding:'10px 12px', background:'rgba(0,228,184,0.06)', border:'1px solid rgba(0,228,184,0.2)', borderRadius:'var(--radius-sm)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>تاريخ التسليم</div>
            <div style={{ fontWeight:800, color:'var(--teal)', fontSize:14 }}>✅ {form.delivery_date}</div>
          </div>
        )}
      </div>

      {/* Products */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-sec)' }}>المنتجات</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              style={{ padding: '6px 12px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              + {p.name} ({formatCurrency(p.price)})
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(item.price)} × </span>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={e => updateItemQty(item.id, parseInt(e.target.value))}
                  style={{ width: 48, padding: '4px 6px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, textAlign: 'center', fontFamily: 'var(--font)' }}
                />
                <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13, minWidth: 70, textAlign: 'left' }}>{formatCurrency(item.price * item.qty)}</span>
                <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
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
              style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)' }}
            />
            <Btn variant="secondary" size="sm" onClick={() => applyDiscount(form.discount_code)}>تطبيق</Btn>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>المجموع: <b style={{ color: 'var(--text)' }}>{formatCurrency(subtotal)}</b></span>
        <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>التوصيل: <b style={{ color: 'var(--text)' }}>{formatCurrency(form.delivery_cost || 0)}</b></span>
        {form.discount_amount > 0 && <span style={{ fontSize: 13, color: 'var(--red)' }}>خصم: -{formatCurrency(form.discount_amount)}</span>}
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)' }}>الإجمالي: {formatCurrency(total)}</span>
        <span style={{ fontSize: 13, color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
          ربح: {profit > 0 ? '+' : ''}{formatCurrency(profit)}
        </span>
      </div>

      <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} containerStyle={{ marginTop: 14 }} placeholder="أي ملاحظات إضافية..." />
    </Modal>
  )
}

// ─── ORDER VIEW MODAL ────────────────────────────────────────
function OrderViewModal({ open, onClose, order, statuses, onEdit, onStatusChange, onRepeat, onSaveTemplate }) {
  if (!order) return null
  const statusObj = statuses?.find(s => s.id === order.status) || { label: order.status, color: '#6b7280' }

  function sendWhatsApp() {
    const phone = order.customer_phone?.replace(/\D/g, '')
    if (!phone) return
    // Plain text only — no emojis, symbols break on some WhatsApp versions
    const lines = [
      `مرحبا${order.customer_name ? ' ' + order.customer_name : ''}`,
      `رقم الطلب: ${order.order_number}`,
      `الحالة: ${statusObj.label}`,
      order.tracking_number ? `رقم التتبع: ${order.tracking_number}` : '',
      `الاجمالي: ${(order.total || 0).toLocaleString()} درهم`,
      order.delivery_date ? `تاريخ التسليم: ${order.delivery_date}` : '',
      '',
      'شكرا لتسوقك مع موج',
    ].filter(Boolean)
    const text = lines.join('\n')
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
          {order.delivery_date && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>تاريخ التسليم: </span><span style={{ color:'var(--teal)', fontWeight:700 }}>{formatDate(order.delivery_date)}</span></div>}
          {order.discount_code && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>كود الخصم: </span>{order.discount_code}</div>}
        </div>

        {order.items?.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-sec)' }}>المنتجات</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13 }}>{item.name} × {item.qty}</span>
                  <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 14, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
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
          <div style={{ padding: 12, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
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

        {/* ── Timeline ── */}
        {order.internal_notes?.length > 0 && (
          <OrderTimeline notes={order.internal_notes} statuses={statuses} />
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {order.customer_phone && (
            <Btn variant="ghost" onClick={sendWhatsApp} style={{ color: '#25d166', borderColor: 'rgba(37,211,102,0.3)' }}>
              <IcWhatsapp size={15} /> واتساب
            </Btn>
          )}
          <PrintReceipt order={order} statuses={statuses} />
          <Btn variant="secondary" onClick={onEdit}><IcEdit size={15} /> تعديل</Btn>
          {onRepeat && (
            <Btn variant="ghost" onClick={() => onRepeat(order)} style={{ borderColor:'var(--violet-soft)', color:'var(--violet-light)' }}>
              🔁 تكرار
            </Btn>
          )}
          {onSaveTemplate && (
            <Btn variant="ghost" onClick={() => onSaveTemplate(order)} style={{ borderColor:'rgba(245,158,11,0.3)', color:'#f59e0b' }}>
              📋 حفظ كقالب
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   KANBAN BOARD — native HTML5 drag & drop
══════════════════════════════════════════════ */
function KanbanBoard({ statuses, orders, onStatusChange, onView, onEdit }) {
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [dropping, setDropping] = useState(null)

  function onDragStart(e, orderId) {
    setDragId(orderId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', orderId)
    // ghost image
    e.currentTarget.style.opacity = '0.5'
  }

  function onDragEnd(e) {
    e.currentTarget.style.opacity = '1'
    setDragId(null)
    setDragOver(null)
  }

  function onDragOver(e, statusId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(statusId)
  }

  async function onDrop(e, statusId) {
    e.preventDefault()
    const id = dragId || e.dataTransfer.getData('text/plain')
    if (!id) return
    const order = orders.find(o => o.id === id)
    if (!order || order.status === statusId) { setDragOver(null); setDragId(null); return }
    setDropping(id)
    await onStatusChange(id, statusId)
    setDropping(null)
    setDragOver(null)
    setDragId(null)
  }

  return (
    <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:20, alignItems:'flex-start', minHeight:300 }}>
      {statuses.map(status => {
        const col = orders.filter(o => o.status === status.id)
        const total = col.reduce((s,o) => s+(o.total||0), 0)
        const isOver = dragOver === status.id

        return (
          <div
            key={status.id}
            style={{ minWidth:270, flex:'0 0 270px', transition:'all 0.2s ease' }}
            onDragOver={e => onDragOver(e, status.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, status.id)}
          >
            {/* Column header */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 14px', marginBottom:10,
              background: isOver ? `${status.color}20` : `${status.color}10`,
              border:`1.5px solid ${isOver ? status.color : status.color+'30'}`,
              borderRadius:'var(--radius)',
              transition:'all 0.2s ease',
              boxShadow: isOver ? `0 0 16px ${status.color}30` : 'none',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:status.color, boxShadow:`0 0 6px ${status.color}`, flexShrink:0 }} />
                <span style={{ fontWeight:800, fontSize:13, color:status.color }}>{status.label}</span>
                <span style={{ fontSize:11, fontWeight:800, padding:'2px 8px', background:`${status.color}22`, borderRadius:'var(--radius-pill)', color:status.color }}>{col.length}</span>
              </div>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{total.toLocaleString()} د.إ</span>
            </div>

            {/* Drop zone */}
            <div style={{
              display:'flex', flexDirection:'column', gap:9,
              minHeight:80, padding: isOver ? '6px' : '0',
              background: isOver ? `${status.color}06` : 'transparent',
              borderRadius:'var(--radius)',
              border: isOver ? `2px dashed ${status.color}50` : '2px dashed transparent',
              transition:'all 0.2s ease',
            }}>
              {col.length === 0 && !isOver && (
                <div style={{ padding:'24px 10px', textAlign:'center', color:'var(--text-muted)', fontSize:12, background:'var(--bg-glass)', borderRadius:'var(--radius)', border:'1.5px dashed var(--glass-border)' }}>
                  اسحب طلباً هنا
                </div>
              )}

              {col.map(order => (
                <div
                  key={order.id}
                  draggable
                  onDragStart={e => onDragStart(e, order.id)}
                  onDragEnd={onDragEnd}
                  style={{
                    background:'var(--bg-glass)',
                    backdropFilter:'var(--blur-md)',
                    border:`1.5px solid ${dragId===order.id ? status.color+'60' : 'var(--glass-border)'}`,
                    borderRadius:'var(--radius)',
                    padding:'12px 14px',
                    cursor:'grab',
                    transition:'all 0.2s ease',
                    opacity: dropping===order.id ? 0.5 : 1,
                    boxShadow: dragId===order.id ? `0 8px 24px rgba(0,0,0,0.4)` : 'var(--shadow-card)',
                    userSelect:'none',
                    position:'relative', overflow:'hidden',
                  }}
                  className="list-row"
                >
                  {/* Color top strip */}
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${status.color},${status.color}80)` }} />

                  {/* Order number */}
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', fontWeight:600, marginBottom:7, letterSpacing:'0.05em' }}>
                    {order.order_number}
                  </div>

                  {/* Customer */}
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:4, lineHeight:1.3 }}>
                    {order.customer_name || order.customer_phone || 'طلب'}
                  </div>

                  {order.customer_city && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>📍 {order.customer_city}</div>
                  )}

                  {/* Items preview */}
                  {order.items?.length > 0 && (
                    <div style={{ fontSize:11, color:'var(--text-sec)', marginBottom:8, lineHeight:1.4 }}>
                      {order.items.slice(0,2).map(i=>`${i.name} ×${i.qty}`).join(' · ')}
                      {order.items.length > 2 && ` +${order.items.length-2}`}
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:900, fontSize:14, color:'var(--teal)' }}>{(order.total||0).toLocaleString()} د.إ</span>
                    <div style={{ display:'flex', gap:4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onView(order) }}
                        style={{ background:'rgba(0,228,184,0.12)', border:'1px solid rgba(0,228,184,0.22)', borderRadius:'var(--radius-pill)', padding:'4px 10px', color:'var(--teal)', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}
                      >عرض</button>
                      <button
                        onClick={e => { e.stopPropagation(); onEdit(order) }}
                        style={{ background:'var(--bg-glass)', border:'1.5px solid var(--glass-border)', borderRadius:'var(--radius-pill)', padding:'4px 10px', color:'var(--text-sec)', cursor:'pointer', fontSize:11, fontFamily:'inherit' }}
                      >تعديل</button>
                    </div>
                  </div>

                  {/* Drag handle hint */}
                  <div style={{ position:'absolute', top:'50%', left:8, transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:10, opacity:0.4, pointerEvents:'none' }}>⠿</div>
                </div>
              ))}

              {isOver && (
                <div style={{ height:60, border:`2px dashed ${status.color}60`, borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center', color:status.color, fontSize:12, fontWeight:700, background:`${status.color}08` }}>
                  ⬇ أفلت هنا
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════
   ORDER TIMELINE — shows internal_notes history
══════════════════════════════════════════════ */
function OrderTimeline({ notes, statuses }) {
  if (!notes?.length) return null
  const sorted = [...notes].sort((a,b) => new Date(a.time) - new Date(b.time))

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
        <span>⏱</span> سجل الطلب
      </div>
      <div style={{ position:'relative', paddingRight:16 }}>
        {/* Vertical line */}
        <div style={{ position:'absolute', right:5, top:6, bottom:6, width:2, background:'linear-gradient(to bottom, var(--teal), var(--violet-light))', borderRadius:2, opacity:0.3 }} />

        {sorted.map((note, i) => {
          const isLast = i === sorted.length - 1
          const d = new Date(note.time)
          const timeStr = d.toLocaleTimeString('ar-AE', { hour:'2-digit', minute:'2-digit' })
          const dateStr = d.toLocaleDateString('ar-AE', { month:'short', day:'numeric' })
          return (
            <div key={i} style={{ display:'flex', gap:10, marginBottom: isLast ? 0 : 12, alignItems:'flex-start' }}>
              {/* Dot */}
              <div style={{
                width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:3,
                background: isLast ? 'var(--teal)' : 'var(--violet-light)',
                boxShadow: isLast ? '0 0 8px var(--teal-glow)' : 'none',
                border:`2px solid var(--bg)`,
              }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color: isLast ? 'var(--text)' : 'var(--text-sec)', fontWeight: isLast ? 700 : 400 }}>
                  {note.text}
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                  {dateStr} • {timeStr}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   BOTTOM SHEET FILTERS — mobile native feel
══════════════════════════════════════════════ */
function BottomSheetFilters({ open, onClose, filterStatus, setFilterStatus, filterSource, setFilterSource, statuses }) {
  const hasFilters = filterStatus !== 'all' || filterSource !== 'all'

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:998, animation:'fadeIn 0.2s ease' }}
      />
      {/* Sheet */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:999,
        background:'var(--modal-bg)',
        backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
        border:'1.5px solid var(--glass-border-strong)',
        borderRadius:'24px 24px 0 0',
        padding:'0 0 env(safe-area-inset-bottom,16px)',
        animation:'slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both',
        maxHeight:'80vh', overflowY:'auto',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:8 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--glass-border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px 16px' }}>
          <span style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>تصفية الطلبات</span>
          {hasFilters && (
            <button onClick={() => { setFilterStatus('all'); setFilterSource('all') }} style={{
              fontSize:12, color:'var(--teal)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700,
            }}>مسح الكل</button>
          )}
        </div>

        {/* Status section */}
        <div style={{ padding:'0 20px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>الحالة</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[{ id:'all', label:'الكل', color:'var(--text-sec)' }, ...statuses].map(s => (
              <button key={s.id} onClick={() => setFilterStatus(s.id)} style={{
                padding:'8px 16px', borderRadius:999, border:`1.5px solid ${filterStatus===s.id ? (s.color||'var(--teal)') : 'var(--glass-border)'}`,
                background: filterStatus===s.id ? `${s.color||'var(--teal)'}22` : 'var(--bg-glass)',
                color: filterStatus===s.id ? (s.color||'var(--teal)') : 'var(--text-sec)',
                cursor:'pointer', fontSize:13, fontWeight: filterStatus===s.id ? 800 : 500,
                fontFamily:'inherit', transition:'all 0.15s ease',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Source section */}
        <div style={{ padding:'0 20px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>المصدر</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[['all','الكل'], ...Object.entries(SOURCE_LABELS)].map(([k,v]) => (
              <button key={k} onClick={() => setFilterSource(k)} style={{
                padding:'8px 16px', borderRadius:999,
                border:`1.5px solid ${filterSource===k ? 'var(--violet-light)' : 'var(--glass-border)'}`,
                background: filterSource===k ? 'var(--violet-soft)' : 'var(--bg-glass)',
                color: filterSource===k ? 'var(--violet-light)' : 'var(--text-sec)',
                cursor:'pointer', fontSize:13, fontWeight: filterSource===k ? 800 : 500,
                fontFamily:'inherit', transition:'all 0.15s ease',
              }}>{v}</button>
            ))}
          </div>
        </div>

        {/* Apply button */}
        <div style={{ padding:'8px 20px 20px' }}>
          <button onClick={onClose} style={{
            width:'100%', padding:'14px', borderRadius:'var(--radius)',
            background:'linear-gradient(135deg,var(--teal),var(--violet))',
            border:'none', color:'#050c1a', fontSize:15, fontWeight:900,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            تطبيق الفلتر {hasFilters ? '✓' : ''}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </>
  )
}

/* ══════════════════════════════════════════════
   ORDER TEMPLATES MODAL
   Browse, use, or delete saved templates
══════════════════════════════════════════════ */
function OrderTemplatesModal({ open, onClose, templates, onUse, onDelete }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title="قوالب الطلبات" maxWidth={480}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {templates.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
            <div style={{ fontWeight:700, marginBottom:6 }}>لا يوجد قوالب بعد</div>
            <div style={{ fontSize:12 }}>افتح أي طلب واضغط "حفظ كقالب" لإنشاء قالب</div>
          </div>
        ) : templates.map(t => (
          <div key={t.id} style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
            background:'var(--bg-glass)', border:'1.5px solid var(--glass-border)',
            borderRadius:'var(--radius)', 
          }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'var(--text)', marginBottom:3 }}>{t.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                {t.items?.length > 0
                  ? t.items.map(i=>`${i.name} ×${i.qty}`).join(' · ')
                  : 'بدون منتجات'}
                {t.customer_city ? ` • ${t.customer_city}` : ''}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <Btn size="sm" onClick={() => onUse(t)}>استخدام</Btn>
              <Btn variant="danger" size="sm" onClick={() => onDelete(t.id)}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   QUICK STATUS PICKER
   Floating pill menu that appears when tapping
   status badge on a list row
══════════════════════════════════════════════ */
function QuickStatusPicker({ orderId, statuses, currentStatus, onSelect, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:997 }} />
      {/* Bottom sheet style on mobile */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:998,
        background:'var(--modal-bg)',
        backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
        border:'1.5px solid var(--glass-border-strong)',
        borderRadius:'24px 24px 0 0',
        padding:'16px 20px env(safe-area-inset-bottom,20px)',
        animation:'slideUp 0.22s ease both',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--glass-border-strong)' }} />
        </div>
        <div style={{ fontWeight:800, fontSize:15, color:'var(--text)', marginBottom:14, textAlign:'center' }}>
          تغيير حالة الطلب
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {statuses.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(orderId, s.id)}
              style={{
                padding:'13px 16px', borderRadius:'var(--radius)',
                border:`1.5px solid ${currentStatus===s.id ? s.color : 'var(--glass-border)'}`,
                background: currentStatus===s.id ? `${s.color}18` : 'var(--bg-glass)',
                color: currentStatus===s.id ? s.color : 'var(--text)',
                cursor:'pointer', fontFamily:'inherit', fontSize:14,
                fontWeight: currentStatus===s.id ? 800 : 500,
                display:'flex', alignItems:'center', gap:10,
                transition:'all 0.15s ease',
              }}
            >
              <span style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0, boxShadow: currentStatus===s.id ? `0 0 8px ${s.color}` : 'none' }} />
              {s.label}
              {currentStatus===s.id && <span style={{ marginRight:'auto', fontSize:16 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
