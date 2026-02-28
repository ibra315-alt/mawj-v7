// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Card, Spinner, PageHeader, Btn } from '../components/ui'
import { IcWhatsapp } from '../components/Icons'
import type { PageProps } from '../types'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function monthRange(year, month) {
  return { start: new Date(year, month, 1), end: new Date(year, month+1, 0, 23, 59, 59) }
}
function pct(num, den) { return den > 0 ? ((num / den) * 100).toFixed(1) : '0.0' }

function KPI({ label, value, sub, color = 'var(--action)', small }) {
  return (
    <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'12px 14px', boxShadow:'var(--card-shadow)' }}>
      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize: small ? 15 : 18, fontWeight:900, color, fontFamily:'Inter,sans-serif', lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function BarRow({ label, value, max, total, color = 'var(--action)', right }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
        <span style={{ color:'var(--text-sec)' }}>{label}</span>
        <div style={{ display:'flex', gap:12 }}>
          {right && <span style={{ color:'var(--text-muted)' }}>{right}</span>}
          <span style={{ fontWeight:700, color }}>{value}</span>
        </div>
      </div>
      <div style={{ height:5, background:'var(--bg-hover)', borderRadius:99 }}>
        <div style={{ width:`${w}%`, height:'100%', background:color, borderRadius:99, transition:'width 0.4s ease' }}/>
      </div>
      {total > 0 && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, textAlign:'left' }}>{pct(value, total)}%</div>}
    </div>
  )
}

