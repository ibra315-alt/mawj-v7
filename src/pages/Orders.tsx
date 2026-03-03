// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { DB, Settings, generateOrderNumber, supabase } from '../data/db'
import { subscribeOrders } from '../data/realtime'
import { formatCurrency, formatDate, SOURCE_LABELS, UAE_CITIES } from '../data/constants'
import { calcOrderProfit, ORDER_STATUSES, PIPELINE_STATUSES, getStatusInfo, getNextStatus } from '../data/finance'
import { Btn, Badge, Input, Select, Textarea, Empty, PageHeader, ConfirmModal, DirtyWarning, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcSearch, IcEdit, IcDelete, IcEye, IcWhatsapp, IcSave, IcNote, IcRefresh, IcClose, IcCheck, IcCopy, IcAlert, IcPhone } from '../components/Icons'
import PrintReceipt from '../components/PrintReceipt'
import Confetti from '../components/Confetti'
import useDebounce from '../hooks/useDebounce'
import { useDirtyForm } from '../hooks/useDirtyForm'
import type { PageProps } from '../types'

// Re-export for backward compatibility
export { calcOrderProfit, ORDER_STATUSES }

// ─── Phone normalization: always returns UAE format 971XXXXXXXX ───────────────
function normalizePhone(raw) {
  if (!raw) return ''
  let p = raw.replace(/[\s\-\(\)\+]/g, '')
  if (p.startsWith('00971')) p = p.slice(2)          // 00971 → 971...
  else if (p.startsWith('971'))  { /* already good */ }
  else if (p.startsWith('0'))    p = '971' + p.slice(1) // 05x → 9715x
  else if (/^[5-9]/.test(p))    p = '971' + p          // 5x → 9715x
  return p
}

