import React, { useState, useEffect } from 'react'
import { Settings as SettingsDB, DB } from '../data/db'
import { UAE_CITIES, FONTS } from '../data/constants'
import { Btn, Card, Input, Select, Textarea, Spinner, Tabs, Toggle, ColorPicker, Badge, toast } from '../components/ui'
import { IcPlus, IcSave, IcDownload } from '../components/Icons'

/* ══════════════════════════════════════════════════
   SETTINGS v8.5 — Advanced control panel
   Violet glass tabs · Indigo-violet cards
══════════════════════════════════════════════════ */

export default function Settings({ theme, toggleTheme }) {
  const [tab, setTab]       = useState('business')
  const [loading, setLoading] = useState(true)
  const [data, setData]     = useState({ business:{}, statuses:[], products:[], templates:{}, partners:[] })

  const TABS = [
    { id:'business',   label:'🏪 المتجر' },
    { id:'statuses',   label:'📋 الحالات' },
    { id:'team',       label:'👥 الفريق' },
    { id:'whatsapp',   label:'📱 واتساب' },
    { id:'appearance', label:'🎨 المظهر' },
    { id:'delivery',   label:'🚚 التوصيل' },
    { id:'discounts',  label:'🏷️ الخصومات' },
    { id:'backup',     label:'💾 النسخ الاحتياطي' },
  ]

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
      setData({ business:business||{}, statuses:statuses||[], products:products||[], templates:templates||{}, partners:partners||[] })
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function saveSetting(key, value) {
    try { await SettingsDB.set(key, value); toast('تم الحفظ ✓') }
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

  return (
    <div className="page">
      {/* Page header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:900,marginBottom:4,color:'var(--text)'}}>الإعدادات</h1>
        <p style={{color:'var(--text-muted)',fontSize:13}}>تخصيص النظام وإدارة البيانات</p>
      </div>
      <div className="page-wave-accent" />

      {/* Tabs */}
      <div style={{marginBottom:28,overflowX:'auto'}}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="stagger">
        {tab==='business'   && <BusinessTab   data={data.business} products={data.products} partners={data.partners} onSave={updateData} />}
        {tab==='statuses'   && <StatusesTab   statuses={data.statuses} onSave={v=>updateData('statuses',v)} />}
        {tab==='team'       && <TeamTab />}
        {tab==='whatsapp'   && <WhatsAppTab   templates={data.templates} onSave={v=>updateData('whatsapp_templates',v)} />}
        {tab==='appearance' && <AppearanceTab theme={theme} toggleTheme={toggleTheme} />}
        {tab==='delivery'   && <DeliveryTab   business={data.business} onSave={v=>updateData('business',v)} />}
        {tab==='discounts'  && <DiscountsTab />}
        {tab==='backup'     && <BackupTab />}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SHARED: glass row item (used in lists)
══════════════════════════════════════════════════ */
function GlassRow({ children, style }) {
  return (
    <div className="list-row" style={{
      display:'flex',alignItems:'center',gap:12,
      padding:'10px 14px',
      background:'var(--bg-surface)',
      backdropFilter:'var(--blur-sm)',WebkitBackdropFilter:'var(--blur-sm)',
      border:'1.5px solid var(--glass-border)',
      borderRadius:'var(--radius-sm)',
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BUSINESS TAB
══════════════════════════════════════════════════ */
function BusinessTab({ data, products, partners, onSave }) {
  const [form, setForm]   = useState(data)
  const [pForm, setPForm] = useState({ name:'', price:'', cost:'', sku:'' })
  const [partnerName, setPartnerName] = useState('')

  function field(k,v) { setForm(p=>({...p,[k]:v})) }

  function addProduct() {
    if (!pForm.name) return
    const updated = [...(products||[]), { id:`p${Date.now()}`, ...pForm, price:parseFloat(pForm.price)||0, cost:parseFloat(pForm.cost)||0 }]
    onSave('products', updated)
    setPForm({ name:'', price:'', cost:'', sku:'' })
  }

  function removeProduct(id) { onSave('products', (products||[]).filter(p=>p.id!==id)) }

  function addPartner() {
    if (!partnerName.trim()) return
    onSave('partners', [...(partners||[]), partnerName.trim()])
    setPartnerName('')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card>
        <SectionTitle>معلومات المتجر</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Input label="اسم المتجر" value={form.name||''} onChange={e=>field('name',e.target.value)} containerStyle={{gridColumn:'1/-1'}} />
          <Input label="الهدف الشهري (د.إ)" type="number" value={form.monthly_target||''} onChange={e=>field('monthly_target',parseFloat(e.target.value)||0)} />
        </div>
        <Btn onClick={()=>onSave('business',form)} style={{marginTop:16}}><IcSave size={14}/> حفظ</Btn>
      </Card>

      <Card>
        <SectionTitle>المنتجات</SectionTitle>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
          {(products||[]).map(p => (
            <GlassRow key={p.id}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{p.name}</div>
                {p.sku && <div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{p.sku}</div>}
              </div>
              <span style={{fontSize:12,color:'var(--text-sec)'}}>تكلفة: {p.cost} د.إ</span>
              <span style={{fontSize:13,fontWeight:800,color:'var(--teal)'}}>{p.price} د.إ</span>
              <button onClick={()=>removeProduct(p.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,padding:4}}>✕</button>
            </GlassRow>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 80px auto',gap:8,alignItems:'flex-end'}}>
          <Input label="اسم المنتج" value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} placeholder="مثال: عطر رجالي" />
          <Input label="السعر" type="number" value={pForm.price} onChange={e=>setPForm(p=>({...p,price:e.target.value}))} />
          <Input label="التكلفة" type="number" value={pForm.cost} onChange={e=>setPForm(p=>({...p,cost:e.target.value}))} />
          <Input label="SKU" value={pForm.sku} onChange={e=>setPForm(p=>({...p,sku:e.target.value}))} />
          <Btn onClick={addProduct} style={{alignSelf:'flex-end'}}><IcPlus size={14}/></Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle>الشركاء</SectionTitle>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
          {(partners||[]).map((p,i) => (
            <div key={i} style={{
              display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
              background:'var(--violet-soft)',
              border:'1px solid var(--glass-border)',
              borderRadius:999,
            }}>
              <span style={{fontSize:13,color:'var(--text)'}}>{p}</span>
              <button onClick={()=>onSave('partners',partners.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:14,lineHeight:1}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <Input value={partnerName} onChange={e=>setPartnerName(e.target.value)} placeholder="اسم الشريك" containerStyle={{flex:1}} />
          <Btn variant="secondary" onClick={addPartner}>إضافة</Btn>
        </div>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   STATUSES TAB
══════════════════════════════════════════════════ */
function StatusesTab({ statuses, onSave }) {
  const [list, setList] = useState(statuses||[])
  const [form, setForm] = useState({ label:'', color:'#00e4b8' })

  function add() {
    if (!form.label) return
    const updated = [...list, { id:`s_${Date.now()}`, ...form, order:list.length }]
    setList(updated); onSave(updated)
    setForm({ label:'', color:'#00e4b8' })
  }

  function remove(id) { const u=list.filter(s=>s.id!==id); setList(u); onSave(u) }

  function update(id, field, value) {
    setList(list.map(s=>s.id===id?{...s,[field]:value}:s))
  }

  return (
    <Card>
      <SectionTitle>حالات الطلبات</SectionTitle>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
        {list.map(s => (
          <GlassRow key={s.id}>
            <input type="color" value={s.color}
              onChange={e=>update(s.id,'color',e.target.value)}
              onBlur={()=>onSave(list)}
              style={{width:32,height:32,borderRadius:8,border:'none',cursor:'pointer',padding:0,flexShrink:0}}
            />
            <input value={s.label}
              onChange={e=>update(s.id,'label',e.target.value)}
              onBlur={()=>onSave(list)}
              style={{
                flex:1,padding:'8px 12px',
                background:'var(--bg-glass)',
                backdropFilter:'var(--blur-sm)',WebkitBackdropFilter:'var(--blur-sm)',
                border:'1px solid var(--glass-border)',
                borderRadius:'var(--radius-sm)',
                color:'var(--text)',fontSize:13,fontFamily:'inherit',outline:'none',
              }}
            />
            <Badge color={s.color}>{s.label}</Badge>
            <button onClick={()=>remove(s.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,padding:4}}>✕</button>
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
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { DB.list('users').then(u=>{ setUsers(u); setLoading(false) }) }, [])
  if (loading) return <Spinner />

  const ROLES  = { admin:'مدير النظام', accountant:'محاسب', sales:'مبيعات', viewer:'مشاهد' }
  const ROLE_C = { admin:'var(--teal)', accountant:'var(--gold)', sales:'var(--violet-light)', viewer:'var(--text-muted)' }

  return (
    <Card>
      <SectionTitle>أعضاء الفريق</SectionTitle>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {users.map(u => (
          <GlassRow key={u.id}>
            <div style={{
              width:38,height:38,borderRadius:'50%',flexShrink:0,
              background:'linear-gradient(135deg,var(--teal),var(--violet-light),var(--pink))',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontWeight:900,color:'#07051c',
              boxShadow:'0 0 12px rgba(124,58,237,0.25)',
            }}>{u.name?.[0]||'؟'}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{u.name}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',direction:'ltr',textAlign:'right'}}>{u.email}</div>
            </div>
            <Badge color={ROLE_C[u.role]||'var(--text-muted)'}>{ROLES[u.role]||u.role}</Badge>
          </GlassRow>
        ))}
      </div>
      <div style={{
        marginTop:14,padding:'12px 16px',
        background:'var(--teal-soft)',
        border:'1px solid rgba(0,228,184,0.18)',
        borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--text-sec)',
      }}>
        💡 لإضافة مستخدمين جدد، أضفهم في Supabase → Authentication → Users
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════
   WHATSAPP TAB
══════════════════════════════════════════════════ */
function WhatsAppTab({ templates, onSave }) {
  const [form, setForm] = useState(templates||{})
  const TMPL = {
    order_confirm:  'تأكيد الطلب',
    order_shipped:  'تم الشحن',
    order_delivered:'تم التسليم',
    daily_summary:  'الملخص اليومي',
  }
  const VARS = ['{customer_name}','{order_number}','{total}','{tracking_number}','{expected_delivery}','{date}']

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card style={{padding:'14px 18px'}}>
        <div style={{fontSize:13,color:'var(--text-sec)',marginBottom:8,fontWeight:600}}>المتغيرات المتاحة:</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {VARS.map(v => (
            <code key={v} style={{
              fontSize:11,padding:'3px 10px',
              background:'var(--violet-faint)',
              border:'1px solid var(--glass-border)',
              borderRadius:999,color:'var(--teal)',
            }}>{v}</code>
          ))}
        </div>
      </Card>
      {Object.entries(TMPL).map(([key,label]) => (
        <Card key={key}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:'var(--text)'}}>📱 {label}</div>
          <Textarea value={form[key]||''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={{minHeight:90}} />
        </Card>
      ))}
      <Btn onClick={()=>onSave(form)} style={{alignSelf:'flex-start'}}><IcSave size={14}/> حفظ القوالب</Btn>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   APPEARANCE TAB — advanced control panel
══════════════════════════════════════════════════ */
function AppearanceTab({ theme, toggleTheme }) {
  const [accentColor, setAccentColor] = React.useState(() => localStorage.getItem('mawj_accent')||'#00e4b8')
  const [fontSize,    setFontSize]    = React.useState(() => localStorage.getItem('mawj_fontsize')||'medium')
  const [radius,      setRadius]      = React.useState(() => localStorage.getItem('mawj_radius')||'rounded')
  const [animations,  setAnimations]  = React.useState(() => localStorage.getItem('mawj_animations')!=='false')
  const [noise,       setNoise]       = React.useState(() => localStorage.getItem('mawj_noise')!=='false')
  const [spotlight,   setSpotlight]   = React.useState(() => localStorage.getItem('mawj_spotlight')!=='false')
  const [compactCards,setCompactCards]= React.useState(() => localStorage.getItem('mawj_compact')==='true')

  const currentFont = localStorage.getItem('mawj_font') || "'Noto Kufi Arabic', sans-serif"

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
    const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if(r) {
      const [,rv,gv,bv] = r
      const rgb = `${parseInt(rv,16)},${parseInt(gv,16)},${parseInt(bv,16)}`
      document.documentElement.style.setProperty('--teal', hex)
      document.documentElement.style.setProperty('--teal-glow', `rgba(${rgb},0.22)`)
      document.documentElement.style.setProperty('--teal-soft', `rgba(${rgb},0.10)`)
    }
    toast('تم تطبيق اللون ✓')
  }

  function applyFontSize(size) {
    setFontSize(size)
    localStorage.setItem('mawj_fontsize', size)
    const map = { small:13, medium:14, large:15 }
    document.documentElement.style.fontSize = map[size]+'px'
    toast('تم تطبيق الحجم ✓')
  }

  function applyRadius(r) {
    setRadius(r)
    localStorage.setItem('mawj_radius', r)
    const map = { sharp:'6px', rounded:'18px', pill:'28px' }
    const sm  = { sharp:'4px', rounded:'12px', pill:'18px' }
    document.documentElement.style.setProperty('--radius', map[r])
    document.documentElement.style.setProperty('--radius-sm', sm[r])
    toast('تم تطبيق الشكل ✓')
  }

  function toggleAnim(v) {
    setAnimations(v)
    localStorage.setItem('mawj_animations', v)
    const s = document.getElementById('mawj-anim-style') || document.createElement('style')
    s.id = 'mawj-anim-style'
    s.textContent = v ? '' : `
      .page { animation: none !important; }
      .stagger > * { animation: none !important; }
      @keyframes pageIn { from{} to{} }
      @keyframes cardEntrance { from{} to{} }
      @keyframes fadeInUp { from{} to{} }
      @keyframes toastIn { from{} to{} }
      @keyframes sheetUp { from{} to{} }
      @keyframes modalIn { from{} to{} }
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

  function toggleCompact(v) {
    setCompactCards(v)
    localStorage.setItem('mawj_compact', v)
    const s = document.getElementById('mawj-compact-style') || document.createElement('style')
    s.id = 'mawj-compact-style'
    s.textContent = v ? '.page { padding: 14px !important; }' : ''
    document.head.appendChild(s)
    toast(v ? 'وضع الضغط مفعّل' : 'وضع الضغط موقوف')
  }

  const ACCENT_PRESETS = [
    { color:'#00e4b8', name:'فيروزي' },
    { color:'#a78bfa', name:'بنفسجي' },
    { color:'#ec4899', name:'وردي' },
    { color:'#f59e0b', name:'عنبري' },
    { color:'#ef4444', name:'أحمر' },
    { color:'#3b82f6', name:'أزرق' },
    { color:'#10b981', name:'أخضر' },
    { color:'#f97316', name:'برتقالي' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* Dark/Light mode */}
      <Card>
        <SectionTitle>وضع العرض</SectionTitle>
        <div style={{display:'flex',gap:10}}>
          {[
            { id:'dark',  emoji:'🌙', label:'داكن',   desc:'مريح للعيون' },
            { id:'light', emoji:'☀️', label:'فاتح',   desc:'إضاءة كاملة' },
          ].map(t => (
            <button key={t.id} onClick={()=>{ if(theme!==t.id) toggleTheme() }} style={{
              flex:1,padding:'16px 12px',
              borderRadius:'var(--radius)',
              border:`2px solid ${theme===t.id?'var(--teal)':'var(--glass-border)'}`,
              background: theme===t.id
                ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(124,58,237,0.08))'
                : 'var(--bg-glass)',
              backdropFilter:'var(--blur-sm)',WebkitBackdropFilter:'var(--blur-sm)',
              color: theme===t.id?'var(--teal)':'var(--text-sec)',
              cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:13,
              transition:'all 0.2s ease',
              boxShadow: theme===t.id?'0 0 24px rgba(0,228,184,0.18)':'none',
            }}>
              <div style={{fontSize:24,marginBottom:6}}>{t.emoji}</div>
              <div>{t.label}</div>
              <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:400}}>{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Accent color */}
      <Card>
        <SectionTitle>لون الإجراء (Teal)</SectionTitle>
        <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:16}}>
          {ACCENT_PRESETS.map(p => (
            <button key={p.color} onClick={()=>applyAccent(p.color)} title={p.name} style={{
              width:44,height:44,borderRadius:'var(--radius-sm)',
              background:p.color,
              border:`3px solid ${accentColor===p.color?'var(--text)':'transparent'}`,
              cursor:'pointer',transition:'all 0.2s ease',
              boxShadow: accentColor===p.color?`0 0 18px ${p.color}aa`:`0 2px 8px ${p.color}44`,
              flexShrink:0,position:'relative',
            }}>
              {accentColor===p.color && (
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#fff',fontWeight:900,textShadow:'0 1px 4px rgba(0,0,0,0.5)'}}>✓</div>
              )}
            </button>
          ))}
          {/* Custom */}
          <div style={{position:'relative',width:44,height:44,flexShrink:0}}>
            <div style={{width:44,height:44,borderRadius:'var(--radius-sm)',background:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',cursor:'pointer',border:'2px solid var(--glass-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'var(--text)'}}>+</div>
            <input type="color" value={accentColor} onChange={e=>applyAccent(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%',borderRadius:'var(--radius-sm)'}} />
          </div>
        </div>
        <div style={{fontSize:12,color:'var(--text-muted)'}}>
          اللون الحالي: <span style={{color:accentColor,fontWeight:700}}>■ {accentColor}</span>
        </div>
      </Card>

      {/* Font */}
      <Card>
        <SectionTitle>الخط</SectionTitle>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {Object.entries(FONTS).map(([name,family]) => {
            const active = currentFont===family
            return (
              <button key={name} onClick={()=>applyFont(family)} style={{
                padding:'12px 20px',borderRadius:999,
                border:`2px solid ${active?'var(--teal)':'var(--glass-border)'}`,
                background: active
                  ? 'linear-gradient(135deg,rgba(0,228,184,0.10),rgba(124,58,237,0.06))'
                  : 'var(--bg-glass)',
                backdropFilter:'var(--blur-sm)',WebkitBackdropFilter:'var(--blur-sm)',
                color: active?'var(--teal)':'var(--text-sec)',
                cursor:'pointer',fontFamily:family,fontSize:15,fontWeight:700,
                transition:'all 0.2s ease',
                boxShadow: active?'0 0 16px rgba(0,228,184,0.22)':'none',
              }}>
                {name}
                <div style={{fontSize:11,marginTop:3,fontWeight:400,opacity:0.65}}>أبجد هوز ١٢٣</div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Size & Shape */}
      <Card>
        <SectionTitle>الحجم والشكل</SectionTitle>
        <ControlRow label="حجم الخط" desc="يؤثر على كل النصوص">
          <div style={{display:'flex',gap:6}}>
            {[{id:'small',label:'ص'},{id:'medium',label:'م'},{id:'large',label:'ك'}].map(s=>(
              <ControlBtn key={s.id} active={fontSize===s.id} onClick={()=>applyFontSize(s.id)}
                style={{fontSize: s.id==='small'?11:s.id==='medium'?13:15}}>
                {s.label}
              </ControlBtn>
            ))}
          </div>
        </ControlRow>
        <ControlRow label="شكل الزوايا" desc="حواف البطاقات والأزرار">
          <div style={{display:'flex',gap:6}}>
            {[{id:'sharp',label:'■',title:'حاد'},{id:'rounded',label:'▢',title:'مدوّر'},{id:'pill',label:'⬭',title:'بيضوي'}].map(r=>(
              <ControlBtn key={r.id} active={radius===r.id} onClick={()=>applyRadius(r.id)} title={r.title}
                style={{fontSize:18}}>
                {r.label}
              </ControlBtn>
            ))}
          </div>
        </ControlRow>
      </Card>

      {/* Behavior toggles */}
      <Card>
        <SectionTitle>تفضيلات العرض</SectionTitle>
        {[
          { label:'حركات وانتقالات',     desc:'تأثيرات الحركة والانتقال بين الصفحات', val:animations, set:toggleAnim },
          { label:'ملمس الخلفية',        desc:'نسيج خفيف على الخلفية',                val:noise,      set:toggleNoise },
          { label:'تأثير مؤشر الماوس',  desc:'هالة ضوئية تتبع المؤشر',               val:spotlight,  set:v=>{setSpotlight(v);localStorage.setItem('mawj_spotlight',v);toast(v?'مفعّل':'موقوف')} },
          { label:'وضع الضغط',           desc:'تقليل المسافات لعرض أكثر',              val:compactCards,set:toggleCompact },
        ].map(item => (
          <ControlRow key={item.label} label={item.label} desc={item.desc}>
            <Toggle checked={item.val} onChange={item.set} />
          </ControlRow>
        ))}
      </Card>

      {/* v8.5 palette preview */}
      <Card>
        <SectionTitle>لوحة الألوان v8.5</SectionTitle>
        <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
          {[
            { c:'#07051c', n:'خلفية' },
            { c:'#7c3aed', n:'بنفسجي' },
            { c:'#a78bfa', n:'بنفسجي فاتح' },
            { c:'#00e4b8', n:'فيروزي' },
            { c:'#ec4899', n:'وردي' },
            { c:'#e8e0ff', n:'نص داكن' },
            { c:'#0e0a2e', n:'نص فاتح' },
          ].map(({ c, n }) => (
            <div key={c} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{
                width:44,height:44,borderRadius:'var(--radius-sm)',
                background:c,
                border:'1.5px solid var(--glass-border)',
                boxShadow:`0 4px 12px ${c}55`,
              }} />
              <div style={{fontSize:9,color:'var(--text-muted)',textAlign:'center',maxWidth:48}}>{n}</div>
            </div>
          ))}
          {/* Gradient strip */}
          <div style={{flex:1,minWidth:100}}>
            <div style={{
              height:44,borderRadius:'var(--radius-sm)',
              background:'linear-gradient(135deg,#00e4b8,#a78bfa,#ec4899)',
              border:'1.5px solid var(--glass-border)',
              boxShadow:'0 4px 16px rgba(124,58,237,0.25)',
            }} />
            <div style={{fontSize:9,color:'var(--text-muted)',marginTop:4,textAlign:'center'}}>تدرّج الماركة</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DELIVERY TAB
══════════════════════════════════════════════════ */
function DeliveryTab({ business, onSave }) {
  const [zones, setZones] = useState(business.delivery_zones||[])
  const [city, setCity]   = useState('')
  const [cost, setCost]   = useState('')

  function add() {
    if (!city||!cost) return
    const u = [...zones, { city, cost:parseFloat(cost) }]
    setZones(u); onSave({ ...business, delivery_zones:u })
    setCity(''); setCost('')
  }

  function remove(i) {
    const u = zones.filter((_,j)=>j!==i)
    setZones(u); onSave({ ...business, delivery_zones:u })
  }

  function updateCost(i,v) {
    setZones(zones.map((z,j)=>j===i?{...z,cost:parseFloat(v)||0}:z))
  }

  return (
    <Card>
      <SectionTitle>مناطق التوصيل</SectionTitle>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
        {zones.map((z,i) => (
          <GlassRow key={i}>
            <span style={{flex:1,fontWeight:600,fontSize:14,color:'var(--text)'}}>{z.city}</span>
            <input type="number" value={z.cost}
              onChange={e=>updateCost(i,e.target.value)}
              onBlur={()=>onSave({...business,delivery_zones:zones})}
              style={{
                width:80,padding:'6px 10px',
                background:'var(--bg-glass)',
                border:'1px solid var(--glass-border)',
                borderRadius:999,color:'var(--teal)',
                fontWeight:700,fontSize:13,textAlign:'center',
                fontFamily:'inherit',outline:'none',
              }}
            />
            <span style={{fontSize:12,color:'var(--text-muted)'}}>د.إ</span>
            <button onClick={()=>remove(i)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button>
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
  )
}

/* ══════════════════════════════════════════════════
   DISCOUNTS TAB
══════════════════════════════════════════════════ */
function DiscountsTab() {
  const [list, setList]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]   = useState({ code:'', type:'percent', value:'', active:true })

  useEffect(() => { DB.list('discounts').then(d=>{setList(d);setLoading(false)}) }, [])

  async function add() {
    if (!form.code||!form.value) { toast('أدخل الكود والقيمة','error'); return }
    try {
      const saved = await DB.insert('discounts', { ...form, value:parseFloat(form.value), uses_count:0 })
      setList(p=>[saved,...p])
      setForm({ code:'', type:'percent', value:'', active:true })
      toast('تم إضافة الكود')
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
    <Card>
      <SectionTitle>أكواد الخصم</SectionTitle>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
        {list.length===0 && (
          <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0',textAlign:'center'}}>
            لا يوجد أكواد خصم بعد
          </div>
        )}
        {list.map(d => (
          <GlassRow key={d.id}>
            <code style={{fontSize:14,fontWeight:800,color:'var(--teal)',minWidth:90}}>{d.code}</code>
            <Badge color={d.type==='percent'?'var(--violet-light)':'var(--gold)'}>
              {d.value}{d.type==='percent'?'%':' د.إ'}
            </Badge>
            <span style={{fontSize:12,color:'var(--text-muted)',flex:1}}>استخدم: {d.uses_count||0}</span>
            <Toggle checked={d.active} onChange={v=>toggle(d.id,v)} />
            <button onClick={()=>remove(d.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button>
          </GlassRow>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 120px 100px auto',gap:10,alignItems:'flex-end'}}>
        <Input label="كود الخصم" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="SUMMER20" dir="ltr" />
        <Select label="النوع" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
          <option value="percent">نسبة %</option>
          <option value="fixed">مبلغ ثابت</option>
        </Select>
        <Input label="القيمة" type="number" value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} />
        <Btn onClick={add} style={{alignSelf:'flex-end'}}><IcPlus size={14}/> إضافة</Btn>
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════
   BACKUP TAB
══════════════════════════════════════════════════ */
function BackupTab() {
  const [loading, setLoading] = useState(false)

  async function exportAll() {
    setLoading(true)
    try {
      const [orders,expenses,settlements,inventory,suppliers,capital,withdrawals] = await Promise.all([
        DB.list('orders'),DB.list('expenses'),DB.list('settlements'),
        DB.list('inventory'),DB.list('suppliers'),
        DB.list('capital_entries'),DB.list('withdrawals'),
      ])
      const blob = new Blob([JSON.stringify({ exportDate:new Date().toISOString(), version:'8.5', data:{ orders,expenses,settlements,inventory,suppliers,capital_entries:capital,withdrawals } },null,2)],{type:'application/json'})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mawj-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      toast('تم تصدير البيانات ✓')
    } catch { toast('فشل التصدير','error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <Card glow>
        <SectionTitle>تصدير كامل للبيانات</SectionTitle>
        <div style={{fontSize:13,color:'var(--text-sec)',marginBottom:18,lineHeight:1.7}}>
          تصدير جميع الطلبات والمصاريف والمخزون كملف JSON. احتفظ بنسخة شهرياً.
        </div>
        <Btn loading={loading} onClick={exportAll}><IcDownload size={14}/> تصدير البيانات</Btn>
      </Card>
      <Card>
        <div style={{fontWeight:700,fontSize:13,color:'var(--amber)',marginBottom:8}}>⚠️ ملاحظة</div>
        <div style={{fontSize:13,color:'var(--text-sec)',lineHeight:1.7}}>
          بياناتك محفوظة تلقائياً في Supabase Cloud. النسخ الاحتياطي هنا للأرشفة الشخصية فقط.
        </div>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════════════ */
function SectionTitle({ children }) {
  return (
    <div style={{fontWeight:800,fontSize:15,marginBottom:18,color:'var(--text)'}}>
      {children}
    </div>
  )
}

function ControlRow({ label, desc, children }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'14px 0',borderBottom:'1px solid var(--glass-border)',gap:16,
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
      width:36,height:36,borderRadius:'var(--radius-sm)',
      border:`2px solid ${active?'var(--teal)':'var(--glass-border)'}`,
      background: active
        ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(124,58,237,0.08))'
        : 'var(--bg-glass)',
      backdropFilter:'var(--blur-sm)',WebkitBackdropFilter:'var(--blur-sm)',
      color: active?'var(--teal)':'var(--text-sec)',
      cursor:'pointer',fontFamily:'inherit',fontWeight:700,
      transition:'all 0.15s ease',
      ...style,
    }}>
      {children}
    </button>
  )
}