export default function Reports(_: PageProps) {
  const [orders,   setOrders]   = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('overview')
  const [selMonth, setSelMonth] = useState(new Date().getMonth())
  const [selYear,  setSelYear]  = useState(new Date().getFullYear())
  const [prodSort, setProdSort] = useState('revenue')

  useEffect(() => {
    Promise.all([
      DB.list('orders',   { orderBy: 'created_at' }),
      DB.list('expenses', { orderBy: 'date' }),
    ]).then(([o, e]) => { setOrders(o); setExpenses(e) })
    .finally(() => setLoading(false))
  }, [])

  const { monthOrders, monthExpenses, delivered, replacements, notDelivered,
    revenue, grossProfit, hayyakFees, productCost, totalExp, netProfit,
    deliveryRate, replaceRate, dailyData, maxDay, daysInMonth, cities, maxCity, statusMap,
  } = useMemo(() => {
    const { start, end } = monthRange(selYear, selMonth)
    const mOrders   = orders.filter(o => { const d=new Date(o.order_date||o.created_at); return d>=start&&d<=end })
    const mExpenses = expenses.filter(e => { const d=new Date(e.date); return d>=start&&d<=end })

    const del    = mOrders.filter(o => o.status==='delivered'||o.status==='تم')
    const repl   = mOrders.filter(o => o.is_replacement)
    const notDel = mOrders.filter(o => o.status==='not_delivered'||o.status==='لم يتم')

    const rev   = mOrders.reduce((s,o) => s+(o.total||0), 0)
    const gp    = mOrders.reduce((s,o) => s+(o.gross_profit||0), 0)
    const hFees = mOrders.reduce((s,o) => s+(o.hayyak_fee||0), 0)
    const pCost = mOrders.reduce((s,o) => s+(o.product_cost||0), 0)
    const tExp  = mExpenses.reduce((s,e) => s+(e.amount||0), 0)

    // dailyData — use a map for O(n) instead of O(n*d)
    const daysInMonth = new Date(selYear, selMonth+1, 0).getDate()
    const dayMap = Array.from({ length: daysInMonth }, () => ({ revenue: 0, count: 0 }))
    mOrders.forEach(o => {
      const day = new Date(o.order_date||o.created_at).getDate() - 1
      if (day >= 0 && day < daysInMonth) {
        dayMap[day].revenue += (o.total||0)
        dayMap[day].count++
      }
    })
    const daily = dayMap.map((d, i) => ({ day: i+1, ...d }))
    const mDay = Math.max(...daily.map(d=>d.revenue), 1)

    // cities
    const cMap = {}
    mOrders.forEach(o => {
      const c = o.customer_city||'غير محدد'
      if (!cMap[c]) cMap[c] = { count:0, revenue:0 }
      cMap[c].count++; cMap[c].revenue += (o.total||0)
    })
    const cList = Object.entries(cMap).sort((a,b)=>b[1].count-a[1].count)
    const mCity = Math.max(...cList.map(([,d])=>d.count), 1)

    // statuses
    const sMap = {}
    mOrders.forEach(o => { const s=o.status||'new'; if (!sMap[s]) sMap[s]=0; sMap[s]++ })

    return {
      monthOrders: mOrders, monthExpenses: mExpenses,
      delivered: del, replacements: repl, notDelivered: notDel,
      revenue: rev, grossProfit: gp, hayyakFees: hFees, productCost: pCost,
      totalExp: tExp, netProfit: gp - tExp,
      deliveryRate: pct(del.length, mOrders.length),
      replaceRate: pct(repl.length, mOrders.length),
      dailyData: daily, maxDay: mDay, daysInMonth,
      cities: cList, maxCity: mCity, statusMap: sMap,
    }
  }, [orders, expenses, selYear, selMonth])

  const pnlMonths = useMemo(() => {
    const result = []
    for (let i=5; i>=0; i--) {
      const d = new Date(selYear, selMonth-i, 1)
      const y = d.getFullYear(), m = d.getMonth()
      const { start, end } = monthRange(y, m)
      const mOrds = orders.filter(o => { const d=new Date(o.order_date||o.created_at); return d>=start&&d<=end })
      const mExps = expenses.filter(e => { const d=new Date(e.date); return d>=start&&d<=end })
      const rev    = mOrds.reduce((s,o)=>s+(o.total||0),0)
      const gp     = mOrds.reduce((s,o)=>s+(o.gross_profit||0),0)
      const hayyak = mOrds.reduce((s,o)=>s+(o.hayyak_fee||0),0)
      const exp    = mExps.reduce((s,e)=>s+(e.amount||0),0)
      const repl   = mOrds.filter(o=>o.is_replacement).length
      result.push({
        label:MONTHS[m].slice(0,3), month:m, year:y,
        revenue:rev, grossProfit:gp, hayyak, expenses:exp,
        netProfit:gp-exp, orderCount:mOrds.length,
        replacements:repl, replaceRate: mOrds.length>0 ? ((repl/mOrds.length)*100).toFixed(1) : '0.0',
      })
    }
    return result
  }, [orders, expenses, selMonth, selYear])
  const maxPnl = Math.max(...pnlMonths.map(m=>m.revenue), 1)

  const { ytdRevenue, ytdGP, ytdExp, ytdNet, ytdRepl, expCategories, totalYtdExp, maxExpCat } = useMemo(() => {
    const yOrders   = orders.filter(o => new Date(o.order_date||o.created_at).getFullYear()===selYear)
    const yExpenses = expenses.filter(e => new Date(e.date).getFullYear()===selYear)
    const rev  = yOrders.reduce((s,o)=>s+(o.total||0),0)
    const gp   = yOrders.reduce((s,o)=>s+(o.gross_profit||0),0)
    const exp  = yExpenses.reduce((s,e)=>s+(e.amount||0),0)
    const repl = yOrders.filter(o=>o.is_replacement).length
    const catMap = {}
    yExpenses.forEach(e => {
      const cat=e.category||'أخرى'; if (!catMap[cat]) catMap[cat]=0; catMap[cat]+=(e.amount||0)
    })
    const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1])
    return {
      ytdRevenue: rev, ytdGP: gp, ytdExp: exp, ytdNet: gp - exp, ytdRepl: repl,
      expCategories: cats, totalYtdExp: cats.reduce((s,[,v])=>s+v,0),
      maxExpCat: Math.max(...cats.map(([,v])=>v), 1),
    }
  }, [orders, expenses, selYear])

  // Product profitability (includes hayyak fee allocation, respects order status)
  const { sortedProducts, totalProductRevenue } = useMemo(() => {
    const pMap = {}
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      const items = o.items || []
      const itemCount = items.reduce((s, i) => s + (parseInt(i.qty) || 1), 0)
      const orderHayyak = parseFloat(o.hayyak_fee) || 0
      items.forEach(item => {
        const key = `${item.name}${item.size?'—'+item.size:''}`
        if (!pMap[key]) pMap[key]={ name:item.name, size:item.size||'', qty:0, revenue:0, cost:0, profit:0 }
        const qty = parseInt(item.qty) || 1
        const rev = (parseFloat(item.price)||0) * qty
        const cost = (parseFloat(item.cost)||0) * qty
        const hayyakShare = itemCount > 0 ? (orderHayyak * qty / itemCount) : 0
        pMap[key].qty += qty
        pMap[key].revenue += rev
        pMap[key].cost += cost
        if (o.is_replacement || o.status === 'not_delivered') {
          pMap[key].profit -= (cost + hayyakShare)
        } else {
          pMap[key].profit += (rev - cost - hayyakShare)
        }
      })
    })
    const all = Object.values(pMap).map(p => ({
      ...p, margin: p.revenue>0?((p.profit/p.revenue)*100).toFixed(1):'0', avgPrice: p.qty>0?p.revenue/p.qty:0
    }))
    const sorted = [...all].sort((a,b) => {
      if (prodSort==='revenue') return b.revenue-a.revenue
      if (prodSort==='qty')     return b.qty-a.qty
      if (prodSort==='profit')  return b.profit-a.profit
      return parseFloat(b.margin)-parseFloat(a.margin)
    })
    return { sortedProducts: sorted, totalProductRevenue: all.reduce((s,p)=>s+p.revenue,0) }
  }, [orders, prodSort])

  const { allReplacements, allNotDelivered, totalReplCost, totalNDCost } = useMemo(() => {
    const repl = orders.filter(o=>o.is_replacement)
    const notDel = orders.filter(o=>o.status==='not_delivered'||o.status==='لم يتم')
    return {
      allReplacements: repl, allNotDelivered: notDel,
      totalReplCost: repl.reduce((s,o)=>s+Math.abs(o.gross_profit||0),0),
      totalNDCost: notDel.reduce((s,o)=>s+Math.abs(o.gross_profit||0),0),
    }
  }, [orders])

  function shareWhatsApp() {
    const text = `تقرير ${MONTHS[selMonth]} ${selYear}\n\nالمبيعات: ${formatCurrency(revenue)}\nالطلبات: ${monthOrders.length} (تسليم ${deliveryRate}%)\nربح إجمالي: ${formatCurrency(grossProfit)}\nصافي الربح: ${formatCurrency(netProfit)}\nاستبدالات: ${replacements.length} (${replaceRate}%)`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank')
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><Spinner size={36}/></div>

  const TABS = [
    { id:'overview', label:'عامة' },
    { id:'pnl',      label:'الأرباح' },
    { id:'products', label:'المنتجات' },
    { id:'returns',  label:'الاسترجاع' },
  ]

  return (
    <div className="page">
      <PageHeader title="التقارير"
        actions={<Btn variant="ghost" onClick={shareWhatsApp} style={{ color:'var(--whatsapp)', borderColor:'rgba(37,211,102,0.3)' }}><IcWhatsapp size={15}/> مشاركة</Btn>}
      />

      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 4px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab===t.id ? 'linear-gradient(135deg,var(--action),var(--info-light))' : 'transparent',
            color: tab===t.id ? '#ffffff' : 'var(--text-muted)',
            fontWeight: tab===t.id ? 800 : 500, fontSize:12, fontFamily:'inherit', transition:'all 120ms',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <select value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))}
              style={{ padding:'8px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}
              style={{ padding:'8px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:16 }}>
            <KPI label="إجمالي المبيعات"  value={formatCurrency(revenue)}    color="var(--action)"/>
            <KPI label="ربح إجمالي"       value={formatCurrency(grossProfit)} color="var(--action)" sub={`هامش ${pct(grossProfit,revenue)}%`}/>
            <KPI label="صافي الربح"       value={formatCurrency(netProfit)}   color={netProfit>=0?'var(--action)':'var(--danger)'} sub="بعد المصاريف"/>
            <KPI label="رسوم حياك"        value={formatCurrency(hayyakFees)}  color="var(--danger)" small/>
            <KPI label="تكلفة المنتجات"   value={formatCurrency(productCost)} color="var(--danger)" small/>
            <KPI label="عدد الطلبات"      value={monthOrders.length}          color="var(--text)"   sub={`${delivered.length} تم تسليمها`}/>
            <KPI label="نسبة التسليم"     value={`${deliveryRate}%`}          color={parseFloat(deliveryRate)>=90?'var(--action)':'var(--warning)'}/>
            <KPI label="الاستبدالات"      value={`${replacements.length} (${replaceRate}%)`} color={parseFloat(replaceRate)>10?'var(--danger)':'var(--text-muted)'} small/>
          </div>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'var(--text-sec)' }}>المبيعات اليومية — {MONTHS[selMonth]}</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:80, overflowX:'auto' }}>
              {dailyData.map(d => (
                <div key={d.day} title={`${d.day}: ${formatCurrency(d.revenue)} — ${d.count} طلب`}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, minWidth:8, cursor:'pointer' }}>
                  <div style={{ width:'80%', height: d.revenue>0?`${Math.max(4,(d.revenue/maxDay)*75)}px`:'2px', background: d.revenue>0?'linear-gradient(180deg,var(--action),var(--info-light))':'var(--border)', borderRadius:'3px 3px 0 0', transition:'height 0.3s ease' }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
              <span>1</span><span>{Math.floor(daysInMonth/2)}</span><span>{daysInMonth}</span>
            </div>
          </Card>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Card>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>توزيع الإمارات</div>
              {cities.length===0
                ? <div style={{ color:'var(--text-muted)', fontSize:12, textAlign:'center', padding:12 }}>لا يوجد بيانات</div>
                : cities.slice(0,7).map(([city,data]) => (
                  <BarRow key={city} label={city} value={data.count} max={maxCity} total={monthOrders.length} right={formatCurrency(data.revenue)} color="var(--action)"/>
                ))
              }
            </Card>
            <Card>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>حالات الطلبات</div>
              {[
                { key:'delivered',     label:'تم التسليم', color:'var(--success)' },
                { key:'تم',            label:'تم',          color:'var(--success)' },
                { key:'pending',       label:'معلق',        color:'var(--warning)' },
                { key:'new',           label:'جديد',        color:'var(--action)' },
                { key:'not_delivered', label:'لم يتم',      color:'var(--danger)' },
                { key:'لم يتم',        label:'لم يتم',      color:'var(--danger)' },
                { key:'cancelled',     label:'ملغي',        color:'var(--text-muted)' },
              ].filter(s=>statusMap[s.key]>0).map(s => (
                <BarRow key={s.key} label={s.label} value={statusMap[s.key]} max={monthOrders.length} total={monthOrders.length} color={s.color}/>
              ))}
              {monthOrders.length===0 && <div style={{ color:'var(--text-muted)', fontSize:12, textAlign:'center', padding:12 }}>لا يوجد طلبات</div>}
            </Card>
          </div>
        </>
      )}

      {tab === 'pnl' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}
              style={{ padding:'8px 12px', background:'var(--bg-hover)', border:'none', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-lg)', padding:'16px 20px', marginBottom:20, boxShadow:'var(--card-shadow)', display:'flex', flexWrap:'wrap', gap:'12px 32px' }}>
            {[
              { label:`مبيعات ${selYear}`, value:formatCurrency(ytdRevenue), color:'var(--action)' },
              { label:'ربح إجمالي',        value:formatCurrency(ytdGP),      color:'var(--action)' },
              { label:'مصاريف',            value:formatCurrency(ytdExp),      color:'var(--danger)' },
              { label:'صافي الربح',        value:formatCurrency(ytdNet),      color:ytdNet>=0?'var(--action)':'var(--danger)' },
              { label:'الاستبدالات',       value:ytdRepl,                     color:'var(--warning)' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>آخر 6 أشهر</div>
            <div style={{ display:'flex', gap:6, fontSize:11, color:'var(--text-muted)', marginBottom:14 }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'var(--action)',display:'inline-block' }}/> مبيعات</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'var(--info-light)',display:'inline-block' }}/> صافي ربح</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'var(--danger)',display:'inline-block' }}/> مصاريف</span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:110 }}>
              {pnlMonths.map((m,i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:95 }}>
                    <div title={`مبيعات: ${formatCurrency(m.revenue)}`} style={{ width:12, height:`${Math.max(2,(m.revenue/maxPnl)*90)}px`, background:'var(--action)', borderRadius:'3px 3px 0 0', transition:'height 0.4s ease' }}/>
                    <div title={`ربح: ${formatCurrency(m.netProfit)}`}  style={{ width:12, height:`${Math.max(2,(Math.abs(m.netProfit)/maxPnl)*90)}px`, background:m.netProfit>=0?'var(--info-light)':'var(--danger)', borderRadius:'3px 3px 0 0', opacity:0.85, transition:'height 0.4s ease' }}/>
                    <div title={`مصاريف: ${formatCurrency(m.expenses)}`} style={{ width:12, height:`${Math.max(2,(m.expenses/maxPnl)*90)}px`, background:'var(--danger)', borderRadius:'3px 3px 0 0', opacity:0.5, transition:'height 0.4s ease' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>ملخص الأشهر</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ color:'var(--text-muted)' }}>
                    {['الشهر','الطلبات','المبيعات','ربح إجمالي','رسوم حياك','مصاريف','صافي الربح','الهامش'].map(h => (
                      <th key={h} style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pnlMonths.map((m,i) => (
                    <tr key={i} style={{ opacity:m.revenue===0?0.45:1, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'8px', fontWeight:700 }}>{m.label}</td>
                      <td style={{ padding:'8px', color:'var(--text-sec)' }}>{m.orderCount}</td>
                      <td style={{ padding:'8px', color:'var(--action)', fontWeight:700, fontFamily:'Inter,sans-serif' }}>{formatCurrency(m.revenue)}</td>
                      <td style={{ padding:'8px', color:'var(--action)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(m.grossProfit)}</td>
                      <td style={{ padding:'8px', color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(m.hayyak)}</td>
                      <td style={{ padding:'8px', color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(m.expenses)}</td>
                      <td style={{ padding:'8px', fontWeight:800, fontFamily:'Inter,sans-serif', color:m.netProfit>=0?'var(--action)':'var(--danger)' }}>
                        {m.netProfit>=0?'+':''}{formatCurrency(m.netProfit)}
                      </td>
                      <td style={{ padding:'8px', color:'var(--warning)', fontWeight:700 }}>{m.revenue>0?pct(m.netProfit,m.revenue):'0'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {expCategories.length>0 && (
            <Card>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>المصاريف حسب الفئة ({selYear})</div>
              {expCategories.map(([cat,amt]) => (
                <BarRow key={cat} label={cat} value={formatCurrency(amt)} max={maxExpCat} total={0} color="var(--danger)"/>
              ))}
              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ fontWeight:700 }}>الإجمالي</span>
                <span style={{ fontWeight:900, color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(totalYtdExp)}</span>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'products' && (
        <>
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { value:'revenue', label:'الأعلى مبيعاً' },
              { value:'qty',     label:'الأكثر كمية' },
              { value:'profit',  label:'الأعلى ربحاً' },
              { value:'margin',  label:'أعلى هامش' },
            ].map(s => (
              <button key={s.value} onClick={() => setProdSort(s.value)} style={{
                padding:'7px 14px', borderRadius:999,
                border:`1.5px solid ${prodSort===s.value?'var(--action)':'var(--border)'}`,
                background: prodSort===s.value?'rgba(var(--action-rgb),0.1)':'var(--bg-hover)',
                color: prodSort===s.value?'var(--action)':'var(--text-muted)',
                fontSize:12, fontWeight:prodSort===s.value?800:500, cursor:'pointer', fontFamily:'inherit',
              }}>{s.label}</button>
            ))}
          </div>

          {sortedProducts.length===0 ? (
            <Card style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
              <div>لا يوجد بيانات منتجات بعد</div>
            </Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sortedProducts.map((p,i) => {
                const share = totalProductRevenue>0?(p.revenue/totalProductRevenue)*100:0
                const isTop = i===0
                const rankColors = ['linear-gradient(135deg,#f59e0b,#fbbf24)','linear-gradient(135deg,#94a3b8,#cbd5e1)','linear-gradient(135deg,#cd7c3a,#d4a35a)']
                return (
                  <div key={`${p.name}-${p.size}`} style={{ background:'var(--bg-surface)', border:`1.5px solid ${isTop?'var(--action)':'var(--border)'}`, borderRadius:'var(--r-lg)', padding:'14px 16px', boxShadow: isTop?'0 0 16px rgba(var(--action-rgb),0.08)':'var(--card-shadow)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:30,height:30,borderRadius:9,flexShrink:0, background:i<3?rankColors[i]:'var(--bg-hover)', display:'flex',alignItems:'center',justifyContent:'center', fontWeight:900,fontSize:12, color:i<3?'#ffffff':'var(--text-muted)' }}>
                        {i<3?`#${i+1}`:i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:14 }}>{p.name}</div>
                        {p.size && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.size}</div>}
                      </div>
                      <div style={{ fontWeight:900, fontSize:16, color:'var(--action)', fontFamily:'Inter,sans-serif' }}>{formatCurrency(p.revenue)}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                      {[
                        { label:'الكمية',     value:`${p.qty} وحدة`,         color:'var(--text-sec)' },
                        { label:'الربح',      value:formatCurrency(p.profit), color:p.profit>=0?'var(--success)':'var(--danger)' },
                        { label:'الهامش',     value:`${p.margin}%`,           color:'var(--warning)' },
                        { label:'سعر الوحدة', value:formatCurrency(p.avgPrice), color:'var(--text-muted)' },
                      ].map(s => (
                        <div key={s.label} style={{ padding:'5px 10px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:11 }}>
                          <span style={{ color:'var(--text-muted)' }}>{s.label}: </span>
                          <span style={{ fontWeight:700, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>
                        <span>حصة المبيعات</span><span>{share.toFixed(1)}%</span>
                      </div>
                      <div style={{ height:4, background:'var(--border)', borderRadius:99 }}>
                        <div style={{ width:`${share}%`, height:'100%', background:'linear-gradient(90deg,var(--action),var(--info-light))', borderRadius:99, transition:'width 0.4s ease' }}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'returns' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:20 }}>
            <KPI label="إجمالي الاستبدالات" value={allReplacements.length}        color="var(--danger)" sub={`${pct(allReplacements.length,orders.length)}% من الكل`}/>
            <KPI label="تكلفة الاستبدالات"  value={formatCurrency(totalReplCost)} color="var(--danger)" small/>
            <KPI label="لم يتم التسليم"     value={allNotDelivered.length}         color="var(--warning)"       sub={`${pct(allNotDelivered.length,orders.length)}% من الكل`}/>
            <KPI label="تكلفة لم يتم"       value={formatCurrency(totalNDCost)}    color="var(--warning)"       small/>
          </div>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>نسبة الاستبدال شهرياً</div>
            {pnlMonths.filter(m=>m.orderCount>0).map((m,i) => (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                  <span style={{ color:'var(--text-sec)' }}>{m.label} {m.year}</span>
                  <div style={{ display:'flex', gap:16 }}>
                    <span style={{ color:'var(--text-muted)' }}>{m.orderCount} طلب</span>
                    <span style={{ fontWeight:700, color:parseFloat(m.replaceRate)>10?'var(--danger)':'var(--success)' }}>
                      {m.replacements} استبدال ({m.replaceRate}%)
                    </span>
                  </div>
                </div>
                <div style={{ height:5, background:'var(--bg-hover)', borderRadius:99 }}>
                  <div style={{ width:`${Math.min(parseFloat(m.replaceRate)*5,100)}%`, height:'100%', background:parseFloat(m.replaceRate)>10?'var(--danger)':'var(--success)', borderRadius:99, transition:'width 0.4s ease' }}/>
                </div>
              </div>
            ))}
          </Card>

          {allReplacements.length>0 && (
            <Card style={{ marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>قائمة الاستبدالات</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {allReplacements.slice(0,20).map(o => (
                  <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-md)', flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', fontWeight:600 }}>{o.order_number}</span>
                    <span style={{ fontSize:12, flex:1, fontWeight:700 }}>{o.customer_name||'—'}</span>
                    {o.customer_city && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{o.customer_city}</span>}
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{o.order_date||formatDate(o.created_at)}</span>
                    <span style={{ fontWeight:800, color:'var(--danger)', fontSize:12, fontFamily:'Inter,sans-serif' }}>{formatCurrency(Math.abs(o.gross_profit||0))}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {allNotDelivered.length>0 && (
            <Card>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>طلبات لم يتم التسليم</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {allNotDelivered.slice(0,20).map(o => (
                  <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--bg-hover)', borderRadius:'var(--r-md)', flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', fontWeight:600 }}>{o.order_number}</span>
                    <span style={{ fontSize:12, flex:1, fontWeight:700 }}>{o.customer_name||'—'}</span>
                    {o.customer_city && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{o.customer_city}</span>}
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{o.order_date||formatDate(o.created_at)}</span>
                    <span style={{ fontWeight:800, color:'var(--warning)', fontSize:12, fontFamily:'Inter,sans-serif' }}>{formatCurrency(o.total||0)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {allReplacements.length===0&&allNotDelivered.length===0 && (
            <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:700, fontSize:16 }}>لا يوجد استبدالات أو طلبات غير مسلّمة</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
