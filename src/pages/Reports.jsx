import React, { useState, useEffect, useMemo } from 'react'
import { DB, Settings } from '../data/db'
import { formatCurrency } from '../data/constants'
import { Card, StatCard, Spinner, PageHeader, Btn } from '../components/ui'
import { IcWhatsapp } from '../components/Icons'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const SOURCE_LABELS = { instagram:'إنستغرام', tiktok:'تيك توك', website:'الموقع', walk_in:'زيارة', other:'أخرى' }

function monthRange(year, month) {
  return { start: new Date(year, month, 1), end: new Date(year, month+1, 0, 23, 59, 59) }
}

export default function Reports() {
  const [orders,   setOrders]   = useState([])
  const [expenses, setExpenses] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab, setTab]           = useState('overview') // overview | pnl | products
  const [selMonth, setSelMonth] = useState(new Date().getMonth())
  const [selYear,  setSelYear]  = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      DB.list('orders',   { orderBy: 'created_at' }),
      DB.list('expenses', { orderBy: 'date' }),
      Settings.get('statuses'),
    ]).then(([o, e, s]) => { setOrders(o); setExpenses(e); setStatuses(s || []) })
    .finally(() => setLoading(false))
  }, [])

  // ── Current month data ──
  const { start, end } = monthRange(selYear, selMonth)
  const monthOrders   = orders.filter(o => { const d=new Date(o.created_at); return d>=start && d<=end })
  const monthExpenses = expenses.filter(e => { const d=new Date(e.date); return d>=start && d<=end })

  const revenue        = monthOrders.reduce((s,o) => s+(o.total||0), 0)
  const grossProfit    = monthOrders.reduce((s,o) => s+(o.profit||0), 0)
  const totalExp       = monthExpenses.reduce((s,e) => s+e.amount, 0)
  const totalShipping  = monthOrders.reduce((s,o) => s+(o.delivery_cost||0), 0)
  const productRevenue = monthOrders.reduce((s,o) => s+(o.subtotal||(o.total||0)-(o.delivery_cost||0)), 0)
  const netProfit      = grossProfit - totalExp
  const profitMargin   = revenue > 0 ? ((netProfit/revenue)*100).toFixed(1) : 0

  // Daily bars
  const daysInMonth = new Date(selYear, selMonth+1, 0).getDate()
  const dailyData = Array.from({ length: daysInMonth }, (_,i) => {
    const day = i+1
    const dayOrders = monthOrders.filter(o => new Date(o.created_at).getDate() === day)
    return { day, revenue: dayOrders.reduce((s,o)=>s+(o.total||0),0), count: dayOrders.length }
  })
  const maxDay = Math.max(...dailyData.map(d=>d.revenue), 1)

  // Status & source
  const statusBreakdown = statuses.map(s => ({
    ...s,
    count:   monthOrders.filter(o=>o.status===s.id).length,
    revenue: monthOrders.filter(o=>o.status===s.id).reduce((s,o)=>s+(o.total||0),0),
  }))
  const sourceMap = {}
  monthOrders.forEach(o => {
    if (!sourceMap[o.source]) sourceMap[o.source] = { count:0, revenue:0 }
    sourceMap[o.source].count++; sourceMap[o.source].revenue += o.total||0
  })
  const sourceBreakdown = Object.entries(sourceMap).sort((a,b)=>b[1].count-a[1].count)

  // ── P&L: last 6 months ──
  const pnlMonths = useMemo(() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selYear, selMonth - i, 1)
      const y = d.getFullYear(), m = d.getMonth()
      const { start, end } = monthRange(y, m)
      const mOrds = orders.filter(o => { const d=new Date(o.created_at); return d>=start&&d<=end })
      const mExps = expenses.filter(e => { const d=new Date(e.date); return d>=start&&d<=end })
      const rev      = mOrds.reduce((s,o)=>s+(o.total||0),0)
      const gp       = mOrds.reduce((s,o)=>s+(o.profit||0),0)
      const exp      = mExps.reduce((s,e)=>s+e.amount,0)
      const shipping = mOrds.reduce((s,o)=>s+(o.delivery_cost||0),0)
      result.push({ label: MONTHS[m].slice(0,3), month:m, year:y, revenue:rev, grossProfit:gp, expenses:exp, netProfit:gp-exp, orderCount:mOrds.length, shipping })
    }
    return result
  }, [orders, expenses, selMonth, selYear])

  const maxPnl = Math.max(...pnlMonths.map(m=>m.revenue), 1)

  // YTD
  const ytdOrders   = orders.filter(o => new Date(o.created_at).getFullYear() === selYear)
  const ytdExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selYear)
  const ytdRevenue  = ytdOrders.reduce((s,o)=>s+(o.total||0),0)
  const ytdProfit   = ytdOrders.reduce((s,o)=>s+(o.profit||0),0) - ytdExpenses.reduce((s,e)=>s+e.amount,0)

  // Expense categories
  const expCatMap = {}
  expenses.filter(e => new Date(e.date).getFullYear()===selYear).forEach(e => {
    if (!expCatMap[e.category||'أخرى']) expCatMap[e.category||'أخرى'] = 0
    expCatMap[e.category||'أخرى'] += e.amount
  })
  const expCategories = Object.entries(expCatMap).sort((a,b)=>b[1]-a[1])
  const totalYtdExp = expCategories.reduce((s,[,v])=>s+v, 0)

  // ── Products: all-time ──
  const productMap = {}
  orders.forEach(o => {
    ;(o.items||[]).forEach(item => {
      if (!productMap[item.name]) productMap[item.name] = { name:item.name, qty:0, revenue:0, cost:0, profit:0, orderCount:0 }
      productMap[item.name].qty        += item.qty
      productMap[item.name].revenue    += (item.price||0) * item.qty
      productMap[item.name].cost       += (item.cost||0)  * item.qty
      productMap[item.name].profit     += ((item.price||0)-(item.cost||0)) * item.qty
      productMap[item.name].orderCount += 1
    })
  })
  const allProducts = Object.values(productMap).map(p => ({
    ...p,
    margin: p.revenue>0 ? ((p.profit/p.revenue)*100).toFixed(1) : 0,
    avgPrice: p.qty>0 ? p.revenue/p.qty : 0,
  }))
  const [prodSort, setProdSort] = useState('revenue')
  const sortedProducts = [...allProducts].sort((a,b) => {
    if (prodSort==='revenue') return b.revenue - a.revenue
    if (prodSort==='qty')     return b.qty - a.qty
    if (prodSort==='profit')  return b.profit - a.profit
    if (prodSort==='margin')  return parseFloat(b.margin) - parseFloat(a.margin)
    return 0
  })
  const totalProductRevenue = allProducts.reduce((s,p)=>s+p.revenue, 0)

  function generateWhatsAppSummary() {
    const text =
      `تقرير ${MONTHS[selMonth]} ${selYear}\n\n` +
      `المبيعات: ${formatCurrency(revenue)}\n` +
      `الطلبات: ${monthOrders.length}\n` +
      `صافي الربح: ${formatCurrency(netProfit)}\n` +
      `هامش الربح: ${profitMargin}%`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><Spinner size={36}/></div>

  return (
    <div className="page">
      <PageHeader
        title="التقارير"
        actions={
          <Btn variant="ghost" onClick={generateWhatsAppSummary} style={{ color:'#25d166', borderColor:'rgba(37,211,102,0.3)' }}>
            <IcWhatsapp size={15}/> ملخص
          </Btn>
        }
      />

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', padding:4 }}>
        {[
          { id:'overview', label:'نظرة عامة' },
          { id:'pnl',      label:'الأرباح والخسائر' },
          { id:'products', label:'المنتجات' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 8px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab===t.id ? 'linear-gradient(135deg,var(--teal),var(--violet))' : 'transparent',
            color: tab===t.id ? '#050c1a' : 'var(--text-muted)',
            fontWeight: tab===t.id ? 800 : 500, fontSize:13, fontFamily:'inherit',
            transition:'all 0.2s ease',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {tab === 'overview' && (
        <>
          {/* Month selector */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            <select value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))}
              style={{ padding:'8px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}
              style={{ padding:'8px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:10, marginBottom:20 }}>
            <StatCard label="إجمالي المبيعات"  value={formatCurrency(revenue)}         color="var(--teal)"/>
            <StatCard label="مبيعات المنتجات"  value={formatCurrency(productRevenue)}   color="var(--violet)"/>
            <StatCard label="إيرادات الشحن"    value={formatCurrency(totalShipping)}    color="var(--blue)"/>
            <StatCard label="إجمالي المصاريف"  value={formatCurrency(totalExp)}         color="var(--red)"/>
            <StatCard label="صافي الربح"       value={formatCurrency(netProfit)}        color={netProfit>=0?'var(--green,#34d399)':'var(--red)'}/>
            <StatCard label="هامش الربح"       value={`${profitMargin}%`}               color="var(--gold,#f59e0b)"/>
          </div>

          {/* Daily bar chart */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>المبيعات اليومية</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:90, overflowX:'auto', paddingBottom:4 }}>
              {dailyData.map(d => (
                <div key={d.day} title={`${d.day}: ${formatCurrency(d.revenue)} — ${d.count} طلب`}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, minWidth:10, cursor:'pointer' }}>
                  <div style={{ width:'80%', height: d.revenue>0 ? `${Math.max(4,(d.revenue/maxDay)*80)}px` : '2px', background: d.revenue>0?'linear-gradient(180deg,var(--teal),var(--violet))':'var(--border)', borderRadius:'3px 3px 0 0', transition:'height 0.3s ease' }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
              <span>1</span><span>{Math.floor(daysInMonth/2)}</span><span>{daysInMonth}</span>
            </div>
          </Card>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {/* Status breakdown */}
            <Card>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>توزيع الحالات</div>
              {statusBreakdown.filter(s=>s.count>0).length===0
                ? <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'16px 0' }}>لا يوجد طلبات</div>
                : statusBreakdown.filter(s=>s.count>0).map(s => (
                  <div key={s.id} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:s.color, display:'inline-block' }}/>
                        {s.label}
                      </span>
                      <span style={{ color:'var(--text-muted)' }}>{s.count}</span>
                    </div>
                    <div style={{ height:4, background:'var(--border)', borderRadius:99 }}>
                      <div style={{ width:`${(s.count/monthOrders.length)*100}%`, height:'100%', background:s.color, borderRadius:99 }}/>
                    </div>
                  </div>
                ))
              }
            </Card>
            {/* Source breakdown */}
            <Card>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>مصادر الطلبات</div>
              {sourceBreakdown.length===0
                ? <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'16px 0' }}>لا يوجد بيانات</div>
                : sourceBreakdown.map(([src,data]) => (
                  <div key={src} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                      <span>{SOURCE_LABELS[src]||src}</span>
                      <span style={{ color:'var(--text-muted)' }}>{data.count}</span>
                    </div>
                    <div style={{ height:4, background:'var(--border)', borderRadius:99 }}>
                      <div style={{ width:`${(data.count/monthOrders.length)*100}%`, height:'100%', background:'var(--violet)', borderRadius:99 }}/>
                    </div>
                  </div>
                ))
              }
            </Card>
          </div>
        </>
      )}

      {/* ══════════ P&L TAB ══════════ */}
      {tab === 'pnl' && (
        <>
          {/* Year selector */}
          <div style={{ display:'flex', gap:8, marginBottom:20, alignItems:'center' }}>
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}
              style={{ padding:'8px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>آخر 6 أشهر</span>
          </div>

          {/* YTD summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:20 }}>
            <div style={{ gridColumn:'1/-1', padding:'16px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-lg)', display:'flex', gap:20, flexWrap:'wrap', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>إجمالي المبيعات {selYear}</div>
                <div style={{ fontSize:24, fontWeight:900, color:'var(--teal)' }}>{formatCurrency(ytdRevenue)}</div>
              </div>
              <div style={{ width:1, height:40, background:'var(--border)' }}/>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>صافي الربح {selYear}</div>
                <div style={{ fontSize:24, fontWeight:900, color: ytdProfit>=0?'var(--green,#34d399)':'var(--red)' }}>{ytdProfit>0?'+':''}{formatCurrency(ytdProfit)}</div>
              </div>
              <div style={{ width:1, height:40, background:'var(--border)' }}/>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>هامش الربح</div>
                <div style={{ fontSize:24, fontWeight:900, color:'var(--gold,#f59e0b)' }}>
                  {ytdRevenue>0 ? ((ytdProfit/ytdRevenue)*100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* 6-month grouped bar chart */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>مبيعات وأرباح آخر 6 أشهر</div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-muted)', marginBottom:14 }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:3,background:'var(--teal)',display:'inline-block' }}/> مبيعات</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:3,background:'var(--violet)',display:'inline-block' }}/> ربح صافي</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:3,background:'var(--red)',display:'inline-block' }}/> مصاريف</span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:120 }}>
              {pnlMonths.map((m,i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:100 }}>
                    <div title={`مبيعات: ${formatCurrency(m.revenue)}`} style={{ width:14, height:`${Math.max(2,(m.revenue/maxPnl)*95)}px`, background:'var(--teal)', borderRadius:'3px 3px 0 0', transition:'height 0.4s ease' }}/>
                    <div title={`ربح: ${formatCurrency(m.netProfit)}`} style={{ width:14, height:`${Math.max(2,(Math.abs(m.netProfit)/maxPnl)*95)}px`, background: m.netProfit>=0?'var(--violet)':'var(--red)', borderRadius:'3px 3px 0 0', opacity:0.8, transition:'height 0.4s ease' }}/>
                    <div title={`مصاريف: ${formatCurrency(m.expenses)}`} style={{ width:14, height:`${Math.max(2,(m.expenses/maxPnl)*95)}px`, background:'var(--red)', borderRadius:'3px 3px 0 0', opacity:0.5, transition:'height 0.4s ease' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly table */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>ملخص الأشهر</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ color:'var(--text-muted)', borderBottom:'none' }}>
                    {['الشهر','الطلبات','المبيعات','الشحن','المصاريف','الربح الصافي','الهامش'].map(h => (
                      <th key={h} style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pnlMonths.map((m,i) => (
                    <tr key={i} style={{ borderBottom:'none', opacity: m.revenue===0?0.5:1 }}>
                      <td style={{ padding:'8px', fontWeight:700 }}>{m.label} {m.year}</td>
                      <td style={{ padding:'8px', color:'var(--text-sec)' }}>{m.orderCount}</td>
                      <td style={{ padding:'8px', color:'var(--teal)', fontWeight:700 }}>{formatCurrency(m.revenue)}</td>
                      <td style={{ padding:'8px', color:'var(--blue)' }}>{formatCurrency(m.shipping||0)}</td>
                      <td style={{ padding:'8px', color:'var(--red)' }}>{formatCurrency(m.expenses)}</td>
                      <td style={{ padding:'8px', fontWeight:800, color: m.netProfit>=0?'var(--green,#34d399)':'var(--red)' }}>
                        {m.netProfit>=0?'+':''}{formatCurrency(m.netProfit)}
                      </td>
                      <td style={{ padding:'8px', color:'var(--gold,#f59e0b)', fontWeight:700 }}>
                        {m.revenue>0 ? ((m.netProfit/m.revenue)*100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Shipping breakdown */}
          {pnlMonths.some(m=>m.shipping>0) && (
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>إيرادات الشحن الشهرية</div>
              {pnlMonths.map((m,i) => (
                <div key={i} style={{ marginBottom:10, opacity: m.shipping===0?0.4:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:13 }}>
                    <span style={{ fontWeight:600 }}>{m.label} {m.year}</span>
                    <div style={{ display:'flex', gap:16 }}>
                      <span style={{ color:'var(--text-muted)', fontSize:12 }}>{m.orderCount} طلب</span>
                      <span style={{ fontWeight:800, color:'var(--blue)' }}>{formatCurrency(m.shipping||0)}</span>
                    </div>
                  </div>
                  <div style={{ height:4, background:'var(--border)', borderRadius:99 }}>
                    <div style={{ width:`${maxPnl>0?((m.shipping||0)/maxPnl)*100:0}%`, height:'100%', background:'var(--blue,#3b82f6)', borderRadius:99, transition:'width 0.4s ease' }}/>
                  </div>
                </div>
              ))}
              <div style={{ marginTop:12, paddingTop:12, borderTop:'none', display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ fontWeight:700 }}>الإجمالي</span>
                <span style={{ fontWeight:900, color:'var(--blue)' }}>{formatCurrency(pnlMonths.reduce((s,m)=>s+(m.shipping||0),0))}</span>
              </div>
            </Card>
          )}

          {/* Expense categories */}
          {expCategories.length > 0 && (
            <Card>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>المصاريف حسب الفئة ({selYear})</div>
              {expCategories.map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:13 }}>
                    <span>{cat}</span>
                    <span style={{ fontWeight:700, color:'var(--red)' }}>{formatCurrency(amt)}</span>
                  </div>
                  <div style={{ height:5, background:'var(--border)', borderRadius:99 }}>
                    <div style={{ width:`${(amt/totalYtdExp)*100}%`, height:'100%', background:'linear-gradient(90deg,var(--red),#f97316)', borderRadius:99 }}/>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ══════════ PRODUCTS TAB ══════════ */}
      {tab === 'products' && (
        <>
          {/* Sort controls */}
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { value:'revenue', label:'الأعلى مبيعاً' },
              { value:'qty',     label:'الأكثر كمية' },
              { value:'profit',  label:'الأعلى ربحاً' },
              { value:'margin',  label:'أعلى هامش' },
            ].map(s => (
              <button key={s.value} onClick={() => setProdSort(s.value)} style={{
                padding:'7px 14px', borderRadius:999, border:`1.5px solid ${prodSort===s.value?'var(--teal)':'var(--border)'}`,
                background: prodSort===s.value?'rgba(0,228,184,0.12)':'var(--bg-hover)',
                color: prodSort===s.value?'var(--teal)':'var(--text-muted)',
                fontSize:12, fontWeight: prodSort===s.value?800:500, cursor:'pointer', fontFamily:'inherit',
              }}>{s.label}</button>
            ))}
          </div>

          {sortedProducts.length === 0 ? (
            <Card style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
              <div style={{ fontSize:40, marginBottom:10 }}></div>
              <div>لا يوجد بيانات منتجات بعد</div>
            </Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sortedProducts.map((p, i) => {
                const share = totalProductRevenue>0 ? (p.revenue/totalProductRevenue)*100 : 0
                const isTop = i === 0
                return (
                  <div key={p.name} style={{
                    background:'var(--bg-hover)', border:`1.5px solid ${isTop?'var(--teal)':'var(--border)'}`,
                    borderRadius:'var(--r-lg)', padding:'14px 16px',
                    boxShadow: isTop ? '0 0 16px rgba(0,228,184,0.1)' : 'none',
                  }}>
                    {/* Top row */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{
                        width:32, height:32, borderRadius:10, flexShrink:0,
                        background: i===0?'linear-gradient(135deg,#f59e0b,#fbbf24)' : i===1?'linear-gradient(135deg,#94a3b8,#cbd5e1)' : i===2?'linear-gradient(135deg,#cd7c3a,#d4a35a)' : 'var(--bg-hover)',
                        border:'none',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:900, fontSize:13, color: i<3?'#050c1a':'var(--text-muted)',
                      }}>
                        {i===0?'#1':i===1?'#2':i===2?'#3':i+1}
                      </div>
                      <div style={{ flex:1, fontWeight:800, fontSize:14 }}>{p.name}</div>
                      <div style={{ fontWeight:900, fontSize:16, color:'var(--teal)' }}>{formatCurrency(p.revenue)}</div>
                    </div>
                    {/* Stats row */}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                      {[
                        { label:'الكمية',    value:`${p.qty} وحدة`,          color:'var(--text-sec)' },
                        { label:'الربح',     value:formatCurrency(p.profit),  color: p.profit>=0?'var(--green,#34d399)':'var(--red)' },
                        { label:'الهامش',    value:`${p.margin}%`,            color:'var(--gold,#f59e0b)' },
                        { label:'سعر الوحدة', value:formatCurrency(p.avgPrice), color:'var(--text-muted)' },
                      ].map(s => (
                        <div key={s.label} style={{ padding:'5px 10px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:11 }}>
                          <span style={{ color:'var(--text-muted)' }}>{s.label}: </span>
                          <span style={{ fontWeight:800, color:s.color }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Revenue share bar */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>
                        <span>حصة المبيعات</span>
                        <span>{share.toFixed(1)}%</span>
                      </div>
                      <div style={{ height:4, background:'var(--border)', borderRadius:99 }}>
                        <div style={{ width:`${share}%`, height:'100%', background:'linear-gradient(90deg,var(--teal),var(--violet))', borderRadius:99, transition:'width 0.4s ease' }}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