function waLink(phone, msg) {
  const p = normalizePhone(phone)
  if (!p) return '#'
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`
}

function getStatus(id) {
  return ORDER_STATUSES.find(s => s.id === id) || { id, label: id || '—', color: 'var(--text-muted)', bg: 'rgba(107,114,128,0.1)' }
}

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
  if (diff < 60)    return 'الآن'
  if (diff < 3600)  return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  return `${Math.floor(diff / 86400)} ي`
}

function urgencyInfo(isoStr, status) {
  if (!isoStr) return { color: '#6B7280', label: '—' }
  const h = (Date.now() - new Date(isoStr).getTime()) / 3600000
  const active = ['new','confirmed','processing'].includes(status)
  if (!active) return { color: '#6B7280', label: timeAgo(isoStr) }
  if (h < 6)  return { color: '#5DD8A4', label: timeAgo(isoStr), urgent: false }
  if (h < 48) return { color: '#F59E0B', label: timeAgo(isoStr), urgent: false }
  return { color: '#F87171', label: `${Math.floor(h/24)} ي ⚠`, urgent: true }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Orders({ user }: PageProps) {
  const [orders,         setOrders]         = useState([])
  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const debouncedSearch = useDebounce(search)
  const [activeStatus,   setActiveStatus]   = useState('all')
  const [selectedOrder,  setSelectedOrder]  = useState(null)
  const [showPanel,      setShowPanel]      = useState(false)
  const [editOrder,      setEditOrder]      = useState(null)
  const [deleteId,       setDeleteId]       = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const [confetti,       setConfetti]       = useState(false)
  const [replacementFor, setReplacementFor] = useState(null)
  const [isConnected,    setIsConnected]    = useState(true)
  const [copiedId,       setCopiedId]       = useState(null)

  useEffect(() => {
    loadAll()
    const unsub = subscribeOrders(() => loadOrders())
    if (sessionStorage.getItem('openNewOrder') === '1') {
      sessionStorage.removeItem('openNewOrder')
      setEditOrder(null); setReplacementFor(null); setShowPanel(true)
    }
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
      confirmed: 'on_confirmed', shipped: 'on_shipped',
      delivered: 'on_delivered', not_delivered: 'on_not_delivered',
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
      on_confirmed: 'order_confirm', on_shipped: 'order_shipped',
      on_delivered: 'order_delivered', on_not_delivered: 'payment_reminder',
    }
    const tplKey = TRIGGER_TO_TEMPLATE[triggerKey]
    const template = templates?.[tplKey]
    if (!template) return
    const phone = normalizePhone(order.customer_phone)
    if (!phone) return
    const msg = template
      .replace(/\{customer_name\}/g, order.customer_name || 'عزيزي العميل')
      .replace(/\{order_number\}/g,  order.order_number  || '')
      .replace(/\{total\}/g,         String(order.total  || ''))
      .replace(/\{tracking_number\}/g, order.tracking_number || '')
      .replace(/\{city\}/g,          order.customer_city || '')
      .replace(/\{date\}/g,          new Date().toLocaleDateString('ar-AE'))
    if (sendMode === 'wame') {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
      toast('تم فتح رابط wa.me للإرسال', 'success')
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-sender`
        await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, message: msg }),
        })
        toast('تم إرسال إشعار واتساب ✓', 'success')
      } catch { /* silent */ }
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
      if (selectedOrder?.id === id) setSelectedOrder(prev => ({ ...prev, ...payload }))
      if (newStatus === 'delivered') {
        setConfetti(true); setTimeout(() => setConfetti(false), 4000)
        toast('تم التسليم! 🎉')
      } else if (newStatus === 'not_delivered') {
        toast('تم تسجيل عدم التسليم — خسارة محتسبة', 'error')
      } else {
        toast(`تم النقل إلى: ${getStatus(newStatus).label}`)
      }
      if (order?.customer_phone) triggerWhatsAppNotification(order, newStatus).catch(() => {})
    } catch { toast('فشل تحديث الحالة', 'error') }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await DB.delete('orders', deleteId)
      setOrders(prev => prev.filter(o => o.id !== deleteId))
      if (selectedOrder?.id === deleteId) setSelectedOrder(null)
      setDeleteId(null)
      toast('تم حذف الطلب')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  function copyOrderNumber(orderNumber) {
    navigator.clipboard.writeText(orderNumber).then(() => {
      setCopiedId(orderNumber)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // ── Smart stats ────────────────────────────────────────────
  const totalRev    = orders.filter(o => o.status === 'delivered').reduce((s,o) => s + (o.total||0), 0)
  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_at); const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const stuckOrders = orders.filter(o => {
    if (!['new','confirmed','processing'].includes(o.status)) return false
    return (Date.now() - new Date(o.created_at).getTime()) / 3600000 > 48
  })
  const codPending = orders.filter(o => o.status === 'with_hayyak').reduce((s,o) => s + (o.total||0), 0)

  // ── Status counts ───────────────────────────────────────────
  const statusCounts = { all: orders.length }
  PIPELINE_STATUSES.forEach(s => { statusCounts[s.id] = 0 })
  orders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++ })

  // ── Filtered feed ───────────────────────────────────────────
  const feedOrders = orders.filter(o => {
    if (activeStatus !== 'all' && o.status !== activeStatus) return false
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (o.customer_name  || '').toLowerCase().includes(q)
        || (o.order_number   || '').toLowerCase().includes(q)
        || (o.customer_phone || '').includes(q)
        || (o.customer_city  || '').toLowerCase().includes(q)
  })

  // ── Alert banners ────────────────────────────────────────────
  const alerts = []
  if (stuckOrders.length > 0) alerts.push({ id:'stuck', type:'warning', icon:'⚠️', text:`${stuckOrders.length} طلب${stuckOrders.length > 1 ? '' : ''} عالق منذ أكثر من يومين`, action: () => setActiveStatus('new') })
  if (codPending > 0)         alerts.push({ id:'cod',   type:'info',    icon:'💰', text:`COD معلق: ${formatCurrency(codPending)} — مع حياك`, action: () => setActiveStatus('with_hayyak') })

  if (loading) return (
    <div className="page">
      <SkeletonStats count={4} />
      <SkeletonCard rows={5} />
    </div>
  )

  const STATS = [
    { v: orders.length,         l: 'إجمالي',      c: '#318CE7', i: '📦' },
    { v: todayOrders.length,    l: 'اليوم',        c: '#A78BFA', i: '🌅' },
    { v: stuckOrders.length,    l: 'عالقة',        c: '#F87171', i: '⚠️' },
    { v: formatCurrency(totalRev), l: 'إيراد مسلّم', c: '#5DD8A4', i: '✅', isCurrency: true },
  ]

  return (
    <div className="page orders-cmd">
      <style>{`
        .orders-cmd { padding-bottom: 80px; }
        /* ── Mobile layout ─────────────────────────── */
        .orders-toprow { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
        .orders-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .orders-stat-chip { display:flex; align-items:center; gap:6px; padding:5px 12px; border-radius:99px; font-size:12px; font-weight:700; }
        @media (max-width: 768px) {
          .orders-cmd { padding-bottom: 140px; }
          .orders-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
          .orders-stat-chip { justify-content:center; padding:10px 12px; font-size:13px; }
        }
        @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseRed { 0%,100%{ box-shadow: 0 0 0 0 rgba(248,113,113,0); } 50%{ box-shadow: 0 0 0 6px rgba(248,113,113,0.15); } }
        @keyframes bannerIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
        .order-card { animation: cardIn 0.25s ease both; transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s; }
        .order-card:hover { transform: translateY(-1px); }
        .order-card.stuck { animation: pulseRed 2.5s infinite; }
        .order-card.selected { outline: 2px solid rgba(49,140,231,0.6); outline-offset: 2px; }
        .alert-banner { animation: bannerIn 0.3s ease both; }
        .icon-btn { display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; border:1px solid var(--border); background:var(--bg-hover); color:var(--text-muted); cursor:pointer; transition:all 0.12s; flex-shrink:0; }
        .icon-btn:hover { background:var(--bg-active); color:var(--text); }
        .pipeline-pill { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:99px; border:1.5px solid var(--border); background:var(--bg-surface); color:var(--text-muted); font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s; white-space:nowrap; flex-shrink:0; font-family:inherit; }
        .pipeline-pill.active { border-color: var(--pill-color); background: color-mix(in srgb, var(--pill-color) 12%, transparent); color: var(--pill-color); box-shadow: 0 0 14px color-mix(in srgb, var(--pill-color) 25%, transparent); }
        .wa-quick { display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; border:1px solid rgba(37,211,102,0.25); background:rgba(37,211,102,0.07); color:#25D366; text-decoration:none; transition:all 0.12s; flex-shrink:0; }
        .wa-quick:hover { background:rgba(37,211,102,0.15); }
      `}</style>

      <Confetti active={confetti} />

      {/* ══ COMMAND BAR ══════════════════════════════════════════ */}
      {/* Row 1: LIVE indicator + New order button (always on same row) */}
      <div className="orders-toprow">
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:99, background:'rgba(0,228,184,0.08)', border:'1px solid rgba(0,228,184,0.2)', flexShrink:0 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#00E4B8', animation:'pulseDot 2s infinite', flexShrink:0 }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#00E4B8', fontFamily:'Inter,sans-serif' }}>LIVE</span>
        </div>
        <button
          onClick={() => { setEditOrder(null); setReplacementFor(null); setShowPanel(true) }}
          style={{
            display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:12,
            background:'linear-gradient(135deg, #1B6FC9, #318CE7)', border:'none',
            color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 4px 16px rgba(49,140,231,0.35)', flexShrink:0,
          }}
        >
          <IcPlus size={15}/> طلب جديد
        </button>
      </div>

      {/* Row 2: Stat chips (2×2 grid on mobile, flex row on desktop) */}
      <div className="orders-stats">
        {STATS.map(s => (
          <div key={s.l} className="orders-stat-chip" style={{
            background:`color-mix(in srgb, ${s.c} 8%, transparent)`,
            border:`1px solid color-mix(in srgb, ${s.c} 22%, transparent)`,
          }}>
            <span>{s.i}</span>
            <span style={{ color:s.c, fontFamily:'Inter,sans-serif' }}>{s.v}</span>
            <span style={{ color:'var(--text-muted)', fontWeight:500 }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* ══ PIPELINE TABS ════════════════════════════════════════ */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, scrollbarWidth:'none', WebkitOverflowScrolling:'touch', marginBottom:14 }}>
        <button
          className={`pipeline-pill${activeStatus === 'all' ? ' active' : ''}`}
          style={{ '--pill-color': '#318CE7' } as any}
          onClick={() => setActiveStatus('all')}
        >
          <span>الكل</span>
          <span style={{
            fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:900,
            background: activeStatus === 'all' ? '#318CE7' : 'var(--bg-hover)',
            color: activeStatus === 'all' ? '#fff' : 'var(--text-muted)',
            borderRadius:99, padding:'1px 7px', lineHeight:'1.7',
          }}>{statusCounts.all}</span>
        </button>
        {PIPELINE_STATUSES.map(s => (
          <button
            key={s.id}
            className={`pipeline-pill${activeStatus === s.id ? ' active' : ''}`}
            style={{ '--pill-color': s.color } as any}
            onClick={() => setActiveStatus(s.id)}
          >
            <span>{s.label}</span>
            <span style={{
              fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:900,
              background: activeStatus === s.id ? s.color : 'var(--bg-hover)',
              color: activeStatus === s.id ? '#fff' : 'var(--text-muted)',
              borderRadius:99, padding:'1px 7px', lineHeight:'1.7',
            }}>{statusCounts[s.id] || 0}</span>
          </button>
        ))}
      </div>

      {/* ══ SEARCH ═══════════════════════════════════════════════ */}
      <div style={{ position:'relative', marginBottom:14 }}>
        <IcSearch size={14} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم، رقم الطلب، الهاتف، المدينة..."
          style={{
            width:'100%', paddingTop:10, paddingBottom:10,
            paddingInlineStart:38, paddingInlineEnd:search ? 36 : 12,
            background:'var(--bg-surface)', border:'1.5px solid var(--input-border)',
            borderRadius:12, color:'var(--text)', fontSize:13,
            fontFamily:'inherit', outline:'none', boxSizing:'border-box',
            boxShadow:'var(--card-shadow)',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, padding:4, lineHeight:1 }}>✕</button>
        )}
      </div>

      {/* ══ ALERT BANNERS ════════════════════════════════════════ */}
      {alerts.map((a, i) => (
        <div key={a.id} className="alert-banner" style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'10px 14px', borderRadius:12, marginBottom:10,
          background: a.type === 'warning' ? 'rgba(248,113,113,0.07)' : 'rgba(49,140,231,0.07)',
          border:`1px solid ${a.type === 'warning' ? 'rgba(248,113,113,0.25)' : 'rgba(49,140,231,0.25)'}`,
          animationDelay: `${i * 0.08}s`,
        }}>
          <span style={{ fontSize:16, flexShrink:0 }}>{a.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color: a.type === 'warning' ? '#F87171' : '#7EB8F7', flex:1 }}>{a.text}</span>
          {a.action && (
            <button onClick={a.action} style={{
              padding:'4px 12px', borderRadius:99, border:'none',
              background: a.type === 'warning' ? 'rgba(248,113,113,0.15)' : 'rgba(49,140,231,0.15)',
              color: a.type === 'warning' ? '#F87171' : '#318CE7',
              fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0,
            }}>عرض</button>
          )}
        </div>
      ))}

      {/* ══ FEED ═════════════════════════════════════════════════ */}
      <div>
          {feedOrders.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'64px 24px',
              background:'var(--bg-surface)', borderRadius:20, border:'1px solid var(--border)',
            }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:0.35 }}>📭</div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:8 }}>
                {search ? 'لا توجد نتائج' : 'لا توجد طلبات'}
              </div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
                {search ? 'جرب بحثاً مختلفاً' : 'ابدأ بإضافة طلبك الأول'}
              </div>
              {!search && (
                <button onClick={() => setShowPanel(true)} style={{
                  padding:'10px 24px', borderRadius:12,
                  background:'linear-gradient(135deg, #1B6FC9, #318CE7)', border:'none',
                  color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                }}>
                  <IcPlus size={14}/> طلب جديد
                </button>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {feedOrders.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  copiedId={copiedId}
                  onClick={() => setSelectedOrder(prev => prev?.id === order.id ? null : order)}
                  onEdit={() => { setEditOrder(order); setShowPanel(true) }}
                  onDelete={() => setDeleteId(order.id)}
                  onAdvance={newStatus => handleStatusChange(order.id, newStatus)}
                  onCopy={() => copyOrderNumber(order.order_number)}
                  onReplacement={() => { setReplacementFor(order); setEditOrder(null); setShowPanel(true) }}
                  animDelay={Math.min(idx * 0.04, 0.4)}
                />
              ))}
            </div>
          )}
      </div>

      {/* ══ DETAIL PANEL — fixed portal, always in viewport ════════ */}
      {selectedOrder && createPortal(
        <DetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={() => { setEditOrder(selectedOrder); setShowPanel(true) }}
          onStatusChange={handleStatusChange}
          onReplacement={orig => { setReplacementFor(orig); setEditOrder(null); setShowPanel(true); setSelectedOrder(null) }}
        />,
        document.body
      )}

      {/* ══ PANELS & MODALS ════════════════════════════════════════ */}
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
          if (selectedOrder?.id === saved.id) setSelectedOrder(saved)
          setShowPanel(false); setEditOrder(null); setReplacementFor(null)
          toast(editOrder ? 'تم تحديث الطلب ✓' : 'تم إضافة الطلب ✓')
        }}
      />

      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} loading={deleting}
        message="سيتم حذف الطلب نهائياً ولا يمكن استعادته."
        itemName={orders.find(o => o.id === deleteId)?.customer_name}
        itemDetail={orders.find(o => o.id === deleteId)?.order_number}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDER CARD — Command Center + Timeline style
