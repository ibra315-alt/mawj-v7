import React, { useState, useRef, useEffect } from 'react'
import { DB, supabase } from '../data/db'
import { Settings as SettingsDB } from '../data/db'
import { formatCurrency } from '../data/constants'

/* ══════════════════════════════════════════════════════════
   AI ASSISTANT v10 — Mawj Crystal Gifts
   ─────────────────────────────────────────────────────────
   • Reads ai_settings from Settings for full customization
   • Pre-aggregated context (not raw rows)
   • Actions: navigate, update_status, mark_delivered, add_expense
   • Custom quick prompts from Settings
   • Security: Supabase Edge Function proxy — key never in browser
══════════════════════════════════════════════════════════ */

const DEFAULT_SYSTEM = `أنت مساعد ذكي متخصص لشركة موج للهدايا الكريستالية في الإمارات.
تحليل البيانات، تقديم التوصيات، والإجابة عن أسئلة المبيعات والعمليات.
أجب دائماً بالعربية. كن مختصراً، دقيقاً، وعملياً.`

const DEFAULT_QUICK = [
  { id:'q1', label:'📊 ملخص اليوم',       text:'كيف كانت المبيعات اليوم مقارنة بالأمس؟' },
  { id:'q2', label:'📈 أداء الشهر',        text:'ما أبرز مؤشرات الأداء هذا الشهر؟' },
  { id:'q3', label:'🔄 الاستبدالات',      text:'ما نسبة الاستبدالات وما سببها المرجح؟' },
  { id:'q4', label:'🏆 أفضل المنتجات',    text:'ما المنتجات الأكثر مبيعاً وربحاً؟' },
  { id:'q5', label:'🌆 أفضل المناطق',     text:'أي الإمارات تحقق أعلى مبيعات؟' },
  { id:'q6', label:'💡 توصية',             text:'بناءً على البيانات، ما أهم شيء يجب التركيز عليه الآن؟' },
]

// ── API proxy ─────────────────────────────────────────────
async function callAI(messages, systemPrompt, model='claude-sonnet-4-20250514', maxTokens=1500) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('غير مسجّل الدخول')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':`Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ model, max_tokens:maxTokens, system:systemPrompt, messages }),
  })
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error||`خطأ ${res.status}`) }
  const data = await res.json()
  if (data.error) throw new Error(typeof data.error==='string'?data.error:JSON.stringify(data.error))
  return data
}

