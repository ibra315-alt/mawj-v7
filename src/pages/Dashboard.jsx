import React, { useState, useEffect, useRef } from 'react'
import { DB, Settings } from '../data/db'
import { subscribeOrders, subscribeInventory } from '../data/realtime'
import { formatCurrency, formatDate } from '../data/constants'
import { StatCard, Card, Badge, Spinner, Empty, SkeletonStats, SkeletonCard, PageHeader, DonutMini, ProgressBar } from '../components/ui'
import { IcOrders, IcTrendUp, IcPackage, IcExpenses, IcAlert, IcArrowLeft, IcPlus, IcCustomers, IcReports, IcInventory } from '../components/Icons'
import Sparkline from '../components/Sparkline'

/* ══════════════════════════════════════════════════
   DASHBOARD v8.5 — Arc ring · Donut charts · Violet glass
══════════════════════════════════════════════════ */

export default function Dashboard({ onNavigate }) {
  const [stats, setStats]             = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [statuses, setStatuses]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [lowStock, setLowStock]       = useState([])
  const [target, setTarget]           = useState(50000)
  const [sparkData, setSparkData]     = useState({ revenue:[], orders:[], profit:[] })

  useEffect(() => {
    loadData()
    // Real-time: auto-refresh when orders or inventory change
    const unsubOrders    = subscribeOrders(() => loadData())
    const unsubInventory = subscribeInventory(() => loadData())
    return () => { unsubOrders(); unsubInventory() }
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
      const monthOrders   = orders.filter(o => new Date(o.created_at) >= monthStart)
      const monthExpenses = expenses.filter(e => new Date(e.date) >= monthStart)

      const revenue      = monthOrders.reduce((s,o) => s+(o.total||0), 0)
      const profit       = monthOrders.reduce((s,o) => s+(o.profit||0), 0)
      const totalExpenses = monthExpenses.reduce((s,e) => s+(e.amount||0), 0)

      // Yesterday comparison
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate()-1)
      const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart)
      const yestOrders  = orders.filter(o => { const d=new Date(o.created_at); return d>=yestStart && d<todayStart })
      const todayRev = todayOrders.reduce((s,o)=>s+(o.total||0),0)
      const yestRev  = yestOrders.reduce((s,o)=>s+(o.total||0),0)

      setStats({
        totalOrders: monthOrders.length,
        revenue,
        profit: profit - totalExpenses,
        avgOrder: monthOrders.length ? revenue / monthOrders.length : 0,
        delivered: monthOrders.filter(o => o.status === 'delivered').length,
        returned:  monthOrders.filter(o => o.status === 'returned').length,
        pending:   monthOrders.filter(o => !['delivered','returned','cancelled'].includes(o.status)).length,
        todayOrders: todayOrders.length,
        todayRevenue: todayRev,
        yestRevenue: yestRev,
        revChange: yestRev > 0 ? ((todayRev - yestRev) / yestRev * 100).toFixed(0) : null,
      })

      const days = 14
      const revByDay = [], ordByDay = [], profByDay = []
      for (let i = days-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i)
        const ds = d.toDateString()
        const dayOrds = orders.filter(o => new Date(o.created_at).toDateString()===ds)
        revByDay.push(dayOrds.reduce((s,o) => s+(o.total||0), 0))
        ordByDay.push(dayOrds.length)
        profByDay.push(dayOrds.reduce((s,o) => s+(o.profit||0), 0))
      }
      setSparkData({ revenue:revByDay, orders:ordByDay, profit:profByDay })
      setRecentOrders(orders.slice(-8).reverse())
      setLowStock(inventory.filter(i => i.stock_qty <= i.low_stock_threshold && i.active))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="page">
      <PageHeader title="لوحة التحكم" subtitle="جاري تحميل البيانات..." />
      <SkeletonStats count={4} />
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16,marginTop:16}}>
        <SkeletonCard rows={4} /><SkeletonCard rows={4} /><SkeletonCard rows={3} />
      </div>
    </div>
  )

  const progressPct = Math.min(100, ((stats?.revenue||0)/target)*100)

  return (
    <div className="page">
      {/* ── Page Header ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,margin:0,color:'var(--text)'}}>لوحة التحكم</h1>
          <p style={{color:'var(--text-muted)',marginTop:4,fontSize:13}}>
            {new Date().toLocaleDateString('ar-AE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
      </div>
      <div className="page-wave-accent" />

      {/* ── Quick actions ── */}
      <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {[
          { icon:<IcPlus size={16}/>,      label:'طلب جديد',   color:'var(--action)',   action:() => onNavigate('orders')    },
          { icon:<IcExpenses size={16}/>,  label:'مصروف جديد', color:'var(--warning)',  action:() => onNavigate('expenses')  },
          { icon:<IcInventory size={16}/>, label:'المخزون',    color:'var(--info)',     action:() => onNavigate('inventory') },
          { icon:<IcCustomers size={16}/>, label:'العملاء',    color:'var(--warning)',  action:() => onNavigate('customers') },
          { icon:<IcReports size={16}/>,   label:'التقارير',   color:'var(--info)',     action:() => onNavigate('reports')   },
        ].map(a => (
          <button key={a.label} onClick={a.action} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            padding:'12px 16px',
            background:'var(--bg-surface)', boxShadow:'var(--card-shadow)',
            borderRadius:'var(--r-md)', cursor:'pointer', fontFamily:'inherit',
            flexShrink:0, minWidth:72, border:'none',
            color: a.color,
            transition:'box-shadow 120ms ease, transform 120ms ease',
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='var(--card-shadow-hover)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='var(--card-shadow)'}}
          >
            {a.icon}
            <span style={{ fontSize:10, fontWeight:700, whiteSpace:'nowrap', color:'var(--text-muted)' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Today hero strip ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px', marginBottom:20,
        background:'var(--bg-surface)', boxShadow:'var(--card-shadow)',
        borderRadius:'var(--r-lg)', flexWrap:'wrap', gap:12,
      }}>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>إيرادات اليوم</div>
          <div style={{ fontSize:28, fontWeight:900, color:'var(--action)', fontFamily:'Inter,sans-serif', lineHeight:1 }}>
            {formatCurrency(stats?.todayRevenue||0)}
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{stats?.todayOrders||0} طلب</div>
        </div>
        {stats?.revChange !== null && stats?.revChange !== undefined && (
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'8px 14px', borderRadius:'var(--r-pill)',
            background: stats.revChange >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
            color: stats.revChange >= 0 ? 'var(--success-light)' : 'var(--danger-light)',
          }}>
            <span style={{ fontSize:13, fontWeight:800 }}>
              {stats.revChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revChange)}%
            </span>
            <span style={{ fontSize:11, opacity:0.8 }}>مقارنة بالأمس</span>
          </div>
        )}
      </div>

      {/* ── Target + Donut row ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,marginBottom:20,alignItems:'stretch'}}>

        {/* Monthly Target — arc ring card */}
        <Card glow style={{padding:'var(--s5)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>هدف الشهر</span>
            <span style={{fontSize:12,color:'var(--text-muted)'}}>
              {formatCurrency(stats?.revenue||0)} <span style={{color:'var(--text-muted)'}}>/</span> {formatCurrency(target)}
            </span>
          </div>
          <ArcRing pct={progressPct} />
          <div style={{marginTop:14}}>
            <ProgressBar
              value={stats?.revenue||0} max={target}
              color={progressPct>=100
                ? 'var(--green)'
                : 'linear-gradient(90deg,var(--violet-light),var(--teal))'}
              height={8}
            />
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:11,color:'var(--text-muted)'}}>
              <span>{progressPct.toFixed(0)}% من الهدف</span>
              <span>متبقي: {formatCurrency(Math.max(0,target-(stats?.revenue||0)))}</span>
            </div>
          </div>
        </Card>

        {/* Donut mini cards */}
        <div style={{display:'flex',flexDirection:'row',flexWrap:'wrap',gap:12}}>
          <DonutCard
            label="تسليم يومي"
            pct={stats?.totalOrders ? Math.round((stats.delivered/(stats.totalOrders||1))*100) : 0}
            color="#00e4b8"
          />
          <DonutCard
            label="معدل المرتجعات"
            pct={stats?.totalOrders ? Math.round((stats.returned/(stats.totalOrders||1))*100) : 0}
            color="#ec4899"
          />
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:12,marginBottom:16}} className="stagger stats-grid-4">
        <StatCardWithSpark
          label="طلبات الشهر" value={stats?.totalOrders||0}
          icon={<IcOrders size={18}/>} color="var(--teal)"
          spark={sparkData.orders} sparkColor="#00e4b8"
        />
        <StatCardWithSpark
          label="إجمالي المبيعات" value={formatCurrency(stats?.revenue||0)}
          icon={<IcTrendUp size={18}/>} color="var(--violet-light)"
          spark={sparkData.revenue} sparkColor="#a78bfa"
        />
        <StatCardWithSpark
          label="صافي الربح" value={formatCurrency(stats?.profit||0)}
          icon={<IcTrendUp size={18}/>} color="var(--green)"
          spark={sparkData.profit} sparkColor="#10b981"
        />
        <StatCard label="طلبات معلقة" value={stats?.pending||0} icon={<IcPackage size={18}/>} color="var(--amber)" />
      </div>



      {/* ── Recent orders + low stock ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:20}}>

        {/* Recent orders */}
        <Card glow accentColor="var(--teal)">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <span style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>آخر الطلبات</span>
            <button
              onClick={()=>onNavigate('orders')}
              style={{
                display:'flex',alignItems:'center',gap:4,
                background:'none',border:'none',color:'var(--teal)',
                cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:600,
              }}
            >
              عرض الكل <IcArrowLeft size={14}/>
            </button>
          </div>
          {recentOrders.length===0 ? (
            <Empty title="لا يوجد طلبات بعد" />
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {recentOrders.map(order => {
                const statusObj = statuses.find(s=>s.id===order.status)
                return (
                  <div key={order.id} style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'10px 14px',
                    background:'var(--bg-surface)', boxShadow:'var(--card-shadow)', borderRadius:'var(--r-sm)', border:'none',
                    borderRadius:'var(--r-md)',gap:12,flexWrap:'wrap',
                  }}>
                    <div style={{flex:1,minWidth:120}}>
                      <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{order.customer_name}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{order.order_number}</div>
                    </div>
                    <Badge color={statusObj?.color||'var(--text-muted)'} style={{fontSize:11}}>
                      {statusObj?.label||order.status}
                    </Badge>
                    <div style={{fontWeight:700,color:'var(--teal)',fontSize:13,minWidth:80,textAlign:'left'}}>
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Low stock alert */}
        {lowStock.length>0 && (
          <Card style={{borderColor:'rgba(245,158,11,0.28)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <IcAlert size={18} color="var(--amber)" />
              <span style={{fontWeight:700,fontSize:15,color:'var(--amber)'}}>تنبيه: مخزون منخفض</span>
              <Badge color="var(--amber)">{lowStock.length}</Badge>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {lowStock.map(item => (
                <div key={item.id} style={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'8px 12px',
                  background:'rgba(245,158,11,0.05)',
                  border:'1px solid rgba(245,158,11,0.16)',
                  borderRadius:'var(--r-md)',
                }}>
                  <span style={{fontSize:13,color:'var(--text)'}}>{item.name}</span>
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

/* ── Arc Ring — animated SVG progress ring ── */
function ArcRing({ pct=0 }) {
  const size = 120, sw = 9
  const r = (size-sw*2)/2
  const circ = 2*Math.PI*r
  const dash = circ*(pct/100)

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',position:'relative',height:130}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#00e4b8"/>
            <stop offset="50%"  stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          <filter id="arcGlow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--bg-surface)" strokeWidth={sw}
        />
        {/* Fill */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="url(#arcGrad)" strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          filter="url(#arcGlow)"
          style={{transition:'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)'}}
        />
        {/* Center text */}
        <text
          x={size/2} y={size/2-6} textAnchor="middle" dominantBaseline="central"
          fill="var(--text)" fontSize="18" fontWeight="900" fontFamily="inherit"
        >{pct.toFixed(0)}%</text>
        <text
          x={size/2} y={size/2+14} textAnchor="middle"
          fill="var(--text-muted)" fontSize="9" fontFamily="inherit" letterSpacing="0.06em"
        >من الهدف</text>
      </svg>
    </div>
  )
}

/* ── Donut mini card ── */
function DonutCard({ label, pct, color }) {
  return (
    <div style={{
      background:'var(--bg-hover)',
      border:'none',
      borderRadius:'var(--r-lg)',padding:'12px 14px',
      display:'flex',alignItems:'center',gap:10,
      minWidth:130,
    }}>
      <DonutMini value={pct} max={100} color={color} size={48} strokeWidth={5} />
      <div>
        <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',lineHeight:1.4}}>
          {label}
        </div>
        <div style={{fontSize:18,fontWeight:900,color,marginTop:2}}>{pct}%</div>
      </div>
    </div>
  )
}

/* ── Stat card with sparkline ── */
function StatCardWithSpark({ label, value, color, icon, spark=[], sparkColor }) {
  const hasSpark = spark.length > 1
  return (
    <div className="hover-lift" style={{
      background:'var(--bg-hover)',
      border:'none',
      borderRadius:'var(--r-lg)',
      padding: hasSpark ? '18px 20px 56px' : '18px 20px',
      position:'relative',overflow:'hidden',
      boxShadow:'var(--card-shadow)',
      minHeight: hasSpark ? 110 : 'auto',
    }}>
      {/* Top accent */}
      <div style={{
        position:'absolute',top:0,left:0,right:0,height:2,
        background:`linear-gradient(90deg,transparent,${color},transparent)`,
        opacity:0.65,pointerEvents:'none',
      }} />
      {/* Glow orb */}
      <div style={{
        position:'absolute',top:-24,right:-24,width:80,height:80,
        borderRadius:'50%',background:color,opacity:0.08,
        filter:'blur(22px)',pointerEvents:'none',
      }} />

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>
          {label}
        </div>
        {icon && <div style={{color,opacity:0.8}}>{icon}</div>}
      </div>

      <div style={{fontSize:22,fontWeight:900,color,letterSpacing:'-0.03em',lineHeight:1.1,position:'relative',zIndex:1}}>
        {value}
      </div>

      {hasSpark && (
        <div style={{position:'absolute',bottom:0,left:0,right:0,opacity:0.7,pointerEvents:'none'}}>
          <Sparkline data={spark} color={sparkColor||color} width={200} height={48} />
        </div>
      )}
    </div>
  )
}
