import React, { useState, useRef, useEffect } from 'react'
import { DB } from '../data/db'

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في تحليل بيانات المبيعات لشركة موج للهدايا في الإمارات.
لديك إمكانية الوصول إلى بيانات الطلبات والمبيعات والمخزون.
أجب دائماً بالعربية. كن مختصراً ومفيداً.
إذا سُئلت عن أرقام معينة، اعرضها بشكل واضح ومنظم.
اقترح دائماً خطوات عملية قابلة للتنفيذ.`

const QUICK_PROMPTS = [
  { label:'📊 ملخص اليوم', text:'اعطني ملخص مبيعات اليوم' },
  { label:'⚠️ تنبيهات المخزون', text:'ما هي المنتجات التي تحتاج إعادة تخزين؟' },
  { label:'💡 نصيحة تحسين', text:'كيف أحسن أداء المبيعات هذا الشهر؟' },
  { label:'📈 أفضل المنتجات', text:'ما هي المنتجات الأكثر مبيعاً؟' },
]

export default function AIAssistant({ onClose }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:'مرحباً! أنا مساعد موج الذكي 🤖\nيمكنني تحليل مبيعاتك، تنبيهك بالمخزون المنخفض، وتقديم اقتراحات لتحسين أدائك.\nكيف يمكنني مساعدتك اليوم؟' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function fetchContext() {
    try {
      const [orders, inventory] = await Promise.all([
        DB.list('orders'),
        DB.list('inventory'),
      ])
      const today = new Date().toDateString()
      const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
      const thisMonth = orders.filter(o => {
        const d = new Date(o.created_at)
        const now = new Date()
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
    setMessages(p => [...p, { role:'user', content:userText }])
    setLoading(true)

    try {
      const ctx = await fetchContext()
      const history = messages.map(m => ({ role:m.role, content:m.content }))

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          system: SYSTEM_PROMPT + '\n\n' + ctx,
          messages: [...history, { role:'user', content:userText }],
        }),
      })
      const data = await resp.json()
      const reply = data.content?.[0]?.text || 'عذراً، لم أتمكن من الإجابة.'
      setMessages(p => [...p, { role:'assistant', content:reply }])
    } catch(e) {
      setMessages(p => [...p, { role:'assistant', content:'حدث خطأ في الاتصال. تأكد من إعدادات الـ API.' }])
    } finally { setLoading(false) }
  }

  function handleKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div style={{
      position:'fixed', bottom:80, left:20, zIndex:800,
      width:360, height:520,
      background:'var(--modal-bg)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
      border:'1.5px solid rgba(0,228,184,0.2)',
      borderRadius:'var(--radius-xl)',
      boxShadow:'0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,228,184,0.08)',
      display:'flex', flexDirection:'column',
      animation:'modalIn 0.28s ease both',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--bg-border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,228,184,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--violet))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, boxShadow:'0 0 14px rgba(0,228,184,0.4)' }}>🤖</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'var(--teal)' }}>موج AI</div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>مساعد المبيعات الذكي</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:'var(--radius-pill)', width:28, height:28, cursor:'pointer', color:'var(--text-sec)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-start' : 'flex-end' }}>
            <div style={{
              maxWidth:'85%', padding:'10px 14px',
              borderRadius: m.role==='user'
                ? '18px 18px 4px 18px'
                : '18px 18px 18px 4px',
              background: m.role==='user'
                ? 'linear-gradient(135deg,var(--teal),#00c49a)'
                : 'var(--bg-glass)',
              color: m.role==='user' ? '#07090f' : 'var(--text)',
              fontSize:13, lineHeight:1.65, fontWeight: m.role==='user' ? 600 : 400,
              border: m.role==='assistant' ? '1px solid var(--bg-border)' : 'none',
              backdropFilter: m.role==='assistant' ? 'blur(10px)' : 'none',
              whiteSpace:'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ padding:'10px 16px', background:'var(--bg-glass)', border:'1px solid var(--bg-border)', borderRadius:'18px 18px 18px 4px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', animation:`dotPulse 1.2s ease ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div style={{ padding:'0 14px 10px', display:'flex', flexWrap:'wrap', gap:6 }}>
          {QUICK_PROMPTS.map(q => (
            <button key={q.label} onClick={() => send(q.text)} style={{ padding:'5px 12px', borderRadius:'var(--radius-pill)', border:'1px solid var(--bg-border)', background:'var(--bg-glass)', color:'var(--text-sec)', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600, transition:'all 0.2s ease' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--teal)';e.currentTarget.style.color='var(--teal)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bg-border)';e.currentTarget.style.color='var(--text-sec)'}}>
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'12px 14px', borderTop:'1px solid var(--bg-border)', display:'flex', gap:8 }}>
        <textarea
          value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="اسألني عن مبيعاتك..."
          disabled={loading}
          rows={1}
          style={{
            flex:1, padding:'9px 14px', background:'var(--input-bg)',
            border:'1.5px solid var(--input-border)', borderRadius:'var(--radius-pill)',
            color:'var(--text)', fontSize:13, resize:'none', fontFamily:'inherit',
            outline:'none', lineHeight:1.5, maxHeight:80, overflowY:'auto',
          }}
          onFocus={e=>{e.target.style.borderColor='var(--teal)'}}
          onBlur={e=>{e.target.style.borderColor='var(--input-border)'}}
        />
        <button
          onClick={() => send()} disabled={loading||!input.trim()}
          style={{
            width:38, height:38, borderRadius:'50%', flexShrink:0,
            background: input.trim() ? 'linear-gradient(135deg,var(--teal),#00c49a)' : 'var(--bg-glass)',
            border:'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
            color: input.trim() ? '#07090f' : 'var(--text-muted)',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.2s ease', alignSelf:'flex-end',
            boxShadow: input.trim() ? '0 4px 14px rgba(0,228,184,0.4)' : 'none',
          }}>↑</button>
      </div>
    </div>
  )
}
