import React, { useState, useEffect } from 'react'
import { Settings as SettingsDB, DB } from '../data/db'
import { UAE_CITIES, FONTS } from '../data/constants'
import { Btn, Card, Input, Select, Textarea, Spinner, Tabs, Toggle, ColorPicker, Badge, Modal, toast } from '../components/ui'
import { IcPlus, IcDelete, IcEdit, IcSave, IcDownload, IcUpload } from '../components/Icons'

export default function Settings({ theme, toggleTheme }) {
  const [tab, setTab] = useState('business')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})

  const TABS = [
    { id: 'business', label: '🏪 المتجر' },
    { id: 'statuses', label: '📋 الحالات' },
    { id: 'team', label: '👥 الفريق' },
    { id: 'whatsapp', label: '📱 واتساب' },
    { id: 'appearance', label: '🎨 المظهر' },
    { id: 'delivery', label: '🚚 التوصيل' },
    { id: 'discounts', label: '🏷️ الخصومات' },
    { id: 'backup', label: '💾 النسخ الاحتياطي' },
  ]

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [business, statuses, products, appearance, templates, zones, customFields, partners] = await Promise.all([
        SettingsDB.get('business'),
        SettingsDB.get('statuses'),
        SettingsDB.get('products'),
        SettingsDB.get('appearance'),
        SettingsDB.get('whatsapp_templates'),
        SettingsDB.get('business').then(b => b?.delivery_zones || []),
        SettingsDB.get('custom_fields'),
        SettingsDB.get('partners'),
      ])
      setData({ business: business || {}, statuses: statuses || [], products: products || [], appearance: appearance || {}, templates: templates || {}, customFields: customFields || [], partners: partners || [] })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function saveSetting(key, value) {
    try {
      await SettingsDB.set(key, value)
      toast('تم الحفظ')
    } catch { toast('فشل الحفظ', 'error') }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size={36} /></div>

  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>الإعدادات</h1>
      <div style={{ marginBottom: 24 }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'business' && <BusinessTab data={data.business} onSave={v => { setData(p => ({ ...p, business: v })); saveSetting('business', v) }} products={data.products} onSaveProducts={v => { setData(p => ({ ...p, products: v })); saveSetting('products', v) }} partners={data.partners} onSavePartners={v => { setData(p => ({ ...p, partners: v })); saveSetting('partners', v) }} />}
      {tab === 'statuses' && <StatusesTab statuses={data.statuses} onSave={v => { setData(p => ({ ...p, statuses: v })); saveSetting('statuses', v) }} />}
      {tab === 'team' && <TeamTab />}
      {tab === 'whatsapp' && <WhatsAppTab templates={data.templates} onSave={v => { setData(p => ({ ...p, templates: v })); saveSetting('whatsapp_templates', v) }} />}
      {tab === 'appearance' && <AppearanceTab appearance={data.appearance} theme={theme} toggleTheme={toggleTheme} onSave={v => { setData(p => ({ ...p, appearance: v })); saveSetting('appearance', v) }} />}
      {tab === 'delivery' && <DeliveryTab business={data.business} onSave={v => { setData(p => ({ ...p, business: v })); saveSetting('business', v) }} />}
      {tab === 'discounts' && <DiscountsTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  )
}

