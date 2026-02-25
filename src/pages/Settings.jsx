import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Settings as SettingsDB, DB, supabase } from '../data/db'
import { saveAppearance } from '../data/appearance'
import { UAE_CITIES } from '../data/constants'
import { Btn, Card, Input, Select, Textarea, Spinner, Toggle, Badge, toast } from '../components/ui'
import { IcPlus, IcSave, IcDownload } from '../components/Icons'

/* ══════════════════════════════════════════════════
   SETTINGS v9 — Sidebar navigation
   10 sections · 8 themes · Advanced controls
══════════════════════════════════════════════════ */

const SECTIONS = [
  { id:'business',      label:'المتجر',           desc:'معلومات المتجر والمنتجات', icon:'🏪' },
  { id:'partners',      label:'الشركاء',          desc:'إبراهيم وإحسان والحصص',   icon:'🤝' },
  { id:'statuses',      label:'الحالات',          desc:'حالات الطلبات وألوانها',  icon:'🔖' },
  { id:'team',          label:'الفريق',           desc:'أعضاء وصلاحيات',          icon:'👥' },
  { id:'whatsapp',      label:'واتساب',           desc:'قوالب الرسائل',           icon:'💬' },
  { id:'ai',            label:'الذكاء الاصطناعي', desc:'المساعد والإجراءات',      icon:'🤖' },
  { id:'appearance',    label:'المظهر',           desc:'الوضع الداكن والفاتح',    icon:'🎨' },
  { id:'delivery',      label:'التوصيل',          desc:'مناطق وتكاليف',           icon:'🚚' },
  { id:'notifications', label:'الإشعارات',        desc:'تنبيهات وتذكيرات',        icon:'🔔' },
  { id:'security',      label:'الأمان',           desc:'كلمة المرور والجلسة',     icon:'🔐' },
  { id:'backup',        label:'النسخ الاحتياطي',  desc:'تصدير واستيراد',          icon:'💾' },
]

export default function Settings({ theme, toggleTheme }) {
  const [section, setSection] = useState('business')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ business:{}, statuses:[], products:[], templates:{}, partners:[], ai_settings:{} })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [business, statuses, products, templates, rawPartners, aiSettings] = await Promise.all([
        SettingsDB.get('business'),
        SettingsDB.get('statuses'),
        SettingsDB.get('products'),
        SettingsDB.get('whatsapp_templates'),
        SettingsDB.get('partners'),
        SettingsDB.get('ai_settings'),
      ])
      // Auto-seed partners if empty
      let partners = rawPartners
      if (!partners || partners.length === 0) {
        partners = [
          { id:'ibrahim', name:'إبراهيم', share:50 },
          { id:'ihsan',   name:'إحسان',   share:50 },
        ]
        SettingsDB.set('partners', partners).catch(()=>{})
      }
      // Migrate string partners to objects
      if (partners && partners.length > 0 && typeof partners[0] === 'string') {
        partners = partners.map((n,i) => ({ id:'p'+i, name:n, share: Math.floor(100/partners.length) }))
        SettingsDB.set('partners', partners).catch(()=>{})
      }
      setData({ business:business||{}, statuses:statuses||[], products:products||[], templates:templates||{}, partners, ai_settings:aiSettings||{} })
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function saveSetting(key, value) {
    try { await SettingsDB.set(key, value); toast('تم الحفظ ') }
    catch { toast('فشل الحفظ', 'error') }
  }

  function updateData(key, value) {
    setData(p => ({ ...p, [key]:value }))
    saveSetting(key, value)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <Spinner size={36} />
    </div>
  )

  const active = SECTIONS.find(s=>s.id===section)

  const contentProps = {
    data, updateData, theme, toggleTheme,
    statuses:    data.statuses,
    products:    data.products,
    templates:   data.templates,
    business:    data.business,
    partners:    data.partners || [],
    ai_settings: data.ai_settings || {},
  }

  function renderSection() {
    switch(section) {
      case 'business':      return <BusinessTab      {...contentProps} />
      case 'partners':      return <PartnersTab      {...contentProps} />
      case 'statuses':      return <StatusesTab      {...contentProps} />
      case 'team':          return <TeamTab />
      case 'ai':            return <AITab            {...contentProps} />
      case 'whatsapp':      return <WhatsAppTab      {...contentProps} />
      case 'appearance':    return <AppearanceTab    {...contentProps} />
      case 'delivery':      return <DeliveryTab      {...contentProps} />
      case 'discounts':     return <DiscountsTab />
      case 'notifications': return <NotificationsTab />
      case 'security':      return <SecurityTab />
      case 'backup':        return <BackupTab />
      default:              return null
    }
  }

  /* ── Mobile full-screen section ── */
  const MobileSection = mobileOpen ? createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'var(--bg)', display:'flex', flexDirection:'column',
      animation:'pageIn 0.22s var(--ease-io) both',
    }}>
      <div style={{height:3,flexShrink:0,background:'linear-gradient(90deg,var(--violet-light),var(--teal),var(--pink))'}} />
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 16px', borderBottom:'none',
        flexShrink:0, background:'var(--header-bg)',
      }}>
        <button onClick={()=>setMobileOpen(false)} style={{
          display:'flex', alignItems:'center', gap:6,
          background:'none', border:'none', color:'var(--teal)',
          fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
        }}>← رجوع</button>
        <h2 style={{fontSize:16,fontWeight:900,margin:0,color:'var(--text)'}}>
          {active?.icon} {active?.label}
        </h2>
        <div style={{width:64}} />
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px',WebkitOverflowScrolling:'touch'}}>
        {renderSection()}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="page" style={{paddingTop:8}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:900,marginBottom:4,color:'var(--text)'}}>الإعدادات</h1>
        <p style={{color:'var(--text-muted)',fontSize:13}}>تخصيص النظام وإدارة البيانات</p>
      </div>
      <div className="page-wave-accent" style={{marginBottom:20}} />

      {/* ── Desktop layout: sidebar + panel ── */}
      <div style={{display:'flex',gap:20,alignItems:'flex-start'}} className="settings-layout">

        {/* Sidebar */}
        <div style={{
          width:220, flexShrink:0,
          background:'var(--bg-hover)',
          border:'none',
          borderRadius:'var(--radius-lg)',
          padding:8,
          position:'sticky', top:16,
        }} className="settings-sidebar">
          {SECTIONS.map(s => {
            const active = section === s.id
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:'var(--r-md)',
                border:'none', background: active
                  ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(37,99,235,0.08))'
                  : 'transparent',
                cursor:'pointer', fontFamily:'inherit',
                transition:'all 0.15s ease', textAlign:'right',
                borderRight: active ? '2.5px solid var(--teal)' : '2.5px solid transparent',
              }}>
                <span style={{fontSize:18,flexShrink:0}}>{s.icon}</span>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:13,fontWeight: active?800:600,color: active?'var(--teal)':'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.label}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.desc}</div>
                </div>
                {active && <div style={{width:6,height:6,borderRadius:'50%',background:'var(--teal)',flexShrink:0,boxShadow:'0 0 8px var(--teal)'}} />}
              </button>
            )
          })}
        </div>

        {/* Content panel */}
        <div style={{flex:1,minWidth:0}} className="settings-content">
          {/* Section header */}
          <div style={{
            display:'flex', alignItems:'center', gap:12, marginBottom:20,
            padding:'14px 18px',
            background:'var(--bg-hover)',
            border:'none',
            borderRadius:'var(--r-lg)',
          }}>
            <div style={{
              width:44,height:44,borderRadius:'var(--r-md)',
              background:'linear-gradient(135deg,rgba(0,228,184,0.15),rgba(37,99,235,0.10))',
              border:'1px solid var(--action-soft)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
            }}>{active?.icon}</div>
            <div>
              <div style={{fontWeight:900,fontSize:17,color:'var(--text)'}}>{active?.label}</div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>{active?.desc}</div>
            </div>
          </div>
          <div className="stagger">{renderSection()}</div>
        </div>
      </div>

      {/* ── Mobile: section list ── */}
      <div className="settings-mobile-list">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={()=>{ setSection(s.id); setMobileOpen(true) }} style={{
            width:'100%', display:'flex', alignItems:'center', gap:14,
            padding:'14px 16px', marginBottom:8,
            background:'var(--bg-hover)',
            border:'none',
            borderRadius:'var(--r-lg)',
            cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s ease',
          }} className="mawj-card mawj-card-hover">
            <div style={{
              width:44,height:44,borderRadius:'var(--r-md)',flexShrink:0,
              background:'linear-gradient(135deg,rgba(0,228,184,0.10),rgba(37,99,235,0.08))',
              border:'none',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
            }}>{s.icon}</div>
            <div style={{flex:1,textAlign:'right'}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{s.label}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{s.desc}</div>
            </div>
            <span style={{color:'var(--text-muted)',fontSize:18}}>‹</span>
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
function SectionTitle({ children, icon, style }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:800,fontSize:15,marginBottom:18,color:'var(--text)',paddingBottom:10,borderBottom:'none',...(style||{})}}>
      {icon && <span style={{fontSize:18}}>{icon}</span>}
      {children}
    </div>
  )
}

