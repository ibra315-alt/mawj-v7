// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { PageProps } from '../types'
import { Btn, Card, toast } from '../components/ui'
import { Settings as SettingsDB } from '../data/db'

/* ══════════════════════════════════════════════════
   RECEIPT CUSTOMIZER — 3 options in one page
   A: Block Editor (visual drag-reorder + toggles)
   B: Template Gallery (3 preset themes)
   C: Code Editor (raw HTML/CSS)
══════════════════════════════════════════════════ */

// ── Icons ────────────────────────────────────────
function IcArrowUp({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
}
function IcArrowDown({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
}
function IcPrint({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
}
function IcSave({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
}
function IcEye({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function IcCode({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
}
function IcGrid({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}

// ── Default Block list ────────────────────────────
const DEFAULT_BLOCKS = [
  { id: 'logo',      label: 'شعار المتجر',     enabled: true,  order: 0 },
  { id: 'header',    label: 'معلومات المتجر',   enabled: true,  order: 1 },
  { id: 'divider1',  label: 'خط فاصل',         enabled: true,  order: 2 },
  { id: 'order',     label: 'تفاصيل الطلب',    enabled: true,  order: 3 },
  { id: 'customer',  label: 'معلومات العميل',   enabled: true,  order: 4 },
  { id: 'divider2',  label: 'خط فاصل ٢',       enabled: true,  order: 5 },
  { id: 'items',     label: 'قائمة المنتجات',  enabled: true,  order: 6 },
  { id: 'totals',    label: 'الإجماليات',      enabled: true,  order: 7 },
  { id: 'divider3',  label: 'خط فاصل ٣',       enabled: false, order: 8 },
  { id: 'notes',     label: 'ملاحظات الطلب',   enabled: true,  order: 9 },
  { id: 'footer',    label: 'تذييل الفاتورة',  enabled: true,  order: 10 },
  { id: 'signature', label: 'مربع التوقيع',    enabled: false, order: 11 },
  { id: 'qr',        label: 'رمز QR',          enabled: false, order: 12 },
]

// ── Template Gallery presets ──────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'الكلاسيكي',
    emoji: '📋',
    desc: 'تصميم رسمي احترافي بخطوط نظيفة',
    accent: '#1a1a1a',
    headerBg: '#f8f8f8',
    tableHeaderBg: '#f0f0f0',
    borderColor: '#cccccc',
    fontFamily: 'Tahoma, Arial',
  },
  {
    id: 'modern',
    name: 'العصري',
    emoji: '✨',
    desc: 'هيدر ملون وتصميم جذاب بالألوان',
    accent: '#318CE7',
    headerBg: 'linear-gradient(135deg,#318CE7,#1a6ec4)',
    headerColor: '#ffffff',
    tableHeaderBg: '#EFF6FF',
    borderColor: '#BFDBFE',
    fontFamily: 'Tahoma, Arial',
  },
  {
    id: 'minimal',
    name: 'البسيط',
    emoji: '🧘',
    desc: 'أنيق وبسيط، تركيز على المحتوى',
    accent: '#22c55e',
    headerBg: '#ffffff',
    tableHeaderBg: '#F0FDF4',
    borderColor: '#BBF7D0',
    fontFamily: 'Tahoma, Arial',
  },
]

// ── Sample data for preview ───────────────────────
const SAMPLE = {
  order_number: 'MWJ-2502-0042',
  date: '١ مارس ٢٠٢٥',
  customer: 'أحمد محمد العبدالله',
  phone: '0501234567',
  city: 'دبي',
  items: [
    { name: 'طقم كريستال ملكي', qty: 2, price: 450 },
    { name: 'إطار صدفي مطلي ذهبي', qty: 1, price: 280 },
  ],
  shipping: 25,
  subtotal: 1180,
  total: 1205,
  notes: 'يرجى التعبئة بعناية — هدية خاصة',
  storeName: 'موج',
  storePhone: '0501111222',
}

// ── Build receipt HTML string (for print) ─────────
function buildReceiptHTML({ blocks, template, storeName, customAccent, customCode, mode }) {
  if (mode === 'code') return customCode || ''

  const T = TEMPLATES.find(t => t.id === template) || TEMPLATES[0]
  const accent = customAccent || T.accent
  const headerIsGradient = typeof T.headerBg === 'string' && T.headerBg.includes('gradient')
  const name = storeName || SAMPLE.storeName

  const sortedBlocks = [...(blocks || DEFAULT_BLOCKS)]
    .sort((a, b) => a.order - b.order)
    .filter(b => b.enabled)

  const blockHtml = {
    logo: `<div style="text-align:center;margin-bottom:8px"><span style="font-size:48px">🏪</span></div>`,
    header: headerIsGradient
      ? `<div style="background:${T.headerBg};color:#fff;padding:16px;border-radius:8px;text-align:center;margin-bottom:12px">
           <div style="font-size:22px;font-weight:900">${name}</div>
           <div style="font-size:11px;opacity:0.85;margin-top:4px">${SAMPLE.storePhone} · الإمارات</div>
         </div>`
      : `<div style="text-align:center;margin-bottom:12px;padding:12px;background:${T.headerBg};border-radius:6px">
           <div style="font-size:20px;font-weight:900;color:${accent}">${name}</div>
           <div style="font-size:11px;color:#666;margin-top:3px">${SAMPLE.storePhone} · الإمارات</div>
         </div>`,
    divider1: `<hr style="border:none;border-top:1px dashed ${T.borderColor};margin:10px 0">`,
    divider2: `<hr style="border:none;border-top:1px dashed ${T.borderColor};margin:10px 0">`,
    divider3: `<hr style="border:none;border-top:1px dashed ${T.borderColor};margin:10px 0">`,
    order: `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:800;color:${accent};margin-bottom:5px;letter-spacing:0.05em">معلومات الطلب</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span>رقم الطلب:</span><span style="font-weight:700">#${SAMPLE.order_number}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px"><span>التاريخ:</span><span>${SAMPLE.date}</span></div>
    </div>`,
    customer: `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:800;color:${accent};margin-bottom:5px">معلومات العميل</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span>الاسم:</span><span>${SAMPLE.customer}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span>الجوال:</span><span dir="ltr">${SAMPLE.phone}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px"><span>المدينة:</span><span>${SAMPLE.city}</span></div>
    </div>`,
    items: `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:800;color:${accent};margin-bottom:5px">المنتجات</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:${T.tableHeaderBg}">
          <th style="text-align:right;padding:5px 6px;border-bottom:1px solid ${T.borderColor};color:${accent}">المنتج</th>
          <th style="text-align:center;padding:5px 6px;border-bottom:1px solid ${T.borderColor};color:${accent}">الكمية</th>
          <th style="text-align:left;padding:5px 6px;border-bottom:1px solid ${T.borderColor};color:${accent}">الإجمالي</th>
        </tr></thead>
        <tbody>
          ${SAMPLE.items.map(i => `<tr>
            <td style="padding:5px 6px;border-bottom:1px solid #f5f5f5">${i.name}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f5f5f5;text-align:center">×${i.qty}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f5f5f5;text-align:left">${i.qty * i.price} د.إ</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`,
    totals: `<div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span>المجموع الفرعي:</span><span>${SAMPLE.subtotal} د.إ</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span>الشحن:</span><span>${SAMPLE.shipping} د.إ</span></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;padding:8px 0;border-top:2px solid ${accent};margin-top:4px;color:${accent}"><span>الإجمالي:</span><span>${SAMPLE.total} د.إ</span></div>
    </div>`,
    notes: `<div style="margin-top:8px;font-size:11px;color:#555;line-height:1.6">
      <div style="font-size:10px;font-weight:800;color:${accent};margin-bottom:4px">ملاحظات</div>
      ${SAMPLE.notes}
    </div>`,
    footer: `<div style="text-align:center;font-size:11px;color:#888;margin-top:14px;padding-top:12px;border-top:1px solid ${T.borderColor}">
      <p>شكراً لتعاملكم معنا 💙</p>
      <p style="margin-top:3px;font-weight:700;color:${accent}">${name}</p>
    </div>`,
    signature: `<div style="border:1px dashed ${T.borderColor};height:56px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:11px;margin-top:16px">توقيع المستلم</div>`,
    qr: `<div style="text-align:center;margin-top:12px"><div style="width:56px;height:56px;border:2px solid ${T.borderColor};margin:0 auto;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa">QR</div></div>`,
  }

  const body = sortedBlocks.map(b => blockHtml[b.id] || '').join('\n')

  return `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Tahoma',Arial,sans-serif;direction:rtl;color:#111;background:#fff;padding:24px;max-width:360px}@media print{body{padding:0}}</style>
</head><body>${body}</body></html>`
}

// ── Receipt Preview Component ─────────────────────
function ReceiptPreview({ config }) {
  const html = buildReceiptHTML(config)
  const body = html.replace(/[\s\S]*<body[^>]*>([\s\S]*)<\/body>[\s\S]*/i, '$1')
  return (
    <div style={{
      background: '#fff',
      color: '#111',
      direction: 'rtl',
      padding: 20,
      fontFamily: 'Tahoma, Arial, sans-serif',
      fontSize: 13,
      minHeight: 300,
      borderRadius: 8,
    }}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}

// ── DEFAULT CODE TEMPLATE ─────────────────────────
const DEFAULT_CODE = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tahoma', Arial, sans-serif;
      direction: rtl;
      color: #111;
      background: #fff;
      padding: 24px;
      max-width: 360px;
    }
    .store-title {
      font-size: 22px;
      font-weight: 900;
      color: #318CE7;
      text-align: center;
      margin-bottom: 4px;
    }
    .store-sub { text-align: center; font-size: 11px; color: #888; margin-bottom: 12px; }
    hr { border: none; border-top: 1px dashed #ccc; margin: 12px 0; }
    .label { font-size: 10px; font-weight: 800; color: #318CE7; margin-bottom: 4px; }
    .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #EFF6FF; padding: 5px 6px; text-align: right; color: #318CE7; }
    td { padding: 5px 6px; border-bottom: 1px solid #f0f0f0; }
    .grand { font-size: 16px; font-weight: 900; color: #318CE7; border-top: 2px solid #318CE7; padding-top: 8px; margin-top: 6px; display: flex; justify-content: space-between; }
    .footer { text-align: center; font-size: 11px; color: #888; margin-top: 14px; border-top: 1px dashed #ccc; padding-top: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

<div class="store-title">موج</div>
<div class="store-sub">0501111222 · الإمارات العربية المتحدة</div>
<hr>

<div class="label">معلومات الطلب</div>
<div class="row"><span>رقم الطلب:</span><span><strong>#MWJ-2502-0042</strong></span></div>
<div class="row"><span>التاريخ:</span><span>١ مارس ٢٠٢٥</span></div>
<hr>

<div class="label">معلومات العميل</div>
<div class="row"><span>الاسم:</span><span>أحمد محمد العبدالله</span></div>
<div class="row"><span>الجوال:</span><span dir="ltr">0501234567</span></div>
<div class="row"><span>المدينة:</span><span>دبي</span></div>
<hr>

<div class="label">المنتجات</div>
<table>
  <thead><tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th></tr></thead>
  <tbody>
    <tr><td>طقم كريستال ملكي</td><td>×2</td><td>900 د.إ</td></tr>
    <tr><td>إطار صدفي مطلي</td><td>×1</td><td>280 د.إ</td></tr>
  </tbody>
</table>
<hr>

<div class="row"><span>المجموع الفرعي:</span><span>1,180 د.إ</span></div>
<div class="row"><span>الشحن:</span><span>25 د.إ</span></div>
<div class="grand"><span>الإجمالي:</span><span>1,205 د.إ</span></div>

<p style="font-size:11px;color:#555;margin-top:10px">ملاحظات: يرجى التعبئة بعناية — هدية خاصة</p>

<div class="footer">
  <p>شكراً لتعاملكم معنا 💙</p>
  <p style="font-weight:700;margin-top:3px;color:#318CE7">موج للهدايا الراقية</p>
</div>

</body>
</html>`

// ── VARIABLES for code editor ─────────────────────
const CODE_VARS = [
  { label: '{{store_name}}',    desc: 'اسم المتجر' },
  { label: '{{store_phone}}',   desc: 'جوال المتجر' },
  { label: '{{order_number}}',  desc: 'رقم الطلب' },
  { label: '{{date}}',          desc: 'التاريخ' },
  { label: '{{customer_name}}', desc: 'اسم العميل' },
  { label: '{{customer_phone}}',desc: 'جوال العميل' },
  { label: '{{city}}',          desc: 'المدينة' },
  { label: '{{subtotal}}',      desc: 'المجموع الفرعي' },
  { label: '{{shipping}}',      desc: 'الشحن' },
  { label: '{{total}}',         desc: 'الإجمالي' },
  { label: '{{notes}}',         desc: 'الملاحظات' },
  { label: '{{items_table}}',   desc: 'جدول المنتجات' },
]

// ══════════════════════════════════════════════════
// OPTION A — Block Editor
// ══════════════════════════════════════════════════
function BlockEditorTab({ config, setConfig }) {
  const blocks = config.blocks || DEFAULT_BLOCKS
  const sorted = [...blocks].sort((a, b) => a.order - b.order)

  function toggleBlock(id) {
    setConfig(c => ({
      ...c,
      blocks: (c.blocks || DEFAULT_BLOCKS).map(b => b.id === id ? { ...b, enabled: !b.enabled } : b),
    }))
  }

  function moveBlock(id, dir) {
    const sorted2 = [...(config.blocks || DEFAULT_BLOCKS)].sort((a, b) => a.order - b.order)
    const idx = sorted2.findIndex(b => b.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sorted2.length) return
    const newOrder = sorted2.map((b, i) => {
      if (i === idx) return { ...b, order: sorted2[newIdx].order }
      if (i === newIdx) return { ...b, order: sorted2[idx].order }
      return b
    })
    setConfig(c => ({ ...c, blocks: newOrder }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.6 }}>
        فعّل أو أوقف كل كتلة، واستخدم الأسهم لترتيبها في الفاتورة.
      </div>

      {/* Color accent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>لون مميز:</label>
        <input
          type="color"
          value={config.customAccent || '#318CE7'}
          onChange={e => setConfig(c => ({ ...c, customAccent: e.target.value }))}
          style={{ width: 40, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{config.customAccent || '#318CE7'}</span>
      </div>

      {sorted.map((block, i) => (
        <div key={block.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: block.enabled ? 'var(--bg-surface)' : 'var(--bg)',
          border: `1px solid ${block.enabled ? 'var(--border-strong)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)',
          opacity: block.enabled ? 1 : 0.55,
          transition: 'all 0.15s ease',
        }}>
          {/* Order arrows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => moveBlock(block.id, -1)} disabled={i === 0}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: i === 0 ? 'default' : 'pointer', padding: 2, opacity: i === 0 ? 0.3 : 1 }}>
              <IcArrowUp size={12} />
            </button>
            <button onClick={() => moveBlock(block.id, 1)} disabled={i === sorted.length - 1}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: i === sorted.length - 1 ? 'default' : 'pointer', padding: 2, opacity: i === sorted.length - 1 ? 0.3 : 1 }}>
              <IcArrowDown size={12} />
            </button>
          </div>

          {/* Label */}
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{block.label}</span>

          {/* Order badge */}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 20, textAlign: 'center' }}>{block.order + 1}</span>

          {/* Toggle */}
          <button onClick={() => toggleBlock(block.id)} style={{
            width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: block.enabled ? 'var(--action)' : 'var(--border-strong)',
            transition: 'background 0.2s',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'inset-inline-start 0.2s, right 0.2s',
              right: block.enabled ? 3 : 'auto',
              left: block.enabled ? 'auto' : 3,
            }} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════
// OPTION B — Template Gallery
// ══════════════════════════════════════════════════
function TemplateGalleryTab({ config, setConfig }) {
  const selected = config.template || 'classic'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        اختر قالباً جاهزاً ثم خصّص الألوان حسب هويتك البصرية.
      </div>

      {/* Template cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        {TEMPLATES.map(t => {
          const isSelected = selected === t.id
          const previewAccent = t.accent
          return (
            <button key={t.id} onClick={() => setConfig(c => ({ ...c, template: t.id }))} style={{
              textAlign: 'right', padding: 0, border: `2px solid ${isSelected ? 'var(--action)' : 'var(--border)'}`,
              borderRadius: 'var(--r-lg)', background: 'var(--bg-surface)',
              cursor: 'pointer', overflow: 'hidden', fontFamily: 'inherit',
              boxShadow: isSelected ? '0 0 20px rgba(49,140,231,0.25)' : 'var(--card-shadow)',
              transition: 'all 0.2s ease',
              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
            }}>
              {/* Mini receipt preview */}
              <div style={{ padding: '10px 10px 6px', background: '#fff', direction: 'rtl', minHeight: 110 }}>
                <div style={{
                  background: t.id === 'modern' ? 'linear-gradient(135deg,#318CE7,#1a6ec4)' : t.headerBg,
                  color: t.id === 'modern' ? '#fff' : previewAccent,
                  padding: '6px 8px', borderRadius: 4, textAlign: 'center',
                  fontSize: 10, fontWeight: 800, marginBottom: 6,
                }}>🏪 موج</div>
                <div style={{ borderTop: `1px dashed ${t.borderColor}`, margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#333', marginBottom: 2 }}>
                  <span>رقم الطلب:</span><span style={{ fontWeight: 700 }}>#MWJ-042</span>
                </div>
                <div style={{ borderTop: `1px dashed ${t.borderColor}`, margin: '4px 0' }} />
                <div style={{ background: t.tableHeaderBg, borderRadius: 3, padding: '3px 5px', fontSize: 8, color: previewAccent, fontWeight: 700 }}>
                  طقم كريستال × 2 = 900 د.إ
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 900, color: previewAccent }}>
                  <span>الإجمالي:</span><span>1,205 د.إ</span>
                </div>
              </div>
              <div style={{
                padding: '8px 10px', borderTop: '1px solid var(--border)',
                background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{t.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text)' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.3 }}>{t.desc}</div>
                  </div>
                </div>
                {isSelected && (
                  <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: 'var(--action)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✓ مختار
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom accent color for selected template */}
      <div style={{
        padding: '14px 16px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{ fontSize: 20 }}>🎨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>لون مخصص للقالب</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>يستبدل اللون الافتراضي للقالب المختار</div>
        </div>
        <input
          type="color"
          value={config.customAccent || TEMPLATES.find(t => t.id === selected)?.accent || '#318CE7'}
          onChange={e => setConfig(c => ({ ...c, customAccent: e.target.value }))}
          style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 3 }}
        />
      </div>

      {/* Store name */}
      <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>اسم المتجر في الفاتورة</label>
        <input
          value={config.storeName || ''}
          onChange={e => setConfig(c => ({ ...c, storeName: e.target.value }))}
          placeholder="موج للهدايا الراقية"
          style={{
            width: '100%', padding: '9px 12px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: 13,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// OPTION C — Code Editor
// ══════════════════════════════════════════════════
function CodeEditorTab({ config, setConfig }) {
  const textareaRef = useRef(null)
  const code = config.customCode || DEFAULT_CODE

  function insertVar(v) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newCode = code.slice(0, start) + v + code.slice(end)
    setConfig(c => ({ ...c, customCode: newCode }))
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + v.length
      ta.focus()
    }, 0)
  }

  function resetCode() {
    if (!window.confirm('هل تريد استعادة الكود الافتراضي؟')) return
    setConfig(c => ({ ...c, customCode: DEFAULT_CODE }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        اكتب كود HTML/CSS مخصص بالكامل. المعاينة تتحدث تلقائياً.
      </div>

      {/* Variable chips */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>متغيرات للإدراج:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CODE_VARS.map(v => (
            <button key={v.label} onClick={() => insertVar(v.label)} title={v.desc} style={{
              padding: '4px 10px', background: 'rgba(49,140,231,0.12)',
              border: '1px solid rgba(49,140,231,0.25)', borderRadius: 999,
              fontSize: 10, fontWeight: 700, color: 'var(--action)',
              cursor: 'pointer', fontFamily: 'monospace',
            }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => setConfig(c => ({ ...c, customCode: e.target.value }))}
          spellCheck={false}
          style={{
            width: '100%', minHeight: 340, padding: 14,
            background: '#0D1117', color: '#E6EDF3',
            border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
            fontFamily: '"Fira Code", "Cascadia Code", monospace', fontSize: 11,
            lineHeight: 1.7, resize: 'vertical', outline: 'none',
            direction: 'ltr', textAlign: 'left',
          }}
        />
        <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
          <button onClick={resetCode} style={{
            padding: '4px 10px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
            color: '#aaa', fontSize: 10, cursor: 'pointer',
          }}>↺ استعادة الكود الافتراضي</button>
        </div>
      </div>

      <div style={{
        padding: '10px 14px', background: 'rgba(49,140,231,0.08)',
        border: '1px solid rgba(49,140,231,0.2)', borderRadius: 'var(--r-md)',
        fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        💡 اكتب HTML كامل بما في ذلك &lt;head&gt; و&lt;style&gt;. عند الطباعة سيُستخدم الكود كما هو.
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// MAIN — Receipt Customizer
// ══════════════════════════════════════════════════
const TABS = [
  { id: 'blocks',    label: 'محرر مرئي',     icon: <IcGrid size={15} />,   emoji: '🧩', desc: 'فعّل وأعد ترتيب الكتل' },
  { id: 'templates', label: 'قوالب جاهزة',   icon: <IcEye size={15} />,    emoji: '🎨', desc: '3 تصاميم احترافية' },
  { id: 'code',      label: 'محرر الكود',    icon: <IcCode size={15} />,   emoji: '💻', desc: 'HTML/CSS مخصص بالكامل' },
]

export default function ReceiptCustomizer({ user, onNavigate }: PageProps) {
  const [activeTab, setActiveTab] = useState<'blocks' | 'templates' | 'code'>('blocks')
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    blocks: DEFAULT_BLOCKS,
    template: 'modern',
    customAccent: '',
    storeName: '',
    customCode: DEFAULT_CODE,
    mode: 'blocks' as 'blocks' | 'templates' | 'code',
  })

  // Load saved config on mount
  useEffect(() => {
    SettingsDB.get('receipt_config').then(saved => {
      if (saved) setConfig(c => ({ ...c, ...saved }))
    }).catch(() => {})
  }, [])

  // Sync mode with active tab
  useEffect(() => {
    setConfig(c => ({ ...c, mode: activeTab }))
  }, [activeTab])

  const previewConfig = { ...config, mode: activeTab }

  async function handleSave() {
    setSaving(true)
    try {
      await SettingsDB.set('receipt_config', config)
      toast('تم حفظ إعدادات الفاتورة ✓')
    } catch {
      toast('فشل الحفظ', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    const html = buildReceiptHTML(previewConfig)
    const w = window.open('', '_blank', 'width=500,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 300)
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={() => onNavigate('settings')} style={{
              background: 'none', border: 'none', color: 'var(--action)', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
            }}>← الإعدادات</button>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: 'var(--text)' }}>
            🧾 مخصص الفاتورة
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>صمم فاتورة الطلبات بطريقتك</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowPreview(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', color: 'var(--text-secondary)', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <IcEye size={14} /> {showPreview ? 'إخفاء المعاينة' : 'إظهار المعاينة'}
          </button>
          <button onClick={handlePrint} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', color: 'var(--text-secondary)', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <IcPrint size={14} /> طباعة تجريبية
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            background: 'var(--action)', border: 'none',
            borderRadius: 'var(--r-md)', color: '#fff', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            opacity: saving ? 0.7 : 1,
          }}>
            <IcSave size={14} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      <div className="page-wave-accent" style={{ marginBottom: 20 }} />

      {/* Tab selector */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: 6,
        boxShadow: 'var(--card-shadow)',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 'var(--r-md)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: isActive ? 'var(--action)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              fontWeight: isActive ? 800 : 600, fontSize: 13,
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 2px 12px rgba(49,140,231,0.35)' : 'none',
            }}>
              {tab.icon}
              <span className="hide-xs">{tab.label}</span>
              <span className="show-xs">{tab.emoji}</span>
            </button>
          )
        })}
      </div>

      {/* Main two-column layout */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left: Editor panel */}
        <div style={{
          flex: showPreview ? '0 0 420px' : '1',
          minWidth: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '20px 20px',
          boxShadow: 'var(--card-shadow)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
        }} className="receipt-editor-panel">
          {/* Tab header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--r-md)',
              background: 'rgba(49,140,231,0.15)', border: '1px solid rgba(49,140,231,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{TABS.find(t => t.id === activeTab)?.emoji}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{TABS.find(t => t.id === activeTab)?.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{TABS.find(t => t.id === activeTab)?.desc}</div>
            </div>
          </div>

          {activeTab === 'blocks' && <BlockEditorTab config={config} setConfig={setConfig} />}
          {activeTab === 'templates' && <TemplateGalleryTab config={config} setConfig={setConfig} />}
          {activeTab === 'code' && <CodeEditorTab config={config} setConfig={setConfig} />}
        </div>

        {/* Right: Live preview */}
        {showPreview && (
          <div style={{
            flex: 1, minWidth: 0,
            position: 'sticky', top: 16,
          }} className="receipt-preview-panel">
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--card-shadow)',
              overflow: 'hidden',
            }}>
              {/* Preview header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-elevated)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IcEye size={13} /> معاينة مباشرة
                </span>
                <button onClick={handlePrint} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                  background: 'rgba(49,140,231,0.12)', border: '1px solid rgba(49,140,231,0.25)',
                  borderRadius: 999, color: 'var(--action)', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <IcPrint size={12} /> طباعة
                </button>
              </div>

              {/* Preview area — paper look */}
              <div style={{
                padding: 24, background: 'var(--bg)',
                display: 'flex', justifyContent: 'center',
                minHeight: 300,
              }}>
                <div style={{
                  width: '100%', maxWidth: 340,
                  background: '#fff',
                  borderRadius: 6,
                  boxShadow: '0 4px 40px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                }}>
                  <ReceiptPreview config={previewConfig} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .receipt-editor-panel { flex: 1 !important; }
          .receipt-preview-panel { display: none !important; }
          .hide-xs { display: none; }
          .show-xs { display: inline; }
        }
        @media (min-width: 769px) {
          .hide-xs { display: inline; }
          .show-xs { display: none; }
        }
      `}</style>
    </div>
  )
}