// ─── BUSINESS TAB ────────────────────────────────────────────
function BusinessTab({ data, onSave, products, onSaveProducts, partners, onSavePartners }) {
  const [form, setForm] = useState(data || {})
  const [productForm, setProductForm] = useState({ name: '', price: '', cost: '', sku: '' })
  const [partnerName, setPartnerName] = useState('')
  const [addCourier, setAddCourier] = useState('')

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function addProduct() {
    if (!productForm.name) return
    const newProducts = [...(products || []), { id: `p${Date.now()}`, ...productForm, price: parseFloat(productForm.price) || 0, cost: parseFloat(productForm.cost) || 0 }]
    onSaveProducts(newProducts)
    setProductForm({ name: '', price: '', cost: '', sku: '' })
  }

  function removeProduct(id) { onSaveProducts(products.filter(p => p.id !== id)) }

  function addPartner() {
    if (!partnerName.trim()) return
    onSavePartners([...(partners || []), partnerName.trim()])
    setPartnerName('')
  }

  function addCourierFn() {
    if (!addCourier.trim()) return
    const couriers = [...(form.couriers || []), addCourier.trim()]
    setField('couriers', couriers)
    setAddCourier('')
  }

  function removeCourier(c) { setField('couriers', (form.couriers || []).filter(x => x !== c)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>معلومات المتجر</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="اسم المتجر" value={form.name || ''} onChange={e => setField('name', e.target.value)} containerStyle={{ gridColumn: '1 / -1' }} />
          <Input label="الهدف الشهري (د.إ)" type="number" value={form.monthly_target || ''} onChange={e => setField('monthly_target', parseFloat(e.target.value) || 0)} />
        </div>
        <Btn onClick={() => onSave(form)} style={{ marginTop: 16 }}><IcSave size={14}/> حفظ</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>الشركات الناقلة</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(form.couriers || []).map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 99 }}>
              <span style={{ fontSize: 13 }}>{c}</span>
              <button onClick={() => removeCourier(c)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={addCourier} onChange={e => setAddCourier(e.target.value)} placeholder="اسم الشركة الناقلة" containerStyle={{ flex: 1 }} />
          <Btn variant="secondary" onClick={addCourierFn}>إضافة</Btn>
        </div>
        <Btn onClick={() => onSave(form)} style={{ marginTop: 12 }}><IcSave size={14}/> حفظ</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>المنتجات</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {products.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.sku}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>تكلفة: {p.cost} د.إ</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>{p.price} د.إ</span>
              <button onClick={() => removeProduct(p.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px auto', gap: 8, alignItems: 'end' }}>
          <Input label="اسم المنتج" value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder="اسم المنتج" />
          <Input label="السعر" type="number" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} />
          <Input label="التكلفة" type="number" value={productForm.cost} onChange={e => setProductForm(p => ({ ...p, cost: e.target.value }))} />
          <Input label="SKU" value={productForm.sku} onChange={e => setProductForm(p => ({ ...p, sku: e.target.value }))} />
          <Btn onClick={addProduct} style={{ alignSelf: 'flex-end' }}><IcPlus size={14}/></Btn>
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>الشركاء</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(partners || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 99 }}>
              <span style={{ fontSize: 13 }}>{p}</span>
              <button onClick={() => onSavePartners(partners.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="اسم الشريك" containerStyle={{ flex: 1 }} />
          <Btn variant="secondary" onClick={addPartner}>إضافة</Btn>
        </div>
      </Card>
    </div>
  )
}

// ─── STATUSES TAB ────────────────────────────────────────────
function StatusesTab({ statuses, onSave }) {
  const [list, setList] = useState(statuses || [])
  const [newStatus, setNewStatus] = useState({ label: '', color: '#00e4b8' })

  function addStatus() {
    if (!newStatus.label) return
    const updated = [...list, { id: `status_${Date.now()}`, ...newStatus, order: list.length }]
    setList(updated)
    onSave(updated)
    setNewStatus({ label: '', color: '#00e4b8' })
  }

  function removeStatus(id) {
    const updated = list.filter(s => s.id !== id)
    setList(updated)
    onSave(updated)
  }

  function updateStatus(id, field, value) {
    const updated = list.map(s => s.id === id ? { ...s, [field]: value } : s)
    setList(updated)
  }

  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>حالات الطلبات</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {list.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
            <input type="color" value={s.color} onChange={e => updateStatus(s.id, 'color', e.target.value)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }} />
            <input
              value={s.label}
              onChange={e => updateStatus(s.id, 'label', e.target.value)}
              onBlur={() => onSave(list)}
              style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.id}</span>
            <Badge color={s.color} style={{ fontSize: 11 }}>{s.label}</Badge>
            <button onClick={() => removeStatus(s.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <input type="color" value={newStatus.color} onChange={e => setNewStatus(p => ({ ...p, color: e.target.value }))} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0 }} />
        <Input label="اسم الحالة الجديدة" value={newStatus.label} onChange={e => setNewStatus(p => ({ ...p, label: e.target.value }))} containerStyle={{ flex: 1 }} placeholder="مثال: انتظار الدفع" />
        <Btn onClick={addStatus} style={{ alignSelf: 'flex-end' }}><IcPlus size={14}/> إضافة</Btn>
      </div>
    </Card>
  )
}

// ─── TEAM TAB ────────────────────────────────────────────────
function TeamTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    DB.list('users').then(u => { setUsers(u); setLoading(false) })
  }, [])

  if (loading) return <Spinner />

  const ROLE_LABELS = { admin: 'مدير', accountant: 'محاسب', sales: 'مبيعات', viewer: 'مشاهد' }
  const ROLE_COLORS = { admin: 'var(--teal)', accountant: 'var(--gold)', sales: 'var(--violet)', viewer: 'var(--text-muted)' }

  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>أعضاء الفريق</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {u.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.email}</div>
            </div>
            <Badge color={ROLE_COLORS[u.role] || 'var(--text-muted)'}>{ROLE_LABELS[u.role] || u.role}</Badge>
            <Badge color={u.active ? 'var(--green)' : 'var(--red)'} style={{ fontSize: 10 }}>{u.active ? 'نشط' : 'موقف'}</Badge>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(0,228,184,0.06)', border: '1px solid rgba(0,228,184,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-sec)' }}>
        💡 لإضافة مستخدمين جدد، أضفهم في لوحة Supabase → Authentication ثم أضف بريدهم في جدول users.
      </div>
    </Card>
  )
}

