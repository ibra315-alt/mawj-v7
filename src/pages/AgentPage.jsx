import React, { useState, useEffect, useRef } from 'react'
import { DB, supabase, SettingsDB } from '../data/db'
import { formatCurrency } from '../data/constants'

/* ══════════════════════════════════════════════════════════
   MAWJ AGENT PAGE v1.0
   ─────────────────────────────────────────────────────────
   Multi-step agentic loop with tool execution, confirmations,
   scheduled monitors, and run history.
   
   Tool protocol (works with ALL providers, no function_calling API):
   AI embeds: [TOOL:{"name":"...","params":{...}}]
   Frontend replies: [RESULT:{"ok":true,"data":{...}}]
   Loop until AI replies with no TOOL call.
══════════════════════════════════════════════════════════ */

// ── Detect provider ───────────────────────────────────────
function detectProvider(model='') {
  if (model.startsWith('gemini'))   return 'google'
  if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai'
  if (model.startsWith('deepseek')) return 'deepseek'
  return 'anthropic'
}

// ── Multi-provider callAI (same as AIAssistant) ───────────
async function callAI(messages, systemPrompt, model, maxTokens=1500, apiKeys={}) {
  const provider = detectProvider(model)
  if (provider === 'anthropic') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('غير مسجّل الدخول')
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ model, max_tokens:maxTokens, system:systemPrompt, messages }),
    })
    if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error||`خطأ ${res.status}`) }
    const d = await res.json(); if (d.error) throw new Error(d.error)
    return d.content?.[0]?.text || ''
  }
  if (provider === 'google') {
    const key = apiKeys.google_api_key; if (!key) throw new Error('مفتاح Google AI غير موجود')
    const gemMsgs = messages.map(m=>({ role: m.role==='assistant'?'model':'user', parts:[{text:m.content}] }))
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ system_instruction:{parts:[{text:systemPrompt}]}, contents:gemMsgs, generationConfig:{maxOutputTokens:maxTokens,temperature:0.3} }) })
    if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`خطأ Gemini`) }
    const d = await res.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }
  if (provider === 'openai' || provider === 'deepseek') {
    const key = provider==='openai' ? apiKeys.openai_api_key : apiKeys.deepseek_api_key
    if (!key) throw new Error(`مفتاح ${provider} غير موجود`)
    const url = provider==='openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions'
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
      body: JSON.stringify({ model, max_tokens:maxTokens, temperature:0.3, messages:[{role:'system',content:systemPrompt},...messages.map(m=>({role:m.role,content:m.content}))] }) })
    if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`خطأ`) }
    const d = await res.json(); return d.choices?.[0]?.message?.content || ''
  }
  throw new Error('مزود غير معروف')
}

// ── Tool definitions sent to AI ───────────────────────────
const TOOL_DEFS = `
الأدوات المتاحة لك. استخدم التنسيق بالضبط: [TOOL:{"name":"اسم_الأداة","params":{...}}]

1. get_summary — بدون params. يجلب ملخص النظام: إيرادات اليوم، هذا الشهر، الطلبات النشطة.
2. list_orders — params: { status?: string|string[], date_from?: "YYYY-MM-DD", date_to?: "YYYY-MM-DD", hayyak_only?: bool, no_remittance?: bool }
3. update_orders_status — params: { order_ids: string[], new_status: "ready"|"delivered"|"new"|"cancelled", reason?: string }  ⚠️ يعدّل بيانات
4. reconcile_hayyak_cod — بدون params. يحلل الطلبات المسلّمة بدون حوالة حياك ويقترح المطابقة.
5. detect_anomalies — بدون params. يقارن أداء اليوم والشهر بالمتوسط ويكتشف التحولات المثيرة.
6. generate_whatsapp_report — params: { period?: "today"|"week"|"month", include_details?: bool }. يصيغ تقريراً جاهزاً للإرسال على واتساب.
7. add_expense — params: { amount: number, category: string, description: string, paid_by?: string }  ⚠️ يعدّل بيانات
8. link_remittance — params: { order_ids: string[], remittance_id: string }  ⚠️ يعدّل بيانات

قواعد:
- استخدم أداة واحدة في كل رد.
- ابدأ بـ get_summary أو list_orders قبل أي تعديل.
- الأدوات التي تحمل ⚠️ تحتاج تأكيداً من المستخدم — ستُنفَّذ تلقائياً بعد عرضها.
- لا تُظهر تفكيرك الداخلي. ابدأ برد مباشر أو بأداة.
- بعد كل نتيجة أداة تُرسل إليك في [RESULT:...] واصل المهمة حتى تكتمل.
- عند الانتهاء التام، لخّص ما تم بدون [TOOL:...].
`

