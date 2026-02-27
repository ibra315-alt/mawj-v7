import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DB, Settings, generateOrderNumber, supabase } from '../data/db'
import { subscribeOrders } from '../data/realtime'
import { formatCurrency, formatDate, SOURCE_LABELS, UAE_CITIES } from '../data/constants'
import { calcOrderProfit, ORDER_STATUSES, PIPELINE_STATUSES, getStatusInfo, getNextStatus } from '../data/finance'
import { Btn, Badge, Input, Select, Textarea, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcSearch, IcEdit, IcDelete, IcEye, IcWhatsapp, IcSave, IcNote, IcRefresh, IcClose, IcCheck } from '../components/Icons'
import PrintReceipt from '../components/PrintReceipt'
import Confetti from '../components/Confetti'

// Re-export for backward compatibility with other files that import from Orders
export { calcOrderProfit, ORDER_STATUSES }

function getStatus(id) {
  return ORDER_STATUSES.find(s => s.id === id) || { id, label: id || '—', color: 'var(--text-muted)', bg: 'rgba(107,114,128,0.1)' }
}

/* ═══════════════════════════════════════════
   THE BOARD — Orders Management
═══════════════════════════════════════════ */
export default function Orders({ user }) {
  const [orders,         setOrders]         = useState([])
  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [activeStatus,   setActiveStatus]   = useState('new')
  const [showPanel,      setShowPanel]      = useState(false)
  const [showView,       setShowView]       = useState(false)
  const [editOrder,      setEditOrder]      = useState(null)
  const [viewOrder,      setViewOrder]      = useState(null)
  const [deleteId,       setDeleteId]       = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const [confetti,       setConfetti]       = useState(false)
  const [replacementFor, setReplacementFor] = useState(null)

  useEffect(() => {
    loadAll()
    const unsub = subscribeOrders(() => loadOrders())
    return unsub
  }, [])

  async function loadAll() {
    try {
      const [ords, prods] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at' }),
        Settings.get('products'),
      ])
      setOrders(ords.reverse())
      const allProds = prods || []
      const activeProds = allProds.filter(p => p.active)
      setProducts(activeProds.length > 0 ? activeProds : allProds)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadOrders() {
    try {
      const ords = await DB.list('orders', { orderBy: 'created_at' })
      setOrders(ords.reverse())
    } catch {}
  }

  async function triggerWhatsAppNotification(order, newStatus) {
    const STATUS_TO_TRIGGER = {
      confirmed: 'on_confirmed',
      shipped: 'on_shipped',
      delivered: 'on_delivered',
      not_delivered: 'on_not_delivered',
    }
    const triggerKey = STATUS_TO_TRIGGER[newStatus]
    if (!triggerKey) return

    const [autoSettings, templates, sendMode] = await Promise.all([
      Settings.get('whatsapp_auto_notifications'),
      Settings.get('whatsapp_templates'),
      Settings.get('whatsapp_send_mode'),
    ])
    if (!autoSettings?.[triggerKey]) return

    const TRIGGER_TO_TEMPLATE = {
      on_confirmed: 'order_confirm',
      on_shipped: 'order_shipped',
      on_delivered: 'order_delivered',
      on_not_delivered: 'payment_reminder',
    }
    const tplKey = TRIGGER_TO_TEMPLATE[triggerKey]
    const template = templates?.[tplKey]
    if (!template) return

    // Fill template variables
    let phone = order.customer_phone?.replace(/[\s\-\(\)]/g, '') || ''
    if (/^0/.test(phone)) phone = '971' + phone.slice(1)
    else if (/^5/.test(phone)) phone = '971' + phone
    else if (/^\+971/.test(phone)) phone = phone.slice(1)
    if (!phone) return

    const msg = template
      .replace(/\{customer_name\}/g, order.customer_name || 'عزيزي العميل')
      .replace(/\{order_number\}/g, order.order_number || '')
      .replace(/\{total\}/g, String(order.total || ''))
      .replace(/\{tracking_number\}/g, order.tracking_number || '')
      .replace(/\{city\}/g, order.customer_city || '')
      .replace(/\{date\}/g, new Date().toLocaleDateString('ar-AE'))

    if (sendMode === 'wame') {
      // Open wa.me link
      const encoded = encodeURIComponent(msg)
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
      toast('تم فتح رابط wa.me للإرسال', 'success')
    } else {
      // Send via API
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-sender`
        await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, message: msg }),
        })
        toast('تم إرسال إشعار واتساب تلقائياً ✓', 'success')
      } catch {
        // Silent fail — don't block the status change
      }
    }
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
      } else {
        toast(`تم النقل إلى: ${getStatus(newStatus).label}`)
      }

      // ── Auto WhatsApp notification on status change ──
      if (order?.customer_phone) {
        triggerWhatsAppNotification(order, newStatus).catch(() => {})
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

  // Count by status
  const statusCounts = {}
  PIPELINE_STATUSES.forEach(s => { statusCounts[s.id] = 0 })
  orders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++ })

  // Filtered orders for current tab
  const tabOrders = orders.filter(o => {
    const matchStatus = o.status === activeStatus
    if (!matchStatus) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (o.customer_name || '').includes(q)
      || (o.order_number || '').toLowerCase().includes(q)
      || (o.customer_phone || '').includes(q)
  })

  if (loading) return (
    <div className="page">
      <PageHeader title="اللوحة" subtitle="جاري التحميل..." />
      <SkeletonStats count={5} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, marginTop:16 }}>
        {[1,2,3,4].map(i => <SkeletonCard key={i} rows={3} />)}
      </div>
    </div>
  )

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <Confetti active={confetti} />

      <PageHeader
        title="اللوحة"
        subtitle={`${orders.length} طلب`}
        actions={
          <Btn onClick={() => { setEditOrder(null); setReplacementFor(null); setShowPanel(true) }} style={{ gap:6 }}>
            <IcPlus size={16}/> طلب جديد
          </Btn>
        }
      />

      {/* ── Pipeline Status Bar ───────────────────── */}
      <PipelineBar
        statuses={PIPELINE_STATUSES}
        counts={statusCounts}
        active={activeStatus}
        onSelect={setActiveStatus}
      />

      {/* ── Search ───────────────────────────────── */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <IcSearch size={15} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو رقم الطلب..."
          style={{
            width:'100%', padding:'11px 36px 11px 12px',
            background:'var(--bg-surface)', border:'1.5px solid var(--input-border)',
            borderRadius:'var(--r-md)', color:'var(--text)', fontSize:14,
            fontFamily:'inherit', outline:'none', boxSizing:'border-box',
            boxShadow:'var(--card-shadow)',
          }}
        />
      </div>

      {/* ── Board Cards ──────────────────────────── */}
      {tabOrders.length === 0 ? (
        <Empty
          title={search ? 'لا توجد نتائج' : `لا توجد طلبات ${getStatus(activeStatus).label}`}
          action={!search && <Btn onClick={() => setShowPanel(true)}><IcPlus size={14}/> طلب جديد</Btn>}
        />
      ) : (
        <div className="board-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
          {tabOrders.map(order => (
            <BoardCard
              key={order.id}
              order={order}
              onView={() => { setViewOrder(order); setShowView(true) }}
              onEdit={() => { setEditOrder(order); setShowPanel(true) }}
              onDelete={() => setDeleteId(order.id)}
              onAdvance={(newStatus) => handleStatusChange(order.id, newStatus)}
              onReplacement={() => {
                setReplacementFor(order)
                setEditOrder(null)
                setShowPanel(true)
              }}
            />
          ))}
        </div>
      )}

      {/* ── Order SlideOver Panel ────────────────── */}
      <OrderPanel
        open={showPanel}
        onClose={() => { setShowPanel(false); setEditOrder(null); setReplacementFor(null) }}
        order={editOrder}
        replacementFor={replacementFor}
        products={products}
        user={user}
        onSaved={saved => {
          setOrders(prev => editOrder
            ? prev.map(o => o.id === saved.id ? saved : o)
            : [saved, ...prev]
          )
          setShowPanel(false); setEditOrder(null); setReplacementFor(null)
          toast(editOrder ? 'تم تحديث الطلب ✓' : 'تم إضافة الطلب ✓')
        }}
      />

      {/* ── View Modal ───────────────────────────── */}
      <OrderViewModal
        open={showView}
        onClose={() => { setShowView(false); setViewOrder(null) }}
        order={viewOrder}
        onEdit={() => { setEditOrder(viewOrder); setShowView(false); setShowPanel(true) }}
        onStatusChange={handleStatusChange}
        onReplacement={orig => { setReplacementFor(orig); setEditOrder(null); setShowView(false); setShowPanel(true) }}
      />

      {/* ── Delete Confirm ───────────────────────── */}
      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} loading={deleting}
        message="سيتم حذف الطلب نهائياً ولا يمكن استعادته."
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   PIPELINE STATUS BAR
   Horizontal scrollable status tabs with counts
═══════════════════════════════════════════ */
function PipelineBar({ statuses, counts, active, onSelect }) {
  const scrollRef = useRef(null)

  return (
    <div style={{ marginBottom:16 }}>
      <div
        ref={scrollRef}
        className="pipeline-bar"
        style={{
          display:'flex', gap:6, overflowX:'auto',
          paddingBottom:6, scrollbarWidth:'none',
          WebkitOverflowScrolling:'touch',
        }}
      >
        {statuses.map((s, i) => {
          const isActive = active === s.id
          const count = counts[s.id] || 0
          const isLast = i === statuses.length - 1
          return (
            <React.Fragment key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center',
                  gap:4, padding:'10px 16px', borderRadius:'var(--r-md)',
                  border: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                  background: isActive ? s.bg : 'var(--bg-surface)',
                  cursor:'pointer', flexShrink:0, minWidth:72,
                  boxShadow: isActive ? `0 0 12px ${s.color}20` : 'var(--card-shadow)',
                  transition:'all 150ms ease',
                }}
              >
                <span style={{
                  fontSize:22, fontWeight:900, fontFamily:'Inter,sans-serif',
                  color: isActive ? s.color : 'var(--text-muted)',
                  lineHeight:1,
                }}>
                  {count}
                </span>
                <span style={{
                  fontSize:12, fontWeight: isActive ? 800 : 600,
                  color: isActive ? s.color : 'var(--text-muted)',
                  whiteSpace:'nowrap',
                }}>
                  {s.label}
                </span>
              </button>
              {!isLast && i < 3 && (
                <div style={{
                  display:'flex', alignItems:'center', flexShrink:0,
                  color:'var(--text-muted)', fontSize:14, opacity:0.4,
                }}>
                  ←
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   BOARD CARD
   Order card with contextual action buttons
═══════════════════════════════════════════ */
function BoardCard({ order, onView, onEdit, onDelete, onAdvance, onReplacement }) {
  const status  = getStatus(order.status)
  const profit  = order.gross_profit ?? 0
  const isRepl  = order.is_replacement
  const next    = getNextStatus(order.status)

  return (
    <div
      style={{
        background:'var(--bg-surface)', borderRadius:'var(--r-lg)',
        borderInlineStart:`3px solid ${isRepl ? 'var(--warning)' : status.color}`,
        boxShadow:'var(--card-shadow)', overflow:'hidden',
        transition:'box-shadow 150ms, transform 150ms',
        display:'flex', flexDirection:'column',
      }}
    >
      {/* Card body — clickable to view */}
      <div
        onClick={onView}
        style={{ padding:'14px 16px', cursor:'pointer', flex:1 }}
      >
        {/* Row 1: Customer name + Total */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{
            fontSize:15, fontWeight:700, color:'var(--text)',
            maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {order.customer_name || 'عميل'}
          </span>
          <span style={{
            fontSize:17, fontWeight:900, fontFamily:'Inter,sans-serif',
            color: profit < 0 ? 'var(--danger)' : 'var(--action)',
          }}>
            {formatCurrency(order.total || 0)}
          </span>
        </div>

        {/* Row 2: Order number + meta */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{
              fontSize:11, color:'var(--text-muted)', fontFamily:'Inter,monospace',
              fontWeight:600, direction:'ltr',
            }}>
              {order.order_number}
            </span>
            {isRepl && (
              <span style={{
                fontSize:10, background:'rgba(var(--warning-rgb),0.15)',
                color:'var(--warning)', borderRadius:4, padding:'1px 6px', fontWeight:700,
              }}>
                استبدال
              </span>
            )}
          </div>
          <div style={{ display:'flex', gap:8, fontSize:11, color:'var(--text-muted)' }}>
            {order.customer_city && <span>{order.customer_city}</span>}
          </div>
        </div>

        {/* Row 3: Items preview */}
        {order.items?.length > 0 && (
          <div style={{
            fontSize:12, color:'var(--text-sec)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            marginBottom:6,
          }}>
            {order.items.slice(0,3).map(i => `${i.name}${i.size ? ` (${i.size})` : ''} ×${i.qty}`).join(' · ')}
            {order.items.length > 3 && ` +${order.items.length-3}`}
          </div>
        )}

        {/* Row 4: Profit */}
        {profit !== 0 && (
          <div style={{
            fontSize:13, fontWeight:700, fontFamily:'Inter,sans-serif',
            color: profit >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            ربح: {profit > 0 ? '+' : ''}{formatCurrency(profit)}
          </div>
        )}
      </div>

      {/* ── Actions footer ───────────────────── */}
      <div style={{
        padding:'10px 16px', borderTop:'1px solid var(--border)',
        display:'flex', gap:6, alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap',
      }}>
        {/* Left: utility actions */}
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <button onClick={onEdit} title="تعديل" style={{
            padding:'6px 8px', background:'none', border:'1px solid var(--border)',
            borderRadius:'var(--r-sm)', color:'var(--text-muted)', cursor:'pointer',
            display:'flex', alignItems:'center', fontSize:12,
          }}>
            <IcEdit size={13}/>
          </button>
          <button onClick={onDelete} title="حذف" style={{
            padding:'6px 8px', background:'none', border:'1px solid rgba(var(--danger-rgb),0.2)',
            borderRadius:'var(--r-sm)', color:'var(--danger)', cursor:'pointer',
            display:'flex', alignItems:'center', fontSize:12, opacity:0.7,
          }}>
            <IcDelete size={13}/>
          </button>
          {order.customer_phone && (
            <a
              href={`https://wa.me/${order.customer_phone.replace(/\D/g,'')}?text=${encodeURIComponent(`مرحبا ${order.customer_name||''}،\nرقم طلبك: ${order.order_number}\nالإجمالي: ${(order.total||0).toLocaleString()} درهم\n\nشكراً لتسوقك مع موج 🌊`)}`}
              target="_blank" rel="noreferrer"
              style={{
                padding:'6px 8px', background:'rgba(37,211,102,0.08)',
                border:'1px solid rgba(37,211,102,0.25)', borderRadius:'var(--r-sm)',
                color:'var(--whatsapp)', display:'flex', alignItems:'center',
                textDecoration:'none', fontSize:12,
              }}
            >
              <IcWhatsapp size={13}/>
            </a>
          )}
        </div>

        {/* Right: advance actions */}
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {/* For with_hayyak: show both delivered and not_delivered */}
          {order.status === 'with_hayyak' && (
            <>
              <button
                onClick={() => onAdvance('not_delivered')}
                style={{
                  padding:'7px 12px', borderRadius:'var(--r-sm)',
                  background:'rgba(var(--danger-rgb),0.08)', border:'1.5px solid rgba(var(--danger-rgb),0.25)',
                  color:'var(--danger)', fontSize:12, fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', gap:4,
                }}
              >
                ✗ لم يتم
              </button>
              <button
                onClick={() => onAdvance('delivered')}
                style={{
                  padding:'7px 14px', borderRadius:'var(--r-sm)',
                  background:'linear-gradient(135deg,var(--success),var(--success-light))',
                  border:'none', color:'#fff', fontSize:13, fontWeight:800,
                  cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', gap:4,
                  boxShadow:'0 2px 8px rgba(var(--success-rgb),0.3)',
                }}
              >
                ✓ مسلّم
              </button>
            </>
          )}

          {/* For other statuses with a next step */}
          {next && order.status !== 'with_hayyak' && (
            <button
              onClick={() => onAdvance(next.id)}
              style={{
                padding:'7px 14px', borderRadius:'var(--r-sm)',
                background: next.bg, border:`1.5px solid ${next.color}40`,
                color: next.color, fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', gap:5,
              }}
            >
              {next.label} ←
            </button>
          )}

          {/* For delivered: replacement button */}
          {order.status === 'delivered' && !order.is_replacement && (
            <button
              onClick={onReplacement}
              style={{
                padding:'7px 12px', borderRadius:'var(--r-sm)',
                background:'rgba(var(--warning-rgb),0.08)', border:'1.5px solid rgba(var(--warning-rgb),0.25)',
                color:'var(--warning)', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', gap:4,
              }}
            >
              <IcRefresh size={12}/> استبدال
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ORDER SLIDE-OVER PANEL
   RTL: slides from left (inline-end)
   Desktop: 50% width | Mobile: 100% width
═══════════════════════════════════════════ */
function OrderPanel({ open, onClose, order, replacementFor, products, onSaved, user }) {
  const isEdit = !!order
  const isRepl = !!replacementFor && !order

  const [form,            setForm]            = useState({})
  const [items,           setItems]           = useState([])
  const [saving,          setSaving]          = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [phoneWarning,    setPhoneWarning]    = useState(null)

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
        hayyak_fee:         25, discount:0, status:'with_hayyak',
        notes:              `استبدال للطلب ${replacementFor.order_number}`,
        order_date:         new Date().toISOString().split('T')[0],
        is_replacement:     true,
        replacement_for_id: replacementFor.id,
      })
      setItems((replacementFor.items || []).map(i => ({ ...i, engraving_notes:'' })))
    } else {
      setForm({
        customer_name:'', customer_phone:'', customer_city:'', customer_address:'',
        hayyak_fee:25, discount:0, status:'new', notes:'',
        order_date: new Date().toISOString().split('T')[0],
        is_replacement:false, replacement_for_id:null,
      })
      setItems([])
    }
    setSelectedProduct(null)
    setPhoneWarning(null)
  }, [open, order, replacementFor])

  const setField = (k, v) => setForm(p => ({ ...p, [k]:v }))

  function addItem(productName, sizeVariant) {
    const key = `${sizeVariant.id}`
    setItems(prev => {
      const existing = prev.find(i => i.id === key)
      if (existing) return prev.map(i => i.id === key ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: key, name: productName, size: sizeVariant.size, price: sizeVariant.price, cost: sizeVariant.cost, qty: 1, engraving_notes: '' }]
    })
    setSelectedProduct(null)
  }
  function removeItem(idx) { setItems(p => p.filter((_,i) => i !== idx)) }
  function updateItem(idx, field, val) { setItems(p => p.map((it, i) => i === idx ? { ...it, [field]: val } : it)) }

  const calc = calcOrderProfit({
    items, hayyak_fee: form.hayyak_fee,
    discount: form.discount, is_replacement: form.is_replacement,
  })

  async function handleSave() {
    if (items.length === 0) { toast('أضف منتجاً واحداً على الأقل', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        customer_name: form.customer_name, customer_phone: form.customer_phone,
        customer_city: form.customer_city, customer_address: form.customer_address,
        status: form.status, notes: form.notes,
        hayyak_fee: calc.hayyak_fee, discount: parseFloat(form.discount) || 0,
        items, subtotal: calc.subtotal, product_cost: calc.product_cost,
        total: calc.total, gross_profit: calc.gross_profit,
        is_replacement: form.is_replacement || false,
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

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          zIndex:1000, transition:'opacity 200ms',
        }}
      />

      {/* Panel */}
      <div
        className="order-panel"
        style={{
          position:'fixed', top:0, bottom:0, left:0, zIndex:1001,
          background:'var(--modal-bg)', boxShadow:'var(--modal-shadow)',
          display:'flex', flexDirection:'column',
          animation:'slidePanelIn 250ms ease both',
          overflowY:'auto', WebkitOverflowScrolling:'touch',
        }}
      >
        {/* Header */}
        <div style={{
          position:'sticky', top:0, zIndex:2,
          padding:'16px 20px', background:'var(--modal-bg)',
          borderBottom:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--text)' }}>
            {isEdit ? 'تعديل الطلب' : isRepl ? `استبدال — ${replacementFor?.order_number}` : 'طلب جديد'}
          </h2>
          <button onClick={onClose} style={{
            background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-sm)',
            padding:8, cursor:'pointer', color:'var(--text-muted)',
            display:'flex', alignItems:'center',
          }}>
            <IcClose size={18}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, padding:'20px', overflowY:'auto' }}>
          {/* Replacement warning */}
          {isRepl && (
            <div style={{
              marginBottom:16, padding:'12px 14px',
              background:'rgba(var(--warning-rgb),0.1)', border:'1.5px solid rgba(var(--warning-rgb),0.3)',
              borderRadius:'var(--r-md)', fontSize:13, color:'var(--warning)', fontWeight:700,
            }}>
              طلب استبدال مجاني — الربح سيكون سالباً
            </div>
          )}

          {/* Phone warning */}
          {phoneWarning && (
            <div style={{
              marginBottom:12, padding:'10px 14px',
              background:'rgba(var(--warning-rgb),0.1)', border:'1.5px solid rgba(var(--warning-rgb),0.35)',
              borderRadius:'var(--r-md)', fontSize:12, color:'var(--warning)',
            }}>
              <b>رقم الهاتف موجود في طلب مفتوح:</b> {phoneWarning.customer_name || 'عميل'} — {phoneWarning.order_number}
            </div>
          )}

          {/* Customer info */}
          <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            <Input label="اسم العميل"        value={form.customer_name    || ''} onChange={e => setField('customer_name',    e.target.value)} placeholder="اختياري"/>
            <Input label="رقم الهاتف"        value={form.customer_phone   || ''} onChange={e => setField('customer_phone',   e.target.value)} placeholder="+971..." dir="ltr"/>
            <Select label="الإمارة"           value={form.customer_city    || ''} onChange={e => setField('customer_city',    e.target.value)}>
              <option value="">اختر الإمارة</option>
              {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="العنوان التفصيلي"   value={form.customer_address || ''} onChange={e => setField('customer_address', e.target.value)} placeholder="الحي / الشارع..."/>
          </div>

          {/* Products picker */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontWeight:700, fontSize:12, color:'var(--text-muted)', letterSpacing:'0.05em', marginBottom:10 }}>المنتجات</div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: selectedProduct ? 10 : 0 }}>
              {products.map(p => {
                const sizes = p.sizes?.length > 0 ? p.sizes : [{ id: p.id, size: p.size || '', cost: p.cost || 0, price: p.price || 0, category: p.category || 'small' }]
                const isSingle = sizes.length === 1
                const isSelected = selectedProduct?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (isSingle) addItem(p.name, sizes[0])
                      else setSelectedProduct(isSelected ? null : { ...p, sizes })
                    }}
                    style={{
                      padding:'8px 14px', borderRadius:'var(--r-sm)', cursor:'pointer',
                      fontFamily:'inherit', fontSize:13, fontWeight:700, transition:'all 120ms',
                      background: isSelected ? 'var(--action-soft)' : 'var(--bg-hover)',
                      border: `1.5px solid ${isSelected ? 'var(--action)' : 'var(--border)'}`,
                      color: isSelected ? 'var(--action)' : 'var(--text-sec)',
                    }}
                  >
                    {p.name}
                    {!isSingle && <span style={{ fontSize:10, marginInlineStart:5, opacity:0.6 }}>{isSelected ? '▲' : '▼'}</span>}
                  </button>
                )
              })}
            </div>

            {/* Size picker */}
            {selectedProduct && (
              <div style={{
                padding:'12px 14px', marginBottom:8,
                background:'var(--bg-surface)', borderRadius:'var(--r-md)',
                border:'1.5px solid var(--action)', boxShadow:'0 0 12px rgba(var(--action-rgb),0.08)',
              }}>
                <div style={{ fontSize:11, color:'var(--action)', fontWeight:700, marginBottom:8 }}>
                  {selectedProduct.name} — اختر الحجم:
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {(selectedProduct.sizes || []).map(sv => (
                    <button
                      key={sv.id}
                      onClick={() => addItem(selectedProduct.name, sv)}
                      style={{
                        padding:'10px 18px', borderRadius:'var(--r-sm)', cursor:'pointer',
                        fontFamily:'inherit', transition:'all 120ms', textAlign:'center',
                        background:'var(--bg-hover)', border:'1.5px solid var(--border)',
                        color:'var(--text)', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                      }}
                    >
                      <span style={{ fontSize:15, fontWeight:800 }}>{sv.size}</span>
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'Inter,sans-serif' }}>{sv.price} د.إ</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Items list */}
            {items.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:'10px 12px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.name}</span>
                        {item.size && <span style={{ fontSize:11, color:'var(--text-muted)', marginInlineStart:5 }}>({item.size})</span>}
                      </div>
                      <input type="number" value={item.price}
                        onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        style={{ width:65, padding:'4px 6px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, color:'var(--action)', fontSize:12, textAlign:'center', fontFamily:'Inter,sans-serif' }}
                      />
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>×</span>
                      <input type="number" min="1" value={item.qty}
                        onChange={e => updateItem(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width:42, padding:'4px 6px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)', fontSize:13, textAlign:'center', fontFamily:'inherit' }}
                      />
                      <span style={{ fontWeight:700, color:'var(--action)', fontSize:13, minWidth:58, textAlign:'left', fontFamily:'Inter,sans-serif' }}>
                        {formatCurrency(item.price * item.qty)}
                      </span>
                      <button onClick={() => removeItem(idx)} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <IcNote size={12} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                      <input
                        value={item.engraving_notes || ''}
                        onChange={e => updateItem(idx, 'engraving_notes', e.target.value)}
                        placeholder="ملاحظات النقش..."
                        style={{ flex:1, padding:'6px 10px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:12, fontFamily:'inherit', outline:'none' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial fields */}
          <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <Input
              label="رسوم حياك (يتحملها موج)" type="number" min="0"
              value={form.hayyak_fee ?? 25}
              onChange={e => setField('hayyak_fee', e.target.value)}
            />
            <Input label="خصم (د.إ)" type="number" min="0" value={form.discount || ''} onChange={e => setField('discount', e.target.value)}/>
            {!isEdit && <Input label="تاريخ الطلب" type="date" value={form.order_date || ''} onChange={e => setField('order_date', e.target.value)}/>}
          </div>

          {/* Live profit summary */}
          <div style={{
            padding:'14px 16px', borderRadius:'var(--r-md)', marginBottom:16,
            background: calc.gross_profit < 0 ? 'rgba(var(--danger-rgb),0.06)' : 'rgba(var(--action-rgb),0.06)',
            border:`1.5px solid ${calc.gross_profit < 0 ? 'rgba(var(--danger-rgb),0.2)' : 'rgba(var(--action-rgb),0.2)'}`,
          }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px', fontSize:13 }}>
              <span style={{ color:'var(--text-sec)' }}>مبيعات: <b style={{ fontFamily:'Inter,sans-serif' }}>{formatCurrency(calc.subtotal)}</b></span>
              {parseFloat(form.discount) > 0 && <span style={{ color:'var(--danger)' }}>خصم: −{formatCurrency(form.discount)}</span>}
              <span style={{ color:'var(--text-sec)' }}>تكلفة: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(calc.product_cost)}</b></span>
              <span style={{ color:'var(--text-sec)' }}>حياك: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(calc.hayyak_fee)}</b></span>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:8, fontSize:15, fontWeight:800, fontFamily:'Inter,sans-serif' }}>
              <span style={{ color:'var(--action)' }}>الإجمالي: {formatCurrency(calc.total)}</span>
              <span style={{ color: calc.gross_profit >= 0 ? 'var(--action)' : 'var(--danger)' }}>
                ربح: {calc.gross_profit >= 0 ? '+' : ''}{formatCurrency(calc.gross_profit)}
              </span>
            </div>
          </div>

          <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="أي ملاحظات إضافية..."/>
        </div>

        {/* Footer */}
        <div style={{
          position:'sticky', bottom:0, zIndex:2,
          padding:'14px 20px', background:'var(--modal-bg)',
          borderTop:'1px solid var(--border)',
          display:'flex', gap:10, justifyContent:'flex-end',
        }}>
          <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn loading={saving} onClick={handleSave} style={isRepl ? { background:'var(--warning)', color:'#000' } : {}}>
            <IcSave size={15}/> {isEdit ? 'حفظ التعديلات' : isRepl ? 'إرسال الاستبدال' : 'إضافة الطلب'}
          </Btn>
        </div>
      </div>

      <style>{`
        .order-panel {
          width: 50%;
          min-width: 440px;
        }
        @media (max-width: 768px) {
          .order-panel {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
        @keyframes slidePanelIn {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

/* ═══════════════════════════════════════════
   ORDER VIEW MODAL
═══════════════════════════════════════════ */
function OrderViewModal({ open, onClose, order, onEdit, onStatusChange, onReplacement }) {
  if (!order || !open) return null
  const status = getStatus(order.status)
  const profit = order.gross_profit ?? 0
  const [waMenuOpen, setWaMenuOpen] = useState(false)

  function sendWhatsApp(templateKey) {
    const phone = order.customer_phone?.replace(/\D/g,'')
    if (!phone) return
    const defaults = {
      order_confirm:   `مرحبا ${order.customer_name||'عزيزي العميل'}،\n\nتم استلام طلبك بنجاح ✅\nرقم الطلب: ${order.order_number}\nالإجمالي: ${(order.total||0).toLocaleString()} درهم\n\nشكراً لتسوقك مع موج 🌊`,
      order_delivered: `مرحبا ${order.customer_name||'عزيزي العميل'}،\n\nنأمل أن طلبك وصلك بشكل سليم 🎁\nرقم الطلب: ${order.order_number}\n\nيسعدنا خدمتك دائماً.\nموج 🌊`,
      not_delivered:   `مرحبا ${order.customer_name||'عزيزي العميل'}،\n\nتعذر علينا توصيل طلبك رقم ${order.order_number} 😕\n\nهل يمكنك تأكيد العنوان؟\n\nنحن هنا لخدمتك 💙`,
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(defaults[templateKey] || defaults.order_confirm)}`, '_blank')
    setWaMenuOpen(false)
  }

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.45)',
      padding:20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="order-view-modal" style={{
        position:'relative',
        width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto',
        background:'var(--modal-bg)',
        backdropFilter:'var(--glass-blur-lg)',
        WebkitBackdropFilter:'var(--glass-blur-lg)',
        borderRadius:'var(--r-xl)',
        boxShadow:'var(--modal-shadow)',
        border:'1px solid var(--border)',
        borderTopColor:'var(--glass-edge)',
        padding:'24px',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position:'absolute', top:16, left:16,
          background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-sm)',
          padding:6, cursor:'pointer', color:'var(--text-muted)',
          display:'flex', alignItems:'center',
        }}>
          <IcClose size={16}/>
        </button>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800 }}>{order.customer_name || 'عميل'}</div>
              {order.customer_phone && <div style={{ fontSize:13, color:'var(--text-muted)', direction:'ltr' }}>{order.customer_phone}</div>}
              {order.customer_city  && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{order.customer_city}{order.customer_address ? ` • ${order.customer_address}` : ''}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
              <Badge color={status.color}>{status.label}</Badge>
              {order.is_replacement && <Badge color="var(--warning)">استبدال</Badge>}
            </div>
          </div>

          {/* Order number */}
          {order.order_number && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>رقم الطلب:</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:'Inter,sans-serif', color:'var(--action)' }}>{order.order_number}</span>
            </div>
          )}

          {/* Items */}
          <div>
            <div style={{ fontWeight:700, fontSize:11, color:'var(--text-muted)', letterSpacing:'0.06em', marginBottom:8 }}>المنتجات</div>
            {order.items?.length > 0 ? order.items.map((item, i) => (
              <div key={i} style={{ background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:'10px 12px', marginBottom:6, border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: item.engraving_notes ? 6 : 0 }}>
                  <span style={{ fontWeight:700, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(item.price * item.qty)}</span>
                  <div>
                    <span style={{ fontSize:13, fontWeight:700 }}>{item.name}</span>
                    {item.size && <span style={{ fontSize:11, color:'var(--text-muted)', marginInlineStart:5 }}>({item.size})</span>}
                    <span style={{ fontSize:12, color:'var(--text-muted)', marginInlineStart:4 }}>× {item.qty}</span>
                  </div>
                </div>
                {item.engraving_notes && (
                  <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                    <IcNote size={12} style={{ color:'var(--text-muted)', marginTop:2, flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:'var(--text-sec)', fontStyle:'italic' }}>{item.engraving_notes}</span>
                  </div>
                )}
              </div>
            )) : (
              <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:13, background:'var(--bg-hover)', borderRadius:'var(--r-md)', border:'1px solid var(--border)' }}>
                لا توجد منتجات مسجلة لهذا الطلب
              </div>
            )}
          </div>

          {/* Financial summary */}
          <div style={{
            padding:'12px 16px', borderRadius:'var(--r-md)',
            background: profit < 0 ? 'rgba(var(--danger-rgb),0.06)' : 'rgba(var(--action-rgb),0.06)',
            border:`1px solid ${profit < 0 ? 'rgba(var(--danger-rgb),0.15)' : 'rgba(var(--action-rgb),0.15)'}`,
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
                }}>{s.label}</button>
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

          {/* Actions */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {order.customer_phone && (
              <div style={{ position:'relative' }}>
                <Btn variant="ghost" onClick={() => setWaMenuOpen(p=>!p)} style={{ color:'var(--whatsapp)', borderColor:'rgba(37,211,102,0.3)' }}>
                  <IcWhatsapp size={15}/> واتساب ▾
                </Btn>
                {waMenuOpen && (
                  <div style={{
                    position:'absolute', bottom:'calc(100% + 6px)', right:0, zIndex:200,
                    background:'var(--modal-bg)', border:'1px solid var(--border)',
                    borderRadius:'var(--r-md)', overflow:'hidden', minWidth:180,
                    boxShadow:'var(--float-shadow)',
                  }}>
                    {[
                      { key:'order_confirm',   label:'✅ تأكيد الطلب' },
                      { key:'order_delivered', label:'🎁 تم التسليم' },
                      { key:'not_delivered',   label:'😕 لم يتم — متابعة' },
                    ].map(t => (
                      <button key={t.key} onClick={() => sendWhatsApp(t.key)} style={{
                        display:'block', width:'100%', padding:'11px 16px',
                        background:'none', border:'none', cursor:'pointer',
                        fontSize:13, color:'var(--text)', textAlign:'right',
                        fontFamily:'inherit', fontWeight:600,
                      }}>{t.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {order.status === 'delivered' && !order.is_replacement && (
              <Btn variant="ghost" onClick={() => onReplacement?.(order)} style={{ color:'var(--warning)', borderColor:'rgba(var(--warning-rgb),0.3)' }}>
                <IcRefresh size={15}/> استبدال
              </Btn>
            )}
            <Btn variant="secondary" onClick={onEdit}><IcEdit size={15}/> تعديل</Btn>
            <PrintReceipt order={order} statuses={ORDER_STATUSES}/>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ═══════════════════════════════════════════
   ORDER TIMELINE
═══════════════════════════════════════════ */
function OrderTimeline({ notes }) {
  const sorted = [...notes].sort((a,b) => new Date(a.time) - new Date(b.time))
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>سجل الطلب</div>
      <div style={{ position:'relative', paddingRight:16 }}>
        <div style={{ position:'absolute', right:5, top:6, bottom:6, width:2, background:'linear-gradient(to bottom,var(--action),var(--info-light))', borderRadius:2, opacity:0.3 }}/>
        {sorted.map((note, i) => {
          const isLast = i === sorted.length - 1
          const d = new Date(note.time)
          return (
            <div key={i} style={{ display:'flex', gap:10, marginBottom: isLast ? 0 : 10, alignItems:'flex-start' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:3, background: isLast ? 'var(--action)' : 'var(--info-light)', border:'2px solid var(--bg)', boxShadow: isLast ? '0 0 8px var(--action-glow)' : 'none' }}/>
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