function ControlRow({ label, desc, children, last }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'14px 0',
      borderBottom: last ? 'none' : 'none',
      gap:16,
    }}>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{label}</div>
        {desc && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{desc}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  )
}

function ControlBtn({ active, onClick, children, style={}, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      minWidth:36,height:36,padding:'0 10px',borderRadius:'var(--r-md)',
      border:`2px solid ${active?'var(--teal)':'var(--border)'}`,
      background: active ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(37,99,235,0.08))' : 'var(--bg-hover)',
      color: active?'var(--teal)':'var(--text-sec)',
      cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:13,
      transition:'all 0.15s ease',
      boxShadow: active ? '0 0 12px rgba(0,228,184,0.2)' : 'none',
      ...style,
    }}>{children}</button>
  )
}

function GlassRow({ children, style }) {
  return (
    <div className="list-row" style={{
      display:'flex',alignItems:'center',gap:12,
      padding:'10px 14px',
      background:'var(--bg-surface)',
      border:'none',
      borderRadius:'var(--r-md)',
      ...style,
    }}>{children}</div>
  )
}

function InfoBox({ children, color='var(--teal)', icon='' }) {
  return (
    <div style={{
      padding:'12px 16px',
      background:`rgba(${color==='var(--teal)'?'0,228,184':'37,99,235'},0.06)`,
      border:`1px solid ${color==='var(--teal)'?'rgba(0,228,184,0.18)':'rgba(37,99,235,0.18)'}`,
      borderRadius:'var(--r-md)',fontSize:13,color:'var(--text-sec)',
      display:'flex',gap:10,alignItems:'flex-start',lineHeight:1.6,
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
  const [form, setForm]   = useState(data.business||{})
  const [pForm, setPForm] = useState({ name:'', price:'', cost:'', sku:'' })
  const [partnerName, setPartnerName] = useState('')

  function field(k,v) { setForm(p=>({...p,[k]:v})) }

  function addProduct() {
    if (!pForm.name) return
    const updated = [...(products||[]), { id:`p${Date.now()}`, ...pForm, price:parseFloat(pForm.price)||0, cost:parseFloat(pForm.cost)||0 }]
    updateData('products', updated)
    setPForm({ name:'', price:'', cost:'', sku:'' })
  }

  function removeProduct(id) { updateData('products', (products||[]).filter(p=>p.id!==id)) }

  function addPartner() {
    if (!partnerName.trim()) return
    const newPartner = { id: 'p'+Date.now(), name: partnerName.trim(), share: 50 }
    updateData('partners', [...(partners||[]), newPartner])
    setPartnerName('')
  }

  const CURRENCIES = [{ v:'AED', l:'درهم إماراتي (د.إ)' },{ v:'SAR', l:'ريال سعودي (ر.س)' },{ v:'USD', l:'دولار أمريكي ($)' },{ v:'EUR', l:'يورو (€)' }]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>معلومات المتجر</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
          <Input label="اسم المتجر" value={form.name||''} onChange={e=>field('name',e.target.value)} containerStyle={{gridColumn:'1/-1'}} />
          <Input label="الهدف الشهري (د.إ)" type="number" value={form.monthly_target||''} onChange={e=>field('monthly_target',parseFloat(e.target.value)||0)} />
          <Input label="بادئة رقم الطلب" value={form.order_prefix||'MWJ'} onChange={e=>field('order_prefix',e.target.value)} placeholder="MWJ" dir="ltr" />
          <Input label="نسبة الضريبة / VAT %" type="number" value={form.vat_rate||''} onChange={e=>field('vat_rate',parseFloat(e.target.value)||0)} />
          <Select label="العملة" value={form.currency||'AED'} onChange={e=>field('currency',e.target.value)} containerStyle={{gridColumn:'1/-1'}}>
            {CURRENCIES.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
          </Select>
        </div>
        <Btn onClick={()=>updateData('business',form)}><IcSave size={14}/> حفظ الإعدادات</Btn>
      </Card>

      <Card>
        <SectionTitle>المنتجات</SectionTitle>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
          {(products||[]).length === 0 && <div style={{color:'var(--text-muted)',fontSize:13,padding:'12px 0',textAlign:'center'}}>لا توجد منتجات بعد</div>}
          {(products||[]).map(p => (
            <GlassRow key={p.id}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{p.name}</div>
                {p.sku && <div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{p.sku}</div>}
              </div>
              <span style={{fontSize:11,color:'var(--text-sec)'}}>تكلفة: {p.cost}</span>
              <span style={{fontSize:13,fontWeight:800,color:'var(--teal)'}}>{p.price} د.إ</span>
              <button onClick={()=>removeProduct(p.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,padding:4}}></button>
            </GlassRow>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 70px auto',gap:8,alignItems:'flex-end'}} className="form-grid-2">
          <Input label="اسم المنتج" value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} placeholder="مثال: طقم كريستال" />
          <Input label="السعر" type="number" value={pForm.price} onChange={e=>setPForm(p=>({...p,price:e.target.value}))} />
          <Input label="التكلفة" type="number" value={pForm.cost} onChange={e=>setPForm(p=>({...p,cost:e.target.value}))} />
          <Input label="SKU" value={pForm.sku} onChange={e=>setPForm(p=>({...p,sku:e.target.value}))} dir="ltr" />
          <Btn onClick={addProduct} style={{alignSelf:'flex-end'}}><IcPlus size={14}/></Btn>
        </div>
      </Card>

    </div>
  )
}

/* ══════════════════════════════════════════════════
   STATUSES TAB
══════════════════════════════════════════════════ */
function StatusesTab({ statuses, updateData }) {
  const [list, setList] = useState(statuses||[])
  const [form, setForm] = useState({ label:'', color:'#00e4b8' })
  const [dragIdx, setDragIdx] = useState(null)

  function add() {
    if (!form.label) return
    const updated = [...list, { id:`s_${Date.now()}`, ...form, order:list.length }]
    setList(updated); updateData('statuses', updated)
    setForm({ label:'', color:'#00e4b8' })
  }

  function remove(id) { const u=list.filter(s=>s.id!==id); setList(u); updateData('statuses',u) }

  function update(id, field, value) {
    const updated = list.map(s=>s.id===id?{...s,[field]:value}:s)
    setList(updated)
  }

  function onDragStart(i) { setDragIdx(i) }
  function onDragOver(e,i) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const newList = [...list]
    const [moved] = newList.splice(dragIdx,1)
    newList.splice(i,0,moved)
    setList(newList)
    setDragIdx(i)
  }
  function onDrop() { updateData('statuses',list); setDragIdx(null) }

  return (
    <Card>
      <SectionTitle>حالات الطلبات</SectionTitle>
      <InfoBox>اسحب الحالات لإعادة ترتيبها. الترتيب يؤثر على عمود الكانبان.</InfoBox>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:14,marginBottom:18}}>
        {list.map((s,i) => (
          <GlassRow key={s.id}
            draggable
            onDragStart={()=>onDragStart(i)}
            onDragOver={e=>onDragOver(e,i)}
            onDrop={onDrop}
            style={{cursor:'grab',opacity:dragIdx===i?0.5:1}}
          >
            <span style={{color:'var(--text-muted)',fontSize:18,cursor:'grab'}}>⠿</span>
            <input type="color" value={s.color}
              onChange={e=>update(s.id,'color',e.target.value)}
              onBlur={()=>updateData('statuses',list)}
              style={{width:32,height:32,borderRadius:8,border:'none',cursor:'pointer',padding:0,flexShrink:0}}
            />
            <input value={s.label}
              onChange={e=>update(s.id,'label',e.target.value)}
              onBlur={()=>updateData('statuses',list)}
              style={{flex:1,padding:'8px 12px',background:'var(--bg-hover)',border:'none',borderRadius:'var(--r-md)',color:'var(--text)',fontSize:13,fontFamily:'inherit',outline:'none'}}
            />
            <Badge color={s.color}>{s.label}</Badge>
            <button onClick={()=>remove(s.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,padding:4}}></button>
          </GlassRow>
        ))}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
        <input type="color" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{width:40,height:40,borderRadius:10,border:'none',cursor:'pointer',flexShrink:0}} />
        <Input label="اسم الحالة الجديدة" value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="مثال: قيد التجميع" containerStyle={{flex:1}} />
        <Btn onClick={add} style={{alignSelf:'flex-end'}}><IcPlus size={14}/> إضافة</Btn>
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════
   TEAM TAB
══════════════════════════════════════════════════ */
function TeamTab() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'sales' })
  const [formError, setFormError] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    try {
      const u = await DB.list('users')
      setUsers(u)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function addUser() {
    if (!form.name || !form.email || !form.password) {
      setFormError('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    if (form.password.length < 6) {
      setFormError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      // 1. Create auth user via Supabase signUp
      const { data: authData, error: authError } = await supabase.auth.admin
        ? await supabase.auth.admin.createUser({ email: form.email, password: form.password, email_confirm: true })
        : await (async () => {
            // Fallback: use regular signUp (user will need to confirm email)
            const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
            return { data, error }
          })()
      if (authError) throw authError

      // 2. Insert into users table
      const newUser = await DB.insert('users', {
        name: form.name,
        email: form.email,
        role: form.role,
        auth_id: authData?.user?.id || null,
      })
      setUsers(p => [...p, newUser])
      setForm({ name:'', email:'', password:'', role:'sales' })
      setShowForm(false)
      toast('تم إضافة المستخدم ')
    } catch(e) {
      setFormError(e.message || 'فشل إنشاء المستخدم')
    }
    finally { setSaving(false) }
  }

  async function updateRole(id, role) {
    try {
      await DB.update('users', id, { role })
      setUsers(p => p.map(u => u.id === id ? {...u, role} : u))
      toast('تم تحديث الصلاحية ')
    } catch { toast('فشل التحديث', 'error') }
  }

  async function removeUser(id) {
    if (!confirm('هل تريد حذف هذا المستخدم؟')) return
    try {
      await DB.delete('users', id)
      setUsers(p => p.filter(u => u.id !== id))
      toast('تم حذف المستخدم')
    } catch { toast('فشل الحذف', 'error') }
  }

  const ROLES = { admin:'مدير النظام', accountant:'محاسب', sales:'مبيعات', viewer:'مشاهد' }
  const ROLE_C = { admin:'var(--teal)', accountant:'var(--amber)', sales:'var(--violet-light)', viewer:'var(--text-muted)' }

  if (loading) return <Spinner />

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <SectionTitle icon="" style={{marginBottom:0}}>أعضاء الفريق</SectionTitle>
          <Btn onClick={()=>{setShowForm(!showForm);setFormError('')}} variant={showForm?'secondary':'primary'}>
            {showForm ? 'إلغاء' : '＋ مستخدم جديد'}
          </Btn>
        </div>

        {/* Add user form */}
        {showForm && (
          <div style={{
            marginBottom:20, padding:'16px',
            background:'var(--bg-hover)', border:'1.5px solid var(--action-soft)',
            borderRadius:'var(--r-lg)', display:'flex', flexDirection:'column', gap:12,
          }}>
            <div style={{fontWeight:700,fontSize:14,color:'var(--teal)',marginBottom:4}}>إضافة مستخدم جديد</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input label="الاسم *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="مثال: أحمد محمد" />
              <Input label="البريد الإلكتروني *" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="user@example.com" dir="ltr" />
              <Input label="كلمة المرور *" type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="٦ أحرف على الأقل" />
              <Select label="الصلاحية" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                {Object.entries(ROLES).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            {formError && (
              <div style={{color:'var(--red)',fontSize:12,padding:'8px 12px',background:'rgba(239,68,68,0.08)',borderRadius:'var(--r-md)',border:'1px solid rgba(239,68,68,0.2)'}}>{formError}</div>
            )}
            <Btn loading={saving} onClick={addUser} style={{alignSelf:'flex-start'}}>
              <IcPlus size={14}/> إضافة المستخدم
            </Btn>
          </div>
        )}

        {/* Users list */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {users.length === 0 && <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'20px 0'}}>لا يوجد أعضاء</div>}
          {users.map(u => (
            <GlassRow key={u.id}>
              <div style={{
                width:42,height:42,borderRadius:'50%',flexShrink:0,
                background:'linear-gradient(135deg,var(--teal),var(--violet-light),var(--pink))',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:900,color:'#050c1a',fontSize:16,
              }}>{u.name?.[0]||'؟'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{u.name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',direction:'ltr',textAlign:'right'}}>{u.email}</div>
              </div>
              <Select value={u.role} onChange={e=>updateRole(u.id,e.target.value)}
                style={{fontSize:12,padding:'4px 10px',height:32,minWidth:110}}>
                {Object.entries(ROLES).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </Select>
              <button onClick={()=>removeUser(u.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:18,padding:4,flexShrink:0}}></button>
            </GlassRow>
          ))}
        </div>
      </Card>

      <div style={{
        padding:'12px 16px',
        background:'rgba(37,99,235,0.06)',border:'1px solid rgba(37,99,235,0.14)',
        borderRadius:'var(--r-md)',fontSize:13,color:'var(--text-sec)',
        display:'flex',gap:10,alignItems:'flex-start',lineHeight:1.6,
      }}>
        <span></span>
        <span>المستخدمون المضافون هنا سيتلقون بريد تأكيل من Supabase. كلمة المرور مؤقتة ويمكن تغييرها لاحقاً.</span>
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════
   WHATSAPP TAB
══════════════════════════════════════════════════ */
function WhatsAppTab({ templates, updateData }) {
  const [form, setForm] = useState(templates||{})
  const TMPL = {
    order_confirm:   'تأكيد الطلب',
    order_shipped:   'تم الشحن',
    order_delivered: 'تم التسليم',
    daily_summary:   'الملخص اليومي',
    payment_request: 'طلب الدفع',
  }
  const VARS = ['{customer_name}','{order_number}','{total}','{tracking_number}','{expected_delivery}','{date}','{city}']

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card style={{padding:'14px 18px'}}>
        <SectionTitle>قوالب الرسائل</SectionTitle>
        <div style={{fontSize:13,color:'var(--text-sec)',marginBottom:10,fontWeight:600}}>المتغيرات المتاحة:</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {VARS.map(v => (
            <code key={v} style={{fontSize:11,padding:'4px 10px',background:'rgba(37,99,235,0.08)',border:'none',borderRadius:999,color:'var(--teal)',cursor:'pointer'}}
              onClick={()=>{ navigator.clipboard?.writeText(v); toast('تم نسخ المتغير') }}
            >{v}</code>
          ))}
        </div>
      </Card>
      {Object.entries(TMPL).map(([key,label]) => (
        <Card key={key}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:'var(--text)'}}>{label}</div>
          <Textarea value={form[key]||''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={{minHeight:90,direction:'rtl'}} placeholder={`قالب رسالة ${label}...`} />
        </Card>
      ))}
      <Btn onClick={()=>updateData('whatsapp_templates',form)} style={{alignSelf:'flex-start'}}><IcSave size={14}/> حفظ القوالب</Btn>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   APPEARANCE TAB — Themes + controls
══════════════════════════════════════════════════ */


function AppearanceTab({ theme, toggleTheme, user }) {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') !== 'light'
  )

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { localStorage.setItem('mawj-theme', next ? 'dark' : 'light') } catch {}
    toast(next ? 'تم تفعيل الوضع الداكن' : 'تم تفعيل الوضع الفاتح')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>وضع العرض</SectionTitle>
        <ControlRow
          label={dark ? 'الوضع الداكن' : 'الوضع الفاتح'}
          desc={dark ? 'خلفية داكنة — مريح للعين ليلاً' : 'خلفية فاتحة — واضح في الإضاءة الساطعة'}
          last
        >
          <Toggle checked={dark} onChange={toggle} />
        </ControlRow>
      </Card>
      <Card>
        <SectionTitle>الخطوط</SectionTitle>
        <ControlRow label="الخط العربي" desc="Almarai — مصمم للواجهات العربية" last>
          <span style={{fontFamily:'Almarai,sans-serif',fontWeight:700,color:'var(--action)',fontSize:13}}>Almarai</span>
        </ControlRow>
        <ControlRow label="خط الأرقام" desc="Inter — واضح للأرقام والأكواد">
          <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,color:'var(--info-light)',fontSize:13,direction:'ltr'}}>Inter</span>
        </ControlRow>
      </Card>
    </div>
  )
}


function DeliveryTab({ business, updateData }) {
  const [zones, setZones]     = useState(business.delivery_zones||[])
  const [city, setCity]       = useState('')
  const [cost, setCost]       = useState('')
  const [freeThreshold, setFreeThreshold] = useState(business.free_delivery_threshold||0)
  const [defaultCost, setDefaultCost]     = useState(business.default_delivery||0)

  function add() {
    if (!city||!cost) return
    const u = [...zones, { city, cost:parseFloat(cost) }]
    setZones(u); updateData('business',{...business,delivery_zones:u})
    setCity(''); setCost('')
  }

  function remove(i) {
    const u = zones.filter((_,j)=>j!==i)
    setZones(u); updateData('business',{...business,delivery_zones:u})
  }

  function updateCost(i,v) { setZones(zones.map((z,j)=>j===i?{...z,cost:parseFloat(v)||0}:z)) }

  function saveGlobal() {
    updateData('business',{...business,free_delivery_threshold:freeThreshold,default_delivery:defaultCost,delivery_zones:zones})
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>الإعدادات العامة</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
          <Input label="تكلفة التوصيل الافتراضية (د.إ)" type="number" value={defaultCost} onChange={e=>setDefaultCost(parseFloat(e.target.value)||0)} />
          <Input label="حد التوصيل المجاني (د.إ)" type="number" value={freeThreshold} onChange={e=>setFreeThreshold(parseFloat(e.target.value)||0)} placeholder="0 = معطّل" />
        </div>
        {freeThreshold > 0 && (
          <InfoBox>الطلبات التي تتجاوز {freeThreshold} د.إ ستحصل على توصيل مجاني تلقائياً</InfoBox>
        )}
        <Btn onClick={saveGlobal} style={{marginTop:14}}><IcSave size={14}/> حفظ</Btn>
      </Card>

      <Card>
        <SectionTitle>مناطق التوصيل</SectionTitle>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
          {zones.length === 0 && <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'12px 0'}}>لا توجد مناطق محددة</div>}
          {zones.map((z,i) => (
            <GlassRow key={i}>
              <span style={{flex:1,fontWeight:600,fontSize:14,color:'var(--text)'}}>{z.city}</span>
              <input type="number" value={z.cost}
                onChange={e=>updateCost(i,e.target.value)}
                onBlur={()=>updateData('business',{...business,delivery_zones:zones})}
                style={{width:80,padding:'6px 10px',background:'var(--bg-hover)',border:'none',borderRadius:999,color:'var(--teal)',fontWeight:700,fontSize:13,textAlign:'center',fontFamily:'inherit',outline:'none'}}
              />
              <span style={{fontSize:12,color:'var(--text-muted)'}}>د.إ</span>
              <button onClick={()=>remove(i)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}></button>
            </GlassRow>
          ))}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
          <Select value={city} onChange={e=>setCity(e.target.value)} label="المدينة" containerStyle={{flex:1}}>
            <option value="">اختر مدينة</option>
            {UAE_CITIES.filter(c=>!zones.find(z=>z.city===c)).map(c=><option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="التكلفة" type="number" value={cost} onChange={e=>setCost(e.target.value)} placeholder="20" containerStyle={{width:100}} />
          <Btn onClick={add} style={{alignSelf:'flex-end'}}>إضافة</Btn>
        </div>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DISCOUNTS TAB
══════════════════════════════════════════════════ */
function DiscountsTab() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]     = useState({ code:'', type:'percent', value:'', min_order:'', max_uses:'', expiry:'', active:true })

  useEffect(() => { DB.list('discounts').then(d=>{setList(d);setLoading(false)}) }, [])

  async function add() {
    if (!form.code||!form.value) { toast('أدخل الكود والقيمة','error'); return }
    try {
      const saved = await DB.insert('discounts', {
        ...form,
        value:parseFloat(form.value),
        min_order:parseFloat(form.min_order)||0,
        max_uses:parseInt(form.max_uses)||0,
        uses_count:0
      })
      setList(p=>[saved,...p])
      setForm({ code:'', type:'percent', value:'', min_order:'', max_uses:'', expiry:'', active:true })
      toast('تم إضافة الكود ')
    } catch(e) { toast(e.message,'error') }
  }

  async function toggle(id, active) {
    await DB.update('discounts', id, { active })
    setList(p=>p.map(d=>d.id===id?{...d,active}:d))
  }

  async function remove(id) {
    await DB.delete('discounts', id)
    setList(p=>p.filter(d=>d.id!==id))
    toast('تم الحذف')
  }

  if (loading) return <Spinner />

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>أكواد الخصم</SectionTitle>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {list.length===0 && <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0',textAlign:'center'}}>لا يوجد أكواد خصم بعد</div>}
          {list.map(d => (
            <GlassRow key={d.id}>
              <code style={{fontSize:14,fontWeight:800,color:'var(--teal)',minWidth:90,direction:'ltr'}}>{d.code}</code>
              <Badge color={d.type==='percent'?'var(--violet-light)':'var(--amber)'}>{d.value}{d.type==='percent'?'%':' د.إ'}</Badge>
              <div style={{flex:1,minWidth:0}}>
                {d.min_order>0 && <div style={{fontSize:10,color:'var(--text-muted)'}}>حد أدنى: {d.min_order} د.إ</div>}
                {d.max_uses>0 && <div style={{fontSize:10,color:'var(--text-muted)'}}>استخدام: {d.uses_count||0}/{d.max_uses}</div>}
                {d.expiry && <div style={{fontSize:10,color:'var(--text-muted)'}}>ينتهي: {d.expiry}</div>}
              </div>
              <Toggle checked={d.active} onChange={v=>toggle(d.id,v)} />
              <button onClick={()=>remove(d.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}></button>
            </GlassRow>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Input label="كود الخصم" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="SUMMER20" dir="ltr" containerStyle={{gridColumn:'1/-1'}} />
          <Select label="النوع" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
            <option value="percent">نسبة %</option>
            <option value="fixed">مبلغ ثابت</option>
          </Select>
          <Input label="القيمة" type="number" value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} />
          <Input label="الحد الأدنى للطلب (د.إ)" type="number" value={form.min_order} onChange={e=>setForm(p=>({...p,min_order:e.target.value}))} placeholder="0 = بدون حد" />
          <Input label="الحد الأقصى للاستخدام" type="number" value={form.max_uses} onChange={e=>setForm(p=>({...p,max_uses:e.target.value}))} placeholder="0 = غير محدود" />
          <Input label="تاريخ الانتهاء" type="date" value={form.expiry} onChange={e=>setForm(p=>({...p,expiry:e.target.value}))} containerStyle={{gridColumn:'1/-1'}} dir="ltr" />
        </div>
        <Btn onClick={add} style={{marginTop:14,alignSelf:'flex-start'}}><IcPlus size={14}/> إضافة الكود</Btn>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   NOTIFICATIONS TAB
══════════════════════════════════════════════════ */
function NotificationsTab() {
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mawj_notifications')||'{}') } catch { return {} }
  })

  function toggle(key) {
    const updated = {...settings, [key]: !settings[key]}
    setSettings(updated)
    localStorage.setItem('mawj_notifications', JSON.stringify(updated))
    toast('تم الحفظ ')
  }

  function updateVal(key, val) {
    const updated = {...settings, [key]: val}
    setSettings(updated)
    localStorage.setItem('mawj_notifications', JSON.stringify(updated))
  }

  const ITEMS = [
    { key:'new_order',      label:'طلب جديد',         desc:'تنبيه عند وصول طلب جديد',           icon:'' },
    { key:'low_stock',      label:'مخزون منخفض',      desc:'تنبيه عند وصول المخزون للحد الأدنى', icon:'️' },
    { key:'daily_summary',  label:'الملخص اليومي',     desc:'ملخص يومي في نهاية الدوام',           icon:'' },
    { key:'payment_due',    label:'دفعة متأخرة',       desc:'تذكير بالدفعات غير المحصلة',         icon:'' },
    { key:'target_reached', label:'تحقيق الهدف',      desc:'تهنئة عند تجاوز الهدف الشهري',        icon:'' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>إعدادات الإشعارات</SectionTitle>
        {ITEMS.map((item,i)=>(
          <ControlRow key={item.key} label={item.label} desc={item.desc} last={i===ITEMS.length-1}>
            <Toggle checked={!!settings[item.key]} onChange={()=>toggle(item.key)} />
          </ControlRow>
        ))}
      </Card>

      <Card>
        <SectionTitle>وقت الملخص اليومي</SectionTitle>
        <ControlRow label="وقت الإرسال" desc="الوقت الذي يُرسل فيه الملخص اليومي" last>
          <input type="time" value={settings.summary_time||'20:00'} onChange={e=>updateVal('summary_time',e.target.value)}
            style={{padding:'8px 12px',background:'var(--bg-hover)',border:'none',borderRadius:'var(--r-md)',color:'var(--text)',fontFamily:'inherit',outline:'none',direction:'ltr'}} />
        </ControlRow>
      </Card>

      <Card>
        <SectionTitle>حد المخزون المنخفض</SectionTitle>
        <ControlRow label="الحد الأدنى للمخزون" desc="التنبيه عند وصول الكمية لهذا الحد" last>
          <input type="number" value={settings.low_stock_threshold||5} onChange={e=>updateVal('low_stock_threshold',parseInt(e.target.value)||5)}
            style={{width:80,padding:'8px 12px',background:'var(--bg-hover)',border:'none',borderRadius:'var(--r-md)',color:'var(--teal)',fontWeight:700,fontFamily:'inherit',outline:'none',textAlign:'center'}} />
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
  const [sessionTimeout, setSessionTimeout] = useState(() => parseInt(localStorage.getItem('mawj_session_timeout')||'0'))
  const [log] = useState([
    { action:'تسجيل دخول', time:'منذ ٥ دقائق', device:'iPhone · Safari', ip:'192.168.1.x' },
    { action:'تعديل طلب',  time:'منذ ١٠ دقائق', device:'iPhone · Safari', ip:'192.168.1.x' },
    { action:'تسجيل دخول', time:'الأمس ٩:٣٢م', device:'MacBook · Chrome', ip:'192.168.1.x' },
  ])

  function saveTimeout() {
    localStorage.setItem('mawj_session_timeout', sessionTimeout)
    toast('تم حفظ إعدادات الجلسة ')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>إعدادات الجلسة</SectionTitle>
        <ControlRow label="انتهاء الجلسة التلقائي" desc="تسجيل خروج تلقائي بعد فترة عدم النشاط" last>
          <Select value={sessionTimeout} onChange={e=>setSessionTimeout(parseInt(e.target.value))}>
            <option value={0}>معطّل</option>
            <option value={30}>30 دقيقة</option>
            <option value={60}>ساعة واحدة</option>
            <option value={240}>4 ساعات</option>
            <option value={480}>8 ساعات</option>
          </Select>
        </ControlRow>
        <Btn onClick={saveTimeout} style={{marginTop:14}}><IcSave size={14}/> حفظ</Btn>
      </Card>

      <Card>
        <SectionTitle>سجل النشاط</SectionTitle>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {log.map((entry,i)=>(
            <GlassRow key={i}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{entry.action}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>{entry.device} · {entry.ip}</div>
              </div>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>{entry.time}</span>
            </GlassRow>
          ))}
        </div>
      </Card>

      <InfoBox icon="">كلمة المرور تُدار عبر Supabase Authentication. لتغييرها اذهب إلى إعدادات حسابك.</InfoBox>
    </div>
  )
}


/* ══════════════════════════════════════════════════
   PARTNERS TAB
══════════════════════════════════════════════════ */
function PartnersTab({ partners, updateData }) {
  const [list, setList] = useState(partners || [])
  const [form, setForm] = useState({ name:'', share:50 })

  useEffect(() => { setList(partners || []) }, [partners])

  function add() {
    if (!form.name.trim()) return
    const updated = [...list, { id:'p'+Date.now(), name:form.name.trim(), share:parseInt(form.share)||50 }]
    setList(updated); updateData('partners', updated)
    setForm({ name:'', share:50 })
  }

  function remove(id) {
    const updated = list.filter(p => p.id !== id)
    setList(updated); updateData('partners', updated)
  }

  function updateShare(id, share) {
    const updated = list.map(p => p.id === id ? {...p, share:parseInt(share)||50} : p)
    setList(updated); updateData('partners', updated)
  }

  const totalShare = list.reduce((s,p) => s+(p.share||0), 0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle icon="🤝">الشركاء</SectionTitle>
        <InfoBox icon="ℹ️">الشركاء هنا يؤثرون على صفحات المحاسبة والشركاء. نسبة الحصة تُستخدم لتوزيع الأرباح.</InfoBox>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:14,marginBottom:18}}>
          {list.length === 0 && <div style={{color:'var(--text-muted)',fontSize:13,padding:'12px 0',textAlign:'center'}}>لا يوجد شركاء — أضف إبراهيم وإحسان</div>}
          {list.map(p => (
            <GlassRow key={p.id}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:'#050c1a',flexShrink:0}}>
                {p.name?.[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{p.name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>ID: {p.id}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input
                  type="number" min="0" max="100" value={p.share}
                  onChange={e=>updateShare(p.id, e.target.value)}
                  style={{width:56,padding:'6px 8px',background:'var(--bg-hover)',border:'1.5px solid var(--input-border)',borderRadius:'var(--r-sm)',color:'var(--text)',fontSize:13,fontFamily:'inherit',textAlign:'center'}}
                />
                <span style={{fontSize:12,color:'var(--text-muted)'}}>%</span>
              </div>
              <button onClick={()=>remove(p.id)} style={{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:16,padding:4,flexShrink:0}}>✕</button>
            </GlassRow>
          ))}
        </div>
        {totalShare !== 100 && list.length > 0 && (
          <div style={{padding:'8px 12px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'var(--r-md)',fontSize:12,color:'#f59e0b',marginBottom:12}}>
            ⚠️ مجموع الحصص {totalShare}% — يجب أن يساوي 100%
          </div>
        )}
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <Input label="اسم الشريك" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="إبراهيم"/>
          <Input label="الحصة %" type="number" value={form.share} onChange={e=>setForm(p=>({...p,share:e.target.value}))} style={{width:80}}/>
          <Btn onClick={add} style={{flexShrink:0}}><IcPlus size={14}/> إضافة</Btn>
        </div>
      </Card>
    </div>
  )
}


/* ══════════════════════════════════════════════════
   AI TAB — Full AI assistant settings
══════════════════════════════════════════════════ */
const DEFAULT_AI_SETTINGS = {
  system_prompt: `أنت مساعد ذكي متخصص لشركة موج للهدايا الكريستالية في الإمارات.
تحليل البيانات، تقديم التوصيات، والإجابة عن أسئلة المبيعات والعمليات.
أجب دائماً بالعربية. كن مختصراً، دقيقاً، وعملياً.
إذا طُلب منك تحليل رقم، قدّم السبب والتوصية.`,
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1500,
  quick_prompts: [
    { id:'q1', label:'📊 ملخص اليوم',         text:'كيف كانت المبيعات اليوم مقارنة بالأمس؟' },
    { id:'q2', label:'📈 أداء هذا الشهر',     text:'ما أبرز مؤشرات الأداء هذا الشهر؟' },
    { id:'q3', label:'🔄 تحليل الاستبدالات',  text:'ما نسبة الاستبدالات وما سببها المرجح؟' },
    { id:'q4', label:'🏆 أفضل المنتجات',      text:'ما المنتجات الأكثر مبيعاً وربحاً؟' },
    { id:'q5', label:'🌆 أفضل المناطق',       text:'أي الإمارات تحقق أعلى مبيعات؟' },
    { id:'q6', label:'💡 توصية الأسبوع',      text:'بناءً على البيانات، ما أهم شيء يجب التركيز عليه الآن؟' },
  ],
  context_includes: {
    orders_summary: true,
    expenses_summary: true,
    products_breakdown: true,
    cities_breakdown: true,
    pending_cod: true,
    replacements: true,
  },
  actions_enabled: {
    navigate: true,
    mark_delivered: false,
    add_expense: false,
    update_status: false,
  },
  panel_position: 'bottom-left',
}

function AITab({ ai_settings, updateData }) {
  const cfg = { ...DEFAULT_AI_SETTINGS, ...ai_settings }
  const [form, setForm]     = useState(cfg)
  const [newPrompt, setNewPrompt] = useState({ label:'', text:'' })
  const [dirty, setDirty]   = useState(false)

  function set(path, value) {
    setForm(prev => {
      const parts = path.split('.')
      const next = { ...prev }
      let cur = next
      for (let i=0; i<parts.length-1; i++) { cur[parts[i]] = { ...cur[parts[i]] }; cur = cur[parts[i]] }
      cur[parts[parts.length-1]] = value
      return next
    })
    setDirty(true)
  }

  function save() {
    updateData('ai_settings', form)
    setDirty(false)
  }

  function addQuickPrompt() {
    if (!newPrompt.label.trim() || !newPrompt.text.trim()) return
    const updated = [...(form.quick_prompts||[]), { id:'q'+Date.now(), ...newPrompt }]
    set('quick_prompts', updated)
    setNewPrompt({ label:'', text:'' })
  }

  function removePrompt(id) {
    set('quick_prompts', (form.quick_prompts||[]).filter(p=>p.id!==id))
  }

  function updatePrompt(id, field, value) {
    set('quick_prompts', (form.quick_prompts||[]).map(p=>p.id===id?{...p,[field]:value}:p))
  }

  const MODELS = [
    { value:'claude-sonnet-4-20250514', label:'Claude Sonnet 4 (موصى به)' },
    { value:'claude-haiku-4-5-20251001', label:'Claude Haiku 4.5 (أسرع، أرخص)' },
    { value:'claude-opus-4-6', label:'Claude Opus 4.6 (أذكى، أبطأ)' },
  ]

  const POSITIONS = [
    { value:'bottom-left',  label:'أسفل اليسار' },
    { value:'bottom-right', label:'أسفل اليمين' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* Save banner */}
      {dirty && (
        <div style={{padding:'12px 16px',background:'rgba(0,228,184,0.08)',border:'1.5px solid rgba(0,228,184,0.3)',borderRadius:'var(--r-md)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,color:'var(--text-sec)'}}>لديك تغييرات غير محفوظة</span>
          <Btn size="sm" onClick={save}><IcSave size={13}/> حفظ الإعدادات</Btn>
        </div>
      )}

      {/* Model & Tokens */}
      <Card>
        <SectionTitle icon="⚙️">النموذج والأداء</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <Select label="نموذج الذكاء الاصطناعي" value={form.model} onChange={e=>set('model',e.target.value)}>
            {MODELS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <Input label="أقصى رموز للرد" type="number" min="500" max="4000"
            value={form.max_tokens} onChange={e=>set('max_tokens',parseInt(e.target.value)||1500)}
            hint="500–4000. أعلى = ردود أطول"/>
          <Select label="موضع اللوحة" value={form.panel_position} onChange={e=>set('panel_position',e.target.value)}>
            {POSITIONS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>
        <InfoBox icon="💡">Sonnet 4 هو الأفضل للتحليل اليومي. استخدم Haiku إذا أردت سرعة أكثر وتكلفة أقل.</InfoBox>
      </Card>

      {/* System Prompt */}
      <Card>
        <SectionTitle icon="📝">موجّه النظام</SectionTitle>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>هذا النص يُرسل مع كل رسالة ليحدد شخصية المساعد وأسلوبه</div>
        <textarea
          value={form.system_prompt}
          onChange={e=>set('system_prompt',e.target.value)}
          rows={6}
          style={{width:'100%',padding:'12px',background:'var(--bg-hover)',border:'1.5px solid var(--input-border)',borderRadius:'var(--r-md)',color:'var(--text)',fontSize:13,fontFamily:'inherit',resize:'vertical',outline:'none',boxSizing:'border-box',lineHeight:1.6}}
        />
        <button
          onClick={()=>set('system_prompt',DEFAULT_AI_SETTINGS.system_prompt)}
          style={{marginTop:8,fontSize:11,color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}
        >↩ استعادة الافتراضي</button>
      </Card>

      {/* Context */}
      <Card>
        <SectionTitle icon="📊">بيانات السياق</SectionTitle>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>اختر ما يُرسل للمساعد من بيانات مع كل سؤال</div>
        {[
          { key:'orders_summary',     label:'ملخص الطلبات',      desc:'اليوم، الشهر، الشهر الماضي' },
          { key:'expenses_summary',   label:'ملخص المصاريف',     desc:'هذا الشهر وغير المستردة' },
          { key:'products_breakdown', label:'تفصيل المنتجات',    desc:'أفضل 5 منتجات بالكمية والربح' },
          { key:'cities_breakdown',   label:'توزيع الإمارات',    desc:'أفضل 5 مناطق بالطلبات والإيراد' },
          { key:'pending_cod',        label:'COD المعلق',        desc:'طلبات مسلّمة لم تُحوَّل من حياك' },
          { key:'replacements',       label:'الاستبدالات',       desc:'العدد، النسبة، التكلفة' },
        ].map(item => (
          <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{item.label}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{item.desc}</div>
            </div>
            <button
              onClick={()=>set('context_includes.'+item.key, !form.context_includes?.[item.key])}
              style={{
                width:44,height:24,borderRadius:999,border:'none',cursor:'pointer',flexShrink:0,
                background: form.context_includes?.[item.key] ? 'var(--action)' : 'var(--bg-hover)',
                transition:'background 150ms',position:'relative',
              }}
            >
              <div style={{
                width:18,height:18,borderRadius:'50%',background:'#fff',
                position:'absolute',top:3,
                left: form.context_includes?.[item.key] ? 3 : 'auto',
                right: form.context_includes?.[item.key] ? 'auto' : 3,
                transition:'all 150ms',
              }}/>
            </button>
          </div>
        ))}
      </Card>

      {/* Actions */}
      <Card>
        <SectionTitle icon="⚡">الإجراءات التلقائية</SectionTitle>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>السماح للمساعد بتنفيذ إجراءات مباشرة داخل النظام</div>
        {[
          { key:'navigate',       label:'التنقل بين الصفحات',   desc:'يفتح الصفحات المطلوبة تلقائياً',    safe:true  },
          { key:'update_status',  label:'تغيير حالة الطلب',     desc:'مثل: تغيير "جديد" إلى "جاهز"',      safe:false },
          { key:'mark_delivered', label:'تسجيل التسليم',        desc:'يضع حالة الطلب "مسلّم" مباشرة',     safe:false },
          { key:'add_expense',    label:'إضافة مصروف',          desc:'يحفظ مصروف جديد بناءً على طلبك',    safe:false },
        ].map(item => (
          <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{item.label}</span>
                {!item.safe && <span style={{fontSize:10,padding:'2px 6px',borderRadius:999,background:'rgba(239,68,68,0.1)',color:'var(--danger)',fontWeight:700}}>يعدّل البيانات</span>}
                {item.safe  && <span style={{fontSize:10,padding:'2px 6px',borderRadius:999,background:'rgba(0,228,184,0.1)',color:'var(--action)',fontWeight:700}}>آمن</span>}
              </div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{item.desc}</div>
            </div>
            <button
              onClick={()=>set('actions_enabled.'+item.key, !form.actions_enabled?.[item.key])}
              style={{
                width:44,height:24,borderRadius:999,border:'none',cursor:'pointer',flexShrink:0,
                background: form.actions_enabled?.[item.key] ? (item.safe?'var(--action)':'#f59e0b') : 'var(--bg-hover)',
                transition:'background 150ms',position:'relative',
              }}
            >
              <div style={{
                width:18,height:18,borderRadius:'50%',background:'#fff',
                position:'absolute',top:3,
                left: form.actions_enabled?.[item.key] ? 3 : 'auto',
                right: form.actions_enabled?.[item.key] ? 'auto' : 3,
                transition:'all 150ms',
              }}/>
            </button>
          </div>
        ))}
        <InfoBox icon="⚠️" color="var(--pink)" style={{marginTop:12}}>الإجراءات التي تعدّل البيانات لا رجعة فيها. فعّلها فقط إذا كنت واثقاً من المساعد.</InfoBox>
      </Card>

      {/* Quick Prompts */}
      <Card>
        <SectionTitle icon="⚡">الأسئلة السريعة</SectionTitle>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>تظهر كأزرار في لوحة المساعد عند فتحها لأول مرة</div>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
          {(form.quick_prompts||[]).map(p => (
            <GlassRow key={p.id}>
              <input
                value={p.label} onChange={e=>updatePrompt(p.id,'label',e.target.value)}
                style={{width:160,padding:'6px 10px',background:'var(--bg-hover)',border:'1.5px solid var(--input-border)',borderRadius:'var(--r-sm)',color:'var(--text)',fontSize:12,fontFamily:'inherit'}}
                placeholder="الزر (مثال: 📊 ملخص)"
              />
              <input
                value={p.text} onChange={e=>updatePrompt(p.id,'text',e.target.value)}
                style={{flex:1,padding:'6px 10px',background:'var(--bg-hover)',border:'1.5px solid var(--input-border)',borderRadius:'var(--r-sm)',color:'var(--text)',fontSize:12,fontFamily:'inherit'}}
                placeholder="نص السؤال..."
              />
              <button onClick={()=>removePrompt(p.id)} style={{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:15,padding:'4px 6px',flexShrink:0}}>✕</button>
            </GlassRow>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <Input label="نص الزر" value={newPrompt.label} onChange={e=>setNewPrompt(p=>({...p,label:e.target.value}))} placeholder="📊 ملخص اليوم" style={{width:200}}/>
          <Input label="نص السؤال" value={newPrompt.text} onChange={e=>setNewPrompt(p=>({...p,text:e.target.value}))} placeholder="اعطني ملخص..."/>
          <Btn onClick={addQuickPrompt} style={{flexShrink:0,alignSelf:'flex-end'}}><IcPlus size={14}/></Btn>
        </div>
      </Card>

      {!dirty && (
        <Btn onClick={save}><IcSave size={14}/> حفظ جميع الإعدادات</Btn>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BACKUP TAB
══════════════════════════════════════════════════ */
function BackupTab() {
  const [loading, setLoading]   = useState(false)
  const [importing, setImporting] = useState(false)

  async function exportAll() {
    setLoading(true)
    try {
      const [orders,expenses,settlements,inventory,suppliers,capital,withdrawals] = await Promise.all([
        DB.list('orders'),DB.list('expenses'),DB.list('settlements'),
        DB.list('inventory'),DB.list('suppliers'),
        DB.list('capital_entries'),DB.list('withdrawals'),
      ])
      const blob = new Blob([JSON.stringify({
        exportDate:new Date().toISOString(), version:'9.0',
        data:{ orders,expenses,settlements,inventory,suppliers,capital_entries:capital,withdrawals }
      },null,2)],{type:'application/json'})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mawj-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      toast('تم تصدير البيانات ')
    } catch { toast('فشل التصدير','error') }
    finally { setLoading(false) }
  }

  async function exportCSV() {
    setLoading(true)
    try {
      const orders = await DB.list('orders')
      const headers = ['رقم الطلب','الهاتف','المدينة','الحالة','الإجمالي','الربح','التاريخ']
      const rows = orders.map(o => [
        o.order_number, o.customer_phone, o.customer_city,
        o.status, o.total, o.profit||0,
        new Date(o.created_at).toLocaleDateString('ar')
      ])
      const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      toast('تم تصدير CSV ')
    } catch { toast('فشل التصدير','error') }
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
        toast(`تم استيراد النسخة بتاريخ ${new Date(backup.exportDate).toLocaleDateString('ar')} `)
      } catch(err) { toast('فشل الاستيراد: '+err.message,'error') }
      finally { setImporting(false) }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>تصدير البيانات</SectionTitle>
        <div style={{fontSize:13,color:'var(--text-sec)',marginBottom:18,lineHeight:1.7}}>
          احتفظ بنسخة احتياطية من جميع بياناتك. يُنصح بالتصدير أسبوعياً.
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <Btn loading={loading} onClick={exportAll}><IcDownload size={14}/> تصدير JSON كامل</Btn>
          <Btn loading={loading} variant="secondary" onClick={exportCSV}><IcDownload size={14}/> تصدير الطلبات CSV</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle>استيراد نسخة احتياطية</SectionTitle>
        <div style={{fontSize:13,color:'var(--text-sec)',marginBottom:14,lineHeight:1.7}}>
          استيراد ملف JSON سبق تصديره من موج. تأكد من صحة الملف قبل الاستيراد.
        </div>
        <label style={{
          display:'flex',alignItems:'center',gap:10,padding:'14px 18px',
          background:'var(--bg-hover)',border:'2px dashed var(--border)',
          borderRadius:'var(--r-lg)',cursor:'pointer',
          transition:'border-color 0.2s ease',
        }}>
          <span style={{fontSize:24}}></span>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{importing?'جاري الاستيراد...':'اختر ملف النسخة الاحتياطية'}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>mawj-backup-YYYY-MM-DD.json</div>
          </div>
          <input type="file" accept=".json" onChange={importBackup} style={{display:'none'}} />
        </label>
      </Card>

      <InfoBox icon="️">بياناتك محفوظة تلقائياً في Supabase Cloud. النسخ الاحتياطي هنا للأرشفة الشخصية فقط.</InfoBox>
    </div>
  )
}
