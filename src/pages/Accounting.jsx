import React, { useState, useEffect } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Card, StatCard, Spinner, PageHeader, Tabs } from '../components/ui'

export default function Accounting() {
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [capital, setCapital] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [settlements, setSettlements] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pnl')

  useEffect(() => {
    Promise.all([
      DB.list('orders', { orderBy: 'created_at' }),
      DB.list('expenses', { orderBy: 'date' }),
      DB.list('capital_entries', { orderBy: 'date' }),
      DB.list('withdrawals', { orderBy: 'date' }),
      DB.list('settlements', { orderBy: 'date' }),
      Settings.get('partners'),
    ]).then(([o, e, c, w, s, p]) => {
      setOrders(o)
      setExpenses(e)
      setCapital(c)
      setWithdrawals(w)
      setSettlements(s)
      setPartners(p || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36} />
    </div>
  )

  const TABS = [
    { id: 'pnl', label: 'الأرباح والخسائر' },
    { id: 'cashflow', label: 'التدفق النقدي' },
    { id: 'capital', label: 'رأس المال' },
    { id: 'salaries', label: 'الرواتب' },
    { id: 'balance', label: 'الميزانية' },
  ]

  return (
    <div className="page">
      <PageHeader title="المحاسبة" subtitle="التقارير المالية الشاملة" />
      <div style={{ marginBottom: 24 }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'pnl' && <PnLTab orders={orders} expenses={expenses} />}
      {tab === 'cashflow' && <CashFlowTab orders={orders} expenses={expenses} />}
      {tab === 'capital' && <CapitalTab capital={capital} partners={partners} />}
      {tab === 'salaries' && <SalariesTab withdrawals={withdrawals} partners={partners} />}
      {tab === 'balance' && <BalanceTab orders={orders} expenses={expenses} capital={capital} withdrawals={withdrawals} />}
    </div>
  )
}

// ── P&L TAB ──────────────────────────────────────────────────
function PnLTab({ orders, expenses }) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthOrders = orders.filter(o => {
      const od = new Date(o.created_at)
      return od >= d && od <= end
    })
    const monthExpenses = expenses.filter(e => {
      const ed = new Date(e.date)
      return ed >= d && ed <= end
    })
    const revenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0)
    const grossProfit = monthOrders.reduce((s, o) => s + (o.profit || 0), 0)
    const exp = monthExpenses.reduce((s, e) => s + e.amount, 0)
    months.push({
      label: d.toLocaleDateString('ar-AE', { month: 'short', year: '2-digit' }),
      revenue,
      grossProfit,
      expenses: exp,
      netProfit: grossProfit - exp,
    })
  }

  const totRevenue = months.reduce((s, m) => s + m.revenue, 0)
  const totGross = months.reduce((s, m) => s + m.grossProfit, 0)
  const totExp = months.reduce((s, m) => s + m.expenses, 0)
  const totNet = months.reduce((s, m) => s + m.netProfit, 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي الإيرادات" value={formatCurrency(totRevenue)} color="var(--teal)" />
        <StatCard label="إجمالي المصاريف" value={formatCurrency(totExp)} color="var(--red)" />
        <StatCard label="صافي الربح" value={formatCurrency(totNet)} color={totNet >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="هامش الربح" value={`${totRevenue > 0 ? ((totNet / totRevenue) * 100).toFixed(1) : 0}%`} color="var(--amber)" />
      </div>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>آخر 6 أشهر</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['الشهر', 'الإيرادات', 'الربح الإجمالي', 'المصاريف', 'صافي الربح'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-sec)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.label}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--teal)' }}>{formatCurrency(m.revenue)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--green)' }}>{formatCurrency(m.grossProfit)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--red)' }}>{formatCurrency(m.expenses)}</td>
                  <td style={{ padding: '10px 12px', color: m.netProfit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{formatCurrency(m.netProfit)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--bg-surface)', fontWeight: 700 }}>
                <td style={{ padding: '10px 12px' }}>الإجمالي</td>
                <td style={{ padding: '10px 12px', color: 'var(--teal)' }}>{formatCurrency(totRevenue)}</td>
                <td style={{ padding: '10px 12px', color: 'var(--green)' }}>{formatCurrency(totGross)}</td>
                <td style={{ padding: '10px 12px', color: 'var(--red)' }}>{formatCurrency(totExp)}</td>
                <td style={{ padding: '10px 12px', color: totNet >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(totNet)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── CASH FLOW TAB ─────────────────────────────────────────────
function CashFlowTab({ orders, expenses }) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const mo = orders.filter(o => { const od = new Date(o.created_at); return od >= d && od <= end })
    const me = expenses.filter(e => { const ed = new Date(e.date); return ed >= d && ed <= end })
    const inflow = mo.reduce((s, o) => s + (o.total || 0), 0)
    const outflow = me.reduce((s, e) => s + e.amount, 0)
    months.push({ label: d.toLocaleDateString('ar-AE', { month: 'short' }), inflow, outflow, net: inflow - outflow })
  }

  const maxVal = Math.max(...months.map(m => Math.max(m.inflow, m.outflow)), 1)

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>التدفق النقدي — آخر 6 أشهر</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 140 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', display: 'flex', gap: 4, alignItems: 'flex-end', height: 110 }}>
                <div style={{ flex: 1, background: 'var(--teal)', borderRadius: '3px 3px 0 0', height: `${(m.inflow / maxVal) * 100}%`, minHeight: m.inflow > 0 ? 4 : 0, opacity: 0.85 }} title={`دخل: ${formatCurrency(m.inflow)}`} />
                <div style={{ flex: 1, background: 'var(--red)', borderRadius: '3px 3px 0 0', height: `${(m.outflow / maxVal) * 100}%`, minHeight: m.outflow > 0 ? 4 : 0, opacity: 0.85 }} title={`صرف: ${formatCurrency(m.outflow)}`} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--teal)' }} /> دخل
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--red)' }} /> صرف
          </span>
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['الشهر', 'الدخل', 'الصرف', 'الصافي'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-sec)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.label}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--teal)' }}>{formatCurrency(m.inflow)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--red)' }}>{formatCurrency(m.outflow)}</td>
                  <td style={{ padding: '10px 12px', color: m.net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{formatCurrency(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── CAPITAL TAB ───────────────────────────────────────────────
function CapitalTab({ capital, partners }) {
  const totalCapital = capital.reduce((s, c) => s + (c.type === 'deposit' ? c.amount : -c.amount), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي رأس المال" value={formatCurrency(totalCapital)} color="var(--teal)" />
        <StatCard label="عدد القيود" value={capital.length} color="var(--violet)" />
      </div>

      {partners.map(name => {
        const partnerCap = capital.filter(c => c.partner_name === name)
        const total = partnerCap.reduce((s, c) => s + (c.type === 'deposit' ? c.amount : -c.amount), 0)
        return (
          <Card key={name} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span>
              <span style={{ fontWeight: 800, color: total >= 0 ? 'var(--teal)' : 'var(--red)', fontSize: 16 }}>{formatCurrency(total)}</span>
            </div>
            {partnerCap.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا يوجد قيود</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {partnerCap.slice(-5).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-sec)' }}>{new Date(c.date).toLocaleDateString('ar-AE')}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.notes || (c.type === 'deposit' ? 'إيداع' : 'سحب')}</span>
                    <span style={{ fontWeight: 700, color: c.type === 'deposit' ? 'var(--green)' : 'var(--red)' }}>
                      {c.type === 'deposit' ? '+' : '-'}{formatCurrency(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── SALARIES TAB ──────────────────────────────────────────────
function SalariesTab({ withdrawals, partners }) {
  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)
  const byType = {
    salary: withdrawals.filter(w => w.type === 'salary').reduce((s, w) => s + w.amount, 0),
    personal: withdrawals.filter(w => w.type === 'personal').reduce((s, w) => s + w.amount, 0),
    dividend: withdrawals.filter(w => w.type === 'dividend').reduce((s, w) => s + w.amount, 0),
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي المسحوبات" value={formatCurrency(totalWithdrawals)} color="var(--red)" />
        <StatCard label="رواتب" value={formatCurrency(byType.salary)} color="var(--amber)" />
        <StatCard label="مسحوبات شخصية" value={formatCurrency(byType.personal)} color="var(--violet)" />
        <StatCard label="أرباح موزعة" value={formatCurrency(byType.dividend)} color="var(--amber)" />
      </div>

      {partners.map(name => {
        const pw = withdrawals.filter(w => w.partner_name === name)
        const total = pw.reduce((s, w) => s + w.amount, 0)
        return (
          <Card key={name} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span>
              <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 16 }}>{formatCurrency(total)}</span>
            </div>
            {pw.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا يوجد مسحوبات</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pw.slice(-5).map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-sec)' }}>{new Date(w.date).toLocaleDateString('ar-AE')}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{w.type === 'salary' ? 'راتب' : w.type === 'dividend' ? 'أرباح' : 'شخصي'}</span>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(w.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── BALANCE SHEET TAB ─────────────────────────────────────────
function BalanceTab({ orders, expenses, capital, withdrawals }) {
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
  const totalCost = orders.reduce((s, o) => s + (o.cost || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalCapital = capital.reduce((s, c) => s + (c.type === 'deposit' ? c.amount : -c.amount), 0)
  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)
  const grossProfit = orders.reduce((s, o) => s + (o.profit || 0), 0)
  const netProfit = grossProfit - totalExpenses

  const assets = totalRevenue + totalCapital
  const liabilities = totalCost + totalExpenses + totalWithdrawals
  const equity = assets - liabilities

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--teal)', marginBottom: 16 }}>الأصول</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'إجمالي الإيرادات', value: totalRevenue },
              { label: 'رأس المال', value: totalCapital },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{formatCurrency(row.value)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 15, fontWeight: 800 }}>
              <span>إجمالي الأصول</span>
              <span style={{ color: 'var(--teal)' }}>{formatCurrency(assets)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)', marginBottom: 16 }}>الخصوم والالتزامات</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'تكلفة البضاعة', value: totalCost },
              { label: 'المصاريف التشغيلية', value: totalExpenses },
              { label: 'المسحوبات', value: totalWithdrawals },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(row.value)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 15, fontWeight: 800 }}>
              <span>إجمالي الخصوم</span>
              <span style={{ color: 'var(--red)' }}>{formatCurrency(liabilities)}</span>
            </div>
          </div>
        </Card>

        <Card style={{ gridColumn: '1 / -1', borderColor: equity >= 0 ? 'rgba(0,228,184,0.4)' : 'rgba(255,71,87,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>صافي حقوق الملكية</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>الأصول − الخصوم</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: equity >= 0 ? 'var(--teal)' : 'var(--red)' }}>
              {formatCurrency(equity)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
