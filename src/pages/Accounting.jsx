import React, { useState, useEffect, useMemo } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Spinner, PageHeader, toast } from '../components/ui'

/* ═══════════════════════════════════════════════════════════
   ACCOUNTING v8.5 — Mawj Crystal Gifts
   ─────────────────────────────────────────────────────────
   DATA SOURCES (all from Supabase):
     orders             → revenue, product cost, hayyak fees, gross profit
     hayyak_remittances → actual cash received from Hayyak
     expenses           → operating costs (incl. auto transfer fees)
     capital_entries    → partner deposits
     withdrawals        → partner withdrawals
     settings.partners  → partner list (Ibrahim 50%, Ihsan 50%)

   4 TABS:
     Tab 1: P&L
       Revenue (COD orders only)
       − Product cost
       − Hayyak delivery fees
       = Gross Profit
       − Operating expenses
       = Net Profit

     Tab 2: Cash Position
       Bank received from Hayyak (remittances)
       + Capital deposits
       − Expenses paid from company account
       − Partner withdrawals
       = Estimated cash in bank

     Tab 3: Partner Equity
       Per partner: capital + 50% net profit − withdrawals − unreimbursed expenses

     Tab 4: Monthly
       Month-by-month table exportable view
═══════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'pnl',      label: 'الأرباح والخسائر' },
  { id: 'cash',     label: 'الوضع النقدي' },
  { id: 'partners', label: 'حقوق الشركاء' },
  { id: 'monthly',  label: 'شهري' },
]

export default function Accounting() {
  const [orders,      setOrders]      = useState([])
  const [remittances, setRemittances] = useState([])
  const [expenses,    setExpenses]    = useState([])
  const [capital,     setCapital]     = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [partners,    setPartners]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('pnl')
  const [monthFilter, setMonthFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      DB.list('orders',              { orderBy: 'created_at' }),
      DB.list('hayyak_remittances',  { orderBy: 'date' }),
      DB.list('expenses',            { orderBy: 'date' }),
      DB.list('capital_entries',     { orderBy: 'date' }),
      DB.list('withdrawals',         { orderBy: 'date' }),
      Settings.get('partners'),
    ]).then(([o, r, e, c, w, p]) => {
      setOrders(o)
      setRemittances(r)
      setExpenses(e)
      setCapital(c)
      setWithdrawals(w)
      setPartners(p || [{ id:'p_001', name:'إبراهيم', share:50 }, { id:'p_002', name:'إحسان', share:50 }])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Spinner size={36}/>
    </div>
  )

  return (
    <div className="page">
      <PageHeader title="المحاسبة" subtitle="التقارير المالية"/>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 6px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab === t.id ? 'linear-gradient(135deg,var(--action),var(--action-deep))' : 'transparent',
            color: tab === t.id ? '#ffffff' : 'var(--text-muted)',
            fontWeight: tab === t.id ? 800 : 500, fontSize:12,
            fontFamily:'inherit', transition:'all 0.2s', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'pnl'      && <PnLTab      orders={orders} expenses={expenses} monthFilter={monthFilter} setMonthFilter={setMonthFilter}/>}
      {tab === 'cash'     && <CashTab     orders={orders} remittances={remittances} expenses={expenses} capital={capital} withdrawals={withdrawals}/>}
      {tab === 'partners' && <PartnersTab orders={orders} expenses={expenses} capital={capital} withdrawals={withdrawals} partners={partners}/>}
      {tab === 'monthly'  && <MonthlyTab  orders={orders} expenses={expenses} remittances={remittances}/>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function monthKey(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('ar-AE', { month: 'long', year: 'numeric' })
}

function getMonthKeys(orders, expenses, remittances) {
  const keys = new Set()
  orders.forEach(o => keys.add(monthKey(o.created_at)))
  expenses.forEach(e => keys.add(monthKey(e.date)))
  remittances.forEach(r => keys.add(monthKey(r.date)))
  return [...keys].filter(Boolean).sort().reverse()
}

function filterByMonth(items, dateField, key) {
  if (key === 'all') return items
  return items.filter(i => monthKey(i[dateField]) === key)
}

function SectionRow({ label, value, sub, color, indent, bold, border }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding: `${indent ? 8 : 12}px ${indent ? 24 : 0}px`,
      borderTop: border ? '1px solid var(--border)' : 'none',
      marginTop: border ? 8 : 0,
    }}>
      <div>
        <div style={{ fontSize: indent ? 13 : 14, fontWeight: bold ? 800 : 500, color: color || 'var(--text)' }}>
          {label}
        </div>
        {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily:'Inter,sans-serif', fontWeight: bold ? 800 : 600, fontSize: indent ? 13 : 15, color: color || 'var(--text)', textAlign:'left', minWidth:100 }}>
        {value}
      </div>
    </div>
  )
}

function PnLSection({ children, style }) {
  return (
    <div style={{
      background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'4px 16px 12px',
      boxShadow:'var(--card-shadow)', marginBottom:12, ...style
    }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TAB 1: P&L
───────────────────────────────────────────────────────── */
function PnLTab({ orders, expenses, monthFilter, setMonthFilter }) {
  const monthKeys = getMonthKeys(orders, expenses, [])

  const filteredOrders   = filterByMonth(orders,   'created_at', monthFilter)
  const filteredExpenses = filterByMonth(expenses,  'date',       monthFilter)

  // Only count non-cancelled orders
  const activeOrders = filteredOrders.filter(o => o.status !== 'cancelled')

  // FIX: Use total (post-discount) for revenue, not subtotal
  const revenue      = activeOrders.filter(o => !o.is_replacement && o.status !== 'not_delivered')
                                   .reduce((s, o) => s + (o.total || 0), 0)
  const discount     = activeOrders.reduce((s, o) => s + (o.discount || 0), 0)
  const netRevenue   = revenue - discount
  const productCost  = activeOrders.reduce((s, o) => s + (o.product_cost || 0), 0)
  const hayyakFees   = activeOrders.filter(o => ['delivered','not_delivered'].includes(o.status) || o.is_replacement)
                                   .reduce((s, o) => s + (o.hayyak_fee || 25), 0)
  const grossProfit  = activeOrders.reduce((s, o) => s + (o.gross_profit || 0), 0)

  // Expenses split
  const opExpenses   = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const transferFees = filteredExpenses.filter(e => e.category === 'رسوم تحويل حياك').reduce((s, e) => s + (e.amount || 0), 0)
  const otherExp     = opExpenses - transferFees

  const netProfit    = grossProfit - opExpenses
  const margin       = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : '0'

  // Counts
  const delivered      = activeOrders.filter(o => o.status === 'delivered').length
  const notDelivered   = activeOrders.filter(o => o.status === 'not_delivered').length
  const replacements   = activeOrders.filter(o => o.is_replacement).length

  return (
    <div>
      {/* Month filter */}
      <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {[{ key:'all', label:'كل الوقت' }, ...monthKeys.map(k => ({ key:k, label:monthLabel(k) }))].map(m => (
          <button key={m.key} onClick={() => setMonthFilter(m.key)} style={{
            padding:'6px 12px', flexShrink:0, borderRadius:'var(--r-pill)', border:'none',
            background: monthFilter === m.key ? 'var(--action-soft)' : 'var(--bg-surface)',
            color: monthFilter === m.key ? 'var(--action)' : 'var(--text-muted)',
            fontWeight: monthFilter === m.key ? 700 : 500, fontSize:12,
            cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
          }}>{m.label}</button>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'إيرادات',     value: formatCurrency(netRevenue), color:'var(--action)' },
          { label:'ربح إجمالي', value: formatCurrency(grossProfit), color: grossProfit >= 0 ? 'var(--action)' : 'var(--danger)' },
          { label:'مصاريف',     value: formatCurrency(opExpenses),  color:'var(--danger)' },
          { label:'صافي الربح', value: formatCurrency(netProfit),   color: netProfit >= 0 ? 'var(--action)' : 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
            <div style={{ fontSize:11, fontWeight:800, color:s.color, fontFamily:'Inter,sans-serif', lineHeight:1.3 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* P&L Statement */}
      <PnLSection>
        <div style={{ padding:'12px 0 6px', fontWeight:800, fontSize:13, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>الإيرادات</div>
        <SectionRow label="مبيعات المنتجات"                    value={formatCurrency(revenue)}      color="var(--text)"     indent/>
        {discount > 0 && <SectionRow label="خصومات"           value={`−${formatCurrency(discount)}`} color="var(--danger)" indent/>}
        <SectionRow label="صافي الإيرادات" value={formatCurrency(netRevenue)} color="var(--action)" bold border/>
      </PnLSection>

      <PnLSection>
        <div style={{ padding:'12px 0 6px', fontWeight:800, fontSize:13, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>تكاليف المبيعات</div>
        <SectionRow label="تكلفة المنتجات (COGS)"             value={`−${formatCurrency(productCost)}`} color="var(--danger)" indent/>
        <SectionRow label="رسوم توصيل حياك"                   value={`−${formatCurrency(hayyakFees)}`}  color="var(--danger)" indent
          sub={`${delivered} مسلّم • ${notDelivered} لم يتم • ${replacements} استبدال`}/>
        <SectionRow label="الربح الإجمالي" value={formatCurrency(grossProfit)} color={grossProfit >= 0 ? 'var(--action)' : 'var(--danger)'} bold border/>
      </PnLSection>

      <PnLSection>
        <div style={{ padding:'12px 0 6px', fontWeight:800, fontSize:13, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>المصاريف التشغيلية</div>
        {transferFees > 0 && <SectionRow label="رسوم تحويل بنكي (حياك)" value={`−${formatCurrency(transferFees)}`} color="var(--danger)" indent/>}
        {otherExp > 0 && <SectionRow label="مصاريف أخرى"                 value={`−${formatCurrency(otherExp)}`}     color="var(--danger)" indent/>}
        <SectionRow label="إجمالي المصاريف" value={`−${formatCurrency(opExpenses)}`} color="var(--danger)" bold border/>
      </PnLSection>

      {/* Net Profit highlight */}
      <div style={{
        padding:'16px 20px', borderRadius:'var(--r-md)',
        background: netProfit >= 0 ? 'rgba(56,189,248,0.08)' : 'rgba(239,68,68,0.08)',
        border:`2px solid ${netProfit >= 0 ? 'rgba(56,189,248,0.3)' : 'rgba(239,68,68,0.3)'}`,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:12,
      }}>
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>صافي الربح</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>هامش الربح: {margin}%</div>
        </div>
        <div style={{ fontSize:26, fontWeight:900, color: netProfit >= 0 ? 'var(--action)' : 'var(--danger)', fontFamily:'Inter,sans-serif' }}>
          {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TAB 2: CASH POSITION
───────────────────────────────────────────────────────── */
function CashTab({ orders, remittances, expenses, capital, withdrawals }) {
  // Cash IN
  const bankFromHayyak  = remittances.reduce((s, r) => s + (r.bank_received   || 0), 0)
  const capitalDeposits = capital.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
  const totalIn         = bankFromHayyak + capitalDeposits

  // Cash OUT
  const companyExpenses = expenses.filter(e => e.paid_by === 'company' || !e.paid_by)
                                  .reduce((s, e) => s + (e.amount || 0), 0)
  const totalWithdraw   = withdrawals.reduce((s, w) => s + (w.amount || 0), 0)
  const capitalWithdraw = capital.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)
  const totalOut        = companyExpenses + totalWithdraw + capitalWithdraw

  // Unreimbursed personal expenses (company owes partners)
  const unreimbursed = expenses
    .filter(e => e.paid_by && e.paid_by !== 'company' && !e.reimbursed)
    .reduce((s, e) => s + (e.amount || 0), 0)

  // FIX: Subtract unreimbursed as pending liability
  const estimatedCash   = totalIn - totalOut - unreimbursed

  // Pending (not yet received but owed by Hayyak)
  const pendingCOD = orders
    .filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
    .reduce((s, o) => s + (o.total || 0), 0)
  const pendingHayyakFees = orders
    .filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
    .reduce((s, o) => s + (o.hayyak_fee || 25), 0)
  const expectedFromHayyak = pendingCOD - pendingHayyakFees

  return (
    <div>
      {/* Cash balance highlight */}
      <div style={{
        padding:'20px', borderRadius:'var(--r-md)',
        background: estimatedCash >= 0 ? 'rgba(56,189,248,0.06)' : 'rgba(239,68,68,0.06)',
        border:`2px solid ${estimatedCash >= 0 ? 'rgba(56,189,248,0.25)' : 'rgba(239,68,68,0.25)'}`,
        marginBottom:16, textAlign:'center',
      }}>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>الرصيد التقديري في البنك</div>
        <div style={{ fontSize:36, fontWeight:900, color: estimatedCash >= 0 ? 'var(--action)' : 'var(--danger)', fontFamily:'Inter,sans-serif' }}>
          {formatCurrency(estimatedCash)}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
          بناءً على تحويلات حياك + رأس المال − المصاريف − المسحوبات
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        {/* Cash IN */}
        <PnLSection style={{ marginBottom:0 }}>
          <div style={{ padding:'12px 0 6px', fontWeight:800, fontSize:12, color:'var(--action)', letterSpacing:'0.06em', textTransform:'uppercase' }}>دخل نقدي</div>
          <SectionRow label="تحويلات حياك (فعلية)"   value={formatCurrency(bankFromHayyak)}  color="var(--action)" indent/>
          <SectionRow label="رأس مال مودع"            value={formatCurrency(capitalDeposits)} color="var(--action)" indent/>
          <SectionRow label="الإجمالي" value={formatCurrency(totalIn)} color="var(--action)" bold border/>
        </PnLSection>

        {/* Cash OUT */}
        <PnLSection style={{ marginBottom:0 }}>
          <div style={{ padding:'12px 0 6px', fontWeight:800, fontSize:12, color:'var(--danger)', letterSpacing:'0.06em', textTransform:'uppercase' }}>صرف نقدي</div>
          <SectionRow label="مصاريف من حساب الشركة"   value={formatCurrency(companyExpenses)} color="var(--danger)" indent/>
          <SectionRow label="مسحوبات الشركاء"         value={formatCurrency(totalWithdraw)}   color="var(--danger)" indent/>
          {capitalWithdraw > 0 && <SectionRow label="سحب رأس المال" value={formatCurrency(capitalWithdraw)} color="var(--danger)" indent/>}
          <SectionRow label="الإجمالي" value={formatCurrency(totalOut)} color="var(--danger)" bold border/>
        </PnLSection>
      </div>

      {/* Pending */}
      {expectedFromHayyak > 0 && (
        <div style={{ padding:'14px 16px', background:'rgba(245,158,11,0.06)', border:'1.5px solid rgba(245,158,11,0.25)', borderRadius:'var(--r-md)', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'#f59e0b', marginBottom:8 }}>⏳ في الطريق من حياك</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px' }}>
            <span style={{ fontSize:13, color:'var(--text-sec)' }}>COD المعلق: <b style={{ fontFamily:'Inter,sans-serif', color:'var(--text)' }}>{formatCurrency(pendingCOD)}</b></span>
            <span style={{ fontSize:13, color:'var(--text-sec)' }}>رسوم حياك: <b style={{ fontFamily:'Inter,sans-serif', color:'var(--danger)' }}>−{formatCurrency(pendingHayyakFees)}</b></span>
            <span style={{ fontSize:14, fontWeight:800, color:'#f59e0b', fontFamily:'Inter,sans-serif' }}>المتوقع: {formatCurrency(expectedFromHayyak)}</span>
          </div>
        </div>
      )}

      {/* Unreimbursed personal expenses */}
      {unreimbursed > 0 && (
        <div style={{ padding:'14px 16px', background:'rgba(167,139,250,0.06)', border:'1.5px solid rgba(167,139,250,0.2)', borderRadius:'var(--r-md)' }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--info-light)', marginBottom:6 }}>مصاريف شخصية غير مسترجعة</div>
          <div style={{ fontSize:13, color:'var(--text-sec)' }}>
            الشركة مدينة للشركاء بـ <b style={{ fontFamily:'Inter,sans-serif', color:'var(--info-light)' }}>{formatCurrency(unreimbursed)}</b>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TAB 3: PARTNER EQUITY
───────────────────────────────────────────────────────── */
function PartnersTab({ orders, expenses, capital, withdrawals, partners }) {
  // Net profit (same as P&L, all time)
  const activeOrders  = orders.filter(o => o.status !== 'cancelled')
  const grossProfit   = activeOrders.reduce((s, o) => s + (o.gross_profit || 0), 0)
  const opExpenses    = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netProfit     = grossProfit - opExpenses

  return (
    <div>
      {/* Net profit split summary */}
      <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:16, boxShadow:'var(--card-shadow)' }}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>توزيع الأرباح (50% / 50%)</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px' }}>
          <span style={{ fontSize:13, color:'var(--text-sec)' }}>صافي الربح الكلي: <b style={{ color: netProfit >= 0 ? 'var(--action)' : 'var(--danger)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(netProfit)}</b></span>
          <span style={{ fontSize:13, color:'var(--text-sec)' }}>نصيب كل شريك: <b style={{ color: netProfit >= 0 ? 'var(--action)' : 'var(--danger)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(netProfit / 2)}</b></span>
        </div>
      </div>

      {/* Per-partner cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {partners.map(partner => {
          const share       = (partner.share || 50) / 100
          const myCapital   = capital.filter(c => c.partner_id === partner.id || c.partner_name === partner.name)
          const myWithdraw  = withdrawals.filter(w => w.partner_id === partner.id || w.partner_name === partner.name)
          const myExpenses  = expenses.filter(e =>
            (e.paid_by === 'ibrahim' && partner.name === 'إبراهيم') ||
            (e.paid_by === 'ihsan'   && partner.name === 'إحسان')
          )

          const capitalIn     = myCapital.filter(c => c.type === 'deposit').reduce((s, c) => s + (c.amount || 0), 0)
          const capitalOut    = myCapital.filter(c => c.type === 'withdrawal').reduce((s, c) => s + (c.amount || 0), 0)
          // FIX: Exclude reimbursement withdrawals — unreimbursed tracking already handles it
          const totalWithdraw = myWithdraw.filter(w => w.type !== 'reimbursement').reduce((s, w) => s + (w.amount || 0), 0)
          const profitShare   = netProfit * share
          const expensePaid   = myExpenses.reduce((s, e) => s + (e.amount || 0), 0)
          const reimbursed    = myExpenses.filter(e => e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0)
          const unreimbursed  = expensePaid - reimbursed
          const netEquity     = capitalIn - capitalOut + profitShare - totalWithdraw + unreimbursed

          return (
            <div key={partner.id} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', overflow:'hidden', boxShadow:'var(--card-shadow)' }}>
              {/* Header */}
              <div style={{ padding:'14px 16px', background: netEquity >= 0 ? 'rgba(56,189,248,0.06)' : 'rgba(239,68,68,0.06)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16 }}>{partner.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{partner.share}% من الأرباح</div>
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>صافي حقوق الملكية</div>
                  <div style={{ fontSize:24, fontWeight:900, color: netEquity >= 0 ? 'var(--action)' : 'var(--danger)', fontFamily:'Inter,sans-serif' }}>
                    {formatCurrency(netEquity)}
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ padding:'8px 16px 12px' }}>
                <SectionRow label="رأس مال مودع"          value={`+${formatCurrency(capitalIn)}`}     color="var(--action)"  indent/>
                {capitalOut > 0 && <SectionRow label="سحب رأس مال" value={`−${formatCurrency(capitalOut)}`} color="var(--danger)" indent/>}
                <SectionRow label={`حصة من الأرباح (${partner.share}%)`} value={`${profitShare >= 0 ? '+' : ''}${formatCurrency(profitShare)}`} color={profitShare >= 0 ? 'var(--action)' : 'var(--danger)'} indent/>
                {totalWithdraw > 0 && <SectionRow label="مسحوبات"    value={`−${formatCurrency(totalWithdraw)}`}  color="var(--danger)" indent/>}
                {expensePaid > 0 && (
                  <>
                    <SectionRow label="مصاريف دفعها شخصياً" value={`+${formatCurrency(expensePaid)}`} color="var(--info-light)" indent
                      sub={reimbursed > 0 ? `مسترجع: ${formatCurrency(reimbursed)}` : undefined}/>
                  </>
                )}
                {unreimbursed > 0 && (
                  <div style={{ padding:'8px 16px', background:'rgba(167,139,250,0.06)', borderRadius:'var(--r-sm)', margin:'4px 0', fontSize:12, color:'var(--info-light)' }}>
                    الشركة مدينة لك بـ {formatCurrency(unreimbursed)} (مصاريف غير مسترجعة)
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TAB 4: MONTHLY BREAKDOWN
───────────────────────────────────────────────────────── */
function MonthlyTab({ orders, expenses, remittances }) {
  const keys = getMonthKeys(orders, expenses, remittances)

  const rows = keys.map(key => {
    const mo = filterByMonth(orders,      'created_at', key).filter(o => o.status !== 'cancelled')
    const me = filterByMonth(expenses,    'date',        key)
    const mr = filterByMonth(remittances, 'date',        key)

    // FIX: Use total (post-discount) for revenue
    const revenue     = mo.filter(o => !o.is_replacement && o.status !== 'not_delivered').reduce((s, o) => s + (o.total || 0), 0)
    const productCost = mo.reduce((s, o) => s + (o.product_cost || 0), 0)
    const hayyakFees  = mo.reduce((s, o) => s + (o.hayyak_fee   || 0), 0)
    const grossProfit = mo.reduce((s, o) => s + (o.gross_profit || 0), 0)
    const opExpenses  = me.reduce((s, e) => s + (e.amount || 0), 0)
    const netProfit   = grossProfit - opExpenses
    const cashReceived= mr.reduce((s, r) => s + (r.bank_received || 0), 0)
    const orders_count= mo.length
    const delivered   = mo.filter(o => o.status === 'delivered').length

    return { key, label: monthLabel(key), revenue, productCost, hayyakFees, grossProfit, opExpenses, netProfit, cashReceived, orders_count, delivered }
  })

  const totals = rows.reduce((t, r) => ({
    revenue:      t.revenue      + r.revenue,
    productCost:  t.productCost  + r.productCost,
    hayyakFees:   t.hayyakFees   + r.hayyakFees,
    grossProfit:  t.grossProfit  + r.grossProfit,
    opExpenses:   t.opExpenses   + r.opExpenses,
    netProfit:    t.netProfit    + r.netProfit,
    cashReceived: t.cashReceived + r.cashReceived,
    orders_count: t.orders_count + r.orders_count,
    delivered:    t.delivered    + r.delivered,
  }), { revenue:0, productCost:0, hayyakFees:0, grossProfit:0, opExpenses:0, netProfit:0, cashReceived:0, orders_count:0, delivered:0 })

  const cols = [
    { key:'label',       label:'الشهر',         fmt: v => v,                   color: () => 'var(--text)' },
    { key:'orders_count',label:'طلبات',          fmt: v => v,                   color: () => 'var(--text-sec)' },
    { key:'revenue',     label:'الإيرادات',      fmt: formatCurrency,           color: () => 'var(--action)' },
    { key:'productCost', label:'تكلفة المنتج',   fmt: v => `−${formatCurrency(v)}`, color: () => 'var(--danger)' },
    { key:'hayyakFees',  label:'رسوم حياك',      fmt: v => `−${formatCurrency(v)}`, color: () => 'var(--danger)' },
    { key:'grossProfit', label:'ربح إجمالي',     fmt: formatCurrency,           color: v => v >= 0 ? 'var(--action)' : 'var(--danger)' },
    { key:'opExpenses',  label:'مصاريف',         fmt: v => `−${formatCurrency(v)}`, color: () => 'var(--danger)' },
    { key:'netProfit',   label:'صافي الربح',     fmt: formatCurrency,           color: v => v >= 0 ? 'var(--action)' : 'var(--danger)' },
    { key:'cashReceived',label:'نقد مستلم',      fmt: formatCurrency,           color: () => '#10b981' },
  ]

  if (rows.length === 0) {
    return <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>لا يوجد بيانات بعد</div>
  }

  return (
    <div>
      <div style={{ overflowX:'auto', borderRadius:'var(--r-md)', boxShadow:'var(--card-shadow)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:700, background:'var(--bg-surface)' }}>
          <thead>
            <tr style={{ background:'var(--bg-hover)' }}>
              {cols.map(c => (
                <th key={c.key} style={{ padding:'10px 12px', textAlign:'right', color:'var(--text-muted)', fontWeight:700, whiteSpace:'nowrap', borderBottom:'1px solid var(--border)' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key} style={{ borderBottom:'1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding:'10px 12px', fontWeight: c.key === 'netProfit' ? 800 : c.key === 'label' ? 700 : 500, color: c.color(row[c.key]), fontFamily: c.key === 'label' ? 'inherit' : 'Inter,sans-serif', whiteSpace:'nowrap' }}>
                    {c.fmt(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            <tr style={{ background:'var(--bg-hover)', fontWeight:800, borderTop:'2px solid var(--border)' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:'12px', color: c.color(totals[c.key]), fontFamily: c.key === 'label' ? 'inherit' : 'Inter,sans-serif', whiteSpace:'nowrap', fontWeight:800 }}>
                  {c.key === 'label' ? 'الإجمالي' : c.fmt(totals[c.key])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