═══════════════════════════════════════════════════════════════ */
function OrderCard({ order, isSelected, onClick, onEdit, onDelete, onAdvance, onCopy, onReplacement, copiedId, animDelay }) {
  const status = getStatus(order.status)
  const profit = order.gross_profit ?? 0
  const isRepl = order.is_replacement
  const next   = getNextStatus(order.status)
  const urg    = urgencyInfo(order.created_at, order.status)
  const isCopied = copiedId === order.order_number
  const isStuck  = urg.urgent
  const itemCount = order.items?.length || 0

  const quickWaMsg = `مرحبا ${order.customer_name||''}،\nرقم طلبك: ${order.order_number}\nالإجمالي: ${(order.total||0).toLocaleString()} درهم\n\nشكراً لتسوقك مع موج 🌊`

  return (
    <div
      className={`order-card mawj-card${isSelected ? ' selected' : ''}${isStuck ? ' stuck' : ''}`}
      onClick={onClick}
      style={{
        borderRadius: 16,
        borderInlineStart: `3px solid ${isRepl ? '#F59E0B' : status.color}`,
        overflow: 'hidden',
        animationDelay: `${animDelay}s`,
        boxShadow: isSelected
          ? `0 0 0 2px rgba(49,140,231,0.5), var(--card-shadow)`
          : `0 0 20px color-mix(in srgb, ${status.color} 6%, transparent), var(--card-shadow)`,
        cursor: 'pointer',
      }}
    >
      {/* ── Main content area ──────────────────────────── */}
      <div style={{ padding:'14px 16px 10px' }}>

        {/* Row 1: Order ID (header) + status pill + replacement badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
          {/* ORDER ID — plain text, whole card is clickable */}
          <span style={{
            fontFamily:'Inter,monospace', fontSize:15, fontWeight:900,
            color: status.color, letterSpacing:'-0.01em',
          }}>
            {order.order_number || '#—'}
          </span>

          {/* Status pill */}
          <span style={{
            padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:800, flexShrink:0,
            color: status.color, background:`color-mix(in srgb, ${status.color} 14%, transparent)`,
            border:`1px solid color-mix(in srgb, ${status.color} 28%, transparent)`,
          }}>{status.label}</span>

          {isRepl && (
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6,
              background:'rgba(245,158,11,0.12)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.25)',
            }}>استبدال</span>
          )}
        </div>

        {/* Row 2: Customer + city + item count */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'Inter,sans-serif', direction:'ltr', textAlign:'start' }}>
            {order.customer_phone ? normalizePhone(order.customer_phone) : (order.customer_name || 'عميل')}
          </span>
          {order.customer_city && (
            <span style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
              📍 {order.customer_city}
            </span>
          )}
          {itemCount > 0 && (
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6,
              background:'rgba(49,140,231,0.08)', color:'#7EB8F7', border:'1px solid rgba(49,140,231,0.18)', flexShrink:0,
            }}>
              📦 {itemCount} {itemCount === 1 ? 'منتج' : 'منتجات'}
            </span>
          )}
        </div>

        {/* Row 3: Amount + profit badge + urgency */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:18, fontWeight:900, fontFamily:'Inter,sans-serif', color:'var(--text)' }}>
            {formatCurrency(order.total || 0)}
          </span>

          {/* Profit badge */}
          {order.status !== 'new' && profit !== 0 && (
            <span style={{
              fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:99, fontFamily:'Inter,sans-serif',
              background: profit >= 0 ? 'rgba(93,216,164,0.12)' : 'rgba(248,113,113,0.12)',
              color: profit >= 0 ? '#5DD8A4' : '#F87171',
              border:`1px solid ${profit >= 0 ? 'rgba(93,216,164,0.25)' : 'rgba(248,113,113,0.25)'}`,
              flexShrink:0,
            }}>
              {profit >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(profit))}
            </span>
          )}

          {/* Urgency timer */}
          <span style={{ fontSize:11, fontWeight:700, color: urg.color, fontFamily:'Inter,sans-serif', flexShrink:0, marginInlineStart:'auto' }}>
            {urg.label}
          </span>
        </div>
      </div>

      {/* ── Actions bar ───────────────────────────────────── */}
      <div onClick={e => e.stopPropagation()} style={{
        padding:'8px 14px', borderTop:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:6, justifyContent:'space-between', flexWrap:'wrap',
      }}>
        {/* Left: utility icons */}
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onEdit() }} title="تعديل">
            <IcEdit size={13}/>
          </button>
          {order.customer_phone && (
            <a
              className="wa-quick"
              href={waLink(order.customer_phone, quickWaMsg)}
              target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              title={`واتساب: ${normalizePhone(order.customer_phone)}`}
            >
              <IcWhatsapp size={13}/>
            </a>
          )}
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onCopy() }} title="نسخ رقم الطلب" style={isCopied ? { color:'#5DD8A4', borderColor:'rgba(93,216,164,0.3)', background:'rgba(93,216,164,0.08)' } : {}}>
            <IcCopy size={12}/>
          </button>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onDelete() }} title="حذف" style={{ color:'var(--danger)', borderColor:'rgba(248,113,113,0.2)', background:'rgba(248,113,113,0.04)' }}>
            <IcDelete size={12}/>
          </button>
        </div>

        {/* Right: advance actions */}
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {order.status === 'delivered' && !order.is_replacement && (
            <button
              onClick={e => { e.stopPropagation(); onReplacement() }}
              style={{ padding:'5px 11px', borderRadius:8, background:'rgba(245,158,11,0.08)', border:'1.5px solid rgba(245,158,11,0.25)', color:'#F59E0B', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}
            >
              <IcRefresh size={11}/> استبدال
            </button>
          )}
          {order.status === 'with_hayyak' && (
            <>
              <button onClick={e => { e.stopPropagation(); onAdvance('not_delivered') }}
                style={{ padding:'5px 10px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1.5px solid rgba(248,113,113,0.25)', color:'#F87171', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                ✗ لم يتم
              </button>
              <button onClick={e => { e.stopPropagation(); onAdvance('delivered') }}
                style={{ padding:'5px 14px', borderRadius:8, background:'linear-gradient(135deg,#3BB579,#5DD8A4)', border:'none', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 10px rgba(93,216,164,0.3)' }}>
                ✓ تم التسليم
              </button>
            </>
          )}
          {next && order.status !== 'with_hayyak' && (
            <button
              onClick={e => { e.stopPropagation(); onAdvance(next.id) }}
              style={{ padding:'5px 12px', borderRadius:8, background:`color-mix(in srgb,${next.color} 10%, transparent)`, border:`1.5px solid color-mix(in srgb,${next.color} 30%, transparent)`, color:next.color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}
            >
              {next.label} ←
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL PANEL — fixed portal: right panel desktop / bottom sheet mobile
═══════════════════════════════════════════════════════════════ */
function DetailPanel({ order, onClose, onEdit, onStatusChange, onReplacement }) {
  const status = getStatus(order.status)
  const profit = order.gross_profit ?? 0
  const [waOpen, setWaOpen] = useState(false)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function sendWhatsApp(templateKey) {
    const phone = normalizePhone(order.customer_phone)
    if (!phone) return
    const msgs = {
      order_confirm:   `مرحبا ${order.customer_name||'عزيزي العميل'}،\n\nتم استلام طلبك ✅\nرقم الطلب: ${order.order_number}\nالإجمالي: ${(order.total||0).toLocaleString()} درهم\n\nشكراً لتسوقك مع موج 🌊`,
      order_delivered: `مرحبا ${order.customer_name||'عزيزي العميل'}،\n\nنأمل أن طلبك وصلك بشكل سليم 🎁\nرقم الطلب: ${order.order_number}\n\nيسعدنا خدمتك دائماً.\nموج 🌊`,
      not_delivered:   `مرحبا ${order.customer_name||'عزيزي العميل'}،\n\nتعذر توصيل طلبك رقم ${order.order_number} 😕\n\nهل يمكنك تأكيد العنوان؟\n\nنحن هنا لخدمتك 💙`,
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msgs[templateKey] || msgs.order_confirm)}`, '_blank')
    setWaOpen(false)
  }

  return (
    <>
      <style>{`
        .detail-panel-overlay { position:fixed; inset:0; z-index:500; }
        .detail-panel-bg { position:fixed; inset:0; background:rgba(0,0,0,0.3); backdrop-filter:blur(2px); }
        .detail-panel-box {
          position:fixed; top:64px; bottom:0; inset-inline-end:0;
          width:400px; max-width:100vw;
          background:var(--modal-bg);
          backdrop-filter:blur(52px) saturate(1.9);
          -webkit-backdrop-filter:blur(52px) saturate(1.9);
          border-inline-start:1px solid var(--border);
          box-shadow:-8px 0 40px rgba(0,0,0,0.25);
          display:flex; flex-direction:column;
          z-index:501;
          animation:detailSlideIn 0.22s ease both;
          overflow:hidden;
        }
        @keyframes detailSlideIn {
          from { transform: translateX(-100%); opacity:0; }
          to   { transform: translateX(0);     opacity:1; }
        }
        /* RTL: slide from right */
        [dir="rtl"] .detail-panel-box {
          animation-name: detailSlideInRtl;
        }
        @keyframes detailSlideInRtl {
          from { transform: translateX(100%); opacity:0; }
          to   { transform: translateX(0);    opacity:1; }
        }
        @media (max-width: 768px) {
          .detail-panel-box {
            top: auto;
            bottom: 0; left: 0; right: 0;
            width: 100% !important;
            max-height: 82vh;
            border-inline-start: none;
            border-top: 1px solid var(--border);
            border-radius: 20px 20px 0 0;
            box-shadow: 0 -8px 40px rgba(0,0,0,0.3);
            animation-name: detailSlideUp !important;
          }
          @keyframes detailSlideUp {
            from { transform: translateY(100%); opacity:0; }
            to   { transform: translateY(0);    opacity:1; }
          }
        }
        .detail-panel-body { flex:1; overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:14px; }
      `}</style>

      {/* Backdrop — click to close */}
      <div className="detail-panel-bg" onClick={onClose} />

      {/* Panel */}
      <div className="detail-panel-box">
        {/* Drag handle (mobile) */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'var(--border)' }}/>
        </div>

        {/* Header */}
        <div style={{
          padding:'8px 18px 14px', borderBottom:'1px solid var(--border)',
          background:`color-mix(in srgb, ${status.color} 5%, transparent)`,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color: status.color, fontFamily:'Inter,monospace', letterSpacing:'-0.01em' }}>
              {order.order_number}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              <span style={{ color: status.color, fontWeight:700 }}>{status.label}</span>
              {order.is_replacement && <span style={{ color:'#F59E0B', marginInlineStart:8 }}>· استبدال</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-hover)', border:'none', borderRadius:8, padding:8, cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
            <IcClose size={16}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="detail-panel-body">

          {/* Customer block */}
          <div style={{ background:'var(--bg-hover)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{order.customer_name || 'عميل'}</div>
            {order.customer_phone && (
              <a
                href={waLink(order.customer_phone, `مرحبا ${order.customer_name||''}، `)}
                target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#25D366', fontFamily:'Inter,sans-serif', fontWeight:700, textDecoration:'none', marginBottom:3 }}
              >
                <IcWhatsapp size={13}/> +{normalizePhone(order.customer_phone)}
              </a>
            )}
            {order.customer_city && (
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                📍 {order.customer_city}{order.customer_address ? ` · ${order.customer_address}` : ''}
              </div>
            )}
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              {formatDate(order.created_at)}
            </div>
          </div>

          {/* Items */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', marginBottom:8 }}>المنتجات</div>
            {(order.items || []).map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:8, background:'var(--bg-hover)', marginBottom:5, border:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.name}{item.size && <span style={{ fontSize:11, color:'var(--text-muted)', marginInlineStart:4 }}>({item.size})</span>}</div>
                  {item.engraving_notes && <div style={{ fontSize:11, color:'var(--text-sec)', marginTop:2 }}>✏ {item.engraving_notes}</div>}
                </div>
                <div style={{ textAlign:'start', flexShrink:0, marginInlineStart:8 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(item.price * item.qty)}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'Inter,sans-serif' }}>×{item.qty}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Financial summary */}
          <div style={{
            padding:'12px 14px', borderRadius:12,
            background: profit < 0 ? 'rgba(248,113,113,0.06)' : 'rgba(49,140,231,0.06)',
            border:`1px solid ${profit < 0 ? 'rgba(248,113,113,0.18)' : 'rgba(49,140,231,0.18)'}`,
          }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 14px', marginBottom:8, fontSize:12, color:'var(--text-sec)' }}>
              <span>مبيعات: <b style={{ fontFamily:'Inter,sans-serif' }}>{formatCurrency(order.subtotal)}</b></span>
              {order.discount > 0 && <span style={{ color:'var(--danger)' }}>خصم: −{formatCurrency(order.discount)}</span>}
              <span>تكلفة: <b style={{ color:'#F87171', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(order.product_cost||0)}</b></span>
              <span>حياك: <b style={{ color:'#F87171', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(order.hayyak_fee??25)}</b></span>
            </div>
            <div style={{ display:'flex', gap:16, fontSize:15, fontWeight:900, fontFamily:'Inter,sans-serif' }}>
              <span style={{ color:'var(--action)' }}>{formatCurrency(order.total)}</span>
              <span style={{ color: profit >= 0 ? '#5DD8A4' : '#F87171' }}>
                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
              </span>
            </div>
          </div>

          {/* Status change */}
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, marginBottom:8 }}>تغيير الحالة</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {ORDER_STATUSES.map(s => (
                <button key={s.id} onClick={() => onStatusChange(order.id, s.id)} style={{
                  padding:'5px 11px', borderRadius:99, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  border:`1px solid ${order.status === s.id ? s.color : `${s.color}30`}`,
                  background: order.status === s.id ? `${s.color}20` : 'transparent',
                  color: s.color,
                }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ padding:'10px 12px', background:'var(--bg-hover)', borderRadius:10, border:'1px solid var(--border)', fontSize:12, color:'var(--text-sec)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, marginBottom:4 }}>ملاحظات</div>
              {order.notes}
            </div>
          )}

          {/* Internal timeline */}
          {order.internal_notes?.length > 0 && <OrderTimeline notes={order.internal_notes}/>}

          {/* Action buttons */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingBottom:4 }}>
            {order.customer_phone && (
              <div style={{ position:'relative' }}>
                <button onClick={() => setWaOpen(p=>!p)} style={{
                  display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10,
                  border:'1.5px solid rgba(37,211,102,0.3)', background:'rgba(37,211,102,0.06)',
                  color:'#25D366', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                }}>
                  <IcWhatsapp size={13}/> واتساب ▾
                </button>
                {waOpen && (
                  <div style={{
                    position:'absolute', bottom:'calc(100% + 6px)', insetInlineStart:0, zIndex:600,
                    background:'var(--modal-bg)', border:'1px solid var(--border)',
                    borderRadius:12, overflow:'hidden', minWidth:190, boxShadow:'var(--float-shadow)',
                  }}>
                    {[
                      { key:'order_confirm',   label:'✅ تأكيد الطلب' },
                      { key:'order_delivered', label:'🎁 تم التسليم' },
                      { key:'not_delivered',   label:'😕 لم يتم — متابعة' },
                    ].map(t => (
                      <button key={t.key} onClick={() => sendWhatsApp(t.key)} style={{
                        display:'block', width:'100%', padding:'10px 14px',
                        background:'none', border:'none', cursor:'pointer',
                        fontSize:12, color:'var(--text)', textAlign:'right',
                        fontFamily:'inherit', fontWeight:600,
                      }}>{t.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {order.status === 'delivered' && !order.is_replacement && (
              <button onClick={() => onReplacement?.(order)} style={{
                display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:10,
                border:'1.5px solid rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.06)',
                color:'#F59E0B', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              }}>
                <IcRefresh size={13}/> استبدال
              </button>
            )}
            <button onClick={onEdit} style={{
              display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:10,
              border:'1.5px solid var(--border)', background:'var(--bg-hover)',
              color:'var(--text)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flex:1,
            }}>
              <IcEdit size={13}/> تعديل
            </button>
            <PrintReceipt order={order} statuses={ORDER_STATUSES}/>
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDER PANEL — Create / Edit slide-over
═══════════════════════════════════════════════════════════════ */
function OrderPanel({ open, onClose, order, replacementFor, products, onSaved, user }) {
  const isEdit = !!order
  const isRepl = !!replacementFor && !order

  const [form,            setForm]            = useState({})
  const [items,           setItems]           = useState([])
  const [saving,          setSaving]          = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [phoneWarning,    setPhoneWarning]    = useState(null)
  const dirty = useDirtyForm(onClose)

  useEffect(() => {
    if (!open) return
    let initForm, initItems
    if (order) {
      initForm = {
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
      }
      initItems = order.items || []
    } else if (isRepl) {
      initForm = {
        customer_name:      replacementFor.customer_name    || '',
        customer_phone:     replacementFor.customer_phone   || '',
        customer_city:      replacementFor.customer_city    || '',
        customer_address:   replacementFor.customer_address || '',
        hayyak_fee: 25, discount: 0, status: 'with_hayyak',
        notes: `استبدال للطلب ${replacementFor.order_number}`,
        order_date: new Date().toISOString().split('T')[0],
        is_replacement: true, replacement_for_id: replacementFor.id,
      }
      initItems = (replacementFor.items || []).map(i => ({ ...i, engraving_notes:'' }))
    } else {
      initForm = {
        customer_name:'', customer_phone:'', customer_city:'', customer_address:'',
        hayyak_fee:25, discount:0, status:'new', notes:'',
        order_date: new Date().toISOString().split('T')[0],
        is_replacement:false, replacement_for_id:null,
      }
      initItems = []
    }
    setForm(initForm)
    setItems(initItems)
    setSelectedProduct(null)
    setPhoneWarning(null)
    dirty.setInitial({ form: initForm, items: initItems })
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

  const calc = calcOrderProfit({ items, hayyak_fee: form.hayyak_fee, discount: form.discount, is_replacement: form.is_replacement })

  async function handleSave() {
    if (!form.customer_name?.trim()) { toast('أدخل اسم العميل', 'error'); return }
    if (!form.customer_phone?.trim()) { toast('أدخل رقم الهاتف', 'error'); return }
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
      dirty.markClean({ form, items })
      onSaved(saved)
    } catch (err) {
      toast('فشل الحفظ: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  if (!open) return null

  const saveLabel = isEdit ? 'حفظ' : isRepl ? 'إرسال' : 'إضافة'

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={() => dirty.attemptClose({ form, items })} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(10px) saturate(1.2)', WebkitBackdropFilter:'blur(10px) saturate(1.2)',
        zIndex:2000,
      }}/>

      {/* Panel */}
      <div className="order-panel-shell" style={{
        position:'fixed', zIndex:2001,
        background:'var(--modal-bg)', boxShadow:'var(--modal-shadow)',
        backdropFilter:'var(--glass-blur-lg)', WebkitBackdropFilter:'var(--glass-blur-lg)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        animation:'orderPanelIn 220ms cubic-bezier(0.34,1.1,0.64,1) both',
      }}>

        {/* ── Sticky header with action buttons always visible ── */}
        <div style={{
          flexShrink:0, padding:'11px 14px',
          borderBottom:'1px solid var(--border)',
          background:'var(--modal-bg)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {isEdit ? 'تعديل الطلب' : isRepl ? `استبدال — ${replacementFor?.order_number}` : 'طلب جديد'}
            </div>
            {isRepl && <div style={{ fontSize:10, color:'#F59E0B', marginTop:1, fontWeight:600 }}>ربح سالب · استبدال مجاني</div>}
          </div>
          {/* Cancel */}
          <button onClick={() => dirty.attemptClose({ form, items })} style={{
            padding:'7px 13px', borderRadius:8,
            border:'1.5px solid var(--border)', background:'transparent',
            color:'var(--text-muted)', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit', flexShrink:0,
            WebkitTapHighlightColor:'transparent',
          }}>إلغاء</button>
          {/* Save — always visible, no scrolling needed */}
          <button onClick={handleSave} disabled={saving} style={{
            padding:'7px 18px', borderRadius:8, border:'none',
            background: saving ? 'var(--bg-hover)'
              : isRepl ? 'linear-gradient(135deg,#d97706,#F59E0B)'
              : 'linear-gradient(135deg,#1B6FC9,#318CE7)',
            color:'#fff',
            fontSize:13, fontWeight:800,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily:'inherit', display:'flex', alignItems:'center', gap:6,
            boxShadow: saving ? 'none' : '0 2px 14px rgba(49,140,231,0.4)',
            opacity: saving ? 0.65 : 1, flexShrink:0,
            transition:'all 0.15s',
            WebkitTapHighlightColor:'transparent',
          }}>
            {saving
              ? <span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'orderPanelSpin 0.7s linear infinite' }}/>
              : <><IcSave size={13}/> {saveLabel}</>
            }
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div style={{ flex:1, padding:'12px 14px', overflowY:'auto', minHeight:0, WebkitOverflowScrolling:'touch' }}>

          {dirty.showWarn && <DirtyWarning onDiscard={() => dirty.confirmDiscard()} onContinue={() => dirty.cancelClose()} />}

          {phoneWarning && (
            <div style={{ marginBottom:10, padding:'9px 12px', background:'rgba(245,158,11,0.1)', border:'1.5px solid rgba(245,158,11,0.35)', borderRadius:10, fontSize:12, color:'#F59E0B' }}>
              <b>رقم الهاتف موجود في طلب مفتوح:</b> {phoneWarning.customer_name || 'عميل'} — {phoneWarning.order_number}
            </div>
          )}

          {/* Customer info — compact 2-col grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <Input label="اسم العميل"   value={form.customer_name    || ''} onChange={e => setField('customer_name',    e.target.value)} placeholder="اختياري"/>
            <Input label="رقم الهاتف"   value={form.customer_phone   || ''} onChange={e => setField('customer_phone',   e.target.value)} placeholder="+971..." dir="ltr"/>
            <Select label="الإمارة"      value={form.customer_city    || ''} onChange={e => setField('customer_city',    e.target.value)}>
              <option value="">اختر</option>
              {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="العنوان"       value={form.customer_address || ''} onChange={e => setField('customer_address', e.target.value)} placeholder="الحي / الشارع..."/>
          </div>

          {/* Products */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:11, color:'var(--text-muted)', letterSpacing:'0.06em', marginBottom:8 }}>المنتجات</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom: selectedProduct ? 8 : 0 }}>
              {products.map(p => {
                const sizes = p.sizes?.length > 0 ? p.sizes : [{ id: p.id, size: p.size || '', cost: p.cost || 0, price: p.price || 0 }]
                const isSingle   = sizes.length === 1
                const isSelected = selectedProduct?.id === p.id
                return (
                  <button key={p.id} onClick={() => isSingle ? addItem(p.name, sizes[0]) : setSelectedProduct(isSelected ? null : { ...p, sizes })}
                    style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700, transition:'all 120ms', background: isSelected ? 'var(--action-soft)' : 'var(--bg-hover)', border:`1.5px solid ${isSelected ? 'var(--action)' : 'var(--border)'}`, color: isSelected ? 'var(--action)' : 'var(--text-sec)', WebkitTapHighlightColor:'transparent' }}>
                    {p.name}{!isSingle && <span style={{ fontSize:9, marginInlineStart:3, opacity:0.6 }}>{isSelected ? '▲' : '▼'}</span>}
                  </button>
                )
              })}
            </div>
            {selectedProduct && (
              <div style={{ padding:'10px 12px', marginBottom:6, background:'var(--bg-surface)', borderRadius:10, border:'1.5px solid var(--action)', boxShadow:'0 0 10px rgba(49,140,231,0.1)' }}>
                <div style={{ fontSize:11, color:'var(--action)', fontWeight:700, marginBottom:6 }}>{selectedProduct.name} — الحجم:</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(selectedProduct.sizes || []).map(sv => (
                    <button key={sv.id} onClick={() => addItem(selectedProduct.name, sv)}
                      style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', fontFamily:'inherit', background:'var(--bg-hover)', border:'1.5px solid var(--border)', color:'var(--text)', display:'flex', flexDirection:'column', alignItems:'center', gap:2, WebkitTapHighlightColor:'transparent' }}>
                      <span style={{ fontSize:13, fontWeight:800 }}>{sv.size}</span>
                      <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'Inter,sans-serif' }}>{sv.price} د.إ</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {items.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop: selectedProduct ? 0 : 6 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ background:'var(--bg-hover)', borderRadius:10, padding:'10px 12px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {/* Name */}
                      <div style={{ flex:1, minWidth:0, overflow:'hidden' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.name}</span>
                        {item.size && <span style={{ fontSize:11, color:'var(--text-muted)', marginInlineStart:4 }}>({item.size})</span>}
                      </div>
                      {/* Unit price */}
                      <input type="number" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        style={{ width:52, padding:'5px 4px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, color:'var(--action)', fontSize:12, textAlign:'center', fontFamily:'Inter,sans-serif', flexShrink:0 }}/>
                      {/* ── Qty stepper — large tap targets for mobile ── */}
                      <div style={{ display:'flex', alignItems:'center', borderRadius:8, border:'1.5px solid var(--border)', overflow:'hidden', flexShrink:0 }}>
                        <button
                          onClick={() => updateItem(idx, 'qty', Math.max(1, item.qty - 1))}
                          style={{ width:36, height:36, border:'none', borderInlineEnd:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-muted)', fontSize:20, lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}
                        >−</button>
                        <span style={{ width:32, textAlign:'center', fontSize:15, fontWeight:800, color:'var(--text)', fontFamily:'Inter,sans-serif', userSelect:'none', flexShrink:0 }}>{item.qty}</span>
                        <button
                          onClick={() => updateItem(idx, 'qty', item.qty + 1)}
                          style={{ width:36, height:36, border:'none', borderInlineStart:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--action)', fontSize:20, lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}
                        >+</button>
                      </div>
                      {/* Line total */}
                      <span style={{ fontWeight:800, color:'var(--action)', fontSize:12, minWidth:46, textAlign:'start', fontFamily:'Inter,sans-serif', flexShrink:0 }}>
                        {formatCurrency(item.price * item.qty)}
                      </span>
                      {/* Remove */}
                      <button onClick={() => removeItem(idx)}
                        style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:20, lineHeight:1, padding:0, flexShrink:0, WebkitTapHighlightColor:'transparent' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial fields */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <Input label="رسوم حياك" type="number" min="0" value={form.hayyak_fee ?? 25} onChange={e => setField('hayyak_fee', e.target.value)}/>
            <Input label="خصم (د.إ)" type="number" min="0" value={form.discount || ''} onChange={e => setField('discount', e.target.value)}/>
            {!isEdit && <Input label="تاريخ الطلب" type="date" value={form.order_date || ''} onChange={e => setField('order_date', e.target.value)}/>}
          </div>

          {/* Compact live profit bar */}
          <div style={{
            padding:'9px 12px', borderRadius:10, marginBottom:10,
            background: calc.gross_profit < 0 ? 'rgba(248,113,113,0.06)' : 'rgba(49,140,231,0.06)',
            border:`1.5px solid ${calc.gross_profit < 0 ? 'rgba(248,113,113,0.2)' : 'rgba(49,140,231,0.2)'}`,
            display:'flex', flexWrap:'wrap', gap:'4px 16px', alignItems:'center',
          }}>
            <span style={{ fontSize:14, fontWeight:900, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>
              {formatCurrency(calc.total)}
            </span>
            <span style={{ fontSize:12, color:'var(--text-sec)' }}>
              ربح: <b style={{ color: calc.gross_profit >= 0 ? '#5DD8A4' : '#F87171', fontFamily:'Inter,sans-serif' }}>
                {calc.gross_profit >= 0 ? '+' : ''}{formatCurrency(calc.gross_profit)}
              </b>
            </span>
            {parseFloat(form.discount) > 0 && (
              <span style={{ fontSize:11, color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>خصم −{formatCurrency(form.discount)}</span>
            )}
          </div>

          <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="أي ملاحظات إضافية..."/>

          {/* iPhone home bar safe-area spacer */}
          <div style={{ height:'max(12px, env(safe-area-inset-bottom))' }}/>
        </div>
      </div>

      <style>{`
        .order-panel-shell {
          top: 64px; bottom: 0;
          inset-inline-start: 0;
          width: 50%; min-width: 440px;
        }
        @media (max-width: 768px) {
          .order-panel-shell {
            top: 56px !important;
            left: 0 !important; right: 0 !important;
            width: 100% !important; min-width: 0 !important;
          }
        }
        @keyframes orderPanelIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes orderPanelSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>,
    document.body
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDER TIMELINE
═══════════════════════════════════════════════════════════════ */
function OrderTimeline({ notes }) {
  const sorted = [...notes].sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>سجل الطلب</div>
      <div style={{ position:'relative', paddingInlineEnd:16 }}>
        <div style={{ position:'absolute', insetInlineEnd:5, top:6, bottom:6, width:2, background:'linear-gradient(to bottom,var(--action),var(--info-light))', borderRadius:2, opacity:0.25 }}/>
        {sorted.map((note, i) => {
          const isLast = i === sorted.length - 1
          return (
            <div key={i} style={{ display:'flex', gap:10, marginBottom: isLast ? 0 : 10, alignItems:'flex-start' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'var(--text-sec)', fontWeight:600, marginBottom:1 }}>{note.text}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'Inter,sans-serif', direction:'ltr', textAlign:'end' }}>
                  {new Date(note.time).toLocaleString('ar-AE', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
              <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:3, background: isLast ? 'var(--action)' : '#6B7280', boxShadow: isLast ? '0 0 8px var(--action)' : 'none' }}/>
            </div>
          )
        })}
      </div>
    </div>
  )
}