const AGENT_SYSTEM = `أنت وكيل ذكي متخصص لشركة موج للهدايا الكريستالية في الإمارات.
مهمتك تنفيذ المهام المعقدة متعددة الخطوات باستخدام الأدوات المتاحة.
أجب دائماً بالعربية. كن دقيقاً وعملياً وموجزاً.
لا تُظهر تفكيرك الداخلي. لا تكتب "THOUGHT:" أو "أفكر:" في ردودك.
${TOOL_DEFS}`

// ── Tool executor ─────────────────────────────────────────
async function executeTool(name, params) {
  switch (name) {
    case 'get_summary': {
      const [orders, expenses] = await Promise.all([DB.list('orders'), DB.list('expenses')])
      const now = new Date()
      const todayS = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthS = new Date(now.getFullYear(), now.getMonth(), 1)
      const toDay = o => new Date(o.order_date||o.created_at) >= todayS
      const toMonth = o => new Date(o.order_date||o.created_at) >= monthS
      const todayOrds = orders.filter(toDay)
      const monthOrds = orders.filter(toMonth)
      const tRev = todayOrds.reduce((s,o)=>s+(o.total||0),0)
      const mRev = monthOrds.reduce((s,o)=>s+(o.total||0),0)
      const mGP  = monthOrds.reduce((s,o)=>s+(o.gross_profit||0),0)
      const mExp = expenses.filter(e=>new Date(e.date)>=monthS).reduce((s,e)=>s+(e.amount||0),0)
      const inProgress = orders.filter(o=>['new','ready','with_hayyak'].includes(o.status))
      const pendingCOD = orders.filter(o=>o.status==='delivered'&&!o.hayyak_remittance_id)
      return {
        today: { orders:todayOrds.length, revenue:tRev },
        month: { orders:monthOrds.length, revenue:mRev, gross_profit:mGP, expenses:mExp, net:mGP-mExp,
          delivered:monthOrds.filter(o=>o.status==='delivered').length,
          not_delivered:monthOrds.filter(o=>o.status==='not_delivered').length,
          replacements:monthOrds.filter(o=>o.is_replacement).length },
        in_progress: inProgress.length,
        pending_cod: { count:pendingCOD.length, total:pendingCOD.reduce((s,o)=>s+(o.total||0),0) },
      }
    }

    case 'list_orders': {
      let orders = await DB.list('orders')
      if (params.status) {
        const statuses = Array.isArray(params.status) ? params.status : [params.status]
        orders = orders.filter(o => statuses.includes(o.status))
      }
      if (params.date_from) orders = orders.filter(o => new Date(o.order_date||o.created_at) >= new Date(params.date_from))
      if (params.date_to)   orders = orders.filter(o => new Date(o.order_date||o.created_at) <= new Date(params.date_to))
      if (params.hayyak_only) orders = orders.filter(o => o.hayyak_tracking || o.status === 'with_hayyak')
      if (params.no_remittance) orders = orders.filter(o => !o.hayyak_remittance_id)
      return { count: orders.length, orders: orders.slice(0,50).map(o=>({ id:o.id, ref:o.order_ref, customer:o.customer_name, status:o.status, total:o.total, date:o.order_date||o.created_at?.slice(0,10), city:o.customer_city })) }
    }

    case 'update_orders_status': {
      if (!params.order_ids?.length) return { ok:false, error:'لا توجد طلبات' }
      const { error } = await supabase.from('orders').update({ status: params.new_status, updated_at: new Date().toISOString() }).in('id', params.order_ids)
      if (error) return { ok:false, error: error.message }
      return { ok:true, updated: params.order_ids.length, new_status: params.new_status }
    }

    case 'reconcile_hayyak_cod': {
      const [orders, remittances] = await Promise.all([DB.list('orders'), DB.list('hayyak_remittances')])
      const unlinked = orders.filter(o => o.status==='delivered' && !o.hayyak_remittance_id)
      const openRem  = remittances.filter(r => !r.fully_reconciled)
      const suggestions = []
      for (const rem of openRem.slice(0,10)) {
        const remDate = new Date(rem.date)
        const nearby  = unlinked.filter(o => {
          const d = new Date(o.order_date||o.created_at)
          const diffDays = Math.abs((d-remDate)/(1000*60*60*24))
          return diffDays <= 7
        })
        if (nearby.length) suggestions.push({ remittance_id:rem.id, remittance_ref:rem.reference, amount:rem.amount, date:rem.date, candidate_orders:nearby.slice(0,5).map(o=>({id:o.id,ref:o.order_ref,total:o.total,date:o.order_date||o.created_at?.slice(0,10)})) })
      }
      return { unlinked_orders: unlinked.length, open_remittances: openRem.length, suggestions }
    }

    case 'detect_anomalies': {
      const orders = await DB.list('orders')
      const now = new Date()
      const todayS   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const day7ago  = new Date(todayS); day7ago.setDate(day7ago.getDate()-7)
      const day14ago = new Date(todayS); day14ago.setDate(day14ago.getDate()-14)
      const monthS   = new Date(now.getFullYear(), now.getMonth(), 1)
      const byDate = (o,from,to) => { const d=new Date(o.order_date||o.created_at); return d>=from&&(!to||d<to) }
      const todayOrds   = orders.filter(o=>byDate(o,todayS))
      const last7       = orders.filter(o=>byDate(o,day7ago,todayS))
      const prev7       = orders.filter(o=>byDate(o,day14ago,day7ago))
      const monthOrds   = orders.filter(o=>byDate(o,monthS))
      const tRev = todayOrds.reduce((s,o)=>s+(o.total||0),0)
      const avg7Rev  = last7.reduce((s,o)=>s+(o.total||0),0) / 7
      const avg7prev = prev7.reduce((s,o)=>s+(o.total||0),0) / 7
      const replRate = monthOrds.length ? monthOrds.filter(o=>o.is_replacement).length / monthOrds.length : 0
      const ndRate   = monthOrds.length ? monthOrds.filter(o=>o.status==='not_delivered').length / monthOrds.length : 0
      const anomalies = []
      if (tRev < avg7Rev * 0.5 && avg7Rev > 0) anomalies.push({ type:'low_today_revenue', severity:'high', msg:`إيرادات اليوم (${formatCurrency(tRev)}) أقل من 50% من المتوسط الأسبوعي (${formatCurrency(avg7Rev)})` })
      if (todayOrds.length === 0) anomalies.push({ type:'zero_orders_today', severity:'medium', msg:'لا توجد طلبات اليوم' })
      if (replRate > 0.15) anomalies.push({ type:'high_replacement_rate', severity:'high', msg:`نسبة الاستبدال هذا الشهر ${(replRate*100).toFixed(1)}% — أعلى من المعتاد` })
      if (ndRate > 0.20) anomalies.push({ type:'high_not_delivered', severity:'medium', msg:`نسبة عدم التسليم ${(ndRate*100).toFixed(1)}%` })
      if (avg7Rev < avg7prev * 0.7 && avg7prev > 0) anomalies.push({ type:'weekly_revenue_drop', severity:'medium', msg:`إيرادات الأسبوع الأخير انخفضت ${Math.round((1-avg7Rev/avg7prev)*100)}% عن الأسبوع السابق` })
      return { anomalies, stats: { today_orders:todayOrds.length, today_revenue:tRev, avg_daily_revenue_7d:Math.round(avg7Rev), replacement_rate:`${(replRate*100).toFixed(1)}%`, not_delivered_rate:`${(ndRate*100).toFixed(1)}%` } }
    }

    case 'generate_whatsapp_report': {
      const [orders, expenses] = await Promise.all([DB.list('orders'), DB.list('expenses')])
      const now = new Date()
      const period = params.period || 'today'
      let from, label
      if (period==='today') { from=new Date(now.getFullYear(),now.getMonth(),now.getDate()); label='اليوم' }
      else if (period==='week') { from=new Date(now); from.setDate(from.getDate()-7); label='الأسبوع الماضي' }
      else { from=new Date(now.getFullYear(),now.getMonth(),1); label='هذا الشهر' }
      const filtered = orders.filter(o=>new Date(o.order_date||o.created_at)>=from)
      const rev   = filtered.reduce((s,o)=>s+(o.total||0),0)
      const gp    = filtered.reduce((s,o)=>s+(o.gross_profit||0),0)
      const exp   = expenses.filter(e=>new Date(e.date)>=from).reduce((s,e)=>s+(e.amount||0),0)
      const deliv = filtered.filter(o=>o.status==='delivered').length
      const repl  = filtered.filter(o=>o.is_replacement).length
      const lines = [
        `📊 *تقرير موج — ${label}*`,
        `📅 ${now.toLocaleDateString('ar-AE')}`,
        ``,
        `🛒 الطلبات: ${filtered.length}`,
        `💰 الإيرادات: ${formatCurrency(rev)}`,
        `📈 الربح الإجمالي: ${formatCurrency(gp)}`,
        `💸 المصاريف: ${formatCurrency(exp)}`,
        `✅ الصافي: ${formatCurrency(gp-exp)}`,
        ``,
        `✅ مسلّم: ${deliv} | 🔄 استبدال: ${repl}`,
      ]
      if (params.include_details) {
        const cityMap={}; filtered.forEach(o=>{ const c=o.customer_city||'أخرى'; cityMap[c]=(cityMap[c]||0)+1 })
        const top = Object.entries(cityMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,n])=>`${c}: ${n}`).join(' | ')
        lines.push(`🌆 أبرز المناطق: ${top}`)
      }
      lines.push(``, `_موج للهدايا الكريستالية_`)
      return { report: lines.join('\n'), stats: { orders:filtered.length, revenue:rev, net:gp-exp } }
    }

    case 'add_expense': {
      if (!params.amount || !params.category) return { ok:false, error:'يجب تحديد المبلغ والفئة' }
      const { data, error } = await supabase.from('expenses').insert([{
        amount: params.amount, category: params.category,
        description: params.description||'', paid_by: params.paid_by||'company',
        date: new Date().toISOString().slice(0,10),
      }]).select().single()
      if (error) return { ok:false, error:error.message }
      return { ok:true, expense_id:data.id, amount:data.amount, category:data.category }
    }

    case 'link_remittance': {
      if (!params.order_ids?.length || !params.remittance_id) return { ok:false, error:'بيانات ناقصة' }
      const { error } = await supabase.from('orders').update({ hayyak_remittance_id: params.remittance_id }).in('id', params.order_ids)
      if (error) return { ok:false, error:error.message }
      return { ok:true, linked:params.order_ids.length, remittance_id:params.remittance_id }
    }

    default:
      return { ok:false, error:`أداة غير معروفة: ${name}` }
  }
}

// Mutation tools that need confirmation
const MUTATION_TOOLS = new Set(['update_orders_status','add_expense','link_remittance'])

// Parse [TOOL:{...}] from AI response
function parseToolCall(text) {
  const idx = text.indexOf('[TOOL:')
  if (idx === -1) return null
  const end = text.indexOf(']', idx)
  if (end === -1) return null
  try {
    const json = text.slice(idx+6, end)
    return JSON.parse(json)
  } catch { return null }
}

// Strip [TOOL:...] from response for display
function stripToolCall(text) {
  const idx = text.indexOf('[TOOL:')
  if (idx === -1) return text.trim()
  const end = text.indexOf(']', idx)
  if (end === -1) return text.trim()
  return (text.slice(0, idx) + text.slice(end + 1)).trim()
}

// ── Default scheduled tasks ───────────────────────────────
const DEFAULT_SCHEDULES = [
  { id:'s1', name:'تقرير الصباح',      task:'أنشئ تقرير واتساب ليوم أمس وأبرز الانحرافات إن وجدت', frequency:'daily',   hour:9,  enabled:false, lastRun:null },
  { id:'s2', name:'فحص حالات شاذة',   task:'افحص الأداء واكتشف أي انحرافات غير طبيعية', frequency:'daily',   hour:18, enabled:false, lastRun:null },
  { id:'s3', name:'تسوية حياك',        task:'حلل الطلبات المسلّمة بدون حوالة حياك وقترح المطابقة', frequency:'weekly',  day:0,   enabled:false, lastRun:null },
  { id:'s4', name:'تقرير الأسبوع',     task:'أنشئ ملخصاً أسبوعياً شاملاً مع التوصيات', frequency:'weekly',  day:0,   enabled:false, lastRun:null },
]

