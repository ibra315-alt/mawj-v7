import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Btn, Badge, Modal, Input, Textarea, Empty, PageHeader, ConfirmModal, toast, SkeletonStats, SkeletonCard } from '../components/ui'
import { IcPlus, IcEdit, IcDelete, IcSearch, IcCheck, IcAlert, IcWhatsapp } from '../components/Icons'

/* ═══════════════════════════════════════════════════════════
   HAYYAK PAGE v8.5
   Source of truth: orders table + hayyak_remittances table

   DATA FLOW:
   ┌─────────────────────────────────────────────────────┐
   │  orders (status='delivered', remittance_id = null)  │
   │                 = PENDING COD                       │
   │                                                     │
   │  hayyak_remittances                                 │
   │    ← bank_received + transfer_fee per batch         │
   │    → orders.hayyak_remittance_id set                │
   └─────────────────────────────────────────────────────┘

   ACCOUNTING reads:
   • hayyak_remittances → cash actually received from Hayyak
   • orders.hayyak_fee  → total delivery cost absorbed by Mawj
   • transfer_fee       → auto-recorded as operating expense
═══════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'overview',     label: 'نظرة عامة' },
  { id: 'pending',      label: 'COD المعلق' },
  { id: 'remittances',  label: 'التحويلات' },
]

export default function Hayyak() {
  const [orders,       setOrders]       = useState([])
  const [remittances,  setRemittances]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('overview')
  const [search,       setSearch]       = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [groupBy,      setGroupBy]      = useState('none')  // 'none' | 'city' | 'date'
  const [showForm,     setShowForm]     = useState(false)
  const [editRemit,    setEditRemit]    = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [ords, remits] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at' }),
        DB.list('hayyak_remittances', { orderBy: 'date' }),
      ])
      setOrders(ords)
      setRemittances(remits.reverse())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // ── Derived data ─────────────────────────────────────────
  const stats = useMemo(() => {
    const delivered     = orders.filter(o => o.status === 'delivered')
    const pendingOrders = delivered.filter(o => !o.hayyak_remittance_id)
    const settledOrders = delivered.filter(o =>  o.hayyak_remittance_id)

    const totalCOD        = delivered.reduce(    (s, o) => s + (o.total       || 0), 0)
    const pendingCOD      = pendingOrders.reduce((s, o) => s + (o.total       || 0), 0)
    // Hayyak charges for any delivery attempt (delivered + not_delivered)
    const totalHayyakFees = orders.filter(o => ['delivered','not_delivered'].includes(o.status))
                                  .reduce((s, o) => s + (o.hayyak_fee || 0), 0)
    const bankReceived    = remittances.reduce(  (s, r) => s + (r.bank_received || 0), 0)
    const transferFees    = remittances.reduce(  (s, r) => s + (r.transfer_fee  || 0), 0)
    const notDelivered    = orders.filter(o => o.status === 'not_delivered')
    const totalLoss       = notDelivered.reduce((s, o) => s + Math.abs(o.gross_profit || 0), 0)

    return {
      deliveredCount:  delivered.length,
      pendingCount:    pendingOrders.length,
      settledCount:    settledOrders.length,
      totalCOD,
      pendingCOD,
      bankReceived,
      transferFees,
      totalHayyakFees,
      totalLoss,
      notDeliveredCount: notDelivered.length,
      pendingOrders,
      settledOrders,
      deliveryRate: orders.length
        ? Math.round((delivered.length / orders.filter(o => o.status !== 'cancelled').length) * 100)
        : 0,
    }
  }, [orders, remittances])

  async function handleDeleteRemittance() {
    if (!deleteId) return
    setDeleting(true)
    try {
      // Unlink all orders attached to this remittance
      const linked = orders.filter(o => o.hayyak_remittance_id === deleteId)
      await Promise.all(linked.map(o => DB.update('orders', o.id, { hayyak_remittance_id: null })))
      await DB.delete('hayyak_remittances', deleteId)
      setOrders(prev => prev.map(o => o.hayyak_remittance_id === deleteId ? { ...o, hayyak_remittance_id: null } : o))
      setRemittances(prev => prev.filter(r => r.id !== deleteId))
      setDeleteId(null)
      toast('تم حذف التحويل وإلغاء ربط الطلبات')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  const filteredPending = stats.pendingOrders.filter(o => {
    const q = search.toLowerCase()
    const matchQ = !q
      || (o.customer_name  || '').includes(q)
      || (o.order_number   || '').toLowerCase().includes(q)
      || (o.customer_phone || '').includes(q)
    const oDate = o.delivery_date || o.order_date || o.created_at?.split('T')[0] || ''
    const matchFrom = !dateFrom || oDate >= dateFrom
    const matchTo   = !dateTo   || oDate <= dateTo
    return matchQ && matchFrom && matchTo
  })

  // Grouped pending
  function groupOrders(list) {
    if (groupBy === 'city') {
      const map = {}
      list.forEach(o => {
        const k = o.customer_city || 'غير محدد'
        if (!map[k]) map[k] = []
        map[k].push(o)
      })
      return Object.entries(map).sort((a,b) => b[1].length - a[1].length)
    }
    if (groupBy === 'date') {
      const map = {}
      list.forEach(o => {
        const k = o.delivery_date || o.order_date || o.created_at?.split('T')[0] || 'غير محدد'
        if (!map[k]) map[k] = []
        map[k].push(o)
      })
      return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]))
    }
    return [['all', list]]
  }
  const groupedPending = groupOrders(filteredPending)

  if (loading) return (
    <div className="page">
      <PageHeader title="حياك للشحن" subtitle="جاري التحميل..." />
      <SkeletonStats count={4} />
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
        {[1,2,3].map(i => <SkeletonCard key={i} rows={2}/>)}
      </div>
    </div>
  )

  return (
    <div className="page">
      <PageHeader
        title="حياك للشحن"
        subtitle={`${stats.pendingCount} طلب معلق • ${formatCurrency(stats.pendingCOD)} COD`}
        actions={
          <Btn onClick={() => { setEditRemit(null); setShowForm(true) }} style={{ gap:6 }}>
            <IcPlus size={16}/> تحويل جديد
          </Btn>
        }
      />

      {/* Pending COD alert — always visible if there's money waiting */}
      {stats.pendingCOD > 0 && (
        <div style={{
          marginBottom:16, padding:'14px 16px',
          background:'rgba(245,158,11,0.08)',
          border:'1.5px solid rgba(245,158,11,0.3)',
          borderRadius:'var(--r-md)',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <IcAlert size={20} style={{ color:'#f59e0b', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:800, color:'#f59e0b', fontSize:15 }}>{formatCurrency(stats.pendingCOD)}</span>
            <span style={{ color:'var(--text-sec)', fontSize:13, marginRight:8 }}>
              محصّلة من {stats.pendingCount} طلب — لم تُحوَّل بعد من حياك
            </span>
          </div>
          <Btn size="sm" onClick={() => setTab('pending')} style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'none' }}>
            عرض الطلبات
          </Btn>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 8px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab === t.id ? 'linear-gradient(135deg,var(--teal),var(--violet))' : 'transparent',
            color: tab === t.id ? '#050c1a' : 'var(--text-muted)',
            fontWeight: tab === t.id ? 800 : 500, fontSize:13,
            fontFamily:'inherit', transition:'all 0.2s', whiteSpace:'nowrap',
          }}>
            {t.label}
            {t.id === 'pending' && stats.pendingCount > 0 && (
              <span style={{ marginRight:6, padding:'1px 6px', borderRadius:999, fontSize:10, fontWeight:900, background:'rgba(245,158,11,0.2)', color:'#f59e0b' }}>
                {stats.pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW ═══════════ */}
      {tab === 'overview' && (
        <>
          {/* KPI grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:20 }}>
            {[
              { label:'طلبات مسلّمة',    value: stats.deliveredCount,           color:'var(--action)' },
              { label:'معدل التسليم',     value: `${stats.deliveryRate}%`,       color: stats.deliveryRate >= 80 ? 'var(--action)' : '#f59e0b' },
              { label:'لم يتم التسليم',  value: stats.notDeliveredCount,        color:'var(--danger)' },
              { label:'إجمالي رسوم حياك',value: formatCurrency(stats.totalHayyakFees), color:'var(--danger)', small:true },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
                <div style={{ fontSize: s.small ? 11 : 20, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.2 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* COD Reconciliation */}
          <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'16px', boxShadow:'var(--card-shadow)', marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:16, color:'var(--text)' }}>مطابقة COD</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
              {[
                { label:'إجمالي COD المحصّل',  value: formatCurrency(stats.totalCOD),     color:'var(--text)',   bg:'var(--bg-hover)' },
                { label:'تم استلامه من حياك',  value: formatCurrency(stats.bankReceived),  color:'var(--action)', bg:'rgba(0,228,184,0.06)' },
                { label:'COD المعلق',           value: formatCurrency(stats.pendingCOD),   color: stats.pendingCOD > 0 ? '#f59e0b' : 'var(--action)', bg: stats.pendingCOD > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(0,228,184,0.06)' },
                { label:'رسوم تحويل بنكي',      value: formatCurrency(stats.transferFees), color:'var(--danger)', bg:'rgba(239,68,68,0.06)' },
              ].map(s => (
                <div key={s.label} style={{ padding:'12px 14px', background:s.bg, borderRadius:'var(--r-md)' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent remittances */}
          <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'16px', boxShadow:'var(--card-shadow)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>آخر التحويلات</div>
              {remittances.length > 0 && (
                <button onClick={() => setTab('remittances')} style={{ fontSize:12, color:'var(--action)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                  عرض الكل
                </button>
              )}
            </div>
            {remittances.length === 0
              ? <Empty title="لا يوجد تحويلات بعد" action={<Btn size="sm" onClick={() => { setEditRemit(null); setShowForm(true) }}><IcPlus size={13}/> تحويل جديد</Btn>}/>
              : remittances.slice(0, 5).map(r => (
                  <RemittanceRow
                    key={r.id} remit={r}
                    orderCount={orders.filter(o => o.hayyak_remittance_id === r.id).length}
                    compact
                  />
                ))
            }
          </div>
        </>
      )}

      {/* ═══════════ PENDING COD ═══════════ */}
      {tab === 'pending' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'طلبات معلقة',  value: stats.pendingCount,            color:'#f59e0b' },
              { label:'COD المعلق',   value: formatCurrency(stats.pendingCOD), color:'#f59e0b', small:true },
              { label:'رسوم حياك',    value: formatCurrency(stats.pendingOrders.reduce((s,o) => s + (o.hayyak_fee || 25), 0)), color:'var(--danger)', small:true },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
                <div style={{ fontSize: s.small ? 11 : 20, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.2 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:140 }}>
              <IcSearch size={14} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث..."
                style={{ width:'100%', padding:'9px 32px 9px 12px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', boxShadow:'var(--card-shadow)' }}
              />
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding:'9px 10px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color: dateFrom?'var(--text)':'var(--text-muted)', fontSize:12, fontFamily:'inherit', cursor:'pointer', boxShadow:'var(--card-shadow)' }}
              title="من تاريخ"
            />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding:'9px 10px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color: dateTo?'var(--text)':'var(--text-muted)', fontSize:12, fontFamily:'inherit', cursor:'pointer', boxShadow:'var(--card-shadow)' }}
              title="حتى تاريخ"
            />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
              style={{ padding:'9px 10px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:12, fontFamily:'inherit', cursor:'pointer', boxShadow:'var(--card-shadow)' }}>
              <option value="none">بدون تجميع</option>
              <option value="city">حسب الإمارة</option>
              <option value="date">حسب التاريخ</option>
            </select>
            {(search||dateFrom||dateTo) && (
              <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
                style={{ padding:'9px 12px', background:'var(--bg-surface)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-sm)', color:'var(--text-muted)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                ✕ مسح
              </button>
            )}
          </div>

          {filteredPending.length === 0
            ? <Empty title="لا يوجد COD معلق 🎉" subtitle="كل التحويلات مكتملة"/>
            : (
              <>
                {/* Create remittance from selection */}
                <div style={{ marginBottom:12, padding:'10px 14px', background:'rgba(0,228,184,0.05)', border:'1px solid rgba(0,228,184,0.15)', borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <span style={{ fontSize:12, color:'var(--text-sec)' }}>
                    استلمت تحويلاً من حياك؟
                  </span>
                  <Btn size="sm" onClick={() => { setEditRemit(null); setShowForm(true) }}>
                    <IcPlus size={13}/> سجّل تحويلاً جديداً
                  </Btn>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {groupedPending.map(([groupKey, groupOrders]) => (
                    <div key={groupKey}>
                      {groupBy !== 'none' && (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                            {groupKey}
                          </div>
                          <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-muted)' }}>
                            <span>{groupOrders.length} طلب</span>
                            <span style={{ color:'#f59e0b', fontWeight:700 }}>
                              COD: {formatCurrency(groupOrders.reduce((s,o) => s+(o.total||0), 0))}
                            </span>
                          </div>
                        </div>
                      )}
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {groupOrders.map(order => (
                          <PendingOrderRow key={order.id} order={order}
                            onQuickLink={() => {
                              setEditRemit(null)
                              setShowForm(true)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </>
      )}

      {/* ═══════════ REMITTANCES ═══════════ */}
      {tab === 'remittances' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'عدد التحويلات', value: remittances.length,               color:'var(--text-sec)' },
              { label:'إجمالي استُلم', value: formatCurrency(stats.bankReceived), color:'var(--action)', small:true },
              { label:'رسوم تحويل',    value: formatCurrency(stats.transferFees), color:'var(--danger)',  small:true },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
                <div style={{ fontSize: s.small ? 11 : 20, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.2 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {remittances.length === 0
            ? <Empty title="لا يوجد تحويلات بعد" action={<Btn onClick={() => { setEditRemit(null); setShowForm(true) }}><IcPlus size={14}/> تحويل جديد</Btn>}/>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {remittances.map(r => (
                  <RemittanceRow
                    key={r.id} remit={r}
                    orderCount={orders.filter(o => o.hayyak_remittance_id === r.id).length}
                    onEdit={() => { setEditRemit(r); setShowForm(true) }}
                    onDelete={() => setDeleteId(r.id)}
                  />
                ))}
              </div>
            )
          }
        </>
      )}

      {/* Remittance form */}
      <RemittanceForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditRemit(null) }}
        remit={editRemit}
        pendingOrders={stats.pendingOrders}
        onSaved={async (remit, selectedOrderIds) => {
          if (editRemit) {
            setRemittances(prev => prev.map(r => r.id === remit.id ? remit : r))
          } else {
            setRemittances(prev => [remit, ...prev])
            // Update local orders state with remittance_id
            setOrders(prev => prev.map(o =>
              selectedOrderIds.includes(o.id)
                ? { ...o, hayyak_remittance_id: remit.id }
                : o
            ))
          }
          setShowForm(false); setEditRemit(null)
          toast(editRemit ? 'تم تحديث التحويل ✓' : `تم تسجيل التحويل — ${selectedOrderIds.length} طلب مسوّى ✓`)
        }}
      />

      <ConfirmModal
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteRemittance} loading={deleting}
        message="سيتم حذف التحويل وإلغاء ربطه بالطلبات. لا يمكن التراجع."
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   PENDING ORDER ROW
═══════════════════════════════════════════ */
function PendingOrderRow({ order, onQuickLink }) {
  const net = (order.total || 0) - (order.hayyak_fee || 25)
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
      background:'var(--bg-surface)', borderRadius:'var(--r-md)',
      borderRight:'3px solid #f59e0b', boxShadow:'var(--card-shadow)',
      flexWrap:'wrap',
    }}>
      <div style={{ flex:1, minWidth:100 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:2 }}>
          {order.customer_name || 'عميل'}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', direction:'ltr', display:'flex', gap:8, flexWrap:'wrap' }}>
          <span>{order.order_number}</span>
          {order.customer_city  && <span style={{ direction:'rtl' }}>• {order.customer_city}</span>}
          {order.delivery_date  && <span>• {formatDate(order.delivery_date)}</span>}
        </div>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
        <div style={{ textAlign:'center', minWidth:56 }}>
          <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:1 }}>رسوم</div>
          <div style={{ fontWeight:700, color:'var(--danger)', fontSize:12, fontFamily:'Inter,sans-serif' }}>
            −{formatCurrency(order.hayyak_fee || 25)}
          </div>
        </div>
        <div style={{ textAlign:'center', minWidth:64 }}>
          <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:1 }}>COD</div>
          <div style={{ fontWeight:800, color:'#f59e0b', fontSize:14, fontFamily:'Inter,sans-serif' }}>
            {formatCurrency(order.total || 0)}
          </div>
        </div>
        <div style={{ textAlign:'center', minWidth:60 }}>
          <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:1 }}>صافي</div>
          <div style={{ fontWeight:800, color:'var(--action)', fontSize:14, fontFamily:'Inter,sans-serif' }}>
            {formatCurrency(net)}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   REMITTANCE ROW
═══════════════════════════════════════════ */
function RemittanceRow({ remit, orderCount, onEdit, onDelete, compact }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
      background:'var(--bg-surface)', borderRadius:'var(--r-md)',
      borderRight:'3px solid var(--action)', boxShadow:'var(--card-shadow)',
      flexWrap:'wrap', marginBottom: compact ? 8 : 0,
    }}>
      <div style={{ flex:1, minWidth:120 }}>
        <div style={{ fontWeight:800, fontSize:13, color:'var(--text)', marginBottom:2 }}>
          {formatDate(remit.date)}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:10, flexWrap:'wrap' }}>
          {orderCount > 0 && <span>{orderCount} طلب مسوّى</span>}
          {remit.transfer_fee > 0 && (
            <span style={{ color:'var(--danger)' }}>رسوم بنكية: {formatCurrency(remit.transfer_fee)}</span>
          )}
          {remit.notes && <span>{remit.notes}</span>}
        </div>
      </div>

      {remit.total_cod > 0 && (
        <div style={{ textAlign:'center', minWidth:80 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>COD</div>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text-sec)', fontFamily:'Inter,sans-serif' }}>
            {formatCurrency(remit.total_cod)}
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', minWidth:90 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>استُلم فعلياً</div>
        <div style={{ fontWeight:900, fontSize:16, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>
          {formatCurrency(remit.bank_received)}
        </div>
      </div>

      {!compact && (
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <Btn variant="ghost"   size="sm" onClick={onEdit}  ><IcEdit   size={13}/></Btn>
          <Btn variant="danger"  size="sm" onClick={onDelete}><IcDelete size={13}/></Btn>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   REMITTANCE FORM
   The main workflow:
   1. Select which pending orders are included
   2. Enter bank_received amount
   3. Enter transfer_fee (auto-saved as expense)
   4. System calculates difference for verification
═══════════════════════════════════════════ */
function RemittanceForm({ open, onClose, remit, pendingOrders, onSaved }) {
  const isEdit = !!remit
  const [form,         setForm]         = useState({})
  const [selectedIds,  setSelectedIds]  = useState([])
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (!open) return
    if (remit) {
      setForm({
        date:          remit.date          || new Date().toISOString().split('T')[0],
        bank_received: remit.bank_received || 0,
        transfer_fee:  remit.transfer_fee  || 0,
        notes:         remit.notes         || '',
      })
      setSelectedIds([]) // edit mode: just update metadata
    } else {
      setForm({
        date:          new Date().toISOString().split('T')[0],
        bank_received: '',
        transfer_fee:  0,
        notes:         '',
      })
      // Auto-select all pending orders
      setSelectedIds(pendingOrders.map(o => o.id))
    }
  }, [open, remit, pendingOrders])

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function toggleOrder(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedIds(prev =>
      prev.length === pendingOrders.length ? [] : pendingOrders.map(o => o.id)
    )
  }

  // ── Calculated totals ──────────────────────────────────
  const selectedOrders = pendingOrders.filter(o => selectedIds.includes(o.id))
  const totalCOD       = selectedOrders.reduce((s, o) => s + (o.total || 0), 0)
  const totalHayyakFee = selectedOrders.reduce((s, o) => s + (o.hayyak_fee || 25), 0)
  const expectedNet    = totalCOD - totalHayyakFee          // what Hayyak should send
  const bankReceived   = parseFloat(form.bank_received) || 0
  const transferFee    = parseFloat(form.transfer_fee)  || 0
  const difference     = bankReceived - (expectedNet - transferFee) // should be ~0

  async function handleSave() {
    if (!form.date) { toast('اختر تاريخ التحويل', 'error'); return }
    if (!form.bank_received || bankReceived <= 0) { toast('أدخل المبلغ المستلم من البنك', 'error'); return }
    if (!isEdit && selectedIds.length === 0) { toast('اختر طلباً واحداً على الأقل', 'error'); return }

    setSaving(true)
    try {
      const payload = {
        date:          form.date,
        bank_received: bankReceived,
        transfer_fee:  transferFee,
        total_cod:     totalCOD,
        hayyak_fees:   totalHayyakFee,
        difference,
        notes:         form.notes,
      }

      let saved
      if (isEdit) {
        saved = await DB.update('hayyak_remittances', remit.id, payload)
        onSaved(saved, [])
      } else {
        saved = await DB.insert('hayyak_remittances', payload)

        // Link all selected orders to this remittance
        await Promise.all(
          selectedIds.map(id => DB.update('orders', id, { hayyak_remittance_id: saved.id }))
        )

        // Auto-save transfer fee as operating expense (if any)
        if (transferFee > 0) {
          await DB.insert('expenses', {
            date:        form.date,
            amount:      transferFee,
            category:    'رسوم تحويل حياك',
            description: `رسوم التحويل البنكي — ${form.date}`,
            paid_by:     'company',
            reimbursed:  false,
            created_at:  new Date().toISOString(),
          }).catch(() => {}) // Non-critical — don't fail the whole save
        }

        onSaved(saved, selectedIds)
      }
    } catch (err) {
      toast('فشل الحفظ: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'تعديل التحويل' : 'تسجيل تحويل جديد من حياك'}
      width={620}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>
          <IcCheck size={15}/> {isEdit ? 'حفظ التعديلات' : `تأكيد التحويل${selectedIds.length > 0 ? ` (${selectedIds.length} طلب)` : ''}`}
        </Btn>
      </>}
    >
      {/* Date + Bank received + Transfer fee */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12, marginBottom:16 }}>
        <Input label="تاريخ التحويل *" type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)}/>
        <Input
          label="المبلغ المستلم من البنك (د.إ) *"
          type="number" min="0"
          value={form.bank_received || ''}
          onChange={e => setField('bank_received', e.target.value)}
          hint="الرقم الفعلي في كشف الحساب"
        />
        <Input
          label="رسوم التحويل البنكي (د.إ)"
          type="number" min="0"
          value={form.transfer_fee || ''}
          onChange={e => setField('transfer_fee', e.target.value)}
          hint="تُسجَّل تلقائياً كمصروف"
        />
      </div>

      {/* Order selection — only for new remittances */}
      {!isEdit && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
              الطلبات المشمولة
            </div>
            {pendingOrders.length > 0 && (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button onClick={selectAll} style={{ fontSize:11, color:'var(--action)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
                  {selectedIds.length === pendingOrders.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                {form.date && (
                  <button
                    onClick={() => {
                      // Select orders delivered on or before remittance date
                      const ids = pendingOrders
                        .filter(o => {
                          const d = o.delivery_date || o.order_date || o.created_at?.split('T')[0] || ''
                          return d <= form.date
                        })
                        .map(o => o.id)
                      setSelectedIds(ids)
                    }}
                    style={{ fontSize:11, color:'#f59e0b', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:999, padding:'3px 10px', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}
                  >
                    ≤ تاريخ التحويل فقط
                  </button>
                )}
              </div>
            )}
          </div>

          {pendingOrders.length === 0
            ? <div style={{ padding:'16px', background:'var(--bg-hover)', borderRadius:'var(--r-md)', textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>لا يوجد طلبات مسلّمة معلقة</div>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto', paddingLeft:2 }}>
                {pendingOrders.map(order => {
                  const selected = selectedIds.includes(order.id)
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrder(order.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                        background: selected ? 'rgba(0,228,184,0.06)' : 'var(--bg-hover)',
                        border:`1.5px solid ${selected ? 'rgba(0,228,184,0.25)' : 'var(--border)'}`,
                        borderRadius:'var(--r-md)', cursor:'pointer', transition:'all 120ms',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width:18, height:18, borderRadius:5, flexShrink:0,
                        background: selected ? 'var(--action)' : 'transparent',
                        border:`2px solid ${selected ? 'var(--action)' : 'var(--border)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 120ms',
                      }}>
                        {selected && <IcCheck size={11} style={{ color:'#050c1a' }}/>}
                      </div>

                      {/* Order info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {order.customer_name || 'عميل'}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', direction:'ltr', display:'flex', gap:8 }}>
                          <span>{order.order_number}</span>
                          {order.delivery_date && <span>• {formatDate(order.delivery_date)}</span>}
                        </div>
                      </div>

                      {/* Hayyak fee */}
                      <div style={{ textAlign:'center', minWidth:60 }}>
                        <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:1 }}>رسوم حياك</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>
                          {formatCurrency(order.hayyak_fee || 25)}
                        </div>
                      </div>

                      {/* COD */}
                      <div style={{ textAlign:'center', minWidth:70 }}>
                        <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:1 }}>COD</div>
                        <div style={{ fontSize:13, fontWeight:800, color: selected ? 'var(--action)' : 'var(--text-sec)', fontFamily:'Inter,sans-serif' }}>
                          {formatCurrency(order.total || 0)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* Live verification summary */}
      {!isEdit && selectedIds.length > 0 && (
        <div style={{
          padding:'14px 16px', borderRadius:'var(--r-md)', marginBottom:14,
          background: Math.abs(difference) < 5 ? 'rgba(0,228,184,0.06)' : 'rgba(245,158,11,0.08)',
          border:`1.5px solid ${Math.abs(difference) < 5 ? 'rgba(0,228,184,0.2)' : 'rgba(245,158,11,0.3)'}`,
        }}>
          <div style={{ fontWeight:700, fontSize:12, color:'var(--text-muted)', marginBottom:10, letterSpacing:'0.05em', textTransform:'uppercase' }}>التحقق</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px' }}>
            <span style={{ fontSize:13, color:'var(--text-sec)' }}>
              إجمالي COD: <b style={{ color:'var(--text)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(totalCOD)}</b>
            </span>
            <span style={{ fontSize:13, color:'var(--text-sec)' }}>
              رسوم حياك: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(totalHayyakFee)}</b>
            </span>
            <span style={{ fontSize:13, color:'var(--text-sec)' }}>
              المتوقع: <b style={{ color:'var(--text)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(expectedNet)}</b>
            </span>
            <span style={{ fontSize:13, color:'var(--text-sec)' }}>
              استُلم: <b style={{ color:'var(--action)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(bankReceived)}</b>
            </span>
            {transferFee > 0 && (
              <span style={{ fontSize:13, color:'var(--text-sec)' }}>
                رسوم بنك: <b style={{ color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>−{formatCurrency(transferFee)}</b>
              </span>
            )}
            <span style={{
              fontSize:14, fontWeight:800, fontFamily:'Inter,sans-serif',
              color: Math.abs(difference) < 5 ? 'var(--action)' : '#f59e0b',
            }}>
              فرق: {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
              {Math.abs(difference) < 5 && ' ✓'}
            </span>
          </div>
          {Math.abs(difference) >= 5 && (
            <div style={{ marginTop:8, fontSize:11, color:'#f59e0b' }}>
              ⚠️ الفرق يزيد عن 5 د.إ — تحقق من المبلغ أو اختر طلبات مختلفة
            </div>
          )}
        </div>
      )}

      <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="رقم الإيصال أو أي ملاحظة..."/>
    </Modal>
  )
}
