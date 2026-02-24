import React, { useState, useEffect } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Card, StatCard, Spinner, PageHeader, Btn } from '../components/ui'
import { IcWhatsapp } from '../components/Icons'

function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59)
  return { start, end }
}

export default function Reports() {
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      DB.list('orders', { orderBy: 'created_at' }),
      DB.list('expenses', { orderBy: 'date' }),
      Settings.get('statuses'),
    ]).then(([o, e, s]) => {
      setOrders(o)
      setExpenses(e)
      setStatuses(s || [])
    }).finally(() => setLoading(false))
  }, [])

  const { start, end } = monthRange(selectedYear, selectedMonth)

  const monthOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    return d >= start && d <= end
  })

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d >= start && d <= end
  })

  const revenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0)
  const grossProfit = monthOrders.reduce((s, o) => s + (o.profit || 0), 0)
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = grossProfit - totalExpenses
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0

  // Daily data for bar chart
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const dailyData = []
  for (let i = 1; i <= daysInMonth; i++) {
    const dayOrders = monthOrders.filter(o => new Date(o.created_at).getDate() === i)
    dailyData.push({
      day: i,
      revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
      count: dayOrders.length,
    })
  }
  const maxDayRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  // Status breakdown
  const statusBreakdown = statuses.map(s => ({
    ...s,
    count: monthOrders.filter(o => o.status === s.id).length,
    revenue: monthOrders.filter(o => o.status === s.id).reduce((sum, o) => sum + (o.total || 0), 0),
  }))

  // Source breakdown
  const sourceMap = {}
  monthOrders.forEach(o => {
    if (!sourceMap[o.source]) sourceMap[o.source] = { count: 0, revenue: 0 }
    sourceMap[o.source].count++
    sourceMap[o.source].revenue += o.total || 0
  })
  const sourceBreakdown = Object.entries(sourceMap).sort((a, b) => b[1].count - a[1].count)

  // Top products
  const productMap = {}
  monthOrders.forEach(o => {
    ;(o.items || []).forEach(item => {
      if (!productMap[item.name]) productMap[item.name] = { name: item.name, qty: 0, revenue: 0 }
      productMap[item.name].qty += item.qty
      productMap[item.name].revenue += item.price * item.qty
    })
  })
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  function generateWhatsAppSummary() {
    const text =
      `📊 تقرير ${new Date(selectedYear, selectedMonth, 1).toLocaleDateString('ar-AE', { month: 'long', year: 'numeric' })}\n\n` +
      `💰 إجمالي المبيعات: ${formatCurrency(revenue)}\n` +
      `📦 عدد الطلبات: ${monthOrders.length}\n` +
      `✅ تم التسليم: ${monthOrders.filter(o => o.status === 'delivered').length}\n` +
      `↩ المرتجعات: ${monthOrders.filter(o => o.status === 'returned').length}\n` +
      `💵 صافي الربح: ${formatCurrency(netProfit)}\n` +
      `📈 هامش الربح: ${profitMargin}%`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36} />
    </div>
  )

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const SOURCE_LABELS = { instagram: 'إنستغرام', tiktok: 'تيك توك', website: 'الموقع', walk_in: 'زيارة', other: 'أخرى' }

  return (
    <div className="page">
      <PageHeader
        title="التقارير"
        actions={
          <Btn
            variant="ghost"
            onClick={generateWhatsAppSummary}
            style={{ color: '#25d166', borderColor: 'rgba(37,211,102,0.3)' }}
          >
            <IcWhatsapp size={15} /> ملخص واتساب
          </Btn>
        }
      />

      {/* Month/Year selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(parseInt(e.target.value))}
          style={{ padding: '8px 14px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer' }}
        >
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(parseInt(e.target.value))}
          style={{ padding: '8px 14px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer' }}
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="إجمالي المبيعات" value={formatCurrency(revenue)} color="var(--teal)" />
        <StatCard label="عدد الطلبات" value={monthOrders.length} color="var(--violet)" />
        <StatCard label="إجمالي المصاريف" value={formatCurrency(totalExpenses)} color="var(--red)" />
        <StatCard label="صافي الربح" value={formatCurrency(netProfit)} color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="هامش الربح" value={`${profitMargin}%`} color="var(--gold)" />
        <StatCard label="متوسط الطلب" value={formatCurrency(monthOrders.length ? revenue / monthOrders.length : 0)} color="var(--blue)" />
      </div>

      {/* Daily bar chart */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>المبيعات اليومية</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, overflowX: 'auto', paddingBottom: 4 }}>
          {dailyData.map(d => (
            <div
              key={d.day}
              title={`${d.day}: ${formatCurrency(d.revenue)} — ${d.count} طلب`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 12, cursor: 'pointer' }}
            >
              <div style={{
                width: '80%',
                height: d.revenue > 0 ? `${Math.max(4, (d.revenue / maxDayRevenue) * 84)}px` : '2px',
                background: d.revenue > 0 ? 'linear-gradient(180deg, var(--teal), var(--violet))' : 'var(--bg-border)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          <span>1</span>
          <span>{Math.floor(daysInMonth / 2)}</span>
          <span>{daysInMonth}</span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Status breakdown */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>توزيع الحالات</div>
          {statusBreakdown.filter(s => s.count > 0).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا يوجد طلبات</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {statusBreakdown.filter(s => s.count > 0).map(s => (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.label}
                    </span>
                    <span style={{ color: 'var(--text-sec)' }}>{s.count} طلب</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-border)', borderRadius: 99 }}>
                    <div style={{ width: `${(s.count / monthOrders.length) * 100}%`, height: '100%', background: s.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Source breakdown */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>مصادر الطلبات</div>
          {sourceBreakdown.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا يوجد بيانات</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sourceBreakdown.map(([src, data]) => (
                <div key={src}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span>{SOURCE_LABELS[src] || src}</span>
                    <span style={{ color: 'var(--text-sec)' }}>{data.count} طلب</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-border)', borderRadius: 99 }}>
                    <div style={{ width: `${(data.count / monthOrders.length) * 100}%`, height: '100%', background: 'var(--violet)', borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top products */}
        {topProducts.length > 0 && (
          <Card style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>أفضل المنتجات مبيعاً</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topProducts.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? 'var(--gold)' : 'var(--bg-border)', color: i === 0 ? '#07080f' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.qty} وحدة</div>
                  <div style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 14 }}>{formatCurrency(p.revenue)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