// ── Styling helpers ───────────────────────────────────────
const S = {
  card: { background:'var(--bg-glass)', border:'1.5px solid var(--glass-border)', borderRadius:'var(--r-lg,16px)', padding:16 },
  pill: (color) => ({ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:`${color}18`, color }),
  step: (status) => ({
    display:'flex', gap:10, padding:'10px 12px',
    background: status==='done' ? 'rgba(0,228,184,0.05)' : status==='error' ? 'rgba(239,68,68,0.05)' : status==='confirm' ? 'rgba(245,158,11,0.08)' : 'var(--bg-hover)',
    border: `1px solid ${status==='done'?'rgba(0,228,184,0.2)':status==='error'?'rgba(239,68,68,0.2)':status==='confirm'?'rgba(245,158,11,0.2)':'var(--bg-border)'}`,
    borderRadius:'var(--r-md,12px)', transition:'all 0.2s',
  }),
  btn: (variant='primary') => ({
    padding:'8px 16px', borderRadius:'var(--r-md)', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit',
    background: variant==='primary' ? 'linear-gradient(135deg,var(--teal),var(--violet))' : variant==='danger' ? 'rgba(239,68,68,0.1)' : variant==='confirm' ? 'rgba(245,158,11,0.15)' : 'var(--bg-hover)',
    color: variant==='primary' ? '#050c1a' : variant==='danger' ? 'var(--danger,#ef4444)' : variant==='confirm' ? '#f59e0b' : 'var(--text)',
    transition:'all 0.15s',
  }),
}

