import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Card, StatCard, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, toast } from '../components/ui'
import { IcPlus, IcEdit, IcDelete, IcSearch, IcWhatsapp } from '../components/Icons'

/* ══════════════════════════════════════════════════
   HAYYAK PAGE
   Tracks every detail with the Hayyak courier:
   • Shipments (linked to orders) + COD collected
   • Settlements (bank transfers from Hayyak)
   • Returns & lost shipments
   • Reconciliation — what they still owe us
══════════════════════════════════════════════════ */

const SHIP_STATUSES = [
  { id: 'pending',   label: 'في الطريق',   color: '#a78bfa' },
  { id: 'delivered', label: 'تم التسليم',  color: '#00e4b8' },
  { id: 'returned',  label: 'مرتجع',       color: '#f59e0b' },
  { id: 'lost',      label: 'مفقود',       color: '#ef4444' },
]

const TABS = [
  { id: 'overview',    label: 'نظرة عامة' },
  { id: 'shipments',   label: 'الشحنات' },
  { id: 'settlements', label: 'التسويات' },
  { id: 'returns',     label: 'المرتجعات' },
]

export default function Hayyak() {
  const [tab, setTab]               = useState('overview')
  const [orders, setOrders]         = useState([])
  const [shipments, setShipments]   = useState([])
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading]       = useState(true)

  // Modals
  const [showShipForm, setShowShipForm]   = useState(false)
  const [showSettForm, setShowSettForm]   = useState(false)
  const [editShip, setEditShip]           = useState(null)
  const [editSett, setEditSett]           = useState(null)
  const [deleteShip, setDeleteShip]       = useState(null)
  const [deleteSett, setDeleteSett]       = useState(null)
  const [deleting, setDeleting]           = useState(false)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [ords, ships, setts] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at' }),
        DB.list('hayyak_shipments', { orderBy: 'created_at' }),
        DB.list('hayyak_settlements', { orderBy: 'date' }),
      ])
      setOrders(ords)
      setShipments(ships)
      setSettlements(setts)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const delivered  = shipments.filter(s => s.status === 'delivered')
    const returned   = shipments.filter(s => s.status === 'returned')
    const lost       = shipments.filter(s => s.status === 'lost')
    const pending    = shipments.filter(s => s.status === 'pending')

    const totalCOD       = delivered.reduce((s, sh) => s + (sh.cod_amount || 0), 0)
    const totalSettled   = settlements.reduce((s, st) => s + (st.amount || 0), 0)
    const pendingCOD     = totalCOD - totalSettled
    const totalShipping  = shipments.reduce((s, sh) => s + (sh.shipping_cost || 0), 0)
    const lostAmount     = lost.reduce((s, sh) => s + (sh.cod_amount || 0), 0)
    const returnedLoss   = returned.reduce((s, sh) => s + (sh.shipping_cost || 0), 0)

    return {
      total: shipments.length, delivered: delivered.length,
      returned: returned.length, lost: lost.length, pending: pending.length,
      totalCOD, totalSettled, pendingCOD, totalShipping,
      lostAmount, returnedLoss,
      deliveryRate: shipments.length ? Math.round((delivered.length / shipments.length) * 100) : 0,
    }
  }, [shipments, settlements])

  // ── Delete handlers ───────────────────────────────────────
  async function handleDeleteShip() {
    setDeleting(true)
    try {
      await DB.delete('hayyak_shipments', deleteShip)
      setShipments(p => p.filter(s => s.id !== deleteShip))
      setDeleteShip(null); toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  async function handleDeleteSett() {
    setDeleting(true)
    try {
      await DB.delete('hayyak_settlements', deleteSett)
      setSettlements(p => p.filter(s => s.id !== deleteSett))
      setDeleteSett(null); toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  // ── Filtered shipments ────────────────────────────────────
  const filteredShips = shipments.filter(s => {
    const order = orders.find(o => o.id === s.order_id)
    const matchSearch = !search ||
      s.tracking_number?.includes(search) ||
      order?.customer_name?.includes(search) ||
      order?.customer_phone?.includes(search) ||
      order?.order_number?.includes(search)
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const filteredReturns = shipments.filter(s =>
    s.status === 'returned' || s.status === 'lost'
  )

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Spinner size={36}/>
    </div>
  )

  return (
    <div className="page">
      <PageHeader
        title="حياك للشحن"
        subtitle={`${shipments.length} شحنة • ${formatCurrency(stats.pendingCOD)} غير مسوّى`}
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" onClick={() => { setEditSett(null); setShowSettForm(true) }}>
              تسوية جديدة
            </Btn>
            <Btn onClick={() => { setEditShip(null); setShowShipForm(true) }}>
              <IcPlus size={15}/> شحنة جديدة
            </Btn>
          </div>
        }
      />

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 8px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab===t.id ? 'linear-gradient(135deg,var(--teal),var(--violet))' : 'transparent',
            color: tab===t.id ? '#050c1a' : 'var(--text-muted)',
            fontWeight: tab===t.id ? 800 : 500, fontSize:13, fontFamily:'inherit',
            transition:'all 0.2s ease', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════ OVERVIEW ══════════ */}
      {tab === 'overview' && (
        <>
          {/* KPI grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:10, marginBottom:20 }}>
            <StatCard label="إجمالي الشحنات"   value={stats.total}                       color="var(--violet)"/>
            <StatCard label="تم التسليم"        value={stats.delivered}                   color="var(--teal)"/>
            <StatCard label="معدل التسليم"      value={`${stats.deliveryRate}%`}          color="var(--teal)"/>
            <StatCard label="مرتجعات"           value={stats.returned}                    color="var(--amber,#f59e0b)"/>
            <StatCard label="مفقودة"            value={stats.lost}                        color="var(--red)"/>
            <StatCard label="في الطريق"         value={stats.pending}                     color="var(--blue)"/>
          </div>

          {/* COD reconciliation card */}
          <Card glow style={{ marginBottom:16, padding:'20px' }}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:16, color:'var(--text)' }}>
              مطابقة COD
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
              {[
                { label:'إجمالي COD المحصّل',   value: formatCurrency(stats.totalCOD),    color:'var(--teal)',              icon:'' },
                { label:'إجمالي التسويات',      value: formatCurrency(stats.totalSettled), color:'var(--green,#34d399)',     icon:'' },
                { label:'المبلغ غير المسوّى',   value: formatCurrency(stats.pendingCOD),  color: stats.pendingCOD>0?'var(--amber,#f59e0b)':'var(--green,#34d399)', icon:'⏳' },
                { label:'خسارة المرتجعات',      value: formatCurrency(stats.returnedLoss), color:'var(--red)',              icon:'↩' },
              ].map(s => (
                <div key={s.label} style={{ padding:'14px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Pending COD warning */}
            {stats.pendingCOD > 0 && (
              <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'var(--r-md)', fontSize:13 }}>
                ️ <span style={{ fontWeight:700, color:'var(--amber,#f59e0b)' }}>{formatCurrency(stats.pendingCOD)}</span>
                <span style={{ color:'var(--text-sec)' }}> محصّلة من العملاء ولم تُحوَّل بعد من حياك</span>
              </div>
            )}
          </Card>

          {/* Recent settlements */}
          <Card>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>آخر التسويات</div>
            {settlements.length === 0 ? (
              <Empty title="لا يوجد تسويات بعد"/>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[...settlements].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)' }}>
                    <span style={{ fontSize:20 }}></span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{formatDate(s.date)}</div>
                      {s.notes && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.notes}</div>}
                    </div>
                    <div style={{ fontWeight:900, fontSize:16, color:'var(--green,#34d399)' }}>{formatCurrency(s.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══════════ SHIPMENTS ══════════ */}
      {tab === 'shipments' && (
        <>
          {/* Search + filter */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <IcSearch size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث برقم التتبع أو اسم العميل..."
                style={{ width:'100%', padding:'9px 32px 9px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
            </div>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
              style={{ padding:'9px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
              <option value="all">كل الحالات</option>
              {SHIP_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {filteredShips.length === 0 ? <Empty title="لا يوجد شحنات"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredShips.map(ship => {
                const order  = orders.find(o => o.id === ship.order_id)
                const status = SHIP_STATUSES.find(s => s.id === ship.status) || SHIP_STATUSES[0]
                return (
                  <ShipmentRow
                    key={ship.id}
                    ship={ship} order={order} status={status}
                    onEdit={() => { setEditShip(ship); setShowShipForm(true) }}
                    onDelete={() => setDeleteShip(ship.id)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════ SETTLEMENTS ══════════ */}
      {tab === 'settlements' && (
        <>
          {/* Running balance */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'إجمالي COD', value: formatCurrency(stats.totalCOD),    color:'var(--teal)' },
              { label:'تم تسويته', value: formatCurrency(stats.totalSettled), color:'var(--green,#34d399)' },
              { label:'المتبقي',   value: formatCurrency(stats.pendingCOD),  color: stats.pendingCOD>0?'var(--amber,#f59e0b)':'var(--teal)' },
            ].map(s => (
              <div key={s.label} style={{ padding:'12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {settlements.length === 0 ? <Empty title="لا يوجد تسويات بعد" action={<Btn onClick={()=>{setEditSett(null);setShowSettForm(true)}}><IcPlus size={14}/> تسوية جديدة</Btn>}/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[...settlements].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((sett, i, arr) => {
                const runningTotal = arr.slice(i).reduce((s,t)=>s+t.amount,0)
                return (
                  <SettlementRow
                    key={sett.id} sett={sett}
                    onEdit={() => { setEditSett(sett); setShowSettForm(true) }}
                    onDelete={() => setDeleteSett(sett.id)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════ RETURNS & LOST ══════════ */}
      {tab === 'returns' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label:'مرتجعات', value: stats.returned, sub: `خسارة شحن: ${formatCurrency(stats.returnedLoss)}`, color:'var(--amber,#f59e0b)', icon:'↩' },
              { label:'مفقودة', value: stats.lost, sub: `قيمة مفقودة: ${formatCurrency(stats.lostAmount)}`, color:'var(--red)', icon:'' },
            ].map(s => (
              <div key={s.label} style={{ padding:'14px', background:'var(--bg-hover)', border:`1.5px solid ${s.color}30`, borderRadius:'var(--r-lg)' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {filteredReturns.length === 0 ? <Empty title="لا يوجد مرتجعات أو مفقودات"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredReturns.map(ship => {
                const order  = orders.find(o => o.id === ship.order_id)
                const status = SHIP_STATUSES.find(s => s.id === ship.status) || SHIP_STATUSES[0]
                return (
                  <ShipmentRow
                    key={ship.id} ship={ship} order={order} status={status}
                    onEdit={() => { setEditShip(ship); setShowShipForm(true) }}
                    onDelete={() => setDeleteShip(ship.id)}
                    showReason
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <ShipmentForm
        open={showShipForm}
        onClose={() => { setShowShipForm(false); setEditShip(null) }}
        ship={editShip}
        orders={orders}
        onSaved={ship => {
          if (editShip) setShipments(p => p.map(s => s.id===ship.id ? ship : s))
          else setShipments(p => [ship, ...p])
          setShowShipForm(false); setEditShip(null)
          toast(editShip ? 'تم التحديث' : 'تمت الإضافة ')
        }}
      />

      <SettlementForm
        open={showSettForm}
        onClose={() => { setShowSettForm(false); setEditSett(null) }}
        sett={editSett}
        onSaved={sett => {
          if (editSett) setSettlements(p => p.map(s => s.id===sett.id ? sett : s))
          else setSettlements(p => [sett, ...p])
          setShowSettForm(false); setEditSett(null)
          toast(editSett ? 'تم التحديث' : 'تمت إضافة التسوية ')
        }}
      />

      <ConfirmModal open={!!deleteShip} onClose={()=>setDeleteShip(null)} onConfirm={handleDeleteShip} loading={deleting} message="سيتم حذف الشحنة نهائياً."/>
      <ConfirmModal open={!!deleteSett} onClose={()=>setDeleteSett(null)} onConfirm={handleDeleteSett} loading={deleting} message="سيتم حذف التسوية نهائياً."/>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SHIPMENT ROW
══════════════════════════════════════════════ */
function ShipmentRow({ ship, order, status, onEdit, onDelete, showReason }) {
  return (
    <div className="list-row" style={{
      display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
      background:'var(--bg-hover)', border:`1.5px solid ${status.color}22`,
      borderRight:`3px solid ${status.color}`,
      borderRadius:'var(--r-md)', flexWrap:'wrap',
    }}>
      {/* Status dot */}
      <span style={{ width:10, height:10, borderRadius:'50%', background:status.color, flexShrink:0, boxShadow:`0 0 6px ${status.color}` }}/>

      {/* Main info */}
      <div style={{ flex:1, minWidth:140 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
          <span style={{ fontWeight:800, fontSize:13, color:'var(--text)', fontFamily:'monospace' }}>{ship.tracking_number || '—'}</span>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:`${status.color}18`, color:status.color, fontWeight:700 }}>{status.label}</span>
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>
          {order ? `${order.customer_name} • ${order.order_number}` : 'غير مرتبط بطلب'}
          {ship.sent_date && ` • ${formatDate(ship.sent_date)}`}
        </div>
        {showReason && ship.return_reason && (
          <div style={{ fontSize:11, color:'var(--amber,#f59e0b)', marginTop:2 }}>↩ {ship.return_reason}</div>
        )}
      </div>

      {/* COD */}
      <div style={{ textAlign:'center', minWidth:80 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>COD</div>
        <div style={{ fontWeight:900, fontSize:14, color:'var(--teal)' }}>{formatCurrency(ship.cod_amount||0)}</div>
      </div>

      {/* Shipping cost */}
      <div style={{ textAlign:'center', minWidth:70 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>الشحن</div>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--text-sec)' }}>{formatCurrency(ship.shipping_cost||0)}</div>
      </div>

      {/* Settlement badge */}
      <div style={{ flexShrink:0 }}>
        {ship.settled ? (
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:'rgba(52,211,153,0.12)', color:'var(--green,#34d399)', border:'1px solid rgba(52,211,153,0.25)', fontWeight:700 }}>مسوّى</span>
        ) : ship.status==='delivered' ? (
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:'rgba(245,158,11,0.1)', color:'var(--amber,#f59e0b)', border:'1px solid rgba(245,158,11,0.25)', fontWeight:700 }}>⏳ معلق</span>
        ) : null}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <Btn variant="ghost" size="sm" onClick={onEdit}><IcEdit size={13}/></Btn>
        <Btn variant="danger" size="sm" onClick={onDelete}><IcDelete size={13}/></Btn>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SETTLEMENT ROW
══════════════════════════════════════════════ */
function SettlementRow({ sett, onEdit, onDelete }) {
  return (
    <div className="list-row" style={{
      display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
      background:'var(--bg-hover)', border:'none',
      borderRight:'3px solid var(--green,#34d399)',
      borderRadius:'var(--r-md)',
    }}>
      <span style={{ fontSize:22, flexShrink:0 }}></span>
      <div style={{ flex:1, minWidth:120 }}>
        <div style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>{formatDate(sett.date)}</div>
        {sett.reference && <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>ref: {sett.reference}</div>}
        {sett.notes && <div style={{ fontSize:12, color:'var(--text-sec)', marginTop:2 }}>{sett.notes}</div>}
      </div>
      {sett.shipments_count > 0 && (
        <div style={{ textAlign:'center', padding:'6px 12px', background:'rgba(167,139,250,0.1)', borderRadius:8 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>شحنات</div>
          <div style={{ fontWeight:800, color:'var(--violet)' }}>{sett.shipments_count}</div>
        </div>
      )}
      <div style={{ fontWeight:900, fontSize:18, color:'var(--green,#34d399)', minWidth:100, textAlign:'left' }}>{formatCurrency(sett.amount)}</div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <Btn variant="ghost" size="sm" onClick={onEdit}><IcEdit size={13}/></Btn>
        <Btn variant="danger" size="sm" onClick={onDelete}><IcDelete size={13}/></Btn>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SHIPMENT FORM
══════════════════════════════════════════════ */
function ShipmentForm({ open, onClose, ship, orders, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({...p, [k]:v})) }

  useEffect(() => {
    if (open) setForm(ship ? {...ship} : {
      status: 'pending', shipping_cost: 25, settled: false,
      sent_date: new Date().toISOString().split('T')[0],
    })
  }, [open, ship])

  // Auto-fill COD from linked order
  useEffect(() => {
    if (form.order_id && !ship) {
      const order = orders.find(o => o.id === form.order_id)
      if (order) {
        setField('cod_amount', order.total || 0)
        if (!form.tracking_number && order.tracking_number)
          setField('tracking_number', order.tracking_number)
      }
    }
  }, [form.order_id])

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        shipping_cost: parseFloat(form.shipping_cost) || 0,
        cod_amount:    parseFloat(form.cod_amount) || 0,
      }
      let saved
      if (ship) saved = await DB.update('hayyak_shipments', ship.id, payload)
      else saved = await DB.insert('hayyak_shipments', payload)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ: ' + (err.message||''), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={ship ? 'تعديل الشحنة' : 'شحنة جديدة'} width={520}
      footer={<><Btn variant="ghost" onClick={onClose}>إلغاء</Btn><Btn loading={saving} onClick={handleSave}>{ship?'حفظ':'إضافة'}</Btn></>}
    >
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Link to order */}
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>ربط بطلب</div>
          <select value={form.order_id||''} onChange={e=>setField('order_id', e.target.value)}
            style={{ width:'100%', padding:'9px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="">— اختر طلب —</option>
            {[...orders].reverse().map(o => (
              <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name} — {formatCurrency(o.total)}</option>
            ))}
          </select>
        </div>

        <Input label="رقم التتبع" value={form.tracking_number||''} onChange={e=>setField('tracking_number',e.target.value)} dir="ltr" placeholder="HAY-123456"/>

        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>الحالة</div>
          <select value={form.status||'pending'} onChange={e=>setField('status',e.target.value)}
            style={{ width:'100%', padding:'9px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
            {SHIP_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <Input label="تاريخ الإرسال" type="date" value={form.sent_date||''} onChange={e=>setField('sent_date',e.target.value)}/>
        <Input label="تاريخ التسليم" type="date" value={form.delivery_date||''} onChange={e=>setField('delivery_date',e.target.value)}/>

        <Input label="مبلغ COD (د.إ)" type="number" value={form.cod_amount||''} onChange={e=>setField('cod_amount',e.target.value)}/>
        <Input label="تكلفة الشحن (د.إ)" type="number" value={form.shipping_cost||''} onChange={e=>setField('shipping_cost',e.target.value)}/>

        {(form.status==='returned'||form.status==='lost') && (
          <Input label="سبب الإرجاع/الفقدان" value={form.return_reason||''} onChange={e=>setField('return_reason',e.target.value)} containerStyle={{gridColumn:'1/-1'}}/>
        )}

        {/* Settled toggle */}
        <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)' }}>
          <span style={{ flex:1, fontSize:13, fontWeight:700 }}>تم تسوية هذه الشحنة </span>
          <button onClick={() => setField('settled', !form.settled)} style={{
            width:44, height:24, borderRadius:999, border:'none', cursor:'pointer',
            background: form.settled ? 'var(--teal)' : 'var(--border)',
            transition:'all 0.2s',
            position:'relative',
          }}>
            <span style={{
              position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff',
              transition:'all 0.2s', right: form.settled ? 3 : 'auto', left: form.settled ? 'auto' : 3,
            }}/>
          </button>
        </div>

        <Textarea label="ملاحظات" value={form.notes||''} onChange={e=>setField('notes',e.target.value)} containerStyle={{gridColumn:'1/-1'}}/>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   SETTLEMENT FORM
══════════════════════════════════════════════ */
function SettlementForm({ open, onClose, sett, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({...p, [k]:v})) }

  useEffect(() => {
    if (open) setForm(sett ? {...sett} : {
      date: new Date().toISOString().split('T')[0],
      amount: 0, shipments_count: 0,
    })
  }, [open, sett])

  async function handleSave() {
    if (!form.amount || !form.date) { toast('أدخل التاريخ والمبلغ', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount)||0, shipments_count: parseInt(form.shipments_count)||0 }
      let saved
      if (sett) saved = await DB.update('hayyak_settlements', sett.id, payload)
      else saved = await DB.insert('hayyak_settlements', payload)
      onSaved(saved)
    } catch (err) { toast('فشل الحفظ: ' + (err.message||''), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={sett ? 'تعديل التسوية' : 'تسوية جديدة'} width={460}
      footer={<><Btn variant="ghost" onClick={onClose}>إلغاء</Btn><Btn loading={saving} onClick={handleSave}>{sett?'حفظ':'إضافة'}</Btn></>}
    >
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Input label="تاريخ التحويل *" type="date" value={form.date||''} onChange={e=>setField('date',e.target.value)}/>
        <Input label="المبلغ المحوّل (د.إ) *" type="number" value={form.amount||''} onChange={e=>setField('amount',e.target.value)}/>
        <Input label="عدد الشحنات المشمولة" type="number" value={form.shipments_count||''} onChange={e=>setField('shipments_count',e.target.value)}/>
        <Input label="رقم المرجع / الإيصال" value={form.reference||''} onChange={e=>setField('reference',e.target.value)} dir="ltr" placeholder="TXN-xxxxx"/>
        <Textarea label="ملاحظات" value={form.notes||''} onChange={e=>setField('notes',e.target.value)} containerStyle={{gridColumn:'1/-1'}}/>
      </div>
    </Modal>
  )
}
