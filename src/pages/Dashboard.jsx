import React, { useState, useEffect } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { StatCard, Card, Badge, Spinner, Empty } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcAlert, IcArrowLeft } from '../components/Icons'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [lowStock, setLowStock] = useState([])
  const [target, setTarget] = useState(50000)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [orders, expenses, inventory, business, statusList] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at' }),
        DB.list('expenses', { orderBy: 'date' }),
        DB.list('inventory'),
        Settings.get('business'),
        Settings.get('statuses'),
      ])

      if (business?.monthly_target) setTarget(business.monthly_target)
      if (statusList) setStatuses(statusList)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart)
      const monthExpenses = expenses.filter(e => new Date(e.date) >= monthStart)

      const revenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0)
      const profit = monthOrders.reduce((s, o) => s + (o.profit || 0), 0)
      const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0)

      setStats({
        totalOrders: monthOrders.length,
        revenue,
        profit: profit - totalExpenses,
        avgOrder: monthOrders.length ? revenue / monthOrders.length : 0,
        delivered: monthOrders.filter(o => o.status === 'delivered').length,
        returned: monthOrders.filter(o => o.status === 'returned').length,
        pending: monthOrders.filter(o => !['delivered', 'returned', 'cancelled'].includes(o.status)).length,
      })

      setRecentOrders(orders.slice(-8).reverse())
      setLowStock(inventory.filter(i => i.stock_qty <= i.low_stock_threshold && i.active))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36} />
    </div>
  )

  const progressPct = Math.min(100, ((stats?.revenue || 0) / target) * 100)

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>الرئيسية</h1>
          <p style={{ color: 'var(--text-sec)', marginTop: 4, fontSize: 13 }}>
            {new Date().toLocaleDateString('ar-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Monthly Target Progress */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>هدف الشهر</span>
          <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>
            {formatCurrency(stats?.revenue || 0)} / {formatCurrency(target)}
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            borderRadius: 99,
            background: progressPct >= 100
              ? 'var(--green)'
              : `linear-gradient(90deg, var(--teal), var(--violet))`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ textAlign: 'left', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          {progressPct.toFixed(0)}% من الهدف
        </div>
      </Card>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="طلبات الشهر" value={stats?.totalOrders || 0} icon={<IcOrders size={18} />} color="var(--teal)" />
        <StatCard label="إجمالي المبيعات" value={formatCurrency(stats?.revenue || 0)} icon={<IcTrendUp size={18} />} color="var(--green)" />
        <StatCard label="صافي الربح" value={formatCurrency(stats?.profit || 0)} icon={<IcTrendUp size={18} />} color="var(--gold)" />
        <StatCard label="طلبات معلقة" value={stats?.pending || 0} icon={<IcPackage size={18} />} color="var(--amber)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="تم التسليم" value={stats?.delivered || 0} color="var(--green)" />
        <StatCard label="مرتجعات" value={stats?.returned || 0} color="var(--red)" />
        <StatCard label="متوسط الطلب" value={formatCurrency(stats?.avgOrder || 0)} color="var(--blue)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Orders */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>آخر الطلبات</span>
            <button
              onClick={() => onNavigate('orders')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)', fontWeight: 600 }}
            >
              عرض الكل <IcArrowLeft size={14} />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <Empty title="لا يوجد طلبات بعد" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentOrders.map(order => {
                const statusObj = statuses.find(s => s.id === order.status)
                return (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{order.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.order_number}</div>
                    </div>
                    <Badge color={statusObj?.color || '#6b7280'} style={{ fontSize: 11 }}>
                      {statusObj?.label || order.status}
                    </Badge>
                    <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <Card style={{ gridColumn: '1 / -1', borderColor: 'rgba(245,158,11,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IcAlert size={18} color="var(--amber)" />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--amber)' }}>تنبيه: مخزون منخفض</span>
              <Badge color="var(--amber)">{lowStock.length}</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lowStock.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <span style={{ fontSize: 13 }}>{item.name}</span>
                  <Badge color="var(--amber)">{item.stock_qty} متبقي</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
