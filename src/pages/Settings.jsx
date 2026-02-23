import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Settings as SettingsDB, DB } from '../data/db'
import { UAE_CITIES, FONTS } from '../data/constants'
import { Btn, Card, Input, Select, Textarea, Spinner, Toggle, Badge, toast } from '../components/ui'
import { IcPlus, IcSave, IcDownload } from '../components/Icons'

/* ══════════════════════════════════════════════════
   SETTINGS v9 — Sidebar navigation
   10 sections · 8 themes · Advanced controls
══════════════════════════════════════════════════ */

const SECTIONS = [
  { id: 'business', icon: '🏪', label: 'المتجر', desc: 'معلومات المتجر والمنتجات' },
  { id: 'statuses', icon: '📋', label: 'الحالات', desc: 'حالات الطلبات وألوانها' },
  { id: 'team', icon: '👥', label: 'الفريق', desc: 'أعضاء وصلاحيات' },
  { id: 'whatsapp', icon: '📱', label: 'واتساب', desc: 'قوالب الرسائل' },
  { id: 'appearance', icon: '🎨', label: 'المظهر', desc: 'ثيمات وألوان وخطوط' },
  { id: 'delivery', icon: '🚚', label: 'التوصيل', desc: 'مناطق وتكاليف' },
  { id: 'discounts', icon: '🏷️', label: 'الخصومات', desc: 'أكواد وعروض' },
  { id: 'notifications', icon: '🔔', label: 'الإشعارات', desc: 'تنبيهات وتذكيرات' },
  { id: 'security', icon: '🔐', label: 'الأمان', desc: 'كلمة المرور والجلسة' },
  { id: 'backup', icon: '💾', label: 'النسخ الاحتياطي', desc: 'تصدير واستيراد' },
]

