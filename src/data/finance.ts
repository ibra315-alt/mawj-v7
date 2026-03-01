/* ═══════════════════════════════════════════════════════════
   FINANCE ENGINE — Mawj ERP v7
   ─────────────────────────────────────────────────────────
   Single source of truth for ALL financial calculations.
   Every page imports from here — no inline reduce() chains.

   FIXED BUGS:
   ✓ Revenue uses total (post-discount) consistently
   ✓ Hayyak fees only counted for shipped orders
   ✓ Partner equity includes profit share
   ✓ Reimbursement withdrawals excluded from equity
   ✓ Product margins include hayyak fee allocation
   ✓ Pending COD clearly separated from monthly data
   ✓ Cash position includes unreimbursed as liability
═══════════════════════════════════════════════════════════ */

// ── ORDER-LEVEL PROFIT ──────────────────────────────────
// Rule: customer NEVER pays delivery. Mawj absorbs hayyak fee.

export function calcOrderProfit({
  items = [], hayyak_fee = 25, discount = 0,
  is_replacement = false, is_not_delivered = false,
}: { items?: any[]; hayyak_fee?: any; discount?: any; is_replacement?: boolean; is_not_delivered?: boolean }) {
  const subtotal     = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0)
  const product_cost = items.reduce((s, i) => s + (parseFloat(i.cost)  || 0) * (parseInt(i.qty) || 1), 0)
  const fee          = parseFloat(String(hayyak_fee)) || 0
  const disc         = parseFloat(String(discount))   || 0

  if (is_replacement || is_not_delivered) {
    return { subtotal: 0, product_cost, hayyak_fee: fee, total: 0, gross_profit: -(product_cost + fee) }
  }
  const total        = subtotal - disc
  const gross_profit = total - product_cost - fee
  return { subtotal, product_cost, hayyak_fee: fee, total, gross_profit }
}

// ── FILTER HELPERS ──────────────────────────────────────

function _active(orders) {
  return orders.filter(o => o.status !== 'cancelled')
}

function _revenueOrders(orders) {
  return _active(orders).filter(o => !o.is_replacement && o.status !== 'not_delivered')
}

// ── AGGREGATE CALCULATIONS ──────────────────────────────

/** Revenue = total (post-discount) from delivered non-replacement orders */
export function calcRevenue(orders) {
  return _revenueOrders(orders).reduce((s, o) => s + (o.total || 0), 0)
}

/** Discount total from active orders */
export function calcDiscount(orders) {
  return _active(orders).reduce((s, o) => s + (o.discount || 0), 0)
}

/** Product cost from active orders */
export function calcProductCost(orders) {
  return _active(orders).reduce((s, o) => s + (o.product_cost || 0), 0)
}

/** Hayyak fees — only for orders that actually shipped (delivered + not_delivered + replacement) */
export function calcHayyakFees(orders) {
  return _active(orders)
    .filter(o => ['delivered', 'not_delivered'].includes(o.status) || o.is_replacement)
    .reduce((s, o) => s + (o.hayyak_fee || 0), 0)
}

/** Gross profit from active orders */
export function calcGrossProfit(orders) {
  return _active(orders).reduce((s, o) => s + (o.gross_profit || 0), 0)
}

/** Total operating expenses */
export function calcExpenses(expenses) {
  return expenses.reduce((s, e) => s + (e.amount || 0), 0)
}

/** Net profit = gross profit - operating expenses */
export function calcNetProfit(orders, expenses) {
  return calcGrossProfit(orders) - calcExpenses(expenses)
}

/** Profit margin percentage */
export function calcMargin(orders, expenses) {
  const rev = calcRevenue(orders)
  const net = calcNetProfit(orders, expenses)
  return rev > 0 ? ((net / rev) * 100).toFixed(1) : '0.0'
}

// ── PENDING COD ─────────────────────────────────────────

export function calcPendingCOD(orders) {
  const pending    = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
  const totalCOD   = pending.reduce((s, o) => s + (o.total || 0), 0)
  const hayyakFees = pending.reduce((s, o) => s + (o.hayyak_fee || 25), 0)
  return { count: pending.length, totalCOD, hayyakFees, expectedNet: totalCOD - hayyakFees, orders: pending }
}

// ── CASH POSITION ───────────────────────────────────────

export function calcCashPosition({ remittances = [], capital = [], expenses = [], withdrawals = [] }) {
  const bankFromHayyak  = remittances.reduce((s, r) => s + (r.bank_received || 0), 0)
  const capitalDeposits = capital.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
  const totalIn         = bankFromHayyak + capitalDeposits

  const companyExpenses = expenses
    .filter(e => e.paid_by === 'company' || !e.paid_by)
    .reduce((s, e) => s + (e.amount || 0), 0)
  const totalWithdraw   = withdrawals.reduce((s, w) => s + (w.amount || 0), 0)
  const capitalWithdraw = capital.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)
  const totalOut        = companyExpenses + totalWithdraw + capitalWithdraw

  const unreimbursed = expenses
    .filter(e => e.paid_by && e.paid_by !== 'company' && !e.reimbursed)
    .reduce((s, e) => s + (e.amount || 0), 0)

  // FIX: Subtract unreimbursed liability from estimated cash
  const estimatedCash = totalIn - totalOut - unreimbursed

  return {
    bankFromHayyak, capitalDeposits, totalIn,
    companyExpenses, totalWithdraw, capitalWithdraw, totalOut,
    unreimbursed, estimatedCash,
  }
}

// ── PARTNER EQUITY ──────────────────────────────────────

export function calcPartnerEquity(partner, { orders, expenses, capital, withdrawals }) {
  const share       = (partner.share || 50) / 100
  const netProfit   = calcNetProfit(orders, expenses)
  const profitShare = netProfit * share

  const myCapital = capital.filter(c => c.partner_id === partner.id || c.partner_name === partner.name)
  const myWithdrawals = withdrawals.filter(w => w.partner_id === partner.id || w.partner_name === partner.name)
  const myExpenses = expenses.filter(e =>
    (e.paid_by === 'ibrahim' && partner.name === 'إبراهيم') ||
    (e.paid_by === 'ihsan'   && partner.name === 'إحسان')
  )

  const opening    = myCapital.filter(c => c.type === 'opening').reduce((s, c) => s + (c.amount || 0), 0)
  const capitalIn  = myCapital.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
  const capitalOut = myCapital.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)

  // FIX: Exclude reimbursement-type withdrawals — unreimbursed tracking already handles it
  const totalWithdraw = myWithdrawals
    .filter(w => w.type !== 'reimbursement')
    .reduce((s, w) => s + (w.amount || 0), 0)

  const expPaid     = myExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const reimbursed  = myExpenses.filter(e => e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0)
  const unreimbursed = expPaid - reimbursed

  const totalCapital = opening + capitalIn - capitalOut
  // FIX: Include profit share in equity
  const netEquity    = totalCapital + profitShare - totalWithdraw + unreimbursed

  return {
    opening, capitalIn, capitalOut, totalCapital,
    profitShare, share,
    totalWithdraw, expPaid, reimbursed, unreimbursed,
    netEquity,
  }
}

// ── PRODUCT PROFITABILITY ───────────────────────────────

export function calcProductStats(orders: any[]) {
  const productMap: Record<string, { name: string; size: string; qty: number; revenue: number; cost: number; profit: number }> = {}

  _active(orders).forEach(order => {
    const items = order.items || []
    const itemCount = items.reduce((s, i) => s + (parseInt(i.qty) || 1), 0)
    const orderHayyak = parseFloat(order.hayyak_fee) || 0

    items.forEach(item => {
      const key = `${item.name}${item.size ? '—' + item.size : ''}`
      if (!productMap[key]) productMap[key] = { name: item.name, size: item.size || '', qty: 0, revenue: 0, cost: 0, profit: 0 }

      const qty     = parseInt(item.qty) || 1
      const revenue = (parseFloat(item.price) || 0) * qty
      const cost    = (parseFloat(item.cost) || 0) * qty
      // FIX: Allocate hayyak fee proportionally across items
      const hayyakShare = itemCount > 0 ? (orderHayyak * qty / itemCount) : 0

      productMap[key].qty += qty
      productMap[key].revenue += revenue
      productMap[key].cost += cost

      if (order.is_replacement || order.status === 'not_delivered') {
        productMap[key].profit -= (cost + hayyakShare)
      } else {
        productMap[key].profit += (revenue - cost - hayyakShare)
      }
    })
  })

  return Object.values(productMap).map(p => ({
    ...p,
    margin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0',
    avgPrice: p.qty > 0 ? p.revenue / p.qty : 0,
  }))
}