// ── Main component ────────────────────────────────────────
export default function AgentPage({ user, onNavigate }) {
  const [tab, setTab]           = useState('task')
  const [input, setInput]       = useState('')
  const [running, setRunning]   = useState(false)
  const [steps, setSteps]       = useState([])    // [{id,type,content,status,tool,params,result}]
  const [pendingConfirm, setPendingConfirm] = useState(null)  // step id awaiting confirm
  const [confirmResolve, setConfirmResolve] = useState(null)
  const [schedules, setSchedules] = useState(DEFAULT_SCHEDULES)
  const [logs, setLogs]         = useState([])
  const [aiCfg, setAiCfg]       = useState(null)
  const [scheduledRunning, setScheduledRunning] = useState(null)
  const stepsEndRef = useRef()

  // Load AI config + schedules + logs
  useEffect(() => {
    SettingsDB.get('ai_settings').then(v => v && setAiCfg(v))
    SettingsDB.get('agent_schedules').then(v => v && setSchedules(v))
    SettingsDB.get('agent_logs').then(v => v && setLogs(v.slice(-50)))
  }, [])

  // Auto-scroll steps
  useEffect(() => { stepsEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [steps])

  // Check scheduled tasks on mount
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    const day  = now.getDay()  // 0=Sunday
    schedules.forEach(sch => {
      if (!sch.enabled) return
      const lastRun = sch.lastRun ? new Date(sch.lastRun) : null
      const alreadyRanToday = lastRun && lastRun.toDateString() === now.toDateString()
      if (sch.frequency === 'daily' && sch.hour === hour && !alreadyRanToday) {
        runScheduledTask(sch)
      }
      if (sch.frequency === 'weekly' && sch.day === day && !alreadyRanToday) {
        runScheduledTask(sch)
      }
    })
  }, []) // eslint-disable-line

  async function runScheduledTask(sch) {
    setScheduledRunning(sch.id)
    await runAgent(sch.task, `مهمة مجدولة: ${sch.name}`)
    const updated = schedules.map(s => s.id===sch.id ? {...s, lastRun:new Date().toISOString()} : s)
    setSchedules(updated)
    SettingsDB.set('agent_schedules', updated)
    setScheduledRunning(null)
  }

  // ── Confirmation promise ──────────────────────────────
  async function waitForConfirm(stepId) {
    return new Promise(resolve => {
      setPendingConfirm(stepId)
      setConfirmResolve(() => resolve)
    })
  }

  function handleConfirm(confirmed) {
    setPendingConfirm(null)
    if (confirmResolve) { confirmResolve(confirmed); setConfirmResolve(null) }
  }

  // ── Agentic loop ──────────────────────────────────────
  async function runAgent(taskText, label) {
    const text = taskText || input.trim()
    if (!text || running) return
    setInput('')
    setRunning(true)
    setSteps([])
    setTab('task')

    const model     = aiCfg?.model || 'claude-sonnet-4-20250514'
    const maxTokens = aiCfg?.max_tokens || 1500
    const apiKeys   = aiCfg?.api_keys || {}

    // Add user task step
    const taskStep = { id:'task-0', type:'user', content: label||text, status:'done' }
    setSteps([taskStep])

    // Build initial context
    let ctx = ''
    try {
      const summary = await executeTool('get_summary', {})
      ctx = `\nبيانات النظام الحالية:\n${JSON.stringify(summary, null, 2)}\n\nتاريخ اليوم: ${new Date().toLocaleDateString('ar-AE')}`
    } catch {}

    const messages = [{ role:'user', content: text }]
    let iterations = 0
    const MAX_ITER = 12

    while (iterations < MAX_ITER) {
      iterations++
      // Thinking indicator
      const thinkId = `think-${iterations}`
      setSteps(prev => [...prev, { id:thinkId, type:'thinking', content:'يفكّر...', status:'running' }])

      let aiText
      try {
        aiText = await callAI(messages, AGENT_SYSTEM + ctx, model, maxTokens, apiKeys)
      } catch(err) {
        setSteps(prev => prev.filter(s=>s.id!==thinkId))
        setSteps(prev => [...prev, { id:`err-${iterations}`, type:'error', content:`خطأ: ${err.message}`, status:'error' }])
        break
      }

      setSteps(prev => prev.filter(s=>s.id!==thinkId))

      const toolCall = parseToolCall(aiText)
      const visibleText = stripToolCall(aiText)

      if (!toolCall) {
        // Final answer
        if (visibleText) setSteps(prev => [...prev, { id:`final-${iterations}`, type:'answer', content:visibleText, status:'done' }])
        break
      }

      // Show AI's message if any before tool call
      if (visibleText) setSteps(prev => [...prev, { id:`msg-${iterations}`, type:'msg', content:visibleText, status:'done' }])

      const isMutation = MUTATION_TOOLS.has(toolCall.name)
      const stepId = `tool-${iterations}-${toolCall.name}`

      setSteps(prev => [...prev, {
        id: stepId, type:'tool', tool:toolCall.name, params:toolCall.params,
        status: isMutation ? 'confirm' : 'running', result:null,
      }])

      if (isMutation) {
        const confirmed = await waitForConfirm(stepId)
        if (!confirmed) {
          setSteps(prev => prev.map(s => s.id===stepId ? {...s, status:'cancelled'} : s))
          messages.push({ role:'assistant', content:aiText })
          messages.push({ role:'user', content:`[RESULT:{"ok":false,"cancelled":true,"message":"المستخدم ألغى التنفيذ"}]` })
          continue
        }
      }

      setSteps(prev => prev.map(s => s.id===stepId ? {...s, status:'running'} : s))

      let result
      try {
        result = await executeTool(toolCall.name, toolCall.params)
        setSteps(prev => prev.map(s => s.id===stepId ? {...s, status:'done', result} : s))
      } catch(err) {
        result = { ok:false, error:err.message }
        setSteps(prev => prev.map(s => s.id===stepId ? {...s, status:'error', result} : s))
      }

      messages.push({ role:'assistant', content:aiText })
      messages.push({ role:'user', content:`[RESULT:${JSON.stringify(result)}]` })
    }

    if (iterations >= MAX_ITER) {
      setSteps(prev => [...prev, { id:'limit', type:'error', content:'وصل الوكيل للحد الأقصى من الخطوات (12). قد تحتاج إلى تقسيم المهمة.', status:'error' }])
    }

    // Log the run
    const log = { id:Date.now(), task:label||text, ran_at:new Date().toISOString(), steps_count:steps.length, model }
    const newLogs = [...logs, log].slice(-50)
    setLogs(newLogs)
    SettingsDB.set('agent_logs', newLogs)

    setRunning(false)
  }

  // ── Quick task presets ────────────────────────────────
  const QUICK_TASKS = [
    { icon:'📊', label:'تقرير الصباح',   task:'اعمل تقرير واتساب كامل لأداء اليوم مقارنةً بالأمس والأسبوع' },
    { icon:'⚠️', label:'فحص انحرافات',   task:'افحص الأداء واكتشف أي انحرافات أو مشاكل تحتاج انتباهي' },
    { icon:'🔄', label:'تسوية حياك',     task:'حلل الطلبات المسلّمة التي لم تُربط بحوالة حياك وقترح المطابقة' },
    { icon:'✅', label:'أكّد الطلبات',   task:'اعرض الطلبات التي وصلت "مع حياك" منذ أكثر من 3 أيام واقترح تحويلها لمسلّم' },
    { icon:'📈', label:'ملخص الأسبوع',   task:'أنشئ ملخصاً أسبوعياً للأداء مع التوصيات للأسبوع القادم' },
    { icon:'🏆', label:'أفضل المنتجات',  task:'حلل أفضل المنتجات أداءً هذا الشهر وقارنها بالشهر الماضي' },
  ]

  // ── Save schedules ────────────────────────────────────
  function toggleSchedule(id) {
    const updated = schedules.map(s => s.id===id ? {...s, enabled:!s.enabled} : s)
    setSchedules(updated)
    SettingsDB.set('agent_schedules', updated)
  }

  function updateScheduleTask(id, task) {
    const updated = schedules.map(s => s.id===id ? {...s, task} : s)
    setSchedules(updated)
    SettingsDB.set('agent_schedules', updated)
  }

  // ── Step type → icon/color ────────────────────────────
  function stepIcon(s) {
    if (s.type==='user')     return '💬'
    if (s.type==='thinking') return '⏳'
    if (s.type==='msg')      return '🤖'
    if (s.type==='answer')   return '✅'
    if (s.type==='error')    return '❌'
    if (s.type==='tool') {
      const icons = { get_summary:'📊', list_orders:'📋', update_orders_status:'✏️', reconcile_hayyak_cod:'🔄', detect_anomalies:'🔍', generate_whatsapp_report:'📱', add_expense:'💸', link_remittance:'🔗' }
      return icons[s.tool] || '⚙️'
    }
    return '•'
  }

  function toolLabel(name) {
    const labels = { get_summary:'جلب ملخص النظام', list_orders:'عرض الطلبات', update_orders_status:'تحديث الحالة', reconcile_hayyak_cod:'تسوية حياك COD', detect_anomalies:'كشف الانحرافات', generate_whatsapp_report:'توليد تقرير واتساب', add_expense:'إضافة مصروف', link_remittance:'ربط الحوالة' }
    return labels[name] || name
  }

  const totalSteps = steps.filter(s=>s.type==='tool').length
  const doneSteps  = steps.filter(s=>s.type==='tool'&&s.status==='done').length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'100%', minHeight:'100vh', background:'var(--bg)', direction:'rtl', padding:'0 0 80px' }}>

      {/* ── Header ── */}
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,var(--teal),var(--violet))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 20px rgba(0,228,184,0.3)' }}>🤖</div>
            <div>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'var(--text)' }}>وكيل موج</h2>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>يخطط وينفّذ المهام المعقدة تلقائياً</div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {aiCfg?.model && <span style={S.pill('var(--teal)')}>{aiCfg.model.split('-').slice(0,3).join('-')}</span>}
          {running && <span style={{...S.pill('#f59e0b'), animation:'pulse 1s ease infinite'}}>⚡ يعمل...</span>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:0, padding:'16px 20px 0', borderBottom:'1px solid var(--bg-border)' }}>
        {[
          { id:'task', label:'تنفيذ مهمة', icon:'⚡' },
          { id:'scheduled', label:'مهام مجدولة', icon:'⏰' },
          { id:'log', label:'السجل', icon:'📋' },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'8px 16px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight: tab===t.id ? 800 : 500,
            background:'none', color: tab===t.id ? 'var(--teal)' : 'var(--text-muted)',
            borderBottom: tab===t.id ? '2px solid var(--teal)' : '2px solid transparent',
            marginBottom:-1, transition:'all 0.15s',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ══ TAB: TASK ══ */}
      {tab === 'task' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, padding:20 }}>

          {/* Input */}
          <div style={{ ...S.card, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>صف للوكيل ما تريد تنفيذه</div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) runAgent() }}
                placeholder="مثال: حلّل الطلبات المعلقة مع حياك وأكّد التسليم لما أتم أكثر من 3 أيام..."
                rows={2}
                disabled={running}
                style={{ flex:1, padding:'10px 14px', background:'var(--bg-hover)', border:'1.5px solid var(--input-border)', borderRadius:'var(--r-md)', color:'var(--text)', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', opacity:running?0.6:1 }}
              />
              <button onClick={()=>runAgent()} disabled={running||!input.trim()} style={{ ...S.btn('primary'), padding:'10px 20px', flexShrink:0, opacity:(running||!input.trim())?0.5:1 }}>
                {running ? '⏳' : '▶ تشغيل'}
              </button>
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>Ctrl+Enter للتشغيل السريع</div>
          </div>

          {/* Quick tasks */}
          {steps.length===0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>مهام سريعة</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
                {QUICK_TASKS.map(q => (
                  <button key={q.label} onClick={()=>runAgent(q.task, `${q.icon} ${q.label}`)} disabled={running} style={{
                    ...S.card, border:'1px solid var(--bg-border)', cursor:'pointer', textAlign:'right',
                    display:'flex', flexDirection:'column', gap:6, padding:'12px 14px',
                    transition:'all 0.15s', opacity:running?0.5:1,
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(0,228,184,0.4)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bg-border)'}>
                    <div style={{ fontSize:20 }}>{q.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{q.label}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.4 }}>{q.task.slice(0,60)}...</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Execution steps */}
          {steps.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {totalSteps > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>تنفيذ المهمة</div>
                  <div style={{ fontSize:11, color:'var(--teal)' }}>{doneSteps}/{totalSteps} خطوة</div>
                </div>
              )}
              {steps.map(s => (
                <div key={s.id} style={S.step(s.status)}>
                  <div style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{stepIcon(s)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Tool call header */}
                    {s.type==='tool' && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:s.params||s.result?6:0 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{toolLabel(s.tool)}</span>
                        <span style={{...S.pill(s.status==='done'?'var(--teal)':s.status==='error'?'var(--danger,#ef4444)':s.status==='confirm'?'#f59e0b':s.status==='cancelled'?'var(--text-muted)':'var(--violet-light)'), fontSize:9 }}>
                          {s.status==='done'?'✓ تم':s.status==='error'?'✗ خطأ':s.status==='confirm'?'⚠️ تأكيد':s.status==='cancelled'?'ملغى':s.status==='running'?'⏳...':''}
                        </span>
                        {MUTATION_TOOLS.has(s.tool) && <span style={S.pill('#ef4444')}>يعدّل بيانات</span>}
                      </div>
                    )}
                    {/* Params */}
                    {s.type==='tool' && s.params && Object.keys(s.params).length>0 && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-hover)', padding:'6px 10px', borderRadius:'var(--r-sm)', marginBottom:6, fontFamily:'monospace', direction:'ltr', textAlign:'left', wordBreak:'break-all' }}>
                        {JSON.stringify(s.params, null, 2).slice(0,300)}
                      </div>
                    )}
                    {/* Confirm buttons */}
                    {s.status==='confirm' && pendingConfirm===s.id && (
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        <button onClick={()=>handleConfirm(true)}  style={{ ...S.btn('confirm'), fontSize:12, padding:'6px 14px' }}>✓ نفّذ</button>
                        <button onClick={()=>handleConfirm(false)} style={{ ...S.btn('danger'),  fontSize:12, padding:'6px 14px' }}>✕ إلغاء</button>
                      </div>
                    )}
                    {/* Result */}
                    {s.type==='tool' && s.result && (
                      <details style={{ marginTop:4 }}>
                        <summary style={{ fontSize:11, color:'var(--text-muted)', cursor:'pointer' }}>النتيجة ←</summary>
                        <div style={{ fontSize:11, color:'var(--text-sec)', background:'var(--bg-hover)', padding:'8px 10px', borderRadius:'var(--r-sm)', marginTop:4, fontFamily:'monospace', direction:'ltr', textAlign:'left', wordBreak:'break-all', maxHeight:200, overflowY:'auto' }}>
                          {JSON.stringify(s.result, null, 2)}
                        </div>
                      </details>
                    )}
                    {/* WhatsApp report — copy button */}
                    {s.type==='tool' && s.result?.report && (
                      <div style={{ marginTop:8, padding:12, background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.25)', borderRadius:'var(--r-md)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#25d366' }}>📱 تقرير واتساب جاهز</span>
                          <button onClick={()=>navigator.clipboard.writeText(s.result.report)} style={{ ...S.btn(), fontSize:10, padding:'4px 10px', background:'rgba(37,211,102,0.15)', color:'#25d366' }}>نسخ</button>
                        </div>
                        <pre style={{ fontSize:12, color:'var(--text)', whiteSpace:'pre-wrap', margin:0, fontFamily:'inherit', lineHeight:1.6 }}>{s.result.report}</pre>
                      </div>
                    )}
                    {/* Text messages */}
                    {(s.type==='user'||s.type==='msg'||s.type==='answer'||s.type==='error'||s.type==='thinking') && (
                      <div style={{ fontSize:13, color: s.type==='error'?'var(--danger,#ef4444)':s.type==='answer'?'var(--text)':'var(--text-sec)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{s.content}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={stepsEndRef}/>
              {/* Reset */}
              {!running && (
                <button onClick={()=>setSteps([])} style={{ ...S.btn(), fontSize:11, alignSelf:'flex-start', padding:'6px 12px' }}>
                  ↺ مهمة جديدة
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: SCHEDULED ══ */}
      {tab === 'scheduled' && (
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ ...S.card, background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ fontSize:12, color:'#f59e0b', fontWeight:700, marginBottom:4 }}>⏰ كيف تعمل المهام المجدولة؟</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
              تُفعّل المهام المجدولة عند فتح صفحة الوكيل في الوقت المحدد. للتشغيل التلقائي بدون فتح التطبيق، يحتاج مستقبلاً لخادم Supabase Edge Function.
            </div>
          </div>
          {schedules.map(sch => (
            <div key={sch.id} style={{ ...S.card, opacity:sch.enabled?1:0.7, border:`1.5px solid ${sch.enabled?'rgba(0,228,184,0.25)':'var(--bg-border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>{sch.name}</span>
                    <span style={S.pill(sch.frequency==='daily'?'var(--violet-light)':'var(--teal)')}>
                      {sch.frequency==='daily' ? `يومي ${sch.hour}:00` : `أسبوعي / ${['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'][sch.day]}`}
                    </span>
                    {scheduledRunning===sch.id && <span style={{...S.pill('#f59e0b'), animation:'pulse 1s infinite'}}>⚡ يعمل</span>}
                  </div>
                  <textarea
                    value={sch.task} onChange={e=>updateScheduleTask(sch.id, e.target.value)}
                    rows={2}
                    style={{ width:'100%', padding:'8px 12px', background:'var(--bg-hover)', border:'1px solid var(--bg-border)', borderRadius:'var(--r-sm)', color:'var(--text)', fontSize:12, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', marginTop:6 }}
                  />
                  {sch.lastRun && (
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
                      آخر تشغيل: {new Date(sch.lastRun).toLocaleString('ar-AE')}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center', flexShrink:0 }}>
                  <button onClick={()=>toggleSchedule(sch.id)} style={{
                    width:44, height:24, borderRadius:999, border:'none', cursor:'pointer', position:'relative',
                    background: sch.enabled ? 'var(--teal)' : 'var(--bg-hover)', transition:'background 150ms',
                  }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:sch.enabled?3:'auto', right:sch.enabled?'auto':3, transition:'all 150ms' }}/>
                  </button>
                  <button onClick={()=>runAgent(sch.task, sch.name)} disabled={running} style={{ ...S.btn(), fontSize:10, padding:'4px 8px' }}>تشغيل</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: LOG ══ */}
      {tab === 'log' && (
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:8 }}>
          {logs.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>
              لا توجد سجلات بعد. شغّل مهمة لتظهر هنا.
            </div>
          )}
          {[...logs].reverse().map(log => (
            <div key={log.id} style={{ ...S.card, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{log.task}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                  {new Date(log.ran_at).toLocaleString('ar-AE')} · {log.steps_count||0} خطوة · {log.model?.split('-').slice(0,3).join('-')||''}
                </div>
              </div>
              <div style={S.pill('var(--teal)')}>✓ اكتمل</div>
            </div>
          ))}
          {logs.length > 0 && (
            <button onClick={()=>{ setLogs([]); SettingsDB.set('agent_logs',[]) }} style={{ ...S.btn('danger'), fontSize:11, alignSelf:'flex-start', padding:'6px 12px' }}>
              حذف السجل
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  )
}
