// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { DB, Settings as SettingsDB, supabase } from '../data/db'
import { formatCurrency, formatDate, timeAgo, UAE_CITIES } from '../data/constants'
import { Btn, Badge, Input, Select, Textarea, Modal, Empty, PageHeader, Card, Spinner, toast, ConfirmModal } from '../components/ui'
import { IcWhatsapp, IcPlus, IcSave, IcEdit, IcDelete } from '../components/Icons'
import type { PageProps } from '../types'

/* ══════════════════════════════════════════════════
   WHATSAPP CENTER — مركز الواتساب
   Tabs: الرسائل | الحملات | الإشعارات التلقائية | المتابعة
══════════════════════════════════════════════════ */

const TABS = [
  { id: 'log',      label: 'سجل الرسائل' },
  { id: 'campaigns', label: 'الحملات' },
  { id: 'auto',     label: 'إشعارات تلقائية' },
  { id: 'followup', label: 'المتابعة الذكية' },
]

/* ── Segment definitions (match Customers.jsx) ── */
const SEGMENTS = [
  { id: 'all',  label: 'الكل',   color: 'var(--action)' },
  { id: 'VIP',  label: 'VIP',    color: 'var(--warning)' },
  { id: 'مخلص', label: 'مخلص',   color: 'var(--info)' },
  { id: 'نشط',  label: 'نشط',    color: 'var(--success)' },
  { id: 'جديد', label: 'جديد',   color: 'var(--action)' },
  { id: 'خامل', label: 'خامل',   color: 'var(--danger)' },
]

/* ── Template variable helpers ── */
function fillTemplate(template, vars) {
  let result = template
  Object.entries(vars).forEach(([key, val]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val || '')
  })
  return result
}

/* ── WhatsApp API sender via edge function ── */
async function sendViaAPI({ to, recipients, message }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('غير مسجل الدخول')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-sender`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, recipients, message }),
  })
  const data = await res.json()
  if (!res.ok && res.status !== 207) throw new Error(data.error || 'فشل الإرسال')
  return data
}

/* ── wa.me link generator (manual fallback) ── */
function generateWaMeLink(phone, message) {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  const encoded = encodeURIComponent(message || '')
  return `https://wa.me/${normalized}${encoded ? '?text=' + encoded : ''}`
}

function openWaMe(phone, message) {
  const link = generateWaMeLink(phone, message)
  if (link) window.open(link, '_blank')
  else toast('رقم الهاتف غير صالح', 'error')
}

/* ── Send mode toggle component ── */
function SendModeSwitch({ mode, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, background:'var(--bg-hover)', borderRadius:8, padding:2 }}>
      {[
        { id: 'api', label: 'API تلقائي', icon: '⚡' },
        { id: 'wame', label: 'wa.me يدوي', icon: '🔗' },
      ].map(m => (
        <button key={m.id} onClick={() => onChange(m.id)} style={{
          padding:'6px 12px', borderRadius:6, border:'none', cursor:'pointer',
          background: mode===m.id ? 'var(--whatsapp)' : 'transparent',
          color: mode===m.id ? '#fff' : 'var(--text-muted)',
          fontWeight: mode===m.id ? 700 : 500, fontSize:11, fontFamily:'inherit',
          transition:'all 120ms', display:'flex', alignItems:'center', gap:4,
        }}>{m.icon} {m.label}</button>
      ))}
    </div>
  )
}