// ── DATE HELPERS ────────────────────────────────────────

export function monthKey(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('ar-AE', { month: 'long', year: 'numeric' })
}

export function getMonthKeys(...lists: any[]): string[] {
  const keys = new Set<string>()
  lists.flat().forEach(item => {
    const dateStr = item.date || item.created_at || item.order_date
    if (dateStr) keys.add(monthKey(dateStr))
  })
  return [...keys].filter(Boolean).sort().reverse()
}

export function filterByMonth(items, dateField, key) {
  if (!key || key === 'all') return items
  return items.filter(i => monthKey(i[dateField]) === key)
}

// ── ORDER STATUS CONFIG ─────────────────────────────────

export const ORDER_STATUSES = [
  { id: 'new',           label: 'جديد',    color: 'var(--action)', bg: 'rgba(var(--action-rgb),0.1)', next: 'ready' },
  { id: 'ready',         label: 'جاهز',    color: 'var(--warning)', bg: 'rgba(var(--warning-rgb),0.1)', next: 'with_hayyak' },
  { id: 'with_hayyak',   label: 'مع حياك', color: 'var(--info)', bg: 'rgba(var(--info-rgb),0.1)', next: 'delivered' },
  { id: 'delivered',     label: 'تم التسليم',   color: 'var(--success)', bg: 'rgba(var(--success-rgb),0.1)', next: null },
  { id: 'not_delivered', label: 'لم يتم',  color: 'var(--danger)', bg: 'rgba(var(--danger-rgb),0.1)',  next: null },
  { id: 'cancelled',     label: 'ملغي',    color: 'var(--text-muted)', bg: 'rgba(107,114,128,0.1)', next: null },
]

export const PIPELINE_STATUSES = ORDER_STATUSES.filter(s => s.id !== 'cancelled')

export function getStatusInfo(statusId) {
  return ORDER_STATUSES.find(s => s.id === statusId) || ORDER_STATUSES[0]
}

export function getNextStatus(currentStatus) {
  const info = getStatusInfo(currentStatus)
  return info.next ? getStatusInfo(info.next) : null
}

// ── MONTHLY BREAKDOWN ───────────────────────────────────

export function calcMonthlyBreakdown(orders, expenses, remittances) {
  const keys = getMonthKeys(orders, expenses, remittances)

  const rows = keys.map(key => {
    const mo = filterByMonth(orders, 'created_at', key).filter(o => o.status !== 'cancelled')
    const me = filterByMonth(expenses, 'date', key)
    const mr = filterByMonth(remittances, 'date', key)

    // FIX: Use total (post-discount) for revenue
    const revenue     = mo.filter(o => !o.is_replacement && o.status !== 'not_delivered')
                          .reduce((s, o) => s + (o.total || 0), 0)
    const productCost = mo.reduce((s, o) => s + (o.product_cost || 0), 0)
    const hayyakFees  = mo.filter(o => ['delivered', 'not_delivered'].includes(o.status) || o.is_replacement)
                          .reduce((s, o) => s + (o.hayyak_fee || 0), 0)
    const grossProfit = mo.reduce((s, o) => s + (o.gross_profit || 0), 0)
    const opExpenses  = me.reduce((s, e) => s + (e.amount || 0), 0)
    const netProfit   = grossProfit - opExpenses
    const cashReceived = mr.reduce((s, r) => s + (r.bank_received || 0), 0)

    return {
      key, label: monthLabel(key),
      revenue, productCost, hayyakFees, grossProfit,
      opExpenses, netProfit, cashReceived,
      orders_count: mo.length,
      delivered: mo.filter(o => o.status === 'delivered').length,
    }
  })

  const totals = rows.reduce((t, r) => ({
    revenue: t.revenue + r.revenue,
    productCost: t.productCost + r.productCost,
    hayyakFees: t.hayyakFees + r.hayyakFees,
    grossProfit: t.grossProfit + r.grossProfit,
    opExpenses: t.opExpenses + r.opExpenses,
    netProfit: t.netProfit + r.netProfit,
    cashReceived: t.cashReceived + r.cashReceived,
    orders_count: t.orders_count + r.orders_count,
    delivered: t.delivered + r.delivered,
  }), { revenue:0, productCost:0, hayyakFees:0, grossProfit:0, opExpenses:0, netProfit:0, cashReceived:0, orders_count:0, delivered:0 })

  return { rows, totals }
}
