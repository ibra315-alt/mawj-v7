import React, { useState, useEffect } from 'react'
import { Auth, Settings as SettingsDB } from '../data/db'

/* ══════════════════════════════════════════════════
   LOGIN v12 — Split-screen creative design
   Brand panel left · Glass form right · RTL form
══════════════════════════════════════════════════ */
export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPass, setShowPass] = useState(false)
  const [focused,  setFocused]  = useState<string | null>(null)
  const [logoUrl,  setLogoUrl]  = useState('')

  useEffect(() => {
    SettingsDB.get('business').then((biz: any) => {
      // Login page is always dark — prefer the dark logo, fall back to light
      const url = biz?.logo_dark_url || biz?.logo_url || ''
      setLogoUrl(url)
    }).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await Auth.signIn(email, password)
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', overflow:'hidden', direction:'ltr', background:'#04091a' }}>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-22px) rotate(6deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(-5deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.06)} }
        @keyframes twinkle { 0%,100%{opacity:0.12;transform:scale(0.6)} 50%{opacity:0.9;transform:scale(1.2)} }
        @keyframes brandIn { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes formIn  { from{opacity:0;transform:translateX(36px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes gradPulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        .l-brand { display:flex !important; flex-direction:column; align-items:center; justify-content:center; }
        .l-form  { width:440px !important; flex-shrink:0; }
        @media (max-width: 768px) {
          .l-brand { display:none !important; }
          .l-form  { width:100% !important; min-height:100vh; }
        }
      `}</style>

      {/* ══════ BRAND PANEL ══════════════════════════════════════════ */}
      <div className="l-brand" style={{
        flex:1, position:'relative',
        background:'linear-gradient(155deg, #04091a 0%, #070e28 40%, #0b1535 70%, #0f1f47 100%)',
        padding:'64px 52px', overflow:'hidden',
        direction:'rtl', animation:'brandIn 0.5s ease both',
      }}>

        {/* dot grid */}
        <div style={{ position:'absolute', inset:0, opacity:0.06, pointerEvents:'none' }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="lgdots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#7eb8f7"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lgdots)"/>
          </svg>
        </div>

        {/* glow orbs */}
        <div style={{ position:'absolute', top:'-8%', right:'-4%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(49,140,231,0.11),transparent 65%)', pointerEvents:'none', animation:'gradPulse 5s ease-in-out infinite' }} />
        <div style={{ position:'absolute', bottom:'5%', left:'2%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,228,184,0.07),transparent 65%)', pointerEvents:'none' }} />

        {/* floating crystal shapes */}
        {[
          { x:'8%',  y:'11%', w:90,  a:'float1', d:'0s',   shape:'hex' },
          { x:'5%',  y:'48%', w:50,  a:'float3', d:'0.8s', shape:'ring' },
          { x:'5%',  y:'72%', w:70,  a:'float2', d:'1.5s', shape:'square' },
          { x:'88%', y:'25%', w:42,  a:'float2', d:'2.2s', shape:'ring' },
          { x:'75%', y:'68%', w:60,  a:'float1', d:'1s',   shape:'hex' },
        ].map((s,i) => (
          <div key={i} style={{ position:'absolute', left:s.x, top:s.y, width:s.w, height:s.w, opacity:0.15, animation:`${s.a} ${6+i}s ease-in-out infinite ${s.d}`, pointerEvents:'none' }}>
            <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
              {s.shape==='hex'    && <><polygon points="50,7 93,28 93,72 50,93 7,72 7,28" stroke="#318CE7" strokeWidth="1.8" fill="rgba(49,140,231,0.09)"/><polygon points="50,22 80,37 80,63 50,78 20,63 20,37" stroke="#318CE7" strokeWidth="0.8" fill="none" opacity="0.5"/></>}
              {s.shape==='ring'   && <circle cx="50" cy="50" r="42" stroke="#7eb8f7" strokeWidth="1.5" strokeDasharray="6 6" fill="none"/>}
              {s.shape==='square' && <rect x="12" y="12" width="76" height="76" rx="12" stroke="#00E4B8" strokeWidth="1.8" fill="rgba(0,228,184,0.07)" transform="rotate(18 50 50)"/>}
            </svg>
          </div>
        ))}

        {/* twinkling particles */}
        {[{x:'18%',y:'22%',d:'0s'},{x:'82%',y:'38%',d:'1.2s'},{x:'32%',y:'72%',d:'0.6s'},{x:'68%',y:'82%',d:'2s'},{x:'54%',y:'12%',d:'1.8s'},{x:'90%',y:'58%',d:'0.3s'},{x:'45%',y:'44%',d:'2.5s'}].map((p,i) => (
          <div key={i} style={{ position:'absolute', left:p.x, top:p.y, width:5, height:5, borderRadius:'50%', background:'#7eb8f7', animation:`twinkle ${3+i*0.5}s ease-in-out infinite ${p.d}`, pointerEvents:'none' }} />
        ))}

        {/* brand content */}
        <div style={{ position:'relative', zIndex:1, maxWidth:400 }}>

          {/* logo badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:14, marginBottom:32, padding:'14px 22px', background:'rgba(49,140,231,0.08)', border:'1px solid rgba(49,140,231,0.22)', borderRadius:20, backdropFilter:'blur(20px)' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="مَوج" style={{ width:44, height:44, objectFit:'contain', filter:'drop-shadow(0 2px 12px rgba(49,140,231,0.4))' }} />
            ) : (
              <svg width="38" height="38" viewBox="0 0 32 32" fill="none">
                <defs><linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#318CE7"/><stop offset="1" stopColor="#00E4B8"/></linearGradient></defs>
                <path d="M3 20c3.5-6 7-6 10 0s6.5 6 10 0c2-3.5 4.5-4.5 6-2" stroke="url(#lg1)" strokeWidth="2.8" strokeLinecap="round"/>
                <path d="M3 13c3.5-6 7-6 10 0s6.5 6 10 0c2-3.5 4.5-4.5 6-2" stroke="url(#lg1)" strokeWidth="2.8" strokeLinecap="round" opacity="0.35"/>
              </svg>
            )}
            <span style={{ fontSize:30, fontWeight:900, background:'linear-gradient(135deg,#7eb8f7 0%,#00E4B8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>مَوج</span>
          </div>

          <h1 style={{ fontSize:38, fontWeight:900, lineHeight:1.25, color:'#ddeeff', marginBottom:14 }}>
            نظام إدارة<br/>
            <span style={{ background:'linear-gradient(135deg,#318CE7 0%,#00E4B8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>المبيعات الذكي</span>
          </h1>
          <p style={{ fontSize:14, color:'rgba(180,210,255,0.55)', lineHeight:1.85, marginBottom:40, maxWidth:340 }}>
            منصة متكاملة لإدارة الطلبات والعملاء والمخزون في الإمارات العربية المتحدة
          </p>

          {/* features */}
          {[
            { icon:'📦', label:'إدارة الطلبات',   desc:'تتبع لحظي للحالات والشحن' },
            { icon:'👥', label:'تحليل العملاء',   desc:'تقسيم ذكي وإدارة VIP' },
            { icon:'💰', label:'التقارير المالية', desc:'أرباح ومصاريف لحظية' },
            { icon:'🚚', label:'التوصيل السريع',  desc:'تكامل مع حياك' },
          ].map(f => (
            <div key={f.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:'rgba(255,255,255,0.028)', border:'1px solid rgba(49,140,231,0.12)', borderRadius:14, marginBottom:10, backdropFilter:'blur(8px)' }}>
              <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background:'rgba(49,140,231,0.10)', border:'1px solid rgba(49,140,231,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{f.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#c8e0ff', marginBottom:2 }}>{f.label}</div>
                <div style={{ fontSize:11, color:'rgba(150,180,220,0.48)' }}>{f.desc}</div>
              </div>
              <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:'rgba(0,228,184,0.12)', border:'1px solid rgba(0,228,184,0.28)', display:'flex', alignItems:'center', justifyContent:'center', color:'#00E4B8', fontSize:11, fontWeight:900 }}>✓</div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center', fontSize:11, color:'rgba(100,130,180,0.28)' }}>
          تصميم إبراهيم كنعي © 2025 — الإصدار 7
        </div>
      </div>

      {/* ══════ FORM PANEL ══════════════════════════════════════════ */}
      <div className="l-form" style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'48px 40px', background:'#070e26',
        borderLeft:'1px solid rgba(49,140,231,0.14)',
        direction:'rtl', animation:'formIn 0.45s ease both', overflowY:'auto', position:'relative',
      }}>
        {/* subtle background glow */}
        <div style={{ position:'absolute', top:'35%', left:'50%', transform:'translate(-50%,-50%)', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(49,140,231,0.05),transparent 70%)', pointerEvents:'none' }} />

        <div style={{ width:'100%', maxWidth:380, position:'relative' }}>

          {/* mini logo */}
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'10px 20px', background:'rgba(49,140,231,0.08)', border:'1px solid rgba(49,140,231,0.2)', borderRadius:14, marginBottom:14 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="مَوج" style={{ width:32, height:32, objectFit:'contain', filter:'drop-shadow(0 1px 6px rgba(49,140,231,0.35))' }} />
              ) : (
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                  <defs><linearGradient id="flg2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#318CE7"/><stop offset="1" stopColor="#00E4B8"/></linearGradient></defs>
                  <path d="M3 20c3.5-6 7-6 10 0s6.5 6 10 0c2-3.5 4.5-4.5 6-2" stroke="url(#flg2)" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M3 13c3.5-6 7-6 10 0s6.5 6 10 0c2-3.5 4.5-4.5 6-2" stroke="url(#flg2)" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
                </svg>
              )}
              <span style={{ fontSize:22, fontWeight:900, background:'linear-gradient(135deg,#7eb8f7,#00E4B8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>مَوج</span>
            </div>
            <div style={{ fontSize:12, color:'rgba(150,180,220,0.4)' }}>نظام إدارة المبيعات</div>
          </div>

          <div style={{ fontSize:24, fontWeight:900, color:'#ddeeff', marginBottom:6 }}>مرحباً بعودتك 👋</div>
          <div style={{ fontSize:13, color:'rgba(150,180,220,0.48)', marginBottom:32 }}>سجّل دخولك للوصول إلى لوحة التحكم</div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Email */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(150,180,220,0.55)', marginBottom:8, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                البريد الإلكتروني
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com" autoComplete="email"
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                style={{
                  width:'100%', padding:'12px 16px', boxSizing:'border-box',
                  background:'rgba(255,255,255,0.04)',
                  border:`1.5px solid ${focused==='email' ? '#318CE7' : 'rgba(49,140,231,0.2)'}`,
                  borderRadius:12, color:'#ddeeff', fontSize:14,
                  fontFamily:'Inter,sans-serif', outline:'none',
                  direction:'ltr', textAlign:'left',
                  boxShadow: focused==='email' ? '0 0 0 3px rgba(49,140,231,0.12)' : 'none',
                  transition:'border-color 0.15s,box-shadow 0.15s',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(150,180,220,0.55)', marginBottom:8, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                كلمة المرور
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" autoComplete="current-password"
                  onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
                  style={{
                    width:'100%', padding:'12px 16px 12px 48px', boxSizing:'border-box',
                    background:'rgba(255,255,255,0.04)',
                    border:`1.5px solid ${focused==='pass' ? '#318CE7' : 'rgba(49,140,231,0.2)'}`,
                    borderRadius:12, color:'#ddeeff', fontSize:14,
                    fontFamily:'Inter,sans-serif', outline:'none',
                    direction:'rtl', textAlign:'right',
                    letterSpacing: showPass ? 'normal' : '0.12em',
                    boxShadow: focused==='pass' ? '0 0 0 3px rgba(49,140,231,0.12)' : 'none',
                    transition:'border-color 0.15s,box-shadow 0.15s',
                  }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:4, color:'rgba(150,180,220,0.4)', display:'flex', alignItems:'center' }}>
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding:'10px 16px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.22)', borderRadius:10, fontSize:12, color:'#f87171', textAlign:'center' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'14px',
                background: loading ? 'rgba(49,140,231,0.25)' : 'linear-gradient(135deg,#318CE7 0%,#1a6cb8 100%)',
                border:'none', borderRadius:12,
                color: loading ? 'rgba(255,255,255,0.45)' : '#fff',
                fontSize:15, fontWeight:900, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', letterSpacing:'0.03em',
                boxShadow: loading ? 'none' : '0 4px 28px rgba(49,140,231,0.45)',
                transition:'all 0.15s ease',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background='linear-gradient(135deg,#3d98f0,#2575cc)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 6px 36px rgba(49,140,231,0.6)' } }}
              onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background='linear-gradient(135deg,#318CE7 0%,#1a6cb8 100%)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 4px 28px rgba(49,140,231,0.45)' } }}
              onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform='scale(0.985)' }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform='scale(1)' }}
            >
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" style={{ animation:'spin 0.7s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
                  </svg>
                  جاري الدخول...
                </>
              ) : 'تسجيل الدخول ←'}
            </button>
          </form>

          <div style={{ marginTop:32, fontSize:11, color:'rgba(100,130,180,0.32)', textAlign:'center' }}>
            تم التصميم بواسطة{' '}
            <span style={{ fontWeight:700, background:'linear-gradient(135deg,#318CE7,#00E4B8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              إبراهيم كنعي
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