// ─── WHATSAPP TAB ────────────────────────────────────────────
function WhatsAppTab({ templates, onSave }) {
  const [form, setForm] = useState(templates || {})
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const TEMPLATE_LABELS = {
    order_confirm: 'تأكيد الطلب',
    order_shipped: 'تم الشحن',
    order_delivered: 'تم التسليم',
    daily_summary: 'الملخص اليومي',
  }

  const VARIABLES = ['{customer_name}', '{order_number}', '{total}', '{tracking_number}', '{expected_delivery}', '{date}', '{new_orders}', '{revenue}', '{profit}']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 8 }}>المتغيرات المتاحة:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VARIABLES.map(v => (
            <code key={v} style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 4, color: 'var(--teal)' }}>{v}</code>
          ))}
        </div>
      </Card>
      {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
        <Card key={key}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📱 {label}</div>
          <Textarea
            value={form[key] || ''}
            onChange={e => setField(key, e.target.value)}
            style={{ minHeight: 100, fontFamily: 'var(--font)', lineHeight: 1.8 }}
          />
        </Card>
      ))}
      <Btn onClick={() => onSave(form)} style={{ alignSelf: 'flex-start' }}><IcSave size={14}/> حفظ القوالب</Btn>
    </div>
  )
}

// ─── APPEARANCE TAB ──────────────────────────────────────────
function AppearanceTab({ appearance, theme, toggleTheme, onSave }) {
  const isLight = theme === 'light'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>وضع العرض</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { id: 'dark', label: '🌙 داكن', desc: 'مريح للعيون' },
            { id: 'light', label: '☀️ فاتح', desc: 'إضاءة كاملة' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { if (theme !== t.id) toggleTheme() }}
              style={{
                flex: 1, padding: '16px', borderRadius: 'var(--radius)',
                border: `2px solid ${theme === t.id ? 'var(--teal)' : 'var(--bg-border)'}`,
                background: theme === t.id ? 'rgba(0,228,184,0.08)' : 'var(--bg-surface)',
                color: theme === t.id ? 'var(--teal)' : 'var(--text-sec)',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
                transition: 'all 0.2s ease',
                boxShadow: theme === t.id ? '0 0 20px rgba(0,228,184,0.15)' : 'none',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{t.label.split(' ')[0]}</div>
              <div>{t.label.split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{t.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>الوضع الحالي: <strong style={{ color: 'var(--teal)' }}>{isLight ? 'فاتح' : 'داكن'}</strong></span>
          <button onClick={toggleTheme} style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid var(--bg-border)', background: 'var(--bg-glass)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            تبديل
          </button>
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>الخط</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(FONTS).map(f => (
            <button key={f} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', background: 'var(--bg-surface)', color: 'var(--text-sec)', cursor: 'pointer', fontFamily: FONTS[f], fontSize: 13, fontWeight: 600 }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>الخط الافتراضي هو Noto Kufi Arabic</div>
      </Card>
    </div>
  )
}

// ─── DELIVERY TAB ────────────────────────────────────────────
function DeliveryTab({ business, onSave }) {
  const [zones, setZones] = useState(business?.delivery_zones || [])
  const [newCity, setNewCity] = useState('')
  const [newCost, setNewCost] = useState('')

  function addZone() {
    if (!newCity || !newCost) return
    const updated = [...zones, { city: newCity, cost: parseFloat(newCost) }]
    setZones(updated)
    onSave({ ...business, delivery_zones: updated })
    setNewCity('')
    setNewCost('')
  }

  function removeZone(i) {
    const updated = zones.filter((_, j) => j !== i)
    setZones(updated)
    onSave({ ...business, delivery_zones: updated })
  }

  function updateZoneCost(i, cost) {
    const updated = zones.map((z, j) => j === i ? { ...z, cost: parseFloat(cost) || 0 } : z)
    setZones(updated)
  }

  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>مناطق التوصيل</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {zones.map((z, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{z.city}</span>
            <input
              type="number"
              value={z.cost}
              onChange={e => updateZoneCost(i, e.target.value)}
              onBlur={() => onSave({ ...business, delivery_zones: zones })}
              style={{ width: 80, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 6, color: 'var(--teal)', fontWeight: 700, fontSize: 13, textAlign: 'center', fontFamily: 'var(--font)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>د.إ</span>
            <button onClick={() => removeZone(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <Select value={newCity} onChange={e => setNewCity(e.target.value)} containerStyle={{ flex: 1 }} label="إضافة مدينة">
          <option value="">اختر المدينة</option>
          {UAE_CITIES.filter(c => !zones.find(z => z.city === c)).map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="التكلفة" type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="20" containerStyle={{ width: 100 }} />
        <Btn onClick={addZone} style={{ alignSelf: 'flex-end' }}>إضافة</Btn>
      </div>
    </Card>
  )
}

// ─── DISCOUNTS TAB ───────────────────────────────────────────
function DiscountsTab() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    DB.list('discounts').then(d => { setDiscounts(d); setLoading(false) })
  }, [])

  async function addDiscount() {
    if (!form.code || !form.value) { toast('أدخل الكود والقيمة', 'error'); return }
    setSaving(true)
    try {
      const saved = await DB.insert('discounts', { ...form, value: parseFloat(form.value), uses_count: 0 })
      setDiscounts(prev => [saved, ...prev])
      setForm({ code: '', type: 'percent', value: '', active: true })
      toast('تم إضافة كود الخصم')
    } catch (err) { toast('فشل الحفظ: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  async function toggleDiscount(id, active) {
    await DB.update('discounts', id, { active })
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active } : d))
  }

  async function deleteDiscount(id) {
    await DB.delete('discounts', id)
    setDiscounts(prev => prev.filter(d => d.id !== id))
    toast('تم الحذف')
  }

  if (loading) return <Spinner />

  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>أكواد الخصم</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {discounts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>لا يوجد أكواد خصم</div>
        ) : (
          discounts.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <code style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)', minWidth: 100 }}>{d.code}</code>
              <Badge color={d.type === 'percent' ? 'var(--violet)' : 'var(--gold)'}>{d.value}{d.type === 'percent' ? '%' : ' د.إ'}</Badge>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>استخدم: {d.uses_count || 0}</span>
              <Toggle checked={d.active} onChange={v => toggleDiscount(d.id, v)} />
              <button onClick={() => deleteDiscount(d.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, marginRight: 'auto' }}>✕</button>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px auto', gap: 10, alignItems: 'flex-end' }}>
        <Input label="كود الخصم" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" dir="ltr" />
        <Select label="النوع" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
          <option value="percent">نسبة %</option>
          <option value="fixed">مبلغ ثابت</option>
        </Select>
        <Input label="القيمة" type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="20" />
        <Btn loading={saving} onClick={addDiscount} style={{ alignSelf: 'flex-end' }}><IcPlus size={14}/> إضافة</Btn>
      </div>
    </Card>
  )
}

// ─── BACKUP TAB ──────────────────────────────────────────────
function BackupTab() {
  const [exporting, setExporting] = useState(false)

  async function exportData() {
    setExporting(true)
    try {
      const [orders, expenses, settlements, inventory, suppliers, capital, withdrawals] = await Promise.all([
        DB.list('orders'),
        DB.list('expenses'),
        DB.list('settlements'),
        DB.list('inventory'),
        DB.list('suppliers'),
        DB.list('capital_entries'),
        DB.list('withdrawals'),
      ])
      const backup = {
        exportDate: new Date().toISOString(),
        version: '7.0',
        data: { orders, expenses, settlements, inventory, suppliers, capital_entries: capital, withdrawals }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mawj-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('تم تصدير البيانات بنجاح')
    } catch { toast('فشل التصدير', 'error') }
    finally { setExporting(false) }
  }

  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>النسخ الاحتياطي</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '16px', background: 'rgba(0,228,184,0.06)', border: '1px solid rgba(0,228,184,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>تصدير كامل</div>
          <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 12 }}>تصدير جميع بياناتك (طلبات، مصاريف، مخزون...) كملف JSON يمكن حفظه أو استيراده لاحقاً.</div>
          <Btn loading={exporting} onClick={exportData}><IcDownload size={14}/> تصدير البيانات</Btn>
        </div>
        <div style={{ padding: '16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠️ ملاحظة</div>
          <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>الاستيراد يتطلب تشغيل سكريبت Supabase يدوياً. احرص على عمل نسخة احتياطية دورية.</div>
        </div>
      </div>
    </Card>
  )
}


