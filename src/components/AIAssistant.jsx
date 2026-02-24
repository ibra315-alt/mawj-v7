import React, { useState, useRef, useEffect } from 'react'
import { DB, supabase } from '../data/db'
import { formatCurrency } from '../data/constants'

/* ══════════════════════════════════════════════════════════
   AI ASSISTANT v9.5 — Mawj Crystal Gifts
   ─────────────────────────────────────────────────────────
   Security: calls via Supabase Edge Function proxy
   API key never touches the browser bundle
   Context: pre-aggregated (not raw rows) → cheaper + smarter
   Actions: can navigate app, quick stats inline
══════════════════════════════════════════════════════════ */

// ── Supabase Edge Function proxy ─────────────────────────
async function callAI(messages, systemPrompt) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('غير مسجّل الدخول')
  const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, system:systemPrompt, messages }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.error === 'string' ? err.error : `خطأ ${res.status}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
  return data
}

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص لشركة موج للهدايا الكريستالية في الإمارات.
تحليل البيانات، تقديم التوصيات، والإجابة عن أسئلة المبيعات والعمليات.
أجب دائماً بالعربية. كن مختصراً، دقيقاً، وعملياً.
إذا طُلب منك تحليل رقم، قدّم السبب والتوصية.
لا تكرر البيانات الخام — استخرج الأهم فقط.
إذا كان السؤال عن شيء لا توجد له بيانات، قل ذلك بصراحة.`

const QUICK_PROMPTS = [
  { label:'📊 ملخص اليوم',        text:'كيف كانت المبيعات اليوم مقارنة بالأمس؟' },
  { label:'📈 أداء هذا الشهر',    text:'ما أبرز مؤشرات الأداء هذا الشهر؟' },
  { label:'🔄 تحليل الاستبدالات', text:'ما نسبة الاستبدالات وما سببها المرجح؟' },
  { label:'🏆 أفضل المنتجات',     text:'ما المنتجات الأكثر مبيعاً وربحاً؟' },
  { label:'🌆 أفضل المناطق',      text:'أي الإمارات تحقق أعلى مبيعات؟' },
  { label:'💡 توصية لهذا الأسبوع', text:'بناءً على البيانات، ما أهم شيء يجب التركيز عليه الآن؟' },
]

