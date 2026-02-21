import React, { useRef } from 'react'

export default function PrintReceipt({ order, statuses, businessName = 'موج للهدايا' }) {
  const ref = useRef()

  const statusObj = statuses?.find(s => s.id === order?.status) || { label: order?.status || '' }

  function doPrint() {
    const win = window.open('', '_blank', 'width=400,height=700')
    win.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة ${order.order_number}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;900&display=swap" rel="stylesheet"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Noto Kufi Arabic', sans-serif;
    background: #fff;
    color: #111;
    width: 80mm;
    max-width: 80mm;
    margin: 0 auto;
    padding: 8mm 6mm;
    font-size: 12px;
    direction: rtl;
  }
  .center { text-align: center; }
  .divider { border: none; border-top: 1px dashed #bbb; margin: 8px 0; }
  .divider-solid { border: none; border-top: 1px solid #111; margin: 8px 0; }
  .logo-area { text-align: center; margin-bottom: 8px; }
  .store-name {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1;
    margin-bottom: 2px;
  }
  .store-sub { font-size: 10px; color: #666; letter-spacing: 0.08em; }
  .receipt-title {
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin: 6px 0;
    color: #444;
  }
  .order-num {
    font-size: 15px;
    font-weight: 900;
    text-align: center;
    font-family: monospace;
    letter-spacing: 0.06em;
    margin: 4px 0;
  }
  .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
  .info-label { color: #666; }
  .info-val { font-weight: 600; }
  .items-header {
    display: flex; justify-content: space-between;
    font-size: 10px; font-weight: 700;
    color: #444; letter-spacing: 0.05em;
    padding: 4px 0 2px;
    border-bottom: 1px solid #ddd;
    margin-bottom: 4px;
  }
  .item-row {
    display: flex; justify-content: space-between;
    padding: 3px 0; font-size: 11px;
    border-bottom: 1px dotted #eee;
    align-items: flex-start;
    gap: 6px;
  }
  .item-num { color: #888; min-width: 16px; font-size: 10px; }
  .item-name { flex: 1; }
  .item-qty { color: #555; min-width: 24px; text-align: center; }
  .item-price { font-weight: 700; min-width: 48px; text-align: left; }
  .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
  .total-final {
    display: flex; justify-content: space-between;
    font-size: 15px; font-weight: 900;
    padding: 5px 0;
  }
  .total-final span:last-child { font-family: monospace; }
  .status-badge {
    display: inline-block;
    padding: 3px 12px;
    border: 1px solid #111;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .barcode-area {
    text-align: center;
    font-family: monospace;
    font-size: 9px;
    color: #999;
    letter-spacing: 0.2em;
    margin: 4px 0;
  }
  .barcode-text {
    font-size: 24px;
    letter-spacing: 0.15em;
    line-height: 1;
    color: #111;
  }
  .thank-you {
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    margin-top: 4px;
    color: #111;
  }
  .small-note { text-align: center; font-size: 9px; color: #999; margin-top: 3px; }
  @media print {
    body { margin: 0; padding: 6mm 5mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

<!-- Store Header -->
<div class="logo-area">
  <div class="store-name">موج</div>
  <div class="store-sub">للهدايا • UAE</div>
</div>

<hr class="divider-solid"/>

<div class="receipt-title">فاتورة / RECEIPT</div>
<div class="order-num">#${order.order_number || '---'}</div>

<hr class="divider"/>

<!-- Order Info -->
<div class="info-row"><span class="info-label">التاريخ</span><span class="info-val">${new Date(order.created_at || Date.now()).toLocaleDateString('ar-AE')}</span></div>
${order.customer_name ? `<div class="info-row"><span class="info-label">العميل</span><span class="info-val">${order.customer_name}</span></div>` : ''}
${order.customer_phone ? `<div class="info-row"><span class="info-label">الهاتف</span><span class="info-val" style="direction:ltr;text-align:left">${order.customer_phone}</span></div>` : ''}
${order.customer_city ? `<div class="info-row"><span class="info-label">المدينة</span><span class="info-val">${order.customer_city}</span></div>` : ''}
${order.tracking_number ? `<div class="info-row"><span class="info-label">رقم التتبع</span><span class="info-val" style="font-family:monospace;direction:ltr">${order.tracking_number}</span></div>` : ''}
<div class="info-row"><span class="info-label">الحالة</span><span class="status-badge">${statusObj.label}</span></div>

<hr class="divider"/>

<!-- Items -->
<div class="items-header">
  <span>المنتج</span>
  <span>الكمية</span>
  <span>السعر</span>
</div>
${(order.items || []).map((item, i) => `
<div class="item-row">
  <span class="item-num">${i + 1}</span>
  <span class="item-name">${item.name || ''}</span>
  <span class="item-qty">×${item.qty || 1}</span>
  <span class="item-price">${((item.price || 0) * (item.qty || 1)).toFixed(0)} د.إ</span>
</div>`).join('')}

<hr class="divider"/>

<!-- Totals -->
${order.delivery_cost ? `<div class="totals-row"><span>الشحن</span><span>${Number(order.delivery_cost).toFixed(0)} د.إ</span></div>` : ''}
${order.discount_amount ? `<div class="totals-row"><span>خصم</span><span>-${Number(order.discount_amount).toFixed(0)} د.إ</span></div>` : ''}

<div class="total-final">
  <span>الإجمالي</span>
  <span>${Number(order.total || 0).toFixed(0)} د.إ</span>
</div>

<hr class="divider-solid"/>

<!-- Barcode-style order number -->
<div class="barcode-area">
  <div class="barcode-text">${(order.order_number || '').replace(/\D/g, '').split('').join(' ')}</div>
  <div>${order.order_number || ''}</div>
</div>

<hr class="divider"/>

<!-- Footer -->
${order.notes ? `<div class="small-note">ملاحظة: ${order.notes}</div><hr class="divider"/>` : ''}
<div class="thank-you">شكراً لتسوقكم معنا 🎁</div>
<div class="small-note">Mawj Gifts • موج للهدايا</div>
<div class="small-note" style="margin-top:8px;color:#ccc">— — — — — — — — — — — —</div>

<script>
  window.onload = function() {
    window.print()
    setTimeout(() => window.close(), 800)
  }
</script>
</body>
</html>`)
    win.document.close()
  }

  return (
    <button
      onClick={doPrint}
      title="طباعة الفاتورة"
      style={{
        display:'inline-flex', alignItems:'center', gap:7,
        padding:'9px 20px', borderRadius:'var(--radius-pill)',
        background:'var(--bg-glass)', backdropFilter:'blur(12px)',
        border:'1.5px solid var(--bg-border)',
        color:'var(--text-sec)', fontSize:13, fontWeight:600,
        cursor:'pointer', fontFamily:'inherit',
        transition:'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--teal)'; e.currentTarget.style.color='var(--teal)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--bg-border)'; e.currentTarget.style.color='var(--text-sec)' }}
    >
      🖨️ طباعة الفاتورة
    </button>
  )
}
