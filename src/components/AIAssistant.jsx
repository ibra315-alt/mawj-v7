import React, { useState, useRef, useEffect } from 'react'
import { DB, supabase } from '../data/db'

/* ══════════════════════════════════════════════════
   AI ASSISTANT v9 — Uses Supabase Edge Function proxy
   API key never touches the browser bundle
══════════════════════════════════════════════════ */

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في تحليل بيانات المبيعات لشركة موج للهدايا في الإمارات.
لديك إمكانية الوصول إلى بيانات الطلبات والمبيعات والمخزون.
أجب دائماً بالعربية. كن مختصراً ومفيداً.
إذا سُئلت عن أرقام معينة، اعرضها بشكل واضح ومنظم.
اقترح دائماً خطوات عملية قابلة للتنفيذ.`

const QUICK_PROMPTS = [
  { label:'📊 ملخص اليوم',       text:'اعطني ملخص مبيعات اليوم' },
  { label:'⚠️ تنبيهات المخزون', text:'ما هي المنتجات التي تحتاج إعادة تخزين؟' },
  { label:'💡 نصيحة تحسين',     text:'كيف أحسن أداء المبيعات هذا الشهر؟' },
  { label:'📈 أفضل المنتجات',    text:'ما هي المنتجات الأكثر مبيعاً؟' },
]

// ── Call via Supabase Edge Function (API key stays server-side) ──
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
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     systemPrompt,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = typeof err.error === 'string' ? err.error : JSON.stringify(err)
    throw new Error(msg || `خطأ ${res.status}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
  return data
}

export default function AIAssistant({ onClose }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:'مرحباً! أنا مساعد موج الذكي 🤖\nيمكنني تحليل مبيعاتك، تنبيهك بالمخزون المنخفض، وتقديم اقتراحات لتحسين أدائك.\nكيف يمكنني مساعدتك اليوم؟' }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function fetchContext() {
    try {
      const [orders, inventory] = await Promise.all([
        DB.list('orders'),
        DB.list('inventory'),
      ])
      const today      = new Date().toDateString()
      const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
      const now         = new Date()
      const thisMonth   = orders.filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      const lowStock = inventory.filter(i => (i.quantity||0) <= (i.low_stock_threshold||5))

      return `
=== بيانات النظام الحالية ===
الطلبات اليوم: ${todayOrders.length} طلب، إجمالي: ${todayOrders.reduce((s,o)=>s+(o.total||0),0).toFixed(0)} د.إ
هذا الشهر: ${thisMonth.length} طلب، إجمالي: ${thisMonth.reduce((s,o)=>s+(o.total||0),0).toFixed(0)} د.إ
إجمالي الطلبات: ${orders.length}
مخزون منخفض: ${lowStock.map(i=>i.name).join(', ')||'لا يوجد'}
حالات الطلبات اليوم: ${['pending','processing','shipped','delivered'].map(s=>`${s}: ${todayOrders.filter(o=>o.status===s).length}`).join(', ')}
`.trim()
    } catch { return '' }
  }

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')
    const userMsg = { role:'user', content:userText }
    setMessages(p => [...p, userMsg])
    setLoading(true)

    try {
      const ctx     = await fetchContext()
      const history = [...messages, userMsg].map(m => ({ role:m.role, content:m.content }))
      const data    = await callAI(history, SYSTEM_PROMPT + '\n\n' + ctx)
      const reply   = data.content?.[0]?.text || 'عذراً، لم أتمكن من الإجابة.'
      setMessages(p => [...p, { role:'assistant', content:reply }])
    } catch(e) {
      const msg = typeof e === 'string' ? e : e?.message || JSON.stringify(e)
      setMessages(p => [...p, { role:'assistant', content:`حدث خطأ: ${msg}` }])
    } finally { setLoading(false) }
  }

  function handleKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div style={{
      position:'fixed', bottom:80, left:20, zIndex:800,
      width:360, height:520,
      background:'var(--modal-bg)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
      border:'1.5px solid var(--glass-border-teal)',
      borderRadius:'var(--radius-xl, 24px)',
      boxShadow:'var(--shadow-float)',
      display:'flex', flexDirection:'column',
      animation:'modalIn 0.28s ease both',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,228,184,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--violet))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, boxShadow:'0 0 14px var(--teal-glow)' }}>🤖</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>مساعد موج الذكي</div>
            <div style={{ fontSize:10, color:'var(--teal)', marginTop:1 }}>● متصل</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'var(--text-sec)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10, WebkitOverflowScrolling:'touch' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display:'flex', justifyContent: m.role==='user' ? 'flex-start' : 'flex-end',
          }}>
            <div style={{
              maxWidth:'85%', padding:'10px 14px',
              borderRadius: m.role==='user' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
              background: m.role==='user'
                ? 'linear-gradient(135deg,var(--teal),var(--violet))'
                : 'var(--bg-glass)',
              border: m.role==='user' ? 'none' : '1px solid var(--glass-border)',
              color: m.role==='user' ? '#050c1a' : 'var(--text)',
              fontSize:13, lineHeight:1.6, fontWeight: m.role==='user' ? 700 : 400,
              whiteSpace:'pre-wrap', wordBreak:'break-word',
            }}>{m.content}</div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ padding:'12px 16px', background:'var(--bg-glass)', border:'1px solid var(--glass-border)', borderRadius:'18px 18px 4px 18px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', animation:`bounce 1.2s ease infinite ${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div style={{ padding:'0 12px 10px', display:'flex', flexWrap:'wrap', gap:6 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p.text} onClick={()=>send(p.text)} style={{
              fontSize:11, padding:'6px 12px', borderRadius:999,
              background:'var(--bg-glass)', border:'1px solid var(--glass-border)',
              color:'var(--text-sec)', cursor:'pointer', fontFamily:'inherit',
              transition:'all 0.15s ease',
            }}>{p.label}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid var(--bg-border)', display:'flex', gap:8, alignItems:'flex-end' }}>
        <textarea
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="اسألني عن مبيعاتك..."
          rows={1}
          style={{
            flex:1, resize:'none', overflowY:'auto', maxHeight:100,
            padding:'9px 13px',
            background:'var(--input-bg)', border:'1.5px solid var(--input-border)',
            borderRadius:14, color:'var(--text)', fontSize:13,
            fontFamily:'inherit', outline:'none',
            transition:'border-color 0.2s',
          }}
        />
        <button onClick={()=>send()} disabled={loading || !input.trim()} style={{
          width:38, height:38, borderRadius:'50%', flexShrink:0,
          background: input.trim() ? 'linear-gradient(135deg,var(--teal),var(--violet))' : 'var(--bg-glass)',
          border:'none', cursor: input.trim() ? 'pointer' : 'default',
          color: input.trim() ? '#050c1a' : 'var(--text-muted)',
          fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s ease',
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