// ── Build aggregated context (not raw rows) ───────────────
async function buildContext() {
  try {
    const [orders, expenses, remittances] = await Promise.all([
      DB.list('orders',   { orderBy: 'created_at' }),
      DB.list('expenses', { orderBy: 'date' }),
      DB.list('hayyak_remittances', { orderBy: 'date' }),
    ])

    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthS = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthE = new Date(now.getFullYear(), now.getMonth(), 0)

    const byDate = (o, from, to) => {
      const d = new Date(o.order_date || o.created_at)
      return d >= from && (!to || d <= to)
    }

    const todayOrds  = orders.filter(o => byDate(o, todayStart))
    const yestOrds   = orders.filter(o => byDate(o, yestStart, todayStart))
    const monthOrds  = orders.filter(o => byDate(o, monthStart))
    const lastMOrds  = orders.filter(o => byDate(o, lastMonthS, lastMonthE))
    const monthExps  = expenses.filter(e => new Date(e.date) >= monthStart)
    const allActive  = orders.filter(o => o.status !== 'cancelled')

    // Month stats
    const mRev    = monthOrds.reduce((s,o)=>s+(o.total||0),0)
    const mGP     = monthOrds.reduce((s,o)=>s+(o.gross_profit||0),0)
    const mExp    = monthExps.reduce((s,e)=>s+(e.amount||0),0)
    const mNet    = mGP - mExp
    const mRepl   = monthOrds.filter(o=>o.is_replacement).length
    const mDeliv  = monthOrds.filter(o=>o.status==='delivered').length
    const mND     = monthOrds.filter(o=>o.status==='not_delivered').length
    const mHayyak = monthOrds.reduce((s,o)=>s+(o.hayyak_fee||0),0)

    // Last month
    const lmRev  = lastMOrds.reduce((s,o)=>s+(o.total||0),0)
    const lmNet  = lastMOrds.reduce((s,o)=>s+(o.gross_profit||0),0) -
                   expenses.filter(e=>{ const d=new Date(e.date); return d>=lastMonthS&&d<=lastMonthE }).reduce((s,e)=>s+(e.amount||0),0)

    // Today
    const tRev  = todayOrds.reduce((s,o)=>s+(o.total||0),0)
    const yRev  = yestOrds.reduce((s,o)=>s+(o.total||0),0)

    // Top products
    const prodMap = {}
    allActive.forEach(o => (o.items||[]).forEach(item => {
      if (!prodMap[item.name]) prodMap[item.name] = { qty:0, rev:0, profit:0 }
      prodMap[item.name].qty    += (item.qty||1)
      prodMap[item.name].rev    += (item.price||0)*(item.qty||1)
      prodMap[item.name].profit += ((item.price||0)-(item.cost||0))*(item.qty||1)
    }))
    const topProds = Object.entries(prodMap)
      .sort((a,b)=>b[1].rev-a[1].rev).slice(0,5)
      .map(([name,d])=>`${name}: ${d.qty} وحدة، ${formatCurrency(d.rev)}، ربح ${formatCurrency(d.profit)}`)

    // Top cities
    const cityMap = {}
    monthOrds.forEach(o => {
      const c = o.customer_city||'غير محدد'
      if (!cityMap[c]) cityMap[c] = { count:0, rev:0 }
      cityMap[c].count++; cityMap[c].rev += (o.total||0)
    })
    const topCities = Object.entries(cityMap)
      .sort((a,b)=>b[1].count-a[1].count).slice(0,5)
      .map(([c,d])=>`${c}: ${d.count} طلب (${formatCurrency(d.rev)})`)

    // Pending COD
    const pendingOrds = orders.filter(o=>o.status==='delivered'&&!o.hayyak_remittance_id)
    const pendingCOD  = pendingOrds.reduce((s,o)=>s+(o.total||0),0)

    // In-progress
    const inProgress = orders.filter(o=>['new','ready','with_hayyak'].includes(o.status))

    // Unreimbursed expenses
    const unreimbursed = expenses
      .filter(e=>e.paid_by&&e.paid_by!=='company'&&!e.reimbursed)
      .reduce((s,e)=>s+(e.amount||0),0)

    const revChange = yRev > 0 ? `${((tRev-yRev)/yRev*100).toFixed(0)}%` : 'لا مقارنة'

    return `
=== سياق النظام — موج للهدايا (${now.toLocaleDateString('ar-AE')}) ===

── اليوم ──
طلبات: ${todayOrds.length} | إيرادات: ${formatCurrency(tRev)} | مقارنة بالأمس: ${revChange}
أمس: ${yestOrds.length} طلب | ${formatCurrency(yRev)}

── هذا الشهر ──
الطلبات: ${monthOrds.length} | الإيرادات: ${formatCurrency(mRev)} | الربح الإجمالي: ${formatCurrency(mGP)}
رسوم حياك: ${formatCurrency(mHayyak)} | المصاريف: ${formatCurrency(mExp)} | صافي الربح: ${formatCurrency(mNet)}
تسليم: ${mDeliv} (${monthOrds.length?Math.round(mDeliv/monthOrds.length*100):0}%) | لم يتم: ${mND} | استبدال: ${mRepl} (${monthOrds.length?((mRepl/monthOrds.length)*100).toFixed(1):0}%)

── الشهر الماضي ──
إيرادات: ${formatCurrency(lmRev)} | صافي: ${formatCurrency(lmNet)} | طلبات: ${lastMOrds.length}

── قيد المعالجة الآن ──
${inProgress.length} طلب (جديد/جاهز/مع حياك)
COD معلق من حياك: ${pendingOrds.length} طلب — ${formatCurrency(pendingCOD)}

── أفضل المنتجات (كل الوقت) ──
${topProds.join('\n') || 'لا بيانات'}

── توزيع الإمارات (هذا الشهر) ──
${topCities.join('\n') || 'لا بيانات'}

── المصاريف غير المستردة ──
${unreimbursed > 0 ? formatCurrency(unreimbursed) + ' مستحقة للشركاء' : 'لا يوجد مستحقات'}
`.trim()
  } catch (err) {
    return `[خطأ في تحميل السياق: ${err.message}]`
  }
}

