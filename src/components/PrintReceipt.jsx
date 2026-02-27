import React, { useState, useEffect } from 'react'
import { Settings } from '../data/db'

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Inter:wght@400;600;700;800&display=swap'

function buildReceiptHTML(order, statusLabel, logoUrl) {
  const date = new Date(order.created_at || Date.now()).toLocaleDateString('ar-AE', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const items = order.items || []
  const subtotal = Number(order.subtotal || order.total || 0)
  const discount = Number(order.discount || order.discount_amount || 0)
  const total = Number(order.total || 0)

  const logoHTML = logoUrl
    ? `<img src="${logoUrl}" style="height:40px;max-width:120px;object-fit:contain;" crossorigin="anonymous" />`
    : `<div style="font-size:28px;font-weight:800;color:#0d9488;line-height:1;font-family:'Almarai',sans-serif;">موج</div>`

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT_URL}" rel="stylesheet">
<style>
  @page {
    size: 148mm 210mm;
    margin: 0;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Almarai', 'Arial', sans-serif;
    background: #fff;
    color: #1a1a2e;
    width: 148mm;
    height: 210mm;
    margin: 0 auto;
    padding: 0;
    font-size: 12px;
    direction: rtl;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  .page {
    width: 148mm;
    height: 210mm;
    max-height: 210mm;
    padding: 14mm 14mm 10mm;
    position: relative;
    overflow: hidden;
  }
  .top-accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5mm;
    background: linear-gradient(135deg, #0d9488, #00e4b8, #06b6d4);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 5mm;
    padding-bottom: 4mm;
    border-bottom: 1.5px solid #e5e7eb;
  }
  .brand { display: flex; flex-direction: column; gap: 1mm; }
  .brand-sub {
    font-size: 9px;
    color: #6b7280;
    letter-spacing: 0.08em;
  }
  .invoice-meta { text-align: left; direction: ltr; }
  .invoice-label {
    font-size: 8px;
    color: #9ca3af;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 1mm;
  }
  .invoice-num {
    font-family: 'Inter', monospace;
    font-size: 14px;
    font-weight: 800;
    color: #1a1a2e;
    letter-spacing: 0.03em;
  }
  .invoice-date {
    font-size: 10px;
    color: #6b7280;
    margin-top: 1mm;
  }
  .status-pill {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 99px;
    font-size: 8px;
    font-weight: 700;
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
    margin-top: 1mm;
  }

  .customer-box {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 3mm 4mm;
    margin-bottom: 4mm;
  }
  .customer-title {
    font-size: 8px;
    color: #9ca3af;
    font-weight: 700;
    letter-spacing: 0.1em;
    margin-bottom: 1.5mm;
  }
  .customer-name {
    font-size: 13px;
    font-weight: 800;
    color: #1a1a2e;
    margin-bottom: 0.5mm;
  }
  .customer-detail {
    font-size: 10px;
    color: #6b7280;
    line-height: 1.4;
  }

  .items-section { margin-bottom: 4mm; }
  .section-title {
    font-size: 8px;
    color: #9ca3af;
    font-weight: 700;
    letter-spacing: 0.1em;
    margin-bottom: 2mm;
  }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table th {
    font-size: 9px;
    font-weight: 700;
    color: #6b7280;
    padding: 2mm 0;
    border-bottom: 1.5px solid #e5e7eb;
    text-align: right;
  }
  .items-table th:first-child { width: 7mm; text-align: center; }
  .items-table th:nth-child(3) { text-align: center; width: 14mm; }
  .items-table th:last-child { text-align: left; width: 26mm; }
  .items-table td {
    padding: 2mm 0;
    font-size: 11px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }
  .items-table td:first-child {
    text-align: center;
    color: #9ca3af;
    font-size: 9px;
    font-family: 'Inter', sans-serif;
  }
  .items-table td:nth-child(3) {
    text-align: center;
    color: #6b7280;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
  }
  .items-table td:last-child {
    text-align: left;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    color: #1a1a2e;
    font-size: 11px;
  }
  .item-name { font-weight: 600; }
  .item-size { font-size: 9px; color: #9ca3af; }
  .item-note {
    font-size: 9px;
    color: #6b7280;
    font-style: italic;
    margin-top: 0.3mm;
  }

  .totals-box {
    margin-top: 3mm;
    padding-top: 3mm;
    border-top: 1.5px solid #e5e7eb;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 1mm 0;
    font-size: 11px;
    color: #6b7280;
  }
  .totals-row span:last-child {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
  }
  .totals-row.discount span { color: #dc2626; }
  .total-final {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2mm;
    padding: 3mm 4mm;
    background: linear-gradient(135deg, #0d9488, #00e4b8);
    border-radius: 6px;
    color: #fff;
  }
  .total-final .label { font-size: 13px; font-weight: 800; }
  .total-final .amount {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .notes-box {
    margin-top: 3mm;
    padding: 2mm 3mm;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 5px;
    font-size: 10px;
    color: #92400e;
  }
  .notes-label { font-weight: 700; margin-bottom: 0.5mm; font-size: 9px; }

  .footer {
    margin-top: 5mm;
    padding-top: 3mm;
    border-top: 1px solid #e5e7eb;
    text-align: center;
  }
  .footer-thanks {
    font-size: 12px;
    font-weight: 800;
    color: #0d9488;
    margin-bottom: 1mm;
  }
  .footer-brand {
    font-size: 9px;
    color: #9ca3af;
    letter-spacing: 0.1em;
  }
  .footer-wave {
    margin-top: 2mm;
    font-size: 16px;
    letter-spacing: 4px;
    opacity: 0.15;
  }

  /* Print toolbar - hidden when printing */
  .print-toolbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 9999;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    padding: 12px 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    font-family: 'Almarai', sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .print-toolbar button {
    padding: 8px 20px;
    border: none;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .print-toolbar .btn-print {
    background: linear-gradient(135deg, #0d9488, #00e4b8);
    color: #fff;
  }
  .print-toolbar .btn-print:hover { opacity: 0.9; }
  .print-toolbar .btn-close {
    background: rgba(255,255,255,0.1);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.2);
  }
  .print-toolbar .btn-close:hover { background: rgba(255,255,255,0.2); }

  @media print {
    .print-toolbar { display: none !important; }
    body { margin: 0; padding: 0; }
    .page { padding-top: 14mm; }
  }

  /* Adjust page position when toolbar is visible (screen only) */
  @media screen {
    body { padding-top: 56px; }
  }
</style>
</head>
<body>
<div class="print-toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ طباعة / تحميل PDF</button>
  <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
</div>

<div class="page">
  <div class="top-accent"></div>

  <div class="header">
    <div class="brand">
      ${logoHTML}
      <div class="brand-sub">MAWJ GIFTS &bull; UAE</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-num">${order.order_number || '---'}</div>
      <div class="invoice-date">${date}</div>
      <div class="status-pill">${statusLabel}</div>
    </div>
  </div>

  <div class="customer-box">
    <div class="customer-title">بيانات العميل</div>
    <div class="customer-name">${order.customer_name || 'عميل'}</div>
    ${order.customer_phone ? `<div class="customer-detail" style="direction:ltr;text-align:right">${order.customer_phone}</div>` : ''}
    ${order.customer_city ? `<div class="customer-detail">${order.customer_city}${order.customer_address ? ' &bull; ' + order.customer_address : ''}</div>` : ''}
    ${order.tracking_number ? `<div class="customer-detail" style="margin-top:1mm"><span style="color:#9ca3af">رقم التتبع:</span> <span style="font-family:Inter,monospace;direction:ltr">${order.tracking_number}</span></div>` : ''}
  </div>

  <div class="items-section">
    <div class="section-title">المنتجات</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>السعر</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div class="item-name">${item.name || ''}</div>
            ${item.size ? `<div class="item-size">${item.size}</div>` : ''}
            ${item.engraving_notes ? `<div class="item-note">${item.engraving_notes}</div>` : ''}
          </td>
          <td>${item.qty || 1}</td>
          <td>${((item.price || 0) * (item.qty || 1)).toLocaleString('en-US')} د.إ</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="totals-box">
    <div class="totals-row">
      <span>المجموع الفرعي</span>
      <span>${subtotal.toLocaleString('en-US')} د.إ</span>
    </div>
    ${discount > 0 ? `<div class="totals-row discount"><span>الخصم</span><span>-${discount.toLocaleString('en-US')} د.إ</span></div>` : ''}
    ${order.delivery_cost ? `<div class="totals-row"><span>الشحن</span><span>${Number(order.delivery_cost).toLocaleString('en-US')} د.إ</span></div>` : ''}
    <div class="total-final">
      <span class="label">الإجمالي</span>
      <span class="amount">${total.toLocaleString('en-US')} د.إ</span>
    </div>
  </div>

  ${order.notes ? `
  <div class="notes-box">
    <div class="notes-label">ملاحظات</div>
    <div>${order.notes}</div>
  </div>` : ''}

  <div class="footer">
    <div class="footer-thanks">شكراً لتسوقكم معنا</div>
    <div class="footer-brand">Mawj Gifts &bull; موج للهدايا &bull; UAE</div>
    <div class="footer-wave">~ ~ ~ ~ ~ ~ ~</div>
  </div>
</div>
</body>
</html>`
}

// Print invoice directly using a hidden iframe
function printFromIframe(order, statusLabel, logoUrl) {
  return new Promise((resolve, reject) => {
    const html = buildReceiptHTML(order, statusLabel, logoUrl)

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;inset-inline-end:-9999px;top:-9999px;width:0;height:0;border:none;opacity:0;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()

    // Remove toolbar from iframe print (we don't need it there)
    const toolbar = doc.querySelector('.print-toolbar')
    if (toolbar) toolbar.remove()
    // Remove screen padding since no toolbar
    const body = doc.querySelector('body')
    if (body) body.style.paddingTop = '0'

    const cleanup = () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe)
      }
    }

    // Wait for fonts to load inside the iframe, then trigger print
    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        // Clean up after the print dialog closes
        setTimeout(cleanup, 1500)
        resolve()
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    // Use the fonts.ready API if available, with a fallback timeout
    if (iframe.contentDocument.fonts?.ready) {
      iframe.contentDocument.fonts.ready.then(() => {
        setTimeout(triggerPrint, 200)
      }).catch(() => {
        setTimeout(triggerPrint, 600)
      })
    } else {
      setTimeout(triggerPrint, 800)
    }
  })
}

// Open invoice preview in a new window (user can print/save from there)
function openPreview(order, statusLabel, logoUrl) {
  const html = buildReceiptHTML(order, statusLabel, logoUrl)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  // Revoke after a delay to allow the window to load
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return win
}

export default function PrintReceipt({ order, statuses }) {
  const [printing, setPrinting] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const statusObj = statuses?.find(s => s.id === order?.status) || { label: order?.status || '' }

  useEffect(() => {
    Settings.get('business').then(biz => {
      if (biz?.logo_url) setLogoUrl(biz.logo_url)
    }).catch(() => {})
  }, [])

  async function handlePrint() {
    if (printing) return
    setPrinting(true)
    try {
      await printFromIframe(order, statusObj.label, logoUrl)
    } catch (err) {
      console.error('Print failed:', err)
    } finally {
      setPrinting(false)
    }
  }

  function handlePreview() {
    openPreview(order, statusObj.label, logoUrl)
  }

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 99,
    border: 'none',
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  }

  return (
    <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {/* Print / Download PDF */}
      <button
        onClick={handlePrint}
        disabled={printing}
        title="طباعة / تحميل PDF"
        style={{
          ...btnBase,
          background: printing ? 'var(--bg-hover)' : 'linear-gradient(135deg, #0d9488, #00e4b8)',
          color: printing ? 'var(--text-muted)' : '#fff',
          opacity: printing ? 0.7 : 1,
          cursor: printing ? 'wait' : 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        {printing ? 'جاري الطباعة...' : 'طباعة / تحميل PDF'}
      </button>

      {/* Preview Invoice */}
      <button
        onClick={handlePreview}
        title="عرض الفاتورة"
        style={{
          ...btnBase,
          background: 'rgba(var(--action-rgb, 0,228,184), 0.12)',
          color: 'var(--action)',
          border: '1px solid rgba(var(--action-rgb, 0,228,184), 0.25)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        عرض الفاتورة
      </button>
    </div>
  )
}