// ── Context builder ───────────────────────────────────────
async function buildContext(cfg={}) {
  const inc = cfg.context_includes || {}
  const always = inc.orders_summary !== false
  try {
    const [orders, expenses] = await Promise.all([
      DB.list('orders', { orderBy:'created_at' }),
      DB.list('expenses', { orderBy:'date' }),
    ])
    const now         = new Date()
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yestStart   = new Date(todayStart); yestStart.setDate(yestStart.getDate()-1)
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMS      = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const lastME      = new Date(now.getFullYear(), now.getMonth(), 0)

    const byDate = (o, from, to) => { const d=new Date(o.order_date||o.created_at); return d>=from&&(!to||d<=to) }

    const todayOrds  = orders.filter(o=>byDate(o,todayStart))
    const yestOrds   = orders.filter(o=>byDate(o,yestStart,todayStart))
    const monthOrds  = orders.filter(o=>byDate(o,monthStart))
    const lastMOrds  = orders.filter(o=>byDate(o,lastMS,lastME))
    const monthExps  = expenses.filter(e=>new Date(e.date)>=monthStart)

    const tRev=todayOrds.reduce((s,o)=>s+(o.total||0),0)
    const yRev=yestOrds.reduce((s,o)=>s+(o.total||0),0)
    const mRev=monthOrds.reduce((s,o)=>s+(o.total||0),0)
    const mGP=monthOrds.reduce((s,o)=>s+(o.gross_profit||0),0)
    const mExp=monthExps.reduce((s,e)=>s+(e.amount||0),0)
    const mNet=mGP-mExp
    const mDeliv=monthOrds.filter(o=>o.status==='delivered').length
    const mND=monthOrds.filter(o=>o.status==='not_delivered').length
    const mRepl=monthOrds.filter(o=>o.is_replacement).length
    const mHayyak=monthOrds.reduce((s,o)=>s+(o.hayyak_fee||0),0)
    const lmRev=lastMOrds.reduce((s,o)=>s+(o.total||0),0)
    const lmGP=lastMOrds.reduce((s,o)=>s+(o.gross_profit||0),0)
    const lmExp=expenses.filter(e=>{const d=new Date(e.date);return d>=lastMS&&d<=lastME}).reduce((s,e)=>s+(e.amount||0),0)

    let ctx = `=== موج للهدايا — ${now.toLocaleDateString('ar-AE')} ===\n`

    if (always) {
      ctx += `\n── اليوم ──\nطلبات: ${todayOrds.length} | إيرادات: ${formatCurrency(tRev)}`
      if (yRev>0) ctx += ` | مقارنة بالأمس: ${((tRev-yRev)/yRev*100).toFixed(0)}%`
      ctx += `\n\n── هذا الشهر ──\nالطلبات: ${monthOrds.length} | الإيرادات: ${formatCurrency(mRev)}\nربح إجمالي: ${formatCurrency(mGP)} | رسوم حياك: ${formatCurrency(mHayyak)}`
    }

    if (inc.expenses_summary!==false) {
      ctx += `\nمصاريف: ${formatCurrency(mExp)} | صافي الربح: ${formatCurrency(mNet)}`
      const unreimb=expenses.filter(e=>e.paid_by&&e.paid_by!=='company'&&!e.reimbursed).reduce((s,e)=>s+(e.amount||0),0)
      if (unreimb>0) ctx += `\nمستحقات شركاء غير مستردة: ${formatCurrency(unreimb)}`
    }

    if (always) {
      ctx += `\nتسليم: ${mDeliv}/${monthOrds.length} (${monthOrds.length?Math.round(mDeliv/monthOrds.length*100):0}%) | لم يتم: ${mND}`
    }

    if (inc.replacements!==false) {
      ctx += `\nاستبدالات: ${mRepl} (${monthOrds.length?((mRepl/monthOrds.length)*100).toFixed(1):0}%)`
    }

    ctx += `\n\n── الشهر الماضي ──\nإيرادات: ${formatCurrency(lmRev)} | ربح إجمالي: ${formatCurrency(lmGP)} | صافي: ${formatCurrency(lmGP-lmExp)} | طلبات: ${lastMOrds.length}`

    if (inc.pending_cod!==false) {
      const pendingOrds=orders.filter(o=>o.status==='delivered'&&!o.hayyak_remittance_id)
      const pendingCOD=pendingOrds.reduce((s,o)=>s+(o.total||0),0)
      if (pendingCOD>0) ctx += `\n\n── COD معلق من حياك ──\n${pendingOrds.length} طلب — ${formatCurrency(pendingCOD)}`
    }

    const inProg=orders.filter(o=>['new','ready','with_hayyak'].includes(o.status))
    if (inProg.length>0) ctx += `\n\n── قيد المعالجة الآن ──\n${inProg.length} طلب (${inProg.filter(o=>o.status==='new').length} جديد، ${inProg.filter(o=>o.status==='with_hayyak').length} مع حياك)`

    if (inc.products_breakdown!==false) {
      const pm={}
      orders.forEach(o=>(o.items||[]).forEach(item=>{
        if(!pm[item.name])pm[item.name]={qty:0,rev:0,profit:0}
        pm[item.name].qty+=(item.qty||1); pm[item.name].rev+=(item.price||0)*(item.qty||1)
        pm[item.name].profit+=((item.price||0)-(item.cost||0))*(item.qty||1)
      }))
      const top=Object.entries(pm).sort((a,b)=>b[1].rev-a[1].rev).slice(0,5)
      if (top.length) {
        ctx += `\n\n── أفضل المنتجات (كل الوقت) ──`
        top.forEach(([n,d])=>{ ctx += `\n${n}: ${d.qty} وحدة، ${formatCurrency(d.rev)}، ربح ${formatCurrency(d.profit)}` })
      }
    }

    if (inc.cities_breakdown!==false) {
      const cm={}
      monthOrds.forEach(o=>{ const c=o.customer_city||'غير محدد'; if(!cm[c])cm[c]={count:0,rev:0}; cm[c].count++;cm[c].rev+=(o.total||0) })
      const topC=Object.entries(cm).sort((a,b)=>b[1].count-a[1].count).slice(0,5)
      if (topC.length) {
        ctx += `\n\n── توزيع الإمارات (هذا الشهر) ──`
        topC.forEach(([c,d])=>{ ctx += `\n${c}: ${d.count} طلب (${formatCurrency(d.rev)})` })
      }
    }

    return ctx.trim()
  } catch(err) { return `[خطأ في تحميل السياق: ${err.message}]` }
}

