import React, { useState, useEffect } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { StatCard, Card, Badge, Spinner, Empty } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcAlert, IcArrowLeft } from '../components/Icons'
import Sparkline from '../components/Sparkline'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [lowStock, setLowStock] = useState([])
  const [target, setTarget] = useState(50000)
  const [sparkData, setSparkData] = useState({ revenue:[], orders:[], profit:[] })

  useEffect(() => { loadData() }, [])

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

      // Build last-14-days sparkline data
      const days = 14
      const revByDay = [], ordByDay = [], profByDay = []
      for (let i = days-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i)
        const ds = d.toDateString()
        const dayOrds = orders.filter(o => new Date(o.created_at).toDateString()===ds)
        revByDay.push(dayOrds.reduce((s,o)=>s+(o.total||0),0))
        ordByDay.push(dayOrds.length)
        profByDay.push(dayOrds.reduce((s,o)=>s+(o.profit||0),0))
      }
      setSparkData({ revenue:revByDay, orders:ordByDay, profit:profByDay })

      setRecentOrders(orders.slice(-8).reverse())
      setLowStock(inventory.filter(i => i.stock_qty <= i.low_stock_threshold && i.active))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Spinner size={36} />
    </div>
  )

  const progressPct = Math.min(100, ((stats?.revenue||0)/target)*100)

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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:12, marginBottom:20 }} className="stagger">
        <StatCardWithSpark label="طلبات الشهر" value={stats?.totalOrders||0} icon={<IcOrders size={18}/>} color="var(--teal)" spark={sparkData.orders} sparkColor="#00e4b8" />
        <StatCardWithSpark label="إجمالي المبيعات" value={formatCurrency(stats?.revenue||0)} icon={<IcTrendUp size={18}/>} color="var(--green)" spark={sparkData.revenue} sparkColor="#10b981" />
        <StatCardWithSpark label="صافي الربح" value={formatCurrency(stats?.profit||0)} icon={<IcTrendUp size={18}/>} color="var(--gold)" spark={sparkData.profit} sparkColor="#e6b94a" />
        <StatCard label="طلبات معلقة" value={stats?.pending||0} icon={<IcPackage size={18}/>} color="var(--amber)" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12, marginBottom:24 }}>
        <StatCard label="تم التسليم" value={stats?.delivered||0} color="var(--green)" />
        <StatCard label="مرتجعات" value={stats?.returned||0} color="var(--red)" />
        <StatCard label="متوسط الطلب" value={formatCurrency(stats?.avgOrder||0)} color="var(--blue)" />
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

/* Stat card with sparkline chart */
function StatCardWithSpark({ label, value, color, icon, spark = [], sparkColor }) {
  return (
    <div style={{
      background:'var(--bg-glass)', backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
      border:'1.5px solid var(--bg-border)', borderRadius:'var(--radius)',
      padding:'18px 20px', position:'relative', overflow:'hidden',
      transition:'all 0.28s cubic-bezier(0.4,0,0.2,1)', boxShadow:'var(--shadow-card)',
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.35)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='var(--shadow-card)'}}
    >
      {/* Top accent */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${color},transparent)`,opacity:0.6}} />
      {/* Orb */}
      <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:color,opacity:0.07,filter:'blur(20px)'}} />

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>{label}</div>
        {icon && <div style={{color,opacity:0.75}}>{icon}</div>}
      </div>

      <div style={{fontSize:22,fontWeight:900,color,letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:10}}>
        {value}
      </div>

      {/* Sparkline at bottom */}
      {spark.length > 1 && (
        <div style={{position:'absolute',bottom:0,left:0,right:0,opacity:0.8}}>
          <Sparkline data={spark} color={sparkColor||color} width={200} height={36} />
        </div>
      )}
    </div>
  )
}
