import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Btn, Card, Badge, Modal, Input, Select, Textarea, Spinner, Empty, PageHeader, ConfirmModal, StatCard, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit, IcAlert, IcInventory } from '../components/Icons'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterLow, setFilterLow]       = useState(false)
  const [movements, setMovements]       = useState([]) // { itemId, itemName, delta, qty, note, time }
  const [showMoves, setShowMoves]       = useState(false)
  const [movesItem, setMovesItem]       = useState(null) // filter movements by item

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [inv, sups] = await Promise.all([
        DB.list('inventory', { orderBy: 'name', asc: true }),
        DB.list('suppliers'),
      ])
      setItems(inv)
      setSuppliers(sups)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await DB.delete('inventory', deleteId)
      setItems(prev => prev.filter(i => i.id !== deleteId))
      setDeleteId(null)
      toast('تم الحذف')
    } catch { toast('فشل الحذف', 'error') }
    finally { setDeleting(false) }
  }

  async function adjustStock(id, delta, note='') {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newQty = Math.max(0, item.stock_qty + delta)
    try {
      await DB.update('inventory', id, { stock_qty: newQty })
      setItems(prev => prev.map(i => i.id === id ? { ...i, stock_qty: newQty } : i))
      const move = { id: Date.now().toString(), itemId:id, itemName:item.name, delta, qty:newQty, note, time: new Date().toISOString() }
      setMovements(prev => [move, ...prev].slice(0, 200))
    } catch { toast('فشل التحديث', 'error') }
  }

  async function adjustStockWithNote(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const raw = prompt(`تعديل مخزون: ${item.name}
أدخل الكمية (+ للإضافة، - للخصم):`)
    if (!raw) return
    const delta = parseInt(raw)
    if (isNaN(delta) || delta === 0) { toast('كمية غير صحيحة', 'error'); return }
    const note = prompt('ملاحظة (اختياري):') || (delta > 0 ? 'إضافة مخزون' : 'خصم مخزون')
    await adjustStock(id, delta, note)
    toast(`تم تعديل المخزون: ${delta > 0 ? '+' : ''}${delta}`)
  }

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.includes(search) || i.sku?.includes(search) || i.category?.includes(search)
    const matchLow = !filterLow || i.stock_qty <= i.low_stock_threshold
    return matchSearch && matchLow && i.active
  })

  const lowStockCount  = items.filter(i => i.active && i.stock_qty <= i.low_stock_threshold).length
  const zeroStockItems = items.filter(i => i.active && (i.stock_qty === 0 || i.stock_qty == null))
  const totalValue = items.filter(i => i.active).reduce((s, i) => s + i.stock_qty * (i.cost_price || 0), 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <PageHeader
        title="المخزون"
        subtitle={`${items.filter(i => i.active).length} منتج`}
        actions={
          <>
            {movements.length > 0 && (
              <Btn variant="secondary" onClick={() => { setMovesItem(null); setShowMoves(true) }}>
                سجل الحركات {movements.length > 0 && <span style={{ marginRight:4, padding:'1px 6px', background:'var(--violet)', color:'#fff', borderRadius:99, fontSize:10 }}>{movements.length}</span>}
              </Btn>
            )}
            <Btn onClick={() => { setEditItem(null); setShowForm(true) }}><IcPlus size={15} /> منتج جديد</Btn>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي المنتجات" value={items.filter(i => i.active).length} color="var(--violet)" />
        <StatCard label="قيمة المخزون" value={formatCurrency(totalValue)} color="var(--amber)" />
        <StatCard label="مخزون منخفض" value={lowStockCount} color={lowStockCount > 0 ? 'var(--amber)' : 'var(--green)'} />
      </div>

      {/* Zero stock banner */}
      {zeroStockItems.length > 0 && (
        <div style={{ marginBottom:14, padding:'14px 16px', background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.25)', borderRadius:'var(--r-md)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:'var(--danger)' }}>
                  {zeroStockItems.length} منتج بمخزون صفر
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                  {zeroStockItems.slice(0,4).map(i=>i.name).join(' · ')}{zeroStockItems.length > 4 ? ` +${zeroStockItems.length-4}` : ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => setFilterLow(true)}
              style={{ fontSize:12, fontWeight:700, color:'var(--danger)', background:'rgba(239,68,68,0.12)', border:'1.5px solid rgba(239,68,68,0.25)', borderRadius:999, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit' }}
            >
              تحديث المخزون
            </button>
          </div>
        </div>
      )}

      {/* Reorder suggestions */}
      {items.filter(i=>i.active && i.stock_qty <= i.low_stock_threshold).length > 0 && (
        <div style={{ marginBottom:16, padding:'12px 14px', background:'rgba(245,158,11,0.06)', border:'1.5px solid rgba(245,158,11,0.25)', borderRadius:'var(--r-lg)' }}>
          <div style={{ fontWeight:800, fontSize:13, color:'var(--amber,#f59e0b)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
            <IcAlert size={15} color="var(--amber,#f59e0b)"/> مقترح إعادة الطلب
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {items.filter(i=>i.active && i.stock_qty <= i.low_stock_threshold).map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'var(--radius-pill,999px)' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{item.name}</span>
                <span style={{ fontSize:11, color:'var(--amber,#f59e0b)', fontWeight:800 }}>{item.stock_qty} / {item.low_stock_threshold}</span>
                <button onClick={() => adjustStockWithNote(item.id)} style={{ fontSize:11, padding:'2px 8px', borderRadius:999, border:'1px solid rgba(245,158,11,0.4)', background:'rgba(245,158,11,0.12)', color:'var(--amber,#f59e0b)', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
                  + إضافة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، SKU، الفئة..."
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
          />
        </div>
        <Btn
          variant={filterLow ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterLow(!filterLow)}
          style={filterLow ? { background: 'var(--amber)', color: '#07080f' } : {}}
        >
          <IcAlert size={14} /> مخزون منخفض
        </Btn>
      </div>

      {filtered.length === 0 ? <Empty title="لا يوجد منتجات" action={<Btn onClick={() => setShowForm(true)}><IcPlus size={14}/> أضف منتج</Btn>} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(item => {
            const isLow = item.stock_qty <= item.low_stock_threshold
            return (
              <Card
                key={item.id}
                style={{ borderColor: isLow ? 'rgba(245,158,11,0.4)' : 'var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                    {item.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.sku}</div>}
                    {item.category && <Badge color="var(--violet)" style={{ marginTop: 4, fontSize: 10 }}>{item.category}</Badge>}
                  </div>
                  {isLow && (
                    <div style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, fontSize: 11, color: 'var(--amber)', fontWeight: 700, flexShrink: 0 }}>
                      منخفض
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>سعر البيع</div>
                    <div style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 16 }}>{formatCurrency(item.sell_price)}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>التكلفة</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-sec)', fontSize: 14 }}>{formatCurrency(item.cost_price)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => adjustStock(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontWeight: 800, fontSize: 18, minWidth: 36, textAlign: 'center', color: isLow ? 'var(--amber)' : 'var(--text)' }}>{item.stock_qty}</span>
                    <button onClick={() => adjustStock(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>وحدة</span>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <Btn variant="ghost" size="sm" onClick={() => adjustStockWithNote(item.id)} style={{ flex:1 }}>± تعديل</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { setEditItem(item); setShowForm(true) }}><IcEdit size={13}/></Btn>
                  <Btn variant="danger" size="sm" onClick={() => setDeleteId(item.id)}><IcDelete size={13}/></Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Stock movements modal */}
      <StockMovementsModal
        open={showMoves}
        onClose={() => setShowMoves(false)}
        movements={movesItem ? movements.filter(m=>m.itemId===movesItem) : movements}
        title={movesItem ? `حركات: ${items.find(i=>i.id===movesItem)?.name}` : 'سجل حركات المخزون'}
      />

      <InventoryForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        item={editItem}
        suppliers={suppliers}
        onSaved={item => {
          if (editItem) setItems(prev => prev.map(i => i.id === item.id ? item : i))
          else setItems(prev => [item, ...prev])
          setShowForm(false)
          setEditItem(null)
          toast(editItem ? 'تم التحديث' : 'تم الإضافة')
        }}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} message="سيتم حذف المنتج نهائياً." />
    </div>
  )
}

function InventoryForm({ open, onClose, item, suppliers, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (open) setForm(item ? { ...item } : { active: true, stock_qty: 0, low_stock_threshold: 5, cost_price: 0, sell_price: 0 })
  }, [open, item])

  async function handleSave() {
    if (!form.name) { toast('أدخل اسم المنتج', 'error'); return }
    setSaving(true)
    try {
      let saved
      if (item) saved = await DB.update('inventory', item.id, form)
      else saved = await DB.insert('inventory', form)
      onSaved(saved)
    } catch (err) {
      toast('فشل الحفظ: ' + (err.message || ''), 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'تعديل المنتج' : 'منتج جديد'} width={500}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn loading={saving} onClick={handleSave}>{item ? 'حفظ التعديلات' : 'إضافة المنتج'}</Btn>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
        <Input label="اسم المنتج *" value={form.name || ''} onChange={e => setField('name', e.target.value)} placeholder="اسم المنتج" containerStyle={{ gridColumn: '1 / -1' }} />
        <Input label="رمز SKU" value={form.sku || ''} onChange={e => setField('sku', e.target.value)} dir="ltr" placeholder="CRY-001" />
        <Input label="الفئة" value={form.category || ''} onChange={e => setField('category', e.target.value)} placeholder="كريستال، هدايا..." />
        <Input label="سعر التكلفة (د.إ)" type="number" value={form.cost_price || ''} onChange={e => setField('cost_price', e.target.value)} />
        <Input label="سعر البيع (د.إ)" type="number" value={form.sell_price || ''} onChange={e => setField('sell_price', e.target.value)} />
        <Input label="الكمية الحالية" type="number" value={form.stock_qty ?? 0} onChange={e => setField('stock_qty', parseInt(e.target.value) || 0)} />
        <Input label="حد التنبيه (منخفض)" type="number" value={form.low_stock_threshold ?? 5} onChange={e => setField('low_stock_threshold', parseInt(e.target.value) || 5)} />
        {suppliers.length > 0 && (
          <Select label="المورد" value={form.supplier_id || ''} onChange={e => setField('supplier_id', e.target.value)} containerStyle={{ gridColumn: '1 / -1' }}>
            <option value="">لا يوجد مورد</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <Textarea label="ملاحظات" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} containerStyle={{ gridColumn: '1 / -1' }} />
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   STOCK MOVEMENTS MODAL
══════════════════════════════════════════════ */
function StockMovementsModal({ open, onClose, movements, title }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={480}>
      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:420, overflowY:'auto' }}>
        {movements.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:36, marginBottom:8 }}></div>
            لا يوجد حركات مخزون بعد
          </div>
        ) : movements.map(m => {
          const d = new Date(m.time)
          const isAdd = m.delta > 0
          return (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)' }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{isAdd ? '' : ''}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.itemName}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.note}</div>
              </div>
              <div style={{ textAlign:'left', flexShrink:0 }}>
                <div style={{ fontWeight:900, fontSize:14, color: isAdd?'var(--green,#34d399)':'var(--red)' }}>
                  {isAdd?'+':''}{m.delta}
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                  {d.toLocaleDateString('ar-AE',{month:'short',day:'numeric'})} {d.toLocaleTimeString('ar-AE',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              <div style={{ padding:'3px 8px', background:'var(--bg-hover)', border:'none', borderRadius:999, fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>
                {m.qty} متبقي
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
