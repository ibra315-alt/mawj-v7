import React, { useState, useRef } from 'react'
import { DB, generateOrderNumber, supabase } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Btn, Card, Badge, Spinner, PageHeader, toast } from '../components/ui'
import { IcUpload, IcCheck, IcAlert, IcDelete } from '../components/Icons'

// ── Column mapping from your Google Sheets headers ────────────
// رقم باركود التوصيل → tracking_number
// رقم هاتف العميل   → customer_phone
// تاريخ الطلب       → created_at / date
// الكمية            → quantity (stored in items)
// تكلفة الشحن       → delivery_cost
// الامارة           → customer_city
// العنوان التفصيلي  → notes (address)
// السعر الاجمالي    → total
// صافي المبيعات     → profit
// تم الاستلام       → status flag (ignored — all set to delivered)

const COL_MAP = {
  'رقم باركود التوصيل':  'tracking_number',
  'رقم هاتف العميل':     'customer_phone',
  'تاريخ الطلب':         'order_date',
  'الكمية':              'quantity',
  'تكلفة الشحن':         'delivery_cost',
  'الامارة':             'customer_city',
  'العنوان التفصيلي':    'address',
  'السعر الاجمالي':      'total',
  'صافي المبيعات':       'profit',
  'تم الاستلام':         'received',
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const cols = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())

    const row = {}
    headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim() })
    return row
  }).filter(row => Object.values(row).some(v => v !== ''))
}

function mapRow(row, index) {
  const mapped = {}
  Object.entries(row).forEach(([header, value]) => {
    const field = COL_MAP[header]
    if (field) mapped[field] = value
  })

  const total = parseFloat(mapped.total?.replace(/,/g, '') || 0) || 0
  const profit = parseFloat(mapped.profit?.replace(/,/g, '') || 0) || 0
  const deliveryCost = parseFloat(mapped.delivery_cost?.replace(/,/g, '') || 0) || 0
  const qty = parseInt(mapped.quantity || 1) || 1

  // Try to extract customer name from tracking number or use phone as fallback
  const phone = mapped.customer_phone || ''
  const tracking = mapped.tracking_number || ''
  const city = mapped.customer_city || ''

  return {
    _index: index,
    _raw: row,
    customer_name: phone ? `عميل ${phone.slice(-4)}` : `طلب ${index + 1}`,
    customer_phone: phone,
    customer_city: city,
    delivery_zone: city,
    delivery_cost: deliveryCost,
    tracking_number: tracking,
    courier: 'Hayyak',
    status: 'delivered',
    source: 'other',
    notes: mapped.address || '',
    total,
    subtotal: total - deliveryCost,
    profit,
    cost: total - profit - deliveryCost,
    items: qty > 0 ? [{ id: 'imported', name: 'منتج مستورد', price: total - deliveryCost, cost: 0, qty }] : [],
    order_date: mapped.order_date || '',
    internal_notes: [{ text: 'تم الاستيراد من Google Sheets', time: new Date().toISOString() }],
    discount_amount: 0,
    discount_code: '',
    photos: [],
    custom_fields: {},
  }
}

