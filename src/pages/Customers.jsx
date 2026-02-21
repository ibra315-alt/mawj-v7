import React, { useState, useEffect } from 'react'
import { DB } from '../data/db'
import { formatCurrency, formatDate } from '../data/constants'
import { Card, Badge, Spinner, Empty, PageHeader, Input } from '../components/ui'
import { IcSearch, IcPhone, IcOrders } from '../components/Icons'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const orders = await DB.list('orders', { orderBy: 'created_at' })
      const map = {}
      orders.forEach(o => {
        const key = o.customer_phone || o.customer_name
        if (!map[key]) {
          map[key] = { name: o.customer_name, phone: o.customer_phone, city: o.customer_city, orders: [], totalSpent: 0 }
        }
        map[key].orders.push(o)
        map[key].totalSpent += (o.total || 0)
      })
      const list = Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent)
      setCustomers(list)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtered = customers.filter(c =>
    !search || c.name.includes(search) || c.phone?.includes(search) || c.city?.includes(search)
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <PageHeader title="العملاء" subtitle={`${customers.length} عميل`} />

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <IcSearch size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم، الهاتف، المدينة..."
          style={{ width: '100%', padding: '9px 36px 9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
        />
      </div>

      {filtered.length === 0 ? <Empty title="لا يوجد عملاء" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((c, i) => (
            <Card
              key={i}
              hover
              glow="var(--teal)"
              onClick={() => setSelected(selected === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                  {c.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.city && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.city}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--bg-border)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>{c.orders.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>طلب</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(c.totalSpent)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>إجمالي</div>
                  </div>
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(0,228,184,0.1)', border: '1px solid rgba(0,228,184,0.25)', borderRadius: 99, color: 'var(--teal)', fontSize: 12 }}
                  >
                    <IcPhone size={12} /> {c.phone}
                  </a>
                )}
              </div>

              {selected === i && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--bg-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>آخر الطلبات</div>
                  {c.orders.slice(-3).reverse().map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--bg-border)' }}>
                      <span style={{ color: 'var(--text-sec)' }}>{o.order_number}</span>
                      <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{formatCurrency(o.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