/* ── Normalize UAE phone number ── */
function normalizePhone(phone) {
  if (!phone) return null
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (/^0/.test(cleaned)) return '971' + cleaned.slice(1)
  if (/^5/.test(cleaned)) return '971' + cleaned
  if (/^971/.test(cleaned)) return cleaned
  if (/^\+971/.test(cleaned)) return cleaned.slice(1)
  return cleaned
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function WhatsAppCenter(_: PageProps) {
  const [tab, setTab] = useState('log')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [templates, setTemplates] = useState({})
  const [autoSettings, setAutoSettings] = useState({})
  const [messageLog, setMessageLog] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [sendMode, setSendMode] = useState('api') // 'api' | 'wame'

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [ords, tpl, autoSet, campList, savedMode] = await Promise.all([
        DB.list('orders', { orderBy: 'created_at', limit: 500 }),
        SettingsDB.get('whatsapp_templates'),
        SettingsDB.get('whatsapp_auto_notifications'),
        SettingsDB.get('whatsapp_campaigns'),
        SettingsDB.get('whatsapp_send_mode'),
      ])
      if (savedMode) setSendMode(savedMode)
      setOrders(ords)
      setTemplates(tpl || {
        order_confirm: 'مرحبا {customer_name}،\n\nتم استلام طلبك بنجاح ✅\nرقم الطلب: {order_number}\nالإجمالي: {total} درهم\n\nشكراً لتسوقك مع موج 🌊',
        order_shipped: 'مرحبا {customer_name}،\n\nطلبك في الطريق إليك 🚚\nرقم الطلب: {order_number}\nرقم التتبع: {tracking_number}\n\nموج 🌊',
        order_delivered: 'مرحبا {customer_name}،\n\nنأمل أن طلبك وصلك بشكل سليم 🎁\nرقم الطلب: {order_number}\n\nيسعدنا خدمتك دائماً.\nموج 🌊',
        payment_reminder: 'مرحبا {customer_name}،\n\nتذكير ودّي بخصوص طلبك رقم {order_number}\nالمبلغ المتبقي: {total} درهم\n\nشكراً 💙 موج',
        followup_inactive: 'مرحبا {customer_name}،\n\nاشتقنا لك! 🌊\n\nلدينا عروض مميزة جديدة على مجموعتنا الكريستالية 💎\n\nتصفح الجديد عبر إنستغرام @mawj.ae ✨',
      })
      setAutoSettings(autoSet || {
        on_confirmed: true,
        on_shipped: true,
        on_delivered: false,
        on_not_delivered: false,
      })
      setCampaigns(campList || [])

      // Load message log from agent_runs
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('*')
        .like('task', 'WhatsApp%')
        .order('completed_at', { ascending: false })
        .limit(100)
      setMessageLog(runs || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="page">
      <PageHeader title="مركز الواتساب" subtitle="جاري التحميل..." />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh' }}><Spinner size={36}/></div>
    </div>
  )

  return (
    <div className="page">
      <PageHeader
        title="مركز الواتساب"
        subtitle="إدارة الرسائل والحملات والإشعارات التلقائية"
        actions={
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <SendModeSwitch mode={sendMode} onChange={async m => {
              setSendMode(m)
              await SettingsDB.set('whatsapp_send_mode', m)
            }} />
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: sendMode==='api' ? 'var(--success)' : 'var(--warning)', display:'inline-block' }}/>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{sendMode==='api' ? 'API متصل' : 'وضع wa.me'}</span>
            </div>
          </div>
        }
      />

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 4px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab===t.id ? 'linear-gradient(135deg,var(--whatsapp),var(--whatsapp))' : 'transparent',
            color: tab===t.id ? '#ffffff' : 'var(--text-muted)',
            fontWeight: tab===t.id ? 800 : 500, fontSize:12, fontFamily:'inherit', transition:'all 120ms',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'log' && <MessageLogTab log={messageLog} orders={orders} />}
      {tab === 'campaigns' && <CampaignsTab orders={orders} templates={templates} campaigns={campaigns} setCampaigns={setCampaigns} sendMode={sendMode} />}
      {tab === 'auto' && <AutoNotificationsTab settings={autoSettings} setSettings={setAutoSettings} templates={templates} setTemplates={setTemplates} sendMode={sendMode} />}
      {tab === 'followup' && <FollowUpTab orders={orders} templates={templates} sendMode={sendMode} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TAB 1: MESSAGE LOG — سجل الرسائل
══════════════════════════════════════════════════ */
function MessageLogTab({ log, orders }) {
  const [filter, setFilter] = useState('all') // all, sent, failed

  const filtered = useMemo(() => {
    if (filter === 'all') return log
    if (filter === 'sent') return log.filter(l => l.status === 'completed')
    return log.filter(l => l.status === 'failed')
  }, [log, filter])

  const stats = useMemo(() => {
    const total = log.length
    const sent = log.filter(l => l.status === 'completed').length
    const failed = log.filter(l => l.status === 'failed').length
    return { total, sent, failed, rate: total > 0 ? Math.round((sent/total)*100) : 0 }
  }, [log])

  return (
    <>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label: 'إجمالي الرسائل', value: stats.total, color: 'var(--text)' },
          { label: 'تم الإرسال', value: stats.sent, color: 'var(--success)' },
          { label: 'فشل', value: stats.failed, color: 'var(--danger)' },
          { label: 'نسبة النجاح', value: `${stats.rate}%`, color: 'var(--action)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
            <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif' }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[
          { id:'all',  label:'الكل' },
          { id:'sent', label:'تم الإرسال' },
          { id:'failed', label:'فشل' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:'6px 14px', borderRadius:999, border:'none', cursor:'pointer',
            background: filter===f.id ? 'rgba(var(--whatsapp-rgb),0.1)' : 'var(--bg-hover)',
            color: filter===f.id ? 'var(--whatsapp)' : 'var(--text-muted)',
            fontWeight: filter===f.id ? 700 : 500, fontSize:12, fontFamily:'inherit',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <Empty title="لا يوجد رسائل بعد" />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(msg => (
            <div key={msg.id} style={{
              background:'var(--bg-surface)', borderRadius:'var(--r-md)',
              padding:'12px 14px', boxShadow:'var(--card-shadow)',
              borderInlineStart: `3px solid ${msg.status==='completed' ? 'var(--success)' : 'var(--danger)'}`,
              display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(var(--whatsapp-rgb),0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <IcWhatsapp size={16} style={{ color:'var(--whatsapp)' }}/>
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>
                  {msg.task?.replace('WhatsApp: ','').slice(0,60)}...
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:8 }}>
                  {msg.whatsapp_to && <span>إلى: {msg.whatsapp_to.split(',').length} مستلم</span>}
                  <span>{timeAgo(msg.completed_at)}</span>
                </div>
              </div>
              <Badge variant={msg.status==='completed' ? 'success' : 'danger'}>
                {msg.status==='completed' ? 'تم' : 'فشل'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════
   TAB 2: CAMPAIGNS — الحملات
══════════════════════════════════════════════════ */
function CampaignsTab({ orders, templates, campaigns, setCampaigns, sendMode }) {
  const [showComposer, setShowComposer] = useState(false)
  const [segment, setSegment] = useState('all')
  const [city, setCity] = useState('all')
  const [message, setMessage] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(null)

  // Derive customer list from orders
  const customers = useMemo(() => {
    const map = {}
    orders.forEach(o => {
      const phone = normalizePhone(o.customer_phone)
      if (!phone || phone.length < 9) return
      const key = phone
      if (!map[key]) {
        map[key] = {
          name: o.customer_name || 'بدون اسم',
          phone,
          city: o.customer_city || '',
          totalSpent: 0,
          orderCount: 0,
          lastOrder: null,
          segment: 'جديد',
        }
      }
      map[key].totalSpent += (o.total || 0)
      map[key].orderCount++
      const oDate = o.order_date || o.created_at
      if (!map[key].lastOrder || new Date(oDate) > new Date(map[key].lastOrder)) {
        map[key].lastOrder = oDate
      }
    })

    // Assign segments
    const now = new Date()
    Object.values(map).forEach(c => {
      const daysSince = c.lastOrder ? Math.floor((now - new Date(c.lastOrder)) / 86400000) : 999
      if (c.totalSpent >= 2000 || c.orderCount >= 5) c.segment = 'VIP'
      else if (c.orderCount >= 3 && daysSince <= 60) c.segment = 'مخلص'
      else if (daysSince > 90) c.segment = 'خامل'
      else if (c.orderCount === 1) c.segment = 'جديد'
      else c.segment = 'نشط'
    })
    return Object.values(map)
  }, [orders])

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (segment !== 'all' && c.segment !== segment) return false
      if (city !== 'all' && c.city !== city) return false
      return true
    })
  }, [customers, segment, city])

  const cities = useMemo(() => {
    const set = new Set(customers.map(c => c.city).filter(Boolean))
    return [...set].sort()
  }, [customers])

  async function handleSend() {
    if (!message.trim()) { toast('أدخل نص الرسالة', 'error'); return }
    if (!filteredCustomers.length) { toast('لا يوجد مستلمين', 'error'); return }

    setSending(true)
    setSendProgress({ sent: 0, total: filteredCustomers.length, failed: 0 })

    const BATCH_SIZE = 10
    let sent = 0, failed = 0
    const batches = []
    for (let i = 0; i < filteredCustomers.length; i += BATCH_SIZE) {
      batches.push(filteredCustomers.slice(i, i + BATCH_SIZE))
    }

    for (const batch of batches) {
      try {
        const recipients = batch.map(c => c.phone)
        const personalizedMessages = batch.map(c =>
          fillTemplate(message, { customer_name: c.name, المدينة: c.city })
        )
        // Send one at a time for personalization
        for (let j = 0; j < batch.length; j++) {
          try {
            await sendViaAPI({ to: batch[j].phone, message: personalizedMessages[j] })
            sent++
          } catch {
            failed++
          }
          setSendProgress({ sent, total: filteredCustomers.length, failed })
        }
      } catch {
        failed += batch.length
        setSendProgress({ sent, total: filteredCustomers.length, failed })
      }
      // Brief pause between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    // Save campaign record
    const newCampaign = {
      id: Date.now().toString(),
      name: campaignName || `حملة ${new Date().toLocaleDateString('ar-AE')}`,
      segment,
      city,
      message: message.slice(0, 100),
      recipients: filteredCustomers.length,
      sent, failed,
      date: new Date().toISOString(),
    }
    const updated = [newCampaign, ...campaigns]
    setCampaigns(updated)
    await SettingsDB.set('whatsapp_campaigns', updated)

    setSending(false)
    setSendProgress(null)
    setShowComposer(false)
    toast(`تم إرسال ${sent} رسالة${failed > 0 ? ` (${failed} فشل)` : ''} ✓`)
  }

  return (
    <>
      {/* Stats bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:16 }}>
        {SEGMENTS.map(s => {
          const count = s.id === 'all' ? customers.length : customers.filter(c => c.segment === s.id).length
          return (
            <div key={s.id} style={{
              background:'var(--bg-surface)', borderRadius:'var(--r-md)', padding:'10px 12px',
              boxShadow:'var(--card-shadow)', cursor:'pointer',
              border: segment===s.id ? `2px solid ${s.color}` : '2px solid transparent',
            }} onClick={() => setSegment(s.id)}>
              <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:'Inter,sans-serif' }}>{count}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <Btn onClick={() => { setShowComposer(true); setMessage(templates.followup_inactive || '') }} style={{ background:'var(--whatsapp)', borderColor:'var(--whatsapp)', gap:6 }}>
          <IcWhatsapp size={15}/> حملة جديدة
        </Btn>
        <Select value={city} onChange={e => setCity(e.target.value)} style={{ maxWidth:180 }}>
          <option value="all">كل المدن</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {/* Campaign history */}
      {campaigns.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'var(--text-sec)' }}>الحملات السابقة</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {campaigns.slice(0, 10).map(c => (
              <div key={c.id} style={{
                background:'var(--bg-surface)', borderRadius:'var(--r-md)',
                padding:'12px 14px', boxShadow:'var(--card-shadow)',
                display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
              }}>
                <div style={{ width:36, height:36, borderRadius:'var(--r-md)', background:'rgba(var(--whatsapp-rgb),0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <IcWhatsapp size={18} style={{ color:'var(--whatsapp)' }}/>
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:8, marginTop:2 }}>
                    <span>{c.segment !== 'all' ? c.segment : 'الكل'}</span>
                    <span>{formatDate(c.date)}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--success)', fontFamily:'Inter,sans-serif' }}>{c.sent}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)' }}>تم</div>
                  </div>
                  {c.failed > 0 && (
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:15, fontWeight:800, color:'var(--danger)', fontFamily:'Inter,sans-serif' }}>{c.failed}</div>
                      <div style={{ fontSize:9, color:'var(--text-muted)' }}>فشل</div>
                    </div>
                  )}
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--text-sec)', fontFamily:'Inter,sans-serif' }}>{c.recipients}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)' }}>مستلم</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipient preview */}
      <Card>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>
          المستلمون ({filteredCustomers.length})
        </div>
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:12 }}>لا يوجد عملاء في هذه الشريحة</div>
        ) : (
          <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            {filteredCustomers.slice(0, 50).map((c, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                background:'var(--bg-hover)', borderRadius:'var(--r-sm)', fontSize:12,
              }}>
                <Badge variant={c.segment === 'VIP' ? 'action' : c.segment === 'خامل' ? 'danger' : 'muted'}>{c.segment}</Badge>
                <span style={{ fontWeight:600, flex:1 }}>{c.name}</span>
                <span style={{ color:'var(--text-muted)', fontFamily:'Inter,sans-serif', direction:'ltr' }}>{c.phone}</span>
                {c.city && <span style={{ color:'var(--text-muted)' }}>{c.city}</span>}
                <span style={{ color:'var(--action)', fontWeight:700, fontFamily:'Inter,sans-serif' }}>{formatCurrency(c.totalSpent)}</span>
                <button onClick={() => openWaMe(c.phone, '')} title="فتح wa.me" style={{
                  width:24, height:24, borderRadius:6, border:'none', cursor:'pointer',
                  background:'rgba(var(--whatsapp-rgb),0.1)', color:'var(--whatsapp)', display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, padding:0,
                }}>
                  <IcWhatsapp size={12}/>
                </button>
              </div>
            ))}
            {filteredCustomers.length > 50 && (
              <div style={{ textAlign:'center', padding:8, color:'var(--text-muted)', fontSize:11 }}>
                +{filteredCustomers.length - 50} عميل آخر
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Campaign composer modal */}
      <Modal
        open={showComposer}
        onClose={() => { if (!sending) setShowComposer(false) }}
        title="حملة واتساب جديدة"
        width={520}
        footer={!sending && <>
          <Btn variant="ghost" onClick={() => setShowComposer(false)}>إلغاء</Btn>
          {sendMode === 'wame' ? (
            <Btn onClick={() => {
              if (!message.trim()) { toast('أدخل نص الرسالة', 'error'); return }
              if (!filteredCustomers.length) { toast('لا يوجد مستلمين', 'error'); return }
              // Open wa.me for the first customer, show all links
              filteredCustomers.slice(0, 20).forEach((c, i) => {
                const msg = fillTemplate(message, { customer_name: c.name, المدينة: c.city })
                setTimeout(() => openWaMe(c.phone, msg), i * 300)
              })
              if (filteredCustomers.length > 20) toast(`تم فتح أول 20 رابط — المجموع ${filteredCustomers.length}`, 'warning')
              else toast(`تم فتح ${filteredCustomers.length} رابط wa.me ✓`)
              setShowComposer(false)
            }} style={{ background:'var(--whatsapp)', borderColor:'var(--whatsapp)', gap:6 }}>
              🔗 فتح wa.me ({Math.min(filteredCustomers.length, 20)})
            </Btn>
          ) : (
            <Btn onClick={handleSend} style={{ background:'var(--whatsapp)', borderColor:'var(--whatsapp)', gap:6 }}>
              <IcWhatsapp size={14}/> إرسال API ({filteredCustomers.length})
            </Btn>
          )}
        </>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="اسم الحملة" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="مثال: عرض نهاية الشهر" />
          <div style={{ display:'flex', gap:8 }}>
            <Select label="الشريحة" value={segment} onChange={e => setSegment(e.target.value)} style={{ flex:1 }}>
              {SEGMENTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Select label="المدينة" value={city} onChange={e => setCity(e.target.value)} style={{ flex:1 }}>
              <option value="all">الكل</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <label style={{ fontSize:12, fontWeight:600 }}>نص الرسالة</label>
              <div style={{ display:'flex', gap:4 }}>
                {['{customer_name}','{المدينة}'].map(v => (
                  <button key={v} onClick={() => setMessage(m => m + ' ' + v)} style={{
                    padding:'2px 8px', borderRadius:4, border:'1px solid var(--border)',
                    background:'var(--bg-hover)', fontSize:10, color:'var(--text-muted)',
                    cursor:'pointer', fontFamily:'monospace',
                  }}>{v}</button>
                ))}
              </div>
            </div>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." style={{ minHeight:120 }} />
          </div>

          {/* Quick templates */}
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>قوالب سريعة:</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {[
                { label: 'متابعة خامل', key: 'followup_inactive' },
                { label: 'تذكير دفع', key: 'payment_reminder' },
              ].map(t => (
                <button key={t.key} onClick={() => setMessage(templates[t.key] || '')} style={{
                  padding:'5px 12px', borderRadius:999, border:'1px solid var(--border)',
                  background:'var(--bg-hover)', fontSize:11, color:'var(--text-sec)',
                  cursor:'pointer', fontFamily:'inherit',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {message && filteredCustomers[0] && (
            <div style={{ background:'rgba(var(--whatsapp-rgb),0.06)', border:'1px solid rgba(var(--whatsapp-rgb),0.2)', borderRadius:'var(--r-md)', padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--whatsapp)', marginBottom:6 }}>معاينة ({filteredCustomers[0].name}):</div>
              <div style={{ fontSize:12, color:'var(--text)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>
                {fillTemplate(message, { customer_name: filteredCustomers[0].name, المدينة: filteredCustomers[0].city })}
              </div>
            </div>
          )}

          {/* Progress */}
          {sendProgress && (
            <div style={{ padding:16, background:'var(--bg-hover)', borderRadius:'var(--r-md)', textAlign:'center' }}>
              <Spinner size={24}/>
              <div style={{ marginTop:8, fontSize:13, fontWeight:700 }}>
                جاري الإرسال... {sendProgress.sent + sendProgress.failed}/{sendProgress.total}
              </div>
              <div style={{ marginTop:4, fontSize:11, color:'var(--text-muted)' }}>
                ✓ {sendProgress.sent} تم · ✗ {sendProgress.failed} فشل
              </div>
              <div style={{ height:4, background:'var(--border)', borderRadius:99, marginTop:8 }}>
                <div style={{
                  height:'100%', borderRadius:99, transition:'width 0.3s',
                  width:`${((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}%`,
                  background:'linear-gradient(90deg,var(--whatsapp),var(--whatsapp))',
                }}/>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

/* ══════════════════════════════════════════════════
   TAB 3: AUTO NOTIFICATIONS — إشعارات تلقائية
══════════════════════════════════════════════════ */
function AutoNotificationsTab({ settings, setSettings, templates, setTemplates, sendMode }) {
  const [saving, setSaving] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editText, setEditText] = useState('')

  const triggers = [
    { key: 'on_confirmed', label: 'عند تأكيد الطلب', desc: 'يُرسل تلقائياً عند تغيير الحالة إلى "مؤكد"', template: 'order_confirm', icon: '✅' },
    { key: 'on_shipped', label: 'عند الشحن', desc: 'يُرسل عند تغيير الحالة إلى "تم الشحن"', template: 'order_shipped', icon: '🚚' },
    { key: 'on_delivered', label: 'عند التسليم', desc: 'يُرسل عند تغيير الحالة إلى "تم التسليم"', template: 'order_delivered', icon: '🎁' },
    { key: 'on_not_delivered', label: 'عند فشل التسليم', desc: 'يُرسل متابعة عند "لم يتم التسليم"', template: 'payment_reminder', icon: '😕' },
  ]

  async function toggleTrigger(key) {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    await SettingsDB.set('whatsapp_auto_notifications', updated)
    toast(updated[key] ? 'تم التفعيل ✓' : 'تم الإيقاف')
  }

  async function saveTemplate() {
    const updated = { ...templates, [editingTemplate]: editText }
    setTemplates(updated)
    setSaving(true)
    try {
      await SettingsDB.set('whatsapp_templates', updated)
      toast('تم حفظ القالب ✓')
      setEditingTemplate(null)
    } catch { toast('فشل الحفظ', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div style={{ background:'rgba(var(--whatsapp-rgb),0.06)', border:'1px solid rgba(var(--whatsapp-rgb),0.15)', borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--whatsapp)', marginBottom:4 }}>الإشعارات التلقائية</div>
        <div style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.6 }}>
          {sendMode === 'api'
            ? 'عند تغيير حالة الطلب، يتم إرسال رسالة واتساب تلقائياً للعميل عبر Meta API.'
            : 'عند تغيير حالة الطلب، يتم فتح رابط wa.me لإرسال الرسالة يدوياً.'
          }
          {' '}يمكنك تخصيص القوالب وتفعيل/إيقاف كل إشعار.
        </div>
        <Badge variant={sendMode === 'api' ? 'success' : 'warning'} style={{ marginTop:6 }}>
          {sendMode === 'api' ? '⚡ وضع API تلقائي' : '🔗 وضع wa.me يدوي'}
        </Badge>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {triggers.map(t => (
          <div key={t.key} style={{
            background:'var(--bg-surface)', borderRadius:'var(--r-md)',
            padding:'14px 16px', boxShadow:'var(--card-shadow)',
            border: settings[t.key] ? '1.5px solid rgba(var(--whatsapp-rgb),0.3)' : '1.5px solid var(--border)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{t.icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{t.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{t.desc}</div>
                </div>
              </div>
              <button
                onClick={() => toggleTrigger(t.key)}
                style={{
                  width:48, height:26, borderRadius:999, border:'none', cursor:'pointer',
                  background: settings[t.key] ? 'var(--whatsapp)' : 'var(--border)',
                  position:'relative', transition:'background 200ms', flexShrink:0,
                }}
              >
                <span style={{
                  position:'absolute', top:3, width:20, height:20, borderRadius:'50%', background:'#fff',
                  transition:'all 200ms',
                  insetInlineEnd: settings[t.key] ? 3 : 'auto',
                  insetInlineStart: settings[t.key] ? 'auto' : 3,
                }}/>
              </button>
            </div>

            {/* Template preview + edit */}
            <div style={{
              background:'var(--bg-hover)', borderRadius:'var(--r-sm)', padding:'10px 12px',
              fontSize:12, color:'var(--text-sec)', whiteSpace:'pre-wrap', lineHeight:1.6,
            }}>
              {templates[t.template]?.slice(0, 120)}...
            </div>
            <button onClick={() => { setEditingTemplate(t.template); setEditText(templates[t.template] || '') }} style={{
              marginTop:8, background:'none', border:'none', color:'var(--action)', fontSize:11,
              fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:0,
            }}>
              تعديل القالب
            </button>
          </div>
        ))}
      </div>

      {/* Template variables reference */}
      <div style={{ marginTop:16, background:'var(--bg-hover)', borderRadius:'var(--r-md)', padding:'12px 14px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>المتغيرات المتاحة:</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['{customer_name}','{order_number}','{total}','{tracking_number}','{city}','{date}'].map(v => (
            <code key={v} style={{ padding:'2px 8px', borderRadius:4, background:'var(--bg-surface)', fontSize:10, color:'var(--action)', border:'1px solid var(--border)' }}>{v}</code>
          ))}
        </div>
      </div>

      {/* Edit template modal */}
      <Modal
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title="تعديل قالب الرسالة"
        width={480}
        footer={<>
          <Btn variant="ghost" onClick={() => setEditingTemplate(null)}>إلغاء</Btn>
          <Btn loading={saving} onClick={saveTemplate} style={{ gap:6 }}><IcSave size={14}/> حفظ القالب</Btn>
        </>}
      >
        <Textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ minHeight:160 }} />
        <div style={{ marginTop:10, display:'flex', gap:4, flexWrap:'wrap' }}>
          {['{customer_name}','{order_number}','{total}','{tracking_number}','{city}'].map(v => (
            <button key={v} onClick={() => setEditText(t => t + ' ' + v)} style={{
              padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)',
              background:'var(--bg-hover)', fontSize:10, cursor:'pointer', fontFamily:'monospace', color:'var(--text-muted)',
            }}>{v}</button>
          ))}
        </div>
      </Modal>
    </>
  )
}

/* ══════════════════════════════════════════════════
   TAB 4: SMART FOLLOW-UPS — المتابعة الذكية
══════════════════════════════════════════════════ */
function FollowUpTab({ orders, templates, sendMode }) {
  const [sending, setSending] = useState(null) // sending key

  const now = new Date()

  // Compute follow-up segments
  const followups = useMemo(() => {
    // 1. Pending COD — delivered but no remittance
    const pendingCOD = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
    const pendingTotal = pendingCOD.reduce((s, o) => s + (o.total || 0), 0)

    // 2. Not delivered — need follow-up
    const notDelivered = orders.filter(o => o.status === 'not_delivered' || o.status === 'لم يتم')

    // 3. Inactive customers (>60 days since last order)
    const custMap = {}
    orders.forEach(o => {
      const phone = normalizePhone(o.customer_phone)
      if (!phone) return
      if (!custMap[phone]) custMap[phone] = { name: o.customer_name, phone, lastOrder: null, totalSpent: 0 }
      const d = o.order_date || o.created_at
      if (!custMap[phone].lastOrder || new Date(d) > new Date(custMap[phone].lastOrder)) custMap[phone].lastOrder = d
      custMap[phone].totalSpent += (o.total || 0)
    })
    const inactive = Object.values(custMap).filter(c => {
      const days = c.lastOrder ? Math.floor((now - new Date(c.lastOrder)) / 86400000) : 999
      return days > 60
    })

    // 4. New orders without confirmation sent (orders in 'new' status older than 1 hour)
    const unconfirmed = orders.filter(o => {
      if (o.status !== 'new') return false
      const age = now - new Date(o.created_at)
      return age > 3600000 // > 1 hour
    })

    return { pendingCOD, pendingTotal, notDelivered, inactive, unconfirmed }
  }, [orders])

  async function sendFollowup(key, recipients, templateKey) {
    setSending(key)
    let sent = 0, failed = 0
    for (const r of recipients.slice(0, 50)) {
      const phone = normalizePhone(r.customer_phone || r.phone)
      if (!phone) { failed++; continue }
      const msg = fillTemplate(templates[templateKey] || '', {
        customer_name: r.customer_name || r.name || 'عزيزي العميل',
        order_number: r.order_number || '',
        total: String(r.total || ''),
        city: r.customer_city || '',
      })
      try {
        await sendViaAPI({ to: phone, message: msg })
        sent++
      } catch { failed++ }
    }
    setSending(null)
    toast(`تم إرسال ${sent} رسالة${failed > 0 ? ` (${failed} فشل)` : ''} ✓`)
  }

  function waFollowup(recipients, templateKey) {
    const items = recipients.slice(0, 10)
    items.forEach((r, i) => {
      const phone = normalizePhone(r.customer_phone || r.phone)
      const msg = fillTemplate(templates[templateKey] || '', {
        customer_name: r.customer_name || r.name || 'عزيزي العميل',
        order_number: r.order_number || '',
        total: String(r.total || ''),
        city: r.customer_city || '',
      })
      setTimeout(() => openWaMe(phone, msg), i * 300)
    })
    toast(`تم فتح ${items.length} رابط wa.me ✓`)
  }

  const cards = [
    {
      key: 'unconfirmed',
      icon: '📋', label: 'طلبات بدون تأكيد',
      desc: 'طلبات جديدة لم يُرسل لها تأكيد واتساب',
      count: followups.unconfirmed.length,
      color: 'var(--warning)',
      action: () => sendFollowup('unconfirmed', followups.unconfirmed, 'order_confirm'),
      waAction: () => waFollowup(followups.unconfirmed, 'order_confirm'),
      actionLabel: 'إرسال تأكيد',
    },
    {
      key: 'notDelivered',
      icon: '😕', label: 'لم يتم التسليم',
      desc: 'طلبات فشل توصيلها تحتاج متابعة',
      count: followups.notDelivered.length,
      color: 'var(--danger)',
      action: () => sendFollowup('notDelivered', followups.notDelivered, 'payment_reminder'),
      waAction: () => waFollowup(followups.notDelivered, 'payment_reminder'),
      actionLabel: 'إرسال متابعة',
    },
    {
      key: 'inactive',
      icon: '💤', label: 'عملاء خاملون',
      desc: 'لم يطلبوا منذ أكثر من 60 يوم',
      count: followups.inactive.length,
      color: 'var(--info)',
      sub: followups.inactive.length > 0 ? `إجمالي مشترياتهم: ${formatCurrency(followups.inactive.reduce((s, c) => s + c.totalSpent, 0))}` : null,
      action: () => sendFollowup('inactive', followups.inactive, 'followup_inactive'),
      waAction: () => waFollowup(followups.inactive, 'followup_inactive'),
      actionLabel: 'إعادة تنشيط',
    },
    {
      key: 'pendingCOD',
      icon: '💰', label: 'تحصيل COD معلق',
      desc: 'طلبات مسلّمة بانتظار التحصيل',
      count: followups.pendingCOD.length,
      color: 'var(--warning)',
      sub: `المبلغ: ${formatCurrency(followups.pendingTotal)}`,
      action: null,
      waAction: null,
      actionLabel: null,
    },
  ]

  return (
    <>
      <div style={{ background:'rgba(var(--whatsapp-rgb),0.06)', border:'1px solid rgba(var(--whatsapp-rgb),0.15)', borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--whatsapp)', marginBottom:4 }}>المتابعة الذكية</div>
        <div style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.6 }}>
          يكتشف النظام تلقائياً العملاء والطلبات التي تحتاج متابعة عبر واتساب.
          اضغط على الزر لإرسال الرسائل دفعة واحدة.
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {cards.map(c => (
          <div key={c.key} style={{
            background:'var(--bg-surface)', borderRadius:'var(--r-lg)',
            padding:'16px 18px', boxShadow:'var(--card-shadow)',
            borderInlineStart: `4px solid ${c.color}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:24 }}>{c.icon}</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:14 }}>{c.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{c.desc}</div>
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:900, color:c.color, fontFamily:'Inter,sans-serif' }}>{c.count}</div>
            </div>

            {c.sub && <div style={{ fontSize:12, color:'var(--text-sec)', marginBottom:8 }}>{c.sub}</div>}

            {c.action && c.count > 0 && (
              <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                {sendMode === 'api' ? (
                  <Btn
                    onClick={c.action}
                    loading={sending === c.key}
                    size="sm"
                    style={{ background:'var(--whatsapp)', borderColor:'var(--whatsapp)', gap:6 }}
                  >
                    <IcWhatsapp size={13}/> {c.actionLabel} API ({Math.min(c.count, 50)})
                  </Btn>
                ) : (
                  <Btn
                    onClick={() => c.waAction && c.waAction()}
                    size="sm"
                    style={{ background:'var(--whatsapp)', borderColor:'var(--whatsapp)', gap:6 }}
                  >
                    🔗 {c.actionLabel} wa.me ({Math.min(c.count, 10)})
                  </Btn>
                )}
              </div>
            )}
            {c.count === 0 && (
              <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>لا يوجد حالياً ✓</div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