export default function Import({ user }) {
  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped] = useState([])
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const parsed = parseCSV(text)
        if (parsed.length === 0) { toast('الملف فارغ أو غير صحيح', 'error'); return }
        const mapped = parsed.map((row, i) => mapRow(row, i))
        const errs = []
        mapped.forEach((r, i) => {
          if (!r.total || r.total === 0) errs.push(`صف ${i + 2}: السعر الإجمالي فارغ`)
        })
        setRows(mapped)
        setErrors(errs)
        setStep('preview')
      } catch (err) {
        toast('خطأ في قراءة الملف: ' + err.message, 'error')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  function removeRow(index) {
    setRows(prev => prev.filter(r => r._index !== index))
  }

  async function handleImport() {
    setImporting(true)
    setStep('importing')
    setProgress(0)
    const failed = []
    let count = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const order_number = await generateOrderNumber()
        // Parse date if available
        let created_at = new Date().toISOString()
        if (row.order_date) {
          const parsed = new Date(row.order_date)
          if (!isNaN(parsed)) created_at = parsed.toISOString()
        }

        await DB.insert('orders', {
          order_number,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_city: row.customer_city,
          delivery_zone: row.delivery_zone,
          delivery_cost: row.delivery_cost,
          tracking_number: row.tracking_number,
          courier: row.courier,
          status: row.status,
          source: row.source,
          notes: row.notes,
          total: row.total,
          subtotal: row.subtotal,
          profit: row.profit,
          cost: row.cost,
          items: row.items,
          internal_notes: row.internal_notes,
          discount_amount: 0,
          discount_code: '',
          photos: [],
          custom_fields: {},
          created_at,
          updated_at: new Date().toISOString(),
          created_by: user?.id || null,
        })
        count++
      } catch (err) {
        failed.push({ row: i + 1, error: err.message })
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100))
    }

    setImported(count)
    setSkipped(failed)
    setStep('done')
    setImporting(false)
  }

  // ── STEP: UPLOAD ──────────────────────────────────────────
  if (step === 'upload') return (
    <div className="page">
      <PageHeader title="استيراد الطلبات القديمة" subtitle="من Google Sheets / Excel" />

      <Card style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>التعليمات</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-sec)' }}>
            <div>١. افتح ملف Google Sheets الخاص بك</div>
            <div>٢. اذهب إلى <b style={{ color: 'var(--text)' }}>File → Download → CSV</b></div>
            <div>٣. ارفع الملف هنا</div>
          </div>
        </div>

        <div style={{ marginBottom: 20, padding: 14, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-sec)' }}>الأعمدة المدعومة تلقائياً:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(COL_MAP).map(col => (
              <code key={col} style={{ padding: '3px 8px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 4, color: 'var(--teal)', fontSize: 11 }}>{col}</code>
            ))}
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--bg-border)',
            borderRadius: 'var(--radius)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
          className="ghost-btn"
        >
          <IcUpload size={32} color="var(--teal)" />
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 15 }}>اضغط لرفع ملف CSV</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>يدعم ملفات .csv فقط</div>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
      </Card>
    </div>
  )

  // ── STEP: PREVIEW ─────────────────────────────────────────
  if (step === 'preview') return (
    <div className="page">
      <PageHeader
        title="معاينة الطلبات"
        subtitle={`${rows.length} طلب جاهز للاستيراد`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setStep('upload'); setRows([]); setErrors([]) }}>رجوع</Btn>
            <Btn onClick={handleImport} style={{ gap: 6 }}>
              <IcUpload size={15} /> استيراد {rows.length} طلب
            </Btn>
          </div>
        }
      />

      {errors.length > 0 && (
        <Card style={{ marginBottom: 16, borderColor: 'rgba(245,158,11,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IcAlert size={16} color="var(--amber)" />
            <span style={{ fontWeight: 700, color: 'var(--amber)', fontSize: 14 }}>تحذيرات ({errors.length})</span>
          </div>
          {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-sec)', padding: '3px 0' }}>• {e}</div>)}
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 100px 100px 100px 36px', gap: 12, padding: '8px 14px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>#</span>
          <span>العميل / الهاتف</span>
          <span>المدينة</span>
          <span>رقم التتبع</span>
          <span>الإجمالي</span>
          <span>صافي الربح</span>
          <span></span>
        </div>

        {rows.map((row, i) => (
          <div key={row._index} style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 120px 100px 100px 100px 36px',
            gap: 12,
            padding: '12px 14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-sm)',
            alignItems: 'center',
            fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
              {row.customer_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right' }}>{row.customer_phone}</div>}
            </div>
            <span style={{ color: 'var(--text-sec)' }}>{row.customer_city || '—'}</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.tracking_number || '—'}</span>
            <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{formatCurrency(row.total)}</span>
            <span style={{ fontWeight: 600, color: row.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(row.profit)}</span>
            <button onClick={() => removeRow(row._index)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}>
              <IcDelete size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
        <span>عدد الطلبات: <b style={{ color: 'var(--teal)' }}>{rows.length}</b></span>
        <span>إجمالي المبيعات: <b style={{ color: 'var(--teal)' }}>{formatCurrency(rows.reduce((s, r) => s + r.total, 0))}</b></span>
        <span>إجمالي الأرباح: <b style={{ color: 'var(--green)' }}>{formatCurrency(rows.reduce((s, r) => s + r.profit, 0))}</b></span>
        <Badge color="var(--green)">الحالة: تم التسليم</Badge>
        <Badge color="var(--violet)">Hayyak</Badge>
      </div>
    </div>
  )

  // ── STEP: IMPORTING ───────────────────────────────────────
  if (step === 'importing') return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Card style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <Spinner size={40} />
        <div style={{ fontWeight: 700, fontSize: 18, margin: '16px 0 8px' }}>جاري الاستيراد...</div>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 20 }}>{progress}% مكتمل</div>
        <div style={{ height: 8, background: 'var(--bg-border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal), var(--violet))', borderRadius: 99, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>لا تغلق الصفحة</div>
      </Card>
    </div>
  )

  // ── STEP: DONE ────────────────────────────────────────────
  if (step === 'done') return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Card style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>تم الاستيراد بنجاح!</div>
        <div style={{ fontSize: 14, color: 'var(--text-sec)', marginBottom: 24 }}>
          تم استيراد <b style={{ color: 'var(--teal)' }}>{imported}</b> طلب بنجاح
          {skipped.length > 0 && <span style={{ color: 'var(--red)' }}> • {skipped.length} طلب فشل</span>}
        </div>

        {skipped.length > 0 && (
          <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 'var(--radius-sm)', textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 8, fontSize: 13 }}>الطلبات التي فشلت:</div>
            {skipped.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-sec)', padding: '2px 0' }}>صف {s.row}: {s.error}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn variant="secondary" onClick={() => { setStep('upload'); setRows([]); setErrors([]) }}>استيراد ملف آخر</Btn>
          <Btn onClick={() => window.location.reload()}>
            <IcCheck size={15} /> الذهاب للطلبات
          </Btn>
        </div>
      </Card>
    </div>
  )

  return null
}
