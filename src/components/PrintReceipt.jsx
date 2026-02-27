import React, { useState, useEffect } from 'react'
import { Settings } from '../data/db'

// Preload Almarai font for PDF rendering
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Inter:wght@400;600;700;800&display=swap'

async function loadFonts() {
  // Load font stylesheet
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FONT_URL
  document.head.appendChild(link)
  // Wait for fonts to be ready
  if (document.fonts?.ready) {
    await document.fonts.ready
  }
  // Extra wait for font rendering
  await new Promise(r => setTimeout(r, 300))
}

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
</style>
</head>
<body>
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

// Generate PDF blob from order data
async function generatePDFBlob(order, statusLabel, logoUrl) {
  const html2pdf = (await import('html2pdf.js')).default

  await loadFonts()

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.innerHTML = buildReceiptHTML(order, statusLabel, logoUrl)
  document.body.appendChild(container)

  // If there is a logo image, wait for it to load
  const img = container.querySelector('img')
  if (img && !img.complete) {
    await new Promise((resolve) => {
      img.onload = resolve
      img.onerror = resolve
      setTimeout(resolve, 2000)
    })
  }

  const element = container.querySelector('.page')

  // Wait a bit for font rendering in the container
  await new Promise(r => setTimeout(r, 200))

  const worker = html2pdf().set({
    margin: 0,
    filename: `فاتورة-${order.order_number || 'mawj'}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: false,
      width: 559,   // 148mm at 96dpi
      height: 794,  // 210mm at 96dpi
      windowWidth: 559,
      windowHeight: 794,
    },
    jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all'] },
  }).from(element)

  const blob = await worker.outputPdf('blob')
  document.body.removeChild(container)
  return blob
}

export default function PrintReceipt({ order, statuses }) {
  const [loading, setLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const statusObj = statuses?.find(s => s.id === order?.status) || { label: order?.status || '' }

  useEffect(() => {
    Settings.get('business').then(biz => {
      if (biz?.logo_url) setLogoUrl(biz.logo_url)
    }).catch(() => {})
  }, [])

  async function downloadPDF() {
    if (loading) return
    setLoading(true)
    try {
      const blob = await generatePDFBlob(order, statusObj.label, logoUrl)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `فاتورة-${order.order_number || 'mawj'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function sharePDF() {
    if (sharing) return
    setSharing(true)
    try {
      const blob = await generatePDFBlob(order, statusObj.label, logoUrl)
      const file = new File([blob], `فاتورة-${order.order_number || 'mawj'}.pdf`, { type: 'application/pdf' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `فاتورة ${order.order_number || ''}`,
          text: `فاتورة طلب ${order.order_number || ''} - موج للهدايا`,
          files: [file],
        })
      } else {
        // Fallback: download instead
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    } finally {
      setSharing(false)
    }
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
      {/* Download PDF */}
      <button
        onClick={downloadPDF}
        disabled={loading}
        title="تحميل الفاتورة PDF"
        style={{
          ...btnBase,
          background: loading ? 'var(--bg-hover)' : 'linear-gradient(135deg, #0d9488, #00e4b8)',
          color: loading ? 'var(--text-muted)' : '#fff',
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {loading ? 'جاري التحميل...' : 'تحميل PDF'}
      </button>

      {/* Share */}
      <button
        onClick={sharePDF}
        disabled={sharing}
        title="مشاركة الفاتورة"
        style={{
          ...btnBase,
          background: sharing ? 'var(--bg-hover)' : 'rgba(var(--action-rgb, 0,228,184), 0.12)',
          color: sharing ? 'var(--text-muted)' : 'var(--action)',
          border: '1px solid rgba(var(--action-rgb, 0,228,184), 0.25)',
          opacity: sharing ? 0.7 : 1,
          cursor: sharing ? 'wait' : 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        {sharing ? 'جاري المشاركة...' : 'مشاركة'}
      </button>
    </div>
  )
}