// ── Action executor ───────────────────────────────────────
async function executeAction(action, params, onNavigate) {
  switch(action) {
    case 'navigate':
      if (onNavigate && params.page) { onNavigate(params.page); return `✅ تم فتح صفحة ${params.page}` }
      return '⚠️ لا يمكن التنقل الآن'

    case 'update_status':
      if (!params.order_id || !params.status) return '⚠️ بيانات الإجراء غير مكتملة'
      await DB.update('orders', params.order_id, { status:params.status, updated_at:new Date().toISOString() })
      return `✅ تم تغيير حالة الطلب إلى "${params.status}"`

    case 'mark_delivered':
      if (!params.order_id) return '⚠️ رقم الطلب مطلوب'
      await DB.update('orders', params.order_id, { status:'delivered', updated_at:new Date().toISOString() })
      return `✅ تم تسجيل تسليم الطلب`

    case 'add_expense':
      if (!params.amount || !params.category) return '⚠️ المبلغ والفئة مطلوبان'
      await DB.insert('expenses', {
        amount:     parseFloat(params.amount),
        category:   params.category,
        description:params.description || '',
        date:       params.date || new Date().toISOString().split('T')[0],
        paid_by:    params.paid_by || 'company',
        reimbursed: false,
        created_at: new Date().toISOString(),
      })
      return `✅ تم إضافة مصروف: ${formatCurrency(parseFloat(params.amount))} — ${params.category}`

    default:
      return `⚠️ إجراء غير معروف: ${action}`
  }
}

// ── System prompt with actions ────────────────────────────
function buildSystemPrompt(baseCfg, actionsEnabled) {
  let prompt = (baseCfg?.system_prompt || DEFAULT_SYSTEM) + '\n\n'

  const enabledActions = Object.entries(actionsEnabled||{}).filter(([,v])=>v).map(([k])=>k)

  if (enabledActions.length > 0) {
    prompt += `يمكنك تنفيذ الإجراءات التالية عند الطلب الصريح من المستخدم فقط:\n`
    if (actionsEnabled?.navigate)       prompt += `- navigate: الانتقال لصفحة [orders|expenses|reports|hayyak|accounting|partners|inventory|settings]\n`
    if (actionsEnabled?.update_status)  prompt += `- update_status: تغيير حالة طلب (تحتاج order_id وstatus)\n`
    if (actionsEnabled?.mark_delivered) prompt += `- mark_delivered: تسجيل تسليم طلب (تحتاج order_id)\n`
    if (actionsEnabled?.add_expense)    prompt += `- add_expense: إضافة مصروف (تحتاج amount وcategory وdate)\n`
    prompt += `\nعند تنفيذ إجراء، أجب بالصيغة:\n[ACTION:{"action":"اسم_الإجراء","params":{...}}]\nثم اشرح ما فعلت.\nلا تنفذ أي إجراء بدون تأكيد صريح من المستخدم.\n`
  }

  return prompt
}