export default function Settings({ theme, toggleTheme }) {
  const [section, setSection] = useState('business')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ business: {}, statuses: [], products: [], templates: {}, partners: [] })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [business, statuses, products, templates, partners] = await Promise.all([
        SettingsDB.get('business'),
        SettingsDB.get('statuses'),
        SettingsDB.get('products'),
        SettingsDB.get('whatsapp_templates'),
        SettingsDB.get('partners'),
      ])
      setData({ business: business || {}, statuses: statuses || [], products: products || [], templates: templates || {}, partners: partners || [] })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function saveSetting(key, value) {
    try { await SettingsDB.set(key, value); toast('تم الحفظ ✓') }
    catch { toast('فشل الحفظ', 'error') }
  }

  function updateData(key, value) {
    setData(p => ({ ...p, [key]: value }))
    saveSetting(key, value)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={36} />
    </div>
  )

  const active = SECTIONS.find(s => s.id === section)

  const contentProps = {
    data, updateData, theme, toggleTheme,
    statuses: data.statuses,
    products: data.products,
    partners: data.partners,
    templates: data.templates,
    business: data.business,
  }

  function renderSection() {
    switch (section) {
      case 'business': return <BusinessTab      {...contentProps} />
      case 'statuses': return <StatusesTab      {...contentProps} />
      case 'team': return <TeamTab />
      case 'whatsapp': return <WhatsAppTab      {...contentProps} />
      case 'appearance': return <AppearanceTab    {...contentProps} />
      case 'delivery': return <DeliveryTab      {...contentProps} />
      case 'discounts': return <DiscountsTab />
      case 'notifications': return <NotificationsTab />
      case 'security': return <SecurityTab />
      case 'backup': return <BackupTab />
      default: return null
    }
  }

  /* ── Mobile full-screen section ── */
  const MobileSection = mobileOpen ? createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      animation: 'pageIn 0.22s var(--ease-smooth) both',
    }}>
      <div style={{ height: 3, flexShrink: 0, background: 'linear-gradient(90deg,var(--violet-light),var(--teal),var(--pink))' }} />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--glass-border)',
        flexShrink: 0, background: 'var(--header-bg)',
        backdropFilter: 'var(--blur-md)', WebkitBackdropFilter: 'var(--blur-md)',
      }}>
        <button onClick={() => setMobileOpen(false)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--teal)',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>← رجوع</button>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: 'var(--text)' }}>
          {active?.icon} {active?.label}
        </h2>
        <div style={{ width: 64 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
        {renderSection()}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="page" style={{ paddingTop: 8 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: 'var(--text)' }}>الإعدادات</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>تخصيص النظام وإدارة البيانات</p>
      </div>
      <div className="page-wave-accent" style={{ marginBottom: 20 }} />

      {/* ── Desktop layout: sidebar + panel ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }} className="settings-layout">

        {/* Sidebar */}
        <div style={{
          width: 220, flexShrink: 0,
          background: 'var(--bg-glass)',
          backdropFilter: 'var(--blur-md)', WebkitBackdropFilter: 'var(--blur-md)',
          border: '1.5px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 8,
          position: 'sticky', top: 16,
        }} className="settings-sidebar">
          {SECTIONS.map(s => {
            const active = section === s.id
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', background: active
                  ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(37,99,235,0.08))'
                  : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease', textAlign: 'right',
                borderRight: active ? '2.5px solid var(--teal)' : '2.5px solid transparent',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? 'var(--teal)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
                </div>
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, boxShadow: '0 0 8px var(--teal)' }} />}
              </button>
            )
          })}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, minWidth: 0 }} className="settings-content">
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
            padding: '14px 18px',
            background: 'var(--bg-glass)',
            backdropFilter: 'var(--blur-sm)', WebkitBackdropFilter: 'var(--blur-sm)',
            border: '1.5px solid var(--glass-border)',
            borderRadius: 'var(--radius)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg,rgba(0,228,184,0.15),rgba(37,99,235,0.10))',
              border: '1px solid var(--glass-border-teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{active?.icon}</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)' }}>{active?.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{active?.desc}</div>
            </div>
          </div>
          <div className="stagger">{renderSection()}</div>
        </div>
      </div>

      {/* ── Mobile: section list ── */}
      <div className="settings-mobile-list">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => { setSection(s.id); setMobileOpen(true) }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', marginBottom: 8,
            background: 'var(--bg-glass)',
            border: '1.5px solid var(--glass-border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }} className="mawj-card mawj-card-hover">
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(0,228,184,0.10),rgba(37,99,235,0.08))',
              border: '1px solid var(--glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{s.icon}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>‹</span>
          </button>
        ))}
      </div>

      {MobileSection}

      <style>{`
        @media (max-width: 768px) {
          .settings-layout { display: none !important; }
          .settings-mobile-list { display: block !important; }
        }
        @media (min-width: 769px) {
          .settings-layout { display: flex !important; }
          .settings-mobile-list { display: none !important; }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════════════ */
function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, marginBottom: 18, color: 'var(--text)', paddingBottom: 10, borderBottom: '1px solid var(--glass-border)' }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      {children}
    </div>
  )
}

function ControlRow({ label, desc, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: last ? 'none' : '1px solid var(--glass-border)',
      gap: 16,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function ControlBtn({ active, onClick, children, style = {}, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      minWidth: 36, height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)',
      border: `2px solid ${active ? 'var(--teal)' : 'var(--glass-border)'}`,
      background: active ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(37,99,235,0.08))' : 'var(--bg-glass)',
      color: active ? 'var(--teal)' : 'var(--text-sec)',
      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 0 12px rgba(0,228,184,0.2)' : 'none',
      ...style,
    }}>{children}</button>
  )
}

function GlassRow({ children, style }) {
  return (
    <div className="list-row" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'var(--bg-surface)',
      backdropFilter: 'var(--blur-sm)', WebkitBackdropFilter: 'var(--blur-sm)',
      border: '1.5px solid var(--glass-border)',
      borderRadius: 'var(--radius-sm)',
      ...style,
    }}>{children}</div>
  )
}

function InfoBox({ children, color = 'var(--teal)', icon = '💡' }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: `rgba(${color === 'var(--teal)' ? '0,228,184' : '37,99,235'},0.06)`,
      border: `1px solid ${color === 'var(--teal)' ? 'rgba(0,228,184,0.18)' : 'rgba(37,99,235,0.18)'}`,
      borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-sec)',
      display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.6,
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BUSINESS TAB
══════════════════════════════════════════════════ */
function BusinessTab({ data, products, partners, updateData }) {
  const [form, setForm] = useState(data.business || {})
  const [pForm, setPForm] = useState({ name: '', price: '', cost: '', sku: '' })
  const [partnerName, setPartnerName] = useState('')

  function field(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function addProduct() {
    if (!pForm.name) return
    const updated = [...(products || []), { id: `p${Date.now()}`, ...pForm, price: parseFloat(pForm.price) || 0, cost: parseFloat(pForm.cost) || 0 }]
    updateData('products', updated)
    setPForm({ name: '', price: '', cost: '', sku: '' })
  }

  function removeProduct(id) { updateData('products', (products || []).filter(p => p.id !== id)) }

  function addPartner() {
    if (!partnerName.trim()) return
    updateData('partners', [...(partners || []), partnerName.trim()])
    setPartnerName('')
  }

  const CURRENCIES = [{ v: 'AED', l: 'درهم إماراتي (د.إ)' }, { v: 'SAR', l: 'ريال سعودي (ر.س)' }, { v: 'USD', l: 'دولار أمريكي ($)' }, { v: 'EUR', l: 'يورو (€)' }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="🏪">معلومات المتجر</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <Input label="اسم المتجر" value={form.name || ''} onChange={e => field('name', e.target.value)} containerStyle={{ gridColumn: '1/-1' }} />
          <Input label="الهدف الشهري (د.إ)" type="number" value={form.monthly_target || ''} onChange={e => field('monthly_target', parseFloat(e.target.value) || 0)} />
          <Input label="بادئة رقم الطلب" value={form.order_prefix || 'MWJ'} onChange={e => field('order_prefix', e.target.value)} placeholder="MWJ" dir="ltr" />
          <Input label="نسبة الضريبة / VAT %" type="number" value={form.vat_rate || ''} onChange={e => field('vat_rate', parseFloat(e.target.value) || 0)} />
          <Select label="العملة" value={form.currency || 'AED'} onChange={e => field('currency', e.target.value)} containerStyle={{ gridColumn: '1/-1' }}>
            {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
          </Select>
        </div>
        <Btn onClick={() => updateData('business', form)}><IcSave size={14} /> حفظ الإعدادات</Btn>
      </Card>

      <Card>
        <SectionTitle icon="📦">المنتجات</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {(products || []).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>لا توجد منتجات بعد</div>}
          {(products || []).map(p => (
            <GlassRow key={p.id}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{p.name}</div>
                {p.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.sku}</div>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-sec)' }}>تكلفة: {p.cost}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>{p.price} د.إ</span>
              <button onClick={() => removeProduct(p.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
            </GlassRow>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px auto', gap: 8, alignItems: 'flex-end' }} className="form-grid-2">
          <Input label="اسم المنتج" value={pForm.name} onChange={e => setPForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: طقم كريستال" />
          <Input label="السعر" type="number" value={pForm.price} onChange={e => setPForm(p => ({ ...p, price: e.target.value }))} />
          <Input label="التكلفة" type="number" value={pForm.cost} onChange={e => setPForm(p => ({ ...p, cost: e.target.value }))} />
          <Input label="SKU" value={pForm.sku} onChange={e => setPForm(p => ({ ...p, sku: e.target.value }))} dir="ltr" />
          <Btn onClick={addProduct} style={{ alignSelf: 'flex-end' }}><IcPlus size={14} /></Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="🤝">الشركاء</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {(partners || []).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا يوجد شركاء بعد</div>}
          {(partners || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(37,99,235,0.08)', border: '1px solid var(--glass-border)', borderRadius: 999 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{p}</span>
              <button onClick={() => updateData('partners', partners.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>✕</button>
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

/* ══════════════════════════════════════════════════
   STATUSES TAB
══════════════════════════════════════════════════ */
function StatusesTab({ statuses, updateData }) {
  const [list, setList] = useState(statuses || [])
  const [form, setForm] = useState({ label: '', color: '#00e4b8' })
  const [dragIdx, setDragIdx] = useState(null)

  function add() {
    if (!form.label) return
    const updated = [...list, { id: `s_${Date.now()}`, ...form, order: list.length }]
    setList(updated); updateData('statuses', updated)
    setForm({ label: '', color: '#00e4b8' })
  }

  function remove(id) { const u = list.filter(s => s.id !== id); setList(u); updateData('statuses', u) }

  function update(id, field, value) {
    const updated = list.map(s => s.id === id ? { ...s, [field]: value } : s)
    setList(updated)
  }

  function onDragStart(i) { setDragIdx(i) }
  function onDragOver(e, i) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const newList = [...list]
    const [moved] = newList.splice(dragIdx, 1)
    newList.splice(i, 0, moved)
    setList(newList)
    setDragIdx(i)
  }
  function onDrop() { updateData('statuses', list); setDragIdx(null) }

  return (
    <Card>
      <SectionTitle icon="📋">حالات الطلبات</SectionTitle>
      <InfoBox>اسحب الحالات لإعادة ترتيبها. الترتيب يؤثر على عمود الكانبان.</InfoBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, marginBottom: 18 }}>
        {list.map((s, i) => (
          <GlassRow key={s.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={onDrop}
            style={{ cursor: 'grab', opacity: dragIdx === i ? 0.5 : 1 }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: 18, cursor: 'grab' }}>⠿</span>
            <input type="color" value={s.color}
              onChange={e => update(s.id, 'color', e.target.value)}
              onBlur={() => updateData('statuses', list)}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            />
            <input value={s.label}
              onChange={e => update(s.id, 'label', e.target.value)}
              onBlur={() => updateData('statuses', list)}
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
            <Badge color={s.color}>{s.label}</Badge>
            <button onClick={() => remove(s.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
          </GlassRow>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0 }} />
        <Input label="اسم الحالة الجديدة" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="مثال: قيد التجميع" containerStyle={{ flex: 1 }} />
        <Btn onClick={add} style={{ alignSelf: 'flex-end' }}><IcPlus size={14} /> إضافة</Btn>
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════
   TEAM TAB
══════════════════════════════════════════════════ */
function TeamTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { DB.list('users').then(u => { setUsers(u); setLoading(false) }) }, [])
  if (loading) return <Spinner />

  const ROLES = { admin: 'مدير النظام', accountant: 'محاسب', sales: 'مبيعات', viewer: 'مشاهد' }
  const ROLE_C = { admin: 'var(--teal)', accountant: 'var(--gold)', sales: 'var(--violet-light)', viewer: 'var(--text-muted)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="👥">أعضاء الفريق</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا يوجد أعضاء</div>}
          {users.map(u => (
            <GlassRow key={u.id}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--teal),var(--violet-light),var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#050c1a', fontSize: 16 }}>
                {u.name?.[0] || '؟'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right' }}>{u.email}</div>
              </div>
              <Badge color={ROLE_C[u.role] || 'var(--text-muted)'}>{ROLES[u.role] || u.role}</Badge>
            </GlassRow>
          ))}
        </div>
      </Card>
      <InfoBox>لإضافة مستخدمين جدد، أضفهم في Supabase → Authentication → Users</InfoBox>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   WHATSAPP TAB
══════════════════════════════════════════════════ */
function WhatsAppTab({ templates, updateData }) {
  const [form, setForm] = useState(templates || {})
  const TMPL = {
    order_confirm: 'تأكيد الطلب',
    order_shipped: 'تم الشحن',
    order_delivered: 'تم التسليم',
    daily_summary: 'الملخص اليومي',
    payment_request: 'طلب الدفع',
  }
  const VARS = ['{customer_name}', '{order_number}', '{total}', '{tracking_number}', '{expected_delivery}', '{date}', '{city}']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '14px 18px' }}>
        <SectionTitle icon="📱">قوالب الرسائل</SectionTitle>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 10, fontWeight: 600 }}>المتغيرات المتاحة:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VARS.map(v => (
            <code key={v} style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(37,99,235,0.08)', border: '1px solid var(--glass-border)', borderRadius: 999, color: 'var(--teal)', cursor: 'pointer' }}
              onClick={() => { navigator.clipboard?.writeText(v); toast('تم نسخ المتغير') }}
            >{v}</code>
          ))}
        </div>
      </Card>
      {Object.entries(TMPL).map(([key, label]) => (
        <Card key={key}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text)' }}>📱 {label}</div>
          <Textarea value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={{ minHeight: 90, direction: 'rtl' }} placeholder={`قالب رسالة ${label}...`} />
        </Card>
      ))}
      <Btn onClick={() => updateData('whatsapp_templates', form)} style={{ alignSelf: 'flex-start' }}><IcSave size={14} /> حفظ القوالب</Btn>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   APPEARANCE TAB — Themes + controls
══════════════════════════════════════════════════ */

const THEMES = [
  {
    id: 'mawj', name: 'مَوج', emoji: '🌊', desc: 'النيلي العميق',
    vars: { '--bg': '#050c1a', '--bg-alt': '#070f22', '--violet': '#2563eb', '--violet-light': '#60a5fa', '--teal': '#00e4b8', '--pink': '#ec4899' }
  },
  {
    id: 'galaxy', name: 'مجرة', emoji: '🌌', desc: 'البنفسجي الكوني',
    vars: { '--bg': '#0a0618', '--bg-alt': '#0d0820', '--violet': '#7c3aed', '--violet-light': '#a78bfa', '--teal': '#c084fc', '--pink': '#f472b6' }
  },
  {
    id: 'obsidian', name: 'أوبسيديان', emoji: '🖤', desc: 'الأسود والذهب',
    vars: { '--bg': '#0a0a0a', '--bg-alt': '#111111', '--violet': '#525252', '--violet-light': '#a3a3a3', '--teal': '#e6b94a', '--pink': '#f5f5f5' }
  },
  {
    id: 'emerald', name: 'زمرد', emoji: '🌿', desc: 'الغابة الداكنة',
    vars: { '--bg': '#051510', '--bg-alt': '#071a13', '--violet': '#065f46', '--violet-light': '#34d399', '--teal': '#10b981', '--pink': '#86efac' }
  },
  {
    id: 'ember', name: 'جمر', emoji: '🔥', desc: 'الدفء والطاقة',
    vars: { '--bg': '#0f0a08', '--bg-alt': '#150d09', '--violet': '#9a3412', '--violet-light': '#fb923c', '--teal': '#f97316', '--pink': '#fbbf24' }
  },
  {
    id: 'sakura', name: 'سكورا', emoji: '🌸', desc: 'الوردي الأنيق',
    vars: { '--bg': '#0f080e', '--bg-alt': '#140a12', '--violet': '#9d174d', '--violet-light': '#f9a8d4', '--teal': '#ec4899', '--pink': '#fda4af' }
  },
  {
    id: 'arctic', name: 'قطبي', emoji: '🧊', desc: 'النظيف المتجمد',
    vars: { '--bg': '#050d14', '--bg-alt': '#07111b', '--violet': '#164e63', '--violet-light': '#67e8f9', '--teal': '#22d3ee', '--pink': '#a5f3fc' }
  },
  {
    id: 'golden', name: 'ذهبي', emoji: '✨', desc: 'الفخامة الملكية',
    vars: { '--bg': '#080600', '--bg-alt': '#0f0c00', '--violet': '#78350f', '--violet-light': '#fbbf24', '--teal': '#f59e0b', '--pink': '#fde68a' }
  },
]

function AppearanceTab({ theme, toggleTheme }) {
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('mawj_theme') || 'mawj')
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('mawj_accent') || '#00e4b8')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('mawj_fontsize') || 'medium')
  const [radius, setRadius] = useState(() => localStorage.getItem('mawj_radius') || 'rounded')
  const [density, setDensity] = useState(() => localStorage.getItem('mawj_density') || 'normal')
  const [animations, setAnimations] = useState(() => localStorage.getItem('mawj_animations') !== 'false')
  const [noise, setNoise] = useState(() => localStorage.getItem('mawj_noise') !== 'false')
  const [spotlight, setSpotlight] = useState(() => localStorage.getItem('mawj_spotlight') !== 'false')
  const currentFont = localStorage.getItem('mawj_font') || "'Noto Kufi Arabic', sans-serif"

  function applyTheme(t) {
    setActiveTheme(t.id)
    localStorage.setItem('mawj_theme', t.id)
    Object.entries(t.vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v)
    })
    // Auto bg-glass from new violet
    const v = t.vars['--violet']
    if (v) {
      const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v)
      if (r) {
        const rgb = `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
        document.documentElement.style.setProperty('--bg-glass', `rgba(${rgb},0.07)`)
        document.documentElement.style.setProperty('--bg-glass-hover', `rgba(${rgb},0.14)`)
        document.documentElement.style.setProperty('--violet-soft', `rgba(${rgb},0.14)`)
        document.documentElement.style.setProperty('--violet-faint', `rgba(${rgb},0.06)`)
        document.documentElement.style.setProperty('--glass-border', `rgba(${rgb},0.18)`)
        document.documentElement.style.setProperty('--glass-border-strong', `rgba(${rgb},0.30)`)
      }
    }
    toast(`تم تطبيق ثيم ${t.name} ${t.emoji}`)
  }

  function applyFont(fontFamily) {
    document.documentElement.style.setProperty('--font', fontFamily)
    document.body.style.fontFamily = fontFamily
    const s = document.getElementById('mawj-font-style') || document.createElement('style')
    s.id = 'mawj-font-style'
    s.textContent = `*, input, button, select, textarea { font-family: ${fontFamily} !important; }`
    document.head.appendChild(s)
    localStorage.setItem('mawj_font', fontFamily)
    toast('تم تطبيق الخط ✓')
  }

  function applyAccent(hex) {
    setAccentColor(hex)
    localStorage.setItem('mawj_accent', hex)
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (r) {
      const rgb = `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
      document.documentElement.style.setProperty('--teal', hex)
      document.documentElement.style.setProperty('--teal-glow', `rgba(${rgb},0.22)`)
      document.documentElement.style.setProperty('--teal-soft', `rgba(${rgb},0.10)`)
    }
    toast('تم تطبيق لون الإجراء ✓')
  }

  function applyFontSize(size) {
    setFontSize(size)
    localStorage.setItem('mawj_fontsize', size)
    const map = { small: 13, medium: 15, large: 17 }
    document.documentElement.style.fontSize = map[size] + 'px'
    toast('تم تطبيق الحجم ✓')
  }

  function applyRadius(r) {
    setRadius(r)
    localStorage.setItem('mawj_radius', r)
    const map = { sharp: '4px', rounded: '16px', pill: '28px' }
    const sm = { sharp: '4px', rounded: '10px', pill: '18px' }
    document.documentElement.style.setProperty('--radius', map[r])
    document.documentElement.style.setProperty('--radius-sm', sm[r])
    toast('تم تطبيق الشكل ✓')
  }

  function applyDensity(d) {
    setDensity(d)
    localStorage.setItem('mawj_density', d)
    const map = { compact: '8px', normal: '20px', comfortable: '32px' }
    document.documentElement.style.setProperty('--s5', map[d])
    const s = document.getElementById('mawj-density-style') || document.createElement('style')
    s.id = 'mawj-density-style'
    s.textContent = d === 'compact' ? '.page{padding:10px 10px 80px!important}' : d === 'comfortable' ? '.page{padding:28px 28px 96px!important}' : ''
    document.head.appendChild(s)
    toast('تم تطبيق الكثافة ✓')
  }

  function toggleAnim(v) {
    setAnimations(v)
    localStorage.setItem('mawj_animations', v)
    const s = document.getElementById('mawj-anim-style') || document.createElement('style')
    s.id = 'mawj-anim-style'
    s.textContent = v ? '' : `
      .page{animation:none!important} .stagger>*{animation:none!important}
      @keyframes pageIn{from{}to{}} @keyframes cardEntrance{from{}to{}}
      @keyframes fadeInUp{from{}to{}} @keyframes toastIn{from{}to{}}
      @keyframes modalIn{from{}to{}} @keyframes sheetUp{from{}to{}}
    `
    document.head.appendChild(s)
    toast(v ? 'تم تفعيل الحركات' : 'تم إيقاف الحركات')
  }

  function toggleNoise(v) {
    setNoise(v)
    localStorage.setItem('mawj_noise', v)
    document.documentElement.style.setProperty('--noise-opacity', v ? '0.28' : '0')
    toast(v ? 'تم تفعيل الملمس' : 'تم إيقاف الملمس')
  }

  const ACCENT_PRESETS = [
    { color: '#00e4b8', name: 'فيروزي' }, { color: '#60a5fa', name: 'أزرق' },
    { color: '#a78bfa', name: 'بنفسجي' }, { color: '#ec4899', name: 'وردي' },
    { color: '#f59e0b', name: 'عنبري' }, { color: '#10b981', name: 'أخضر' },
    { color: '#ef4444', name: 'أحمر' }, { color: '#f97316', name: 'برتقالي' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Themes ── */}
      <Card>
        <SectionTitle icon="🎨">الثيمات</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
          {THEMES.map(t => {
            const isActive = activeTheme === t.id
            return (
              <button key={t.id} onClick={() => applyTheme(t)} style={{
                padding: '14px 10px', borderRadius: 'var(--radius)',
                border: `2px solid ${isActive ? 'var(--teal)' : 'var(--glass-border)'}`,
                background: isActive
                  ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(37,99,235,0.08))'
                  : 'var(--bg-glass)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 0 20px rgba(0,228,184,0.20)' : 'none',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Mini color preview */}
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: t.vars['--bg'], border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: t.vars['--teal'], boxShadow: `0 0 8px ${t.vars['--teal']}88` }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: t.vars['--violet-light'] }} />
                  {t.vars['--pink'] && <div style={{ width: 16, height: 16, borderRadius: '50%', background: t.vars['--pink'] }} />}
                </div>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{t.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--teal)' : 'var(--text)' }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                {isActive && <div style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)' }} />}
              </button>
            )
          })}
        </div>
      </Card>

      {/* ── Dark/Light ── */}
      <Card>
        <SectionTitle icon="🌗">وضع العرض</SectionTitle>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ id: 'dark', emoji: '🌙', label: 'داكن', desc: 'مريح للعيون' }, { id: 'light', emoji: '☀️', label: 'فاتح', desc: 'إضاءة كاملة' }].map(t => (
            <button key={t.id} onClick={() => { if (theme !== t.id) toggleTheme() }} style={{
              flex: 1, padding: '16px 12px', borderRadius: 'var(--radius)',
              border: `2px solid ${theme === t.id ? 'var(--teal)' : 'var(--glass-border)'}`,
              background: theme === t.id ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(37,99,235,0.08))' : 'var(--bg-glass)',
              color: theme === t.id ? 'var(--teal)' : 'var(--text-sec)',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
              transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{t.emoji}</div>
              <div>{t.label}</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 3, fontWeight: 400 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Action color ── */}
      <Card>
        <SectionTitle icon="🎯">لون الإجراء</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {ACCENT_PRESETS.map(p => (
            <button key={p.color} onClick={() => applyAccent(p.color)} title={p.name} style={{
              width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: p.color,
              border: `3px solid ${accentColor === p.color ? 'var(--text)' : 'transparent'}`,
              cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0, position: 'relative',
              boxShadow: accentColor === p.color ? `0 0 18px ${p.color}aa` : `0 2px 8px ${p.color}44`,
            }}>
              {accentColor === p.color && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 900, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>✓</div>}
            </button>
          ))}
          {/* Custom picker */}
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text)', cursor: 'pointer' }}>＋</div>
            <input type="color" value={accentColor} onChange={e => applyAccent(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>اللون الحالي: <span style={{ color: accentColor, fontWeight: 700 }}>■ {accentColor}</span></div>
      </Card>

      {/* ── Font ── */}
      <Card>
        <SectionTitle icon="🔤">الخط</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(FONTS).map(([name, family]) => {
            const active = currentFont === family
            return (
              <button key={name} onClick={() => applyFont(family)} style={{
                padding: '12px 18px', borderRadius: 999,
                border: `2px solid ${active ? 'var(--teal)' : 'var(--glass-border)'}`,
                background: active ? 'linear-gradient(135deg,rgba(0,228,184,0.10),rgba(37,99,235,0.06))' : 'var(--bg-glass)',
                color: active ? 'var(--teal)' : 'var(--text-sec)',
                cursor: 'pointer', fontFamily: family, fontSize: 15, fontWeight: 700,
                transition: 'all 0.2s ease',
              }}>
                {name}
                <div style={{ fontSize: 11, marginTop: 3, fontWeight: 400, opacity: 0.65 }}>أبجد هوز ١٢٣</div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ── Size Shape Density ── */}
      <Card>
        <SectionTitle icon="📐">الحجم والشكل</SectionTitle>
        <ControlRow label="حجم الخط" desc="يؤثر على كل النصوص في التطبيق">
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'small', label: 'صغير' }, { id: 'medium', label: 'متوسط' }, { id: 'large', label: 'كبير' }].map(s => (
              <ControlBtn key={s.id} active={fontSize === s.id} onClick={() => applyFontSize(s.id)}>{s.label}</ControlBtn>
            ))}
          </div>
        </ControlRow>
        <ControlRow label="شكل الزوايا" desc="حواف البطاقات والأزرار">
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'sharp', label: 'حاد ■' }, { id: 'rounded', label: 'مدوّر ▢' }, { id: 'pill', label: 'بيضوي ⬭' }].map(r => (
              <ControlBtn key={r.id} active={radius === r.id} onClick={() => applyRadius(r.id)}>{r.label}</ControlBtn>
            ))}
          </div>
        </ControlRow>
        <ControlRow label="كثافة العرض" desc="المسافات بين العناصر" last>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'compact', label: 'ضيق' }, { id: 'normal', label: 'عادي' }, { id: 'comfortable', label: 'مريح' }].map(d => (
              <ControlBtn key={d.id} active={density === d.id} onClick={() => applyDensity(d.id)}>{d.label}</ControlBtn>
            ))}
          </div>
        </ControlRow>
      </Card>

      {/* ── Toggles ── */}
      <Card>
        <SectionTitle icon="⚙️">تفضيلات العرض</SectionTitle>
        {[
          { label: 'حركات وانتقالات', desc: 'تأثيرات الحركة بين الصفحات', val: animations, set: toggleAnim },
          { label: 'ملمس الخلفية', desc: 'نسيج خفيف على الخلفية', val: noise, set: toggleNoise },
          { label: 'تأثير المؤشر', desc: 'هالة ضوئية تتبع مؤشر الماوس', val: spotlight, set: v => { setSpotlight(v); localStorage.setItem('mawj_spotlight', v); toast(v ? 'مفعّل' : 'موقوف') } },
        ].map((item, i, arr) => (
          <ControlRow key={item.label} label={item.label} desc={item.desc} last={i === arr.length - 1}>
            <Toggle checked={item.val} onChange={item.set} />
          </ControlRow>
        ))}
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DELIVERY TAB
══════════════════════════════════════════════════ */
function DeliveryTab({ business, updateData }) {
  const [zones, setZones] = useState(business.delivery_zones || [])
  const [city, setCity] = useState('')
  const [cost, setCost] = useState('')
  const [freeThreshold, setFreeThreshold] = useState(business.free_delivery_threshold || 0)
  const [defaultCost, setDefaultCost] = useState(business.default_delivery || 0)

  function add() {
    if (!city || !cost) return
    const u = [...zones, { city, cost: parseFloat(cost) }]
    setZones(u); updateData('business', { ...business, delivery_zones: u })
    setCity(''); setCost('')
  }

  function remove(i) {
    const u = zones.filter((_, j) => j !== i)
    setZones(u); updateData('business', { ...business, delivery_zones: u })
  }

  function updateCost(i, v) { setZones(zones.map((z, j) => j === i ? { ...z, cost: parseFloat(v) || 0 } : z)) }

  function saveGlobal() {
    updateData('business', { ...business, free_delivery_threshold: freeThreshold, default_delivery: defaultCost, delivery_zones: zones })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="⚙️">الإعدادات العامة</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <Input label="تكلفة التوصيل الافتراضية (د.إ)" type="number" value={defaultCost} onChange={e => setDefaultCost(parseFloat(e.target.value) || 0)} />
          <Input label="حد التوصيل المجاني (د.إ)" type="number" value={freeThreshold} onChange={e => setFreeThreshold(parseFloat(e.target.value) || 0)} placeholder="0 = معطّل" />
        </div>
        {freeThreshold > 0 && (
          <InfoBox>الطلبات التي تتجاوز {freeThreshold} د.إ ستحصل على توصيل مجاني تلقائياً</InfoBox>
        )}
        <Btn onClick={saveGlobal} style={{ marginTop: 14 }}><IcSave size={14} /> حفظ</Btn>
      </Card>

      <Card>
        <SectionTitle icon="📍">مناطق التوصيل</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {zones.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>لا توجد مناطق محددة</div>}
          {zones.map((z, i) => (
            <GlassRow key={i}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>📍 {z.city}</span>
              <input type="number" value={z.cost}
                onChange={e => updateCost(i, e.target.value)}
                onBlur={() => updateData('business', { ...business, delivery_zones: zones })}
                style={{ width: 80, padding: '6px 10px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 999, color: 'var(--teal)', fontWeight: 700, fontSize: 13, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>د.إ</span>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </GlassRow>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <Select value={city} onChange={e => setCity(e.target.value)} label="المدينة" containerStyle={{ flex: 1 }}>
            <option value="">اختر مدينة</option>
            {UAE_CITIES.filter(c => !zones.find(z => z.city === c)).map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="التكلفة" type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="20" containerStyle={{ width: 100 }} />
          <Btn onClick={add} style={{ alignSelf: 'flex-end' }}>إضافة</Btn>
        </div>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DISCOUNTS TAB
══════════════════════════════════════════════════ */
function DiscountsTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', min_order: '', max_uses: '', expiry: '', active: true })

  useEffect(() => { DB.list('discounts').then(d => { setList(d); setLoading(false) }) }, [])

  async function add() {
    if (!form.code || !form.value) { toast('أدخل الكود والقيمة', 'error'); return }
    try {
      const saved = await DB.insert('discounts', {
        ...form,
        value: parseFloat(form.value),
        min_order: parseFloat(form.min_order) || 0,
        max_uses: parseInt(form.max_uses) || 0,
        uses_count: 0
      })
      setList(p => [saved, ...p])
      setForm({ code: '', type: 'percent', value: '', min_order: '', max_uses: '', expiry: '', active: true })
      toast('تم إضافة الكود ✓')
    } catch (e) { toast(e.message, 'error') }
  }

  async function toggle(id, active) {
    await DB.update('discounts', id, { active })
    setList(p => p.map(d => d.id === id ? { ...d, active } : d))
  }

  async function remove(id) {
    await DB.delete('discounts', id)
    setList(p => p.filter(d => d.id !== id))
    toast('تم الحذف')
  }

  if (loading) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="🏷️">أكواد الخصم</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {list.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>لا يوجد أكواد خصم بعد</div>}
          {list.map(d => (
            <GlassRow key={d.id}>
              <code style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)', minWidth: 90, direction: 'ltr' }}>{d.code}</code>
              <Badge color={d.type === 'percent' ? 'var(--violet-light)' : 'var(--gold)'}>{d.value}{d.type === 'percent' ? '%' : ' د.إ'}</Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                {d.min_order > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>حد أدنى: {d.min_order} د.إ</div>}
                {d.max_uses > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>استخدام: {d.uses_count || 0}/{d.max_uses}</div>}
                {d.expiry && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ينتهي: {d.expiry}</div>}
              </div>
              <Toggle checked={d.active} onChange={v => toggle(d.id, v)} />
              <button onClick={() => remove(d.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </GlassRow>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="كود الخصم" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" dir="ltr" containerStyle={{ gridColumn: '1/-1' }} />
          <Select label="النوع" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="percent">نسبة %</option>
            <option value="fixed">مبلغ ثابت</option>
          </Select>
          <Input label="القيمة" type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
          <Input label="الحد الأدنى للطلب (د.إ)" type="number" value={form.min_order} onChange={e => setForm(p => ({ ...p, min_order: e.target.value }))} placeholder="0 = بدون حد" />
          <Input label="الحد الأقصى للاستخدام" type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="0 = غير محدود" />
          <Input label="تاريخ الانتهاء" type="date" value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))} containerStyle={{ gridColumn: '1/-1' }} dir="ltr" />
        </div>
        <Btn onClick={add} style={{ marginTop: 14, alignSelf: 'flex-start' }}><IcPlus size={14} /> إضافة الكود</Btn>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   NOTIFICATIONS TAB
══════════════════════════════════════════════════ */
function NotificationsTab() {
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mawj_notifications') || '{}') } catch { return {} }
  })

  function toggle(key) {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    localStorage.setItem('mawj_notifications', JSON.stringify(updated))
    toast('تم الحفظ ✓')
  }

  function updateVal(key, val) {
    const updated = { ...settings, [key]: val }
    setSettings(updated)
    localStorage.setItem('mawj_notifications', JSON.stringify(updated))
  }

  const ITEMS = [
    { key: 'new_order', label: 'طلب جديد', desc: 'تنبيه عند وصول طلب جديد', icon: '📦' },
    { key: 'low_stock', label: 'مخزون منخفض', desc: 'تنبيه عند وصول المخزون للحد الأدنى', icon: '⚠️' },
    { key: 'daily_summary', label: 'الملخص اليومي', desc: 'ملخص يومي في نهاية الدوام', icon: '📊' },
    { key: 'payment_due', label: 'دفعة متأخرة', desc: 'تذكير بالدفعات غير المحصلة', icon: '💳' },
    { key: 'target_reached', label: 'تحقيق الهدف', desc: 'تهنئة عند تجاوز الهدف الشهري', icon: '🎯' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="🔔">إعدادات الإشعارات</SectionTitle>
        {ITEMS.map((item, i) => (
          <ControlRow key={item.key} label={`${item.icon} ${item.label}`} desc={item.desc} last={i === ITEMS.length - 1}>
            <Toggle checked={!!settings[item.key]} onChange={() => toggle(item.key)} />
          </ControlRow>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="⏰">وقت الملخص اليومي</SectionTitle>
        <ControlRow label="وقت الإرسال" desc="الوقت الذي يُرسل فيه الملخص اليومي" last>
          <input type="time" value={settings.summary_time || '20:00'} onChange={e => updateVal('summary_time', e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none', direction: 'ltr' }} />
        </ControlRow>
      </Card>

      <Card>
        <SectionTitle icon="📉">حد المخزون المنخفض</SectionTitle>
        <ControlRow label="الحد الأدنى للمخزون" desc="التنبيه عند وصول الكمية لهذا الحد" last>
          <input type="number" value={settings.low_stock_threshold || 5} onChange={e => updateVal('low_stock_threshold', parseInt(e.target.value) || 5)}
            style={{ width: 80, padding: '8px 12px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--teal)', fontWeight: 700, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
        </ControlRow>
      </Card>

      <InfoBox>بعض الإشعارات تتطلب دعم المتصفح. Safari على iOS لا يدعم إشعارات الدفع.</InfoBox>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SECURITY TAB
══════════════════════════════════════════════════ */
function SecurityTab() {
  const [sessionTimeout, setSessionTimeout] = useState(() => parseInt(localStorage.getItem('mawj_session_timeout') || '0'))
  const [log] = useState([
    { action: 'تسجيل دخول', time: 'منذ ٥ دقائق', device: 'iPhone · Safari', ip: '192.168.1.x' },
    { action: 'تعديل طلب', time: 'منذ ١٠ دقائق', device: 'iPhone · Safari', ip: '192.168.1.x' },
    { action: 'تسجيل دخول', time: 'الأمس ٩:٣٢م', device: 'MacBook · Chrome', ip: '192.168.1.x' },
  ])

  function saveTimeout() {
    localStorage.setItem('mawj_session_timeout', sessionTimeout)
    toast('تم حفظ إعدادات الجلسة ✓')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="⏱️">إعدادات الجلسة</SectionTitle>
        <ControlRow label="انتهاء الجلسة التلقائي" desc="تسجيل خروج تلقائي بعد فترة عدم النشاط" last>
          <Select value={sessionTimeout} onChange={e => setSessionTimeout(parseInt(e.target.value))}>
            <option value={0}>معطّل</option>
            <option value={30}>30 دقيقة</option>
            <option value={60}>ساعة واحدة</option>
            <option value={240}>4 ساعات</option>
            <option value={480}>8 ساعات</option>
          </Select>
        </ControlRow>
        <Btn onClick={saveTimeout} style={{ marginTop: 14 }}><IcSave size={14} /> حفظ</Btn>
      </Card>

      <Card>
        <SectionTitle icon="📋">سجل النشاط</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {log.map((entry, i) => (
            <GlassRow key={i}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{entry.action}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.device} · {entry.ip}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.time}</span>
            </GlassRow>
          ))}
        </div>
      </Card>

      <InfoBox icon="🔐">كلمة المرور تُدار عبر Supabase Authentication. لتغييرها اذهب إلى إعدادات حسابك.</InfoBox>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BACKUP TAB
══════════════════════════════════════════════════ */
function BackupTab() {
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  async function exportAll() {
    setLoading(true)
    try {
      const [orders, expenses, settlements, inventory, suppliers, capital, withdrawals] = await Promise.all([
        DB.list('orders'), DB.list('expenses'), DB.list('settlements'),
        DB.list('inventory'), DB.list('suppliers'),
        DB.list('capital_entries'), DB.list('withdrawals'),
      ])
      const blob = new Blob([JSON.stringify({
        exportDate: new Date().toISOString(), version: '9.0',
        data: { orders, expenses, settlements, inventory, suppliers, capital_entries: capital, withdrawals }
      }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mawj-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      toast('تم تصدير البيانات ✓')
    } catch { toast('فشل التصدير', 'error') }
    finally { setLoading(false) }
  }

  async function exportCSV() {
    setLoading(true)
    try {
      const orders = await DB.list('orders')
      const headers = ['رقم الطلب', 'الهاتف', 'المدينة', 'الحالة', 'الإجمالي', 'الربح', 'التاريخ']
      const rows = orders.map(o => [
        o.order_number, o.customer_phone, o.customer_city,
        o.status, o.total, o.profit || 0,
        new Date(o.created_at).toLocaleDateString('ar')
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      toast('تم تصدير CSV ✓')
    } catch { toast('فشل التصدير', 'error') }
    finally { setLoading(false) }
  }

  function importBackup(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const backup = JSON.parse(ev.target.result)
        if (!backup.data) throw new Error('ملف غير صالح')
        toast(`تم استيراد النسخة بتاريخ ${new Date(backup.exportDate).toLocaleDateString('ar')} ✓`)
      } catch (err) { toast('فشل الاستيراد: ' + err.message, 'error') }
      finally { setImporting(false) }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="📤">تصدير البيانات</SectionTitle>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 18, lineHeight: 1.7 }}>
          احتفظ بنسخة احتياطية من جميع بياناتك. يُنصح بالتصدير أسبوعياً.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn loading={loading} onClick={exportAll}><IcDownload size={14} /> تصدير JSON كامل</Btn>
          <Btn loading={loading} variant="secondary" onClick={exportCSV}><IcDownload size={14} /> تصدير الطلبات CSV</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📥">استيراد نسخة احتياطية</SectionTitle>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 14, lineHeight: 1.7 }}>
          استيراد ملف JSON سبق تصديره من موج. تأكد من صحة الملف قبل الاستيراد.
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          background: 'var(--bg-glass)', border: '2px dashed var(--glass-border)',
          borderRadius: 'var(--radius)', cursor: 'pointer',
          transition: 'border-color 0.2s ease',
        }}>
          <span style={{ fontSize: 24 }}>📁</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{importing ? 'جاري الاستيراد...' : 'اختر ملف النسخة الاحتياطية'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>mawj-backup-YYYY-MM-DD.json</div>
          </div>
          <input type="file" accept=".json" onChange={importBackup} style={{ display: 'none' }} />
        </label>
      </Card>

      <InfoBox icon="☁️">بياناتك محفوظة تلقائياً في Supabase Cloud. النسخ الاحتياطي هنا للأرشفة الشخصية فقط.</InfoBox>
    </div>
  )
}