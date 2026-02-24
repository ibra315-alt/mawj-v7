import React, { useState, useRef } from 'react'
import { DB, Settings, supabase } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Btn, PageHeader, toast } from '../components/ui'
import { IcPlus, IcCheck, IcAlert, IcDelete } from '../components/Icons'

/* ═══════════════════════════════════════════════════════════
   IMPORT TOOL — Mawj ERP v8.5
   ─────────────────────────────────────────────────────────
   Reads mawj_import.json and inserts into Supabase:
     1. settings.products  → 5 product groups (7 size variants)
     2. inventory          → 7 rows (one per size variant)
     3. hayyak_remittances → 20 remittances
     4. orders             → 112 historical orders

   Safe to run once — checks for existing order_numbers
   before inserting to avoid duplicates.
═══════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 'products',     label: 'المنتجات (الإعدادات)', icon: '📦', count_key: 'products' },
  { id: 'inventory',    label: 'المخزون',              icon: '🗃️', count_key: 'inventory' },
  { id: 'remittances',  label: 'التحويلات البنكية',    icon: '🏦', count_key: 'remittances' },
  { id: 'orders',       label: 'الطلبات',              icon: '📋', count_key: 'orders' },
]

export default function ImportTool() {
  const [file,       setFile]       = useState(null)   // parsed JSON
  const [preview,    setPreview]    = useState(null)   // summary stats
  const [importing,  setImporting]  = useState(false)
  const [done,       setDone]       = useState(false)
  const [log,        setLog]        = useState([])     // live log lines
  const [stepStatus, setStepStatus] = useState({})     // { products: 'done'|'error'|'running' }
  const [error,      setError]      = useState(null)
  const inputRef = useRef()

  function addLog(msg, type = 'info') {
    setLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString('ar-AE') }])
  }

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result)
        if (!data.orders || !data.remittances) {
          setError('الملف غير صحيح — يجب أن يحتوي على orders و remittances')
          return
        }
        setFile(data)
        setError(null)
        setLog([])
        setDone(false)
        setStepStatus({})
        setPreview({
          products:    data.products?.reduce((s, p) => s + (p.sizes?.length || 1), 0) || 0,
          inventory:   data.inventory?.length   || 0,
          orders:      data.orders?.length      || 0,
          remittances: data.remittances?.length || 0,
          revenue:     data.summary?.total_revenue      || data.orders.reduce((s,o) => s+(o.total||0), 0),
          profit:      data.summary?.total_gross_profit || data.orders.reduce((s,o) => s+(o.gross_profit||0), 0),
          bank:        data.summary?.total_bank_received|| data.remittances.reduce((s,r) => s+(r.bank_received||0), 0),
          delivered:   data.orders.filter(o => o.status === 'delivered').length,
          replacements:data.orders.filter(o => o.is_replacement).length,
          not_delivered:data.orders.filter(o => o.status === 'not_delivered').length,
        })
      } catch {
        setError('تعذّر قراءة الملف — تأكد أنه JSON صحيح')
      }
    }
    reader.readAsText(f)
  }

  async function runImport() {
    if (!file) return
    setImporting(true)
    setLog([])
    setDone(false)
    setError(null)
    setStepStatus({})

    try {
      // ── STEP 1: Products ──────────────────────────────────
      setStepStatus(p => ({ ...p, products: 'running' }))
      addLog('جاري حفظ قائمة المنتجات في الإعدادات...')
      if (file.products?.length > 0) {
        await Settings.set('products', file.products)
        addLog(`✓ تم حفظ ${file.products.length} مجموعة (${file.products.reduce((s,p)=>s+(p.sizes?.length||1),0)} حجم)`, 'success')
      } else {
        addLog('⚠ لا يوجد منتجات في الملف — تم التخطي', 'warn')
      }
      setStepStatus(p => ({ ...p, products: 'done' }))

      // ── STEP 2: Inventory ─────────────────────────────────
      setStepStatus(p => ({ ...p, inventory: 'running' }))
      addLog('جاري استيراد صنوف المخزون...')
      if (file.inventory?.length > 0) {
        const existingInv = await DB.list('inventory')
        const existingSkus = new Set(existingInv.map(i => i.sku))
        let invInserted = 0, invSkipped = 0
        for (const item of file.inventory) {
          if (existingSkus.has(item.sku)) { invSkipped++; continue }
          const { id, ...payload } = item  // let Supabase generate UUID
          await DB.insert('inventory', payload)
          invInserted++
        }
        addLog(`✓ مخزون: ${invInserted} صنف جديد • ${invSkipped} موجود مسبقاً`, 'success')
      } else {
        addLog('⚠ لا يوجد مخزون في الملف — تم التخطي', 'warn')
      }
      setStepStatus(p => ({ ...p, inventory: 'done' }))

      // ── STEP 3: Remittances ───────────────────────────────
      setStepStatus(p => ({ ...p, remittances: 'running' }))
      addLog('جاري استيراد التحويلات البنكية...')

      // Check existing remittances to avoid duplicates
      const existingRemits = await DB.list('hayyak_remittances')
      const existingDates  = new Set(existingRemits.map(r => r.date))

      let remitInserted = 0, remitSkipped = 0
      const remitIdMap = {} // import_id → real supabase id

      for (const remit of file.remittances) {
        const importId = remit.id
        const payload  = {
          date:          remit.date,
          bank_received: remit.bank_received,
          transfer_fee:  remit.transfer_fee || 0,
          total_cod:     remit.total_cod    || 0,
          hayyak_fees:   remit.hayyak_fees  || 0,
          notes:         remit.notes        || '',
          created_at:    remit.created_at   || new Date().toISOString(),
        }

        // Simple duplicate check: same date + same bank_received
        const isDupe = existingRemits.some(e => e.date === remit.date && e.bank_received === remit.bank_received)
        if (isDupe) {
          // Use existing id for order linking
          const existing = existingRemits.find(e => e.date === remit.date && e.bank_received === remit.bank_received)
          remitIdMap[importId] = existing.id
          remitSkipped++
          continue
        }

        const saved = await DB.insert('hayyak_remittances', payload)
        remitIdMap[importId] = saved.id
        remitInserted++
      }

      addLog(`✓ تحويلات: ${remitInserted} جديدة • ${remitSkipped} موجودة مسبقاً`, 'success')
      setStepStatus(p => ({ ...p, remittances: 'done' }))

      // ── STEP 4: Orders ────────────────────────────────────
      setStepStatus(p => ({ ...p, orders: 'running' }))
      addLog('جاري استيراد الطلبات...')

      // Get existing order numbers to skip duplicates
      const existingOrders = await DB.list('orders')
      const existingNums   = new Set(existingOrders.map(o => o.order_number))

      let ordInserted = 0, ordSkipped = 0, ordErrors = 0

      // Insert in batches of 20
      const BATCH = 20
      const toInsert = []

      for (const order of file.orders) {
        if (existingNums.has(order.order_number)) {
          ordSkipped++
          continue
        }

        // Resolve remittance_id from import id to real supabase id
        const real_remit_id = order.hayyak_remittance_id
          ? (remitIdMap[order.hayyak_remittance_id] || null)
          : null

        toInsert.push({
          order_number:         order.order_number,
          customer_name:        order.customer_name        || '',
          customer_phone:       order.customer_phone       || '',
          customer_city:        order.customer_city        || '',
          customer_address:     order.customer_address     || '',
          status:               order.status,
          is_replacement:       order.is_replacement       || false,
          replacement_for_id:   order.replacement_for_id   || null,
          items:                order.items                || [],
          subtotal:             order.subtotal             || 0,
          discount:             order.discount             || 0,
          total:                order.total                || 0,
          product_cost:         order.product_cost         || 0,
          hayyak_fee:           order.hayyak_fee           || 25,
          gross_profit:         order.gross_profit         || 0,
          hayyak_remittance_id: real_remit_id,
          order_date:           order.order_date           || null,
          delivery_date:        order.delivery_date        || null,
          notes:                order.notes                || '',
          internal_notes:       order.internal_notes       || [],
          created_at:           order.created_at,
          updated_at:           order.updated_at,
        })
      }

      // Batch insert
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH)
        const { error } = await supabase.from('orders').insert(batch)
        if (error) {
          addLog(`⚠ خطأ في الدفعة ${Math.floor(i/BATCH)+1}: ${error.message}`, 'error')
          ordErrors += batch.length
        } else {
          ordInserted += batch.length
          addLog(`  ↳ دفعة ${Math.floor(i/BATCH)+1}: ${batch.length} طلب ✓`)
        }
      }

      const summary = `✓ طلبات: ${ordInserted} مستورد • ${ordSkipped} موجود مسبقاً${ordErrors > 0 ? ` • ${ordErrors} خطأ` : ''}`
      addLog(summary, ordErrors > 0 ? 'warn' : 'success')
      setStepStatus(p => ({ ...p, orders: 'done' }))

      // ── DONE ─────────────────────────────────────────────
      addLog('═══════════════════════════════════════', 'info')
      addLog(`الاستيراد اكتمل بنجاح 🎉`, 'success')
      addLog(`${ordInserted} طلب • ${remitInserted} تحويل • ${file.products?.length||0} مجموعة منتجات • ${file.inventory?.length||0} صنف مخزون`, 'success')
      setDone(true)
      toast(`تم الاستيراد — ${ordInserted} طلب ✓`)

    } catch (err) {
      setError('فشل الاستيراد: ' + err.message)
      addLog('✗ ' + err.message, 'error')
      setStepStatus(p => {
        const updated = { ...p }
        Object.keys(updated).forEach(k => { if (updated[k] === 'running') updated[k] = 'error' })
        return updated
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="استيراد البيانات"
        subtitle="استيراد المنتجات والطلبات والتحويلات التاريخية"
      />

      {/* Warning banner */}
      <div style={{ padding:'12px 16px', marginBottom:16, background:'rgba(245,158,11,0.08)', border:'1.5px solid rgba(245,158,11,0.25)', borderRadius:'var(--r-md)', display:'flex', gap:10, alignItems:'flex-start' }}>
        <IcAlert size={18} style={{ color:'#f59e0b', flexShrink:0, marginTop:1 }}/>
        <div style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.6 }}>
          <b style={{ color:'#f59e0b' }}>قبل الاستيراد:</b> تأكد أن الجداول فارغة (orders, hayyak_remittances).
          الأداة تتحقق تلقائياً من الطلبات الموجودة وتتخطاها — لكن الأفضل البدء بقاعدة بيانات نظيفة.
        </div>
      </div>

      {/* File upload */}
      <div
        onClick={() => !file && inputRef.current?.click()}
        style={{
          padding:'24px', marginBottom:16,
          background:'var(--bg-surface)', borderRadius:'var(--r-md)',
          border:`2px dashed ${file ? 'var(--action)' : 'var(--border)'}`,
          textAlign:'center', cursor: file ? 'default' : 'pointer',
          transition:'border-color 150ms', boxShadow:'var(--card-shadow)',
        }}
      >
        <input ref={inputRef} type="file" accept=".json" onChange={handleFile} style={{ display:'none' }}/>
        {file ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>✅</span>
            <div>
              <div style={{ fontWeight:800, color:'var(--action)', fontSize:14 }}>mawj_import.json محمّل</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {preview?.orders} طلب • {preview?.remittances} تحويل • {preview?.inventory} صنف مخزون
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setLog([]); setDone(false) }}
              style={{ marginRight:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:'4px 8px' }}>
              <IcDelete size={16}/>
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>انقر لتحميل ملف الاستيراد</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>mawj_import.json</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding:'12px 16px', marginBottom:16, background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.25)', borderRadius:'var(--r-md)', fontSize:13, color:'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && !done && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:16 }}>
            {[
              { label:'أحجام المنتجات',  value: preview.products,              color:'var(--info-light)' },
              { label:'صنوف المخزون',     value: preview.inventory,             color:'var(--info-light)' },
              { label:'طلبات',            value: preview.orders,                color:'var(--action)' },
              { label:'تحويلات',          value: preview.remittances,           color:'#10b981' },
              { label:'مسلّم',            value: preview.delivered,             color:'var(--action)' },
              { label:'استبدال',          value: preview.replacements,          color:'#f59e0b' },
              { label:'لم يتم',           value: preview.not_delivered,         color:'var(--danger)' },
              { label:'الإيرادات',        value: formatCurrency(preview.revenue), color:'var(--action)', small:true },
              { label:'الربح',            value: formatCurrency(preview.profit),  color:'#10b981',       small:true },
              { label:'نقد بنكي',         value: formatCurrency(preview.bank),    color:'var(--info-light)', small:true },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
                <div style={{ fontSize: s.small ? 11 : 18, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.2 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Steps preview */}
          <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:16, boxShadow:'var(--card-shadow)' }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>خطوات الاستيراد</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {STEPS.map((step, i) => {
                const status = stepStatus[step.id]
                return (
                  <div key={step.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-sm)' }}>
                    <div style={{
                      width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12,
                      background: status === 'done' ? 'var(--action)' : status === 'running' ? 'rgba(0,228,184,0.15)' : status === 'error' ? 'var(--danger)' : 'var(--bg-surface)',
                      border: status ? 'none' : '1.5px solid var(--border)',
                      color: status === 'done' ? '#050c1a' : 'var(--text)',
                      animation: status === 'running' ? 'pulse 1s infinite' : 'none',
                    }}>
                      {status === 'done' ? '✓' : status === 'error' ? '✗' : step.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{step.label}</div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', fontFamily:'Inter,sans-serif' }}>
                      {preview[step.count_key]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Btn
            onClick={runImport}
            loading={importing}
            style={{ width:'100%', padding:'14px', fontSize:15, fontWeight:800, marginBottom:16 }}
          >
            <IcPlus size={18}/> ابدأ الاستيراد — {preview.orders} طلب + {preview.remittances} تحويل + {preview.inventory} صنف
          </Btn>
        </>
      )}

      {/* Live log */}
      {log.length > 0 && (
        <div style={{ background:'#0a0818', borderRadius:'var(--r-md)', padding:'14px 16px', fontFamily:'monospace', fontSize:12, maxHeight:320, overflowY:'auto', boxShadow:'var(--card-shadow)' }}>
          {log.map((l, i) => (
            <div key={i} style={{
              color: l.type === 'success' ? '#00e4b8' : l.type === 'error' ? '#ef4444' : l.type === 'warn' ? '#f59e0b' : '#a78bfa',
              marginBottom:3, display:'flex', gap:10,
            }}>
              <span style={{ opacity:0.4, flexShrink:0 }}>{l.time}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Done state */}
      {done && (
        <div style={{ marginTop:16, padding:'24px', background:'rgba(0,228,184,0.06)', border:'2px solid rgba(0,228,184,0.25)', borderRadius:'var(--r-md)', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
          <div style={{ fontWeight:900, fontSize:18, color:'var(--action)', marginBottom:8 }}>اكتمل الاستيراد!</div>
          <div style={{ fontSize:13, color:'var(--text-sec)', marginBottom:20 }}>
            البيانات التاريخية موجودة الآن في النظام — الطلبات والتحويلات والمنتجات كلها جاهزة.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <Btn onClick={() => window.location.reload()} style={{ background:'var(--action)', color:'#050c1a' }}>
              <IcCheck size={15}/> الذهاب للوحة التحكم
            </Btn>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