// ── Main component ────────────────────────────────────────
export default function AIAssistant({ onClose, onNavigate }) {
  const [messages,   setMessages]   = useState([
    { role:'assistant', content:'مرحباً! أنا مساعد موج 🤖\nيمكنني تحليل مبيعاتك، مقارنة الأداء، وتقديم توصيات عملية.\nكيف يمكنني مساعدتك؟' }
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [context,    setContext]    = useState(null)
  const [aiCfg,      setAiCfg]      = useState(null)
  const [executing,  setExecuting]  = useState(false)
  const [tab,        setTab]        = useState('chat')   // 'chat' | 'context'
  const bottomRef = useRef()

  // Load settings + context on mount
  useEffect(() => {
    SettingsDB.get('ai_settings').then(cfg => {
      setAiCfg(cfg || {})
      buildContext(cfg || {}).then(setContext)
    }).catch(() => {
      setAiCfg({})
      buildContext({}).then(setContext)
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const quickPrompts = aiCfg?.quick_prompts || DEFAULT_QUICK
  const model      = aiCfg?.model      || 'claude-sonnet-4-20250514'
  const maxTokens  = aiCfg?.max_tokens || 1500
  const actEnabled = aiCfg?.actions_enabled || {}
  const sysPrompt  = buildSystemPrompt(aiCfg, actEnabled)
  const hasActions = Object.values(actEnabled).some(Boolean)

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')
    const userMsg = { role:'user', content:userText }
    setMessages(p => [...p, userMsg])
    setLoading(true)
    try {
      const ctx     = context || await buildContext(aiCfg||{})
      const history = [...messages, userMsg].map(m => ({ role:m.role, content:m.content }))
      const data    = await callAI(history, sysPrompt + '\n\n' + ctx, model, maxTokens)
      const reply   = data.content?.[0]?.text || 'عذراً، لم أتمكن من الإجابة.'

      // Parse action commands from reply
      const ACTION_START = '[ACTION:{'
      const ACTION_END = '}]'
      const aStart = reply.indexOf(ACTION_START)
      const aEnd   = aStart >= 0 ? reply.indexOf(ACTION_END, aStart) : -1
      const actionMatch = aStart >= 0 && aEnd >= 0
        ? { full: reply.slice(aStart, aEnd + ACTION_END.length), json: reply.slice(aStart + ACTION_START.length - 1, aEnd + 1) }
        : null
      if (actionMatch && hasActions) {
        const clean = reply.replace(actionMatch.full, '').trim()
        setMessages(p => [...p, { role:'assistant', content:clean, pending_action: true }])
        setExecuting(true)
        try {
          const { action, params } = JSON.parse(actionMatch.json)
          const result = await executeAction(action, params, onNavigate)
          setMessages(p => [...p, { role:'system', content:result }])
        } catch(e) {
          setMessages(p => [...p, { role:'system', content:`⚠️ فشل الإجراء: ${e.message}` }])
        } finally { setExecuting(false) }
      } else {
        setMessages(p => [...p, { role:'assistant', content:reply }])
      }
    } catch(e) {
      setMessages(p => [...p, { role:'assistant', content:`حدث خطأ: ${e?.message||e}` }])
    } finally { setLoading(false) }
  }

  async function refreshContext() {
    setContext(null)
    const ctx = await buildContext(aiCfg||{})
    setContext(ctx)
  }

  function handleKey(e) { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); send() } }

  const showQuick  = messages.length === 1 && tab==='chat'
  const posRight   = aiCfg?.panel_position === 'bottom-right'

  return (
    <div style={{
      position:'fixed',
      bottom:80,
      [posRight?'right':'left']: 20,
      zIndex:800,
      width:380, height:560,
      background:'var(--modal-bg)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
      border:'1.5px solid var(--glass-border-teal)',
      borderRadius:'var(--radius-xl, 24px)',
      boxShadow:'var(--shadow-float)',
      display:'flex', flexDirection:'column',
      animation:'modalIn 0.28s ease both',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{padding:'10px 14px', borderBottom:'1px solid var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,228,184,0.04)', flexShrink:0}}>
        <div style={{display:'flex', alignItems:'center', gap:9}}>
          <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,boxShadow:'0 0 10px var(--teal-glow)'}}>🤖</div>
          <div>
            <div style={{fontWeight:800,fontSize:12.5,color:'var(--text)'}}>مساعد موج</div>
            <div style={{fontSize:9,color:context?'var(--teal)':'#f59e0b',marginTop:1}}>
              {context ? '● بيانات محمّلة' : '○ جارٍ التحميل...'}
              {hasActions && <span style={{color:'#f59e0b',marginRight:6}}>· إجراءات مفعّلة</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:5,alignItems:'center'}}>
          {/* Tab switcher */}
          <div style={{display:'flex',gap:2,background:'var(--bg-hover)',borderRadius:8,padding:2}}>
            {[{id:'chat',l:'💬'},{id:'context',l:'📊'}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                padding:'4px 8px',borderRadius:6,border:'none',cursor:'pointer',
                background:tab===t.id?'var(--action)':'transparent',
                color:tab===t.id?'#050c1a':'var(--text-muted)',
                fontSize:12,fontFamily:'inherit',
              }}>{t.l}</button>
            ))}
          </div>
          {messages.length>1 && (
            <button onClick={()=>setMessages([messages[0]])} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:10,cursor:'pointer',fontFamily:'inherit',padding:'4px 6px'}}>مسح</button>
          )}
          <button onClick={onClose} style={{background:'var(--bg-glass)',border:'1px solid var(--bg-border)',borderRadius:7,width:24,height:24,cursor:'pointer',color:'var(--text-sec)',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      </div>

      {/* Context tab */}
      {tab==='context' && (
        <div style={{flex:1,overflowY:'auto',padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:12,color:'var(--text-sec)'}}>البيانات المرسلة للمساعد</div>
            <button onClick={refreshContext} style={{fontSize:11,color:'var(--action)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>🔄 تحديث</button>
          </div>
          <pre style={{fontSize:11,color:'var(--text-muted)',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0,fontFamily:'monospace'}}>
            {context || 'جارٍ التحميل...'}
          </pre>
        </div>
      )}

      {/* Chat tab */}
      {tab==='chat' && (
        <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:7,WebkitOverflowScrolling:'touch'}}>
          {messages.map((m,i) => {
            const isSystem = m.role==='system'
            return (
              <div key={i} style={{display:'flex', justifyContent: m.role==='user'?'flex-start':'flex-end'}}>
                {isSystem ? (
                  <div style={{
                    width:'100%',padding:'7px 11px',borderRadius:'var(--r-md)',
                    background:m.content.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)',
                    border:`1px solid ${m.content.startsWith('✅')?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'}`,
                    fontSize:12,color:m.content.startsWith('✅')?'#10b981':'#f59e0b',fontWeight:700,
                  }}>{m.content}</div>
                ) : (
                  <div style={{
                    maxWidth:'88%', padding:'8px 12px',
                    borderRadius: m.role==='user'?'15px 15px 15px 4px':'15px 15px 4px 15px',
                    background: m.role==='user'
                      ? 'linear-gradient(135deg,var(--teal),var(--violet))'
                      : 'var(--bg-glass)',
                    border: m.role==='user'?'none':'1px solid var(--glass-border)',
                    color: m.role==='user'?'#050c1a':'var(--text)',
                    fontSize:12.5, lineHeight:1.65, fontWeight:m.role==='user'?700:400,
                    whiteSpace:'pre-wrap', wordBreak:'break-word',
                    opacity: m.pending_action ? 0.75 : 1,
                  }}>{m.content}</div>
                )}
              </div>
            )
          })}
          {(loading||executing) && (
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <div style={{padding:'9px 13px',background:'var(--bg-glass)',border:'1px solid var(--glass-border)',borderRadius:'15px 15px 4px 15px',display:'flex',gap:5,alignItems:'center',fontSize:11,color:'var(--text-muted)'}}>
                {executing ? '⚡ جارٍ التنفيذ...' : (
                  [0,1,2].map(i=>(
                    <div key={i} style={{width:5,height:5,borderRadius:'50%',background:'var(--teal)',animation:`bounce 1.2s ease infinite ${i*0.2}s`}}/>
                  ))
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      )}

      {/* Quick prompts */}
      {showQuick && (
        <div style={{padding:'0 8px 6px',display:'flex',flexWrap:'wrap',gap:4,flexShrink:0}}>
          {quickPrompts.map(p=>(
            <button key={p.id||p.text} onClick={()=>send(p.text)} style={{
              fontSize:10.5,padding:'5px 9px',borderRadius:999,
              background:'var(--bg-glass)',border:'1px solid var(--glass-border)',
              color:'var(--text-sec)',cursor:'pointer',fontFamily:'inherit',
            }}>{p.label}</button>
          ))}
        </div>
      )}

      {/* Input */}
      {tab==='chat' && (
        <div style={{padding:'7px 10px',borderTop:'1px solid var(--bg-border)',display:'flex',gap:6,alignItems:'flex-end',flexShrink:0}}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={hasActions ? 'اسأل أو اطلب إجراءً مثل: "سجّل تسليم طلب MWJ-001"' : 'اسأل عن مبيعاتك...'}
            rows={1}
            style={{
              flex:1,resize:'none',overflowY:'auto',maxHeight:80,
              padding:'8px 11px',
              background:'var(--input-bg)',border:'1.5px solid var(--input-border)',
              borderRadius:11,color:'var(--text)',fontSize:12.5,
              fontFamily:'inherit',outline:'none',
            }}
          />
          <button onClick={()=>send()} disabled={loading||executing||!input.trim()} style={{
            width:34,height:34,borderRadius:'50%',flexShrink:0,
            background:input.trim()?'linear-gradient(135deg,var(--teal),var(--violet))':'var(--bg-glass)',
            border:'none',cursor:input.trim()?'pointer':'default',
            color:input.trim()?'#050c1a':'var(--text-muted)',
            fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',
          }}>➤</button>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,60%,100%{ transform:translateY(0) }
          30%{ transform:translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