// ── Main component ────────────────────────────────────────
export default function AIAssistant({ onClose, onNavigate }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:'مرحباً! أنا مساعد موج 🤖\nيمكنني تحليل مبيعاتك، مقارنة الأداء، وتقديم توصيات عملية.\nكيف يمكنني مساعدتك؟' }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [context,  setContext]  = useState(null)
  const bottomRef = useRef()

  // Pre-load context on mount
  useEffect(() => {
    buildContext().then(setContext)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')
    const userMsg = { role:'user', content:userText }
    setMessages(p => [...p, userMsg])
    setLoading(true)
    try {
      // Refresh context if it's been a while (simple: always refresh on explicit send)
      const ctx = context || await buildContext()
      const history = [...messages, userMsg].map(m => ({ role:m.role, content:m.content }))
      const data    = await callAI(history, SYSTEM_PROMPT + '\n\n' + ctx)
      const reply   = data.content?.[0]?.text || 'عذراً، لم أتمكن من الإجابة.'
      setMessages(p => [...p, { role:'assistant', content:reply }])
    } catch(e) {
      setMessages(p => [...p, { role:'assistant', content:`حدث خطأ: ${e?.message || e}` }])
    } finally { setLoading(false) }
  }

  function handleKey(e) {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const showQuick = messages.length === 1

  return (
    <div style={{
      position:'fixed', bottom:80, left:20, zIndex:800,
      width:370, height:540,
      background:'var(--modal-bg)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
      border:'1.5px solid var(--glass-border-teal)',
      borderRadius:'var(--radius-xl, 24px)',
      boxShadow:'var(--shadow-float)',
      display:'flex', flexDirection:'column',
      animation:'modalIn 0.28s ease both',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,228,184,0.04)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--violet))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 0 12px var(--teal-glow)' }}>🤖</div>
          <div>
            <div style={{ fontWeight:800, fontSize:13, color:'var(--text)' }}>مساعد موج</div>
            <div style={{ fontSize:10, color: context?'var(--teal)':'#f59e0b', marginTop:1 }}>
              {context ? '● بيانات محمّلة' : '○ جارٍ التحميل...'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {messages.length > 1 && (
            <button
              onClick={() => setMessages([messages[0]])}
              style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:'inherit', padding:'4px 8px' }}
            >
              مسح
            </button>
          )}
          <button onClick={onClose} style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:8, width:26, height:26, cursor:'pointer', color:'var(--text-sec)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:8, WebkitOverflowScrolling:'touch' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-start':'flex-end' }}>
            <div style={{
              maxWidth:'88%', padding:'9px 13px',
              borderRadius: m.role==='user' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
              background: m.role==='user'
                ? 'linear-gradient(135deg,var(--teal),var(--violet))'
                : 'var(--bg-glass)',
              border: m.role==='user' ? 'none' : '1px solid var(--glass-border)',
              color: m.role==='user' ? '#050c1a' : 'var(--text)',
              fontSize:12.5, lineHeight:1.65, fontWeight: m.role==='user'?700:400,
              whiteSpace:'pre-wrap', wordBreak:'break-word',
            }}>{m.content}</div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ padding:'10px 14px', background:'var(--bg-glass)', border:'1px solid var(--glass-border)', borderRadius:'16px 16px 4px 16px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6,height:6,borderRadius:'50%',background:'var(--teal)', animation:`bounce 1.2s ease infinite ${i*0.2}s` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      {showQuick && (
        <div style={{ padding:'0 10px 8px', display:'flex', flexWrap:'wrap', gap:5, flexShrink:0 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p.text} onClick={() => send(p.text)} style={{
              fontSize:11, padding:'5px 10px', borderRadius:999,
              background:'var(--bg-glass)', border:'1px solid var(--glass-border)',
              color:'var(--text-sec)', cursor:'pointer', fontFamily:'inherit',
            }}>{p.label}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'8px 12px', borderTop:'1px solid var(--bg-border)', display:'flex', gap:7, alignItems:'flex-end', flexShrink:0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="اسأل عن مبيعاتك، أرباحك، أو اطلب توصية..."
          rows={1}
          style={{
            flex:1, resize:'none', overflowY:'auto', maxHeight:90,
            padding:'9px 12px',
            background:'var(--input-bg)', border:'1.5px solid var(--input-border)',
            borderRadius:12, color:'var(--text)', fontSize:13,
            fontFamily:'inherit', outline:'none',
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          width:36, height:36, borderRadius:'50%', flexShrink:0,
          background: input.trim() ? 'linear-gradient(135deg,var(--teal),var(--violet))' : 'var(--bg-glass)',
          border:'none', cursor: input.trim()?'pointer':'default',
          color: input.trim() ? '#050c1a' : 'var(--text-muted)',
          fontSize:15, display:'flex', alignItems:'center', justifyContent:'center',
        }}>➤</button>
      </div>

      <style>{`
        @keyframes bounce {
          0%,60%,100%{ transform:translateY(0) }
          30%{ transform:translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
