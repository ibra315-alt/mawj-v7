import React, { useState } from 'react'
import { Auth } from '../data/db'
import MawjLogo from '../components/Logo'

export default function Login({ theme, toggleTheme }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)
  const isLight = theme === 'light'

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

  const bg = isLight ? '#eaf0fc' : '#050810'
  const orbTeal   = isLight ? 'rgba(0,228,184,0.08)'  : 'rgba(0,228,184,0.10)'
  const orbViolet = isLight ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.10)'

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:bg, position:'relative', overflow:'hidden', padding:16,
      transition:'background 0.3s ease',
    }}>
      {/* ── Animated depth orbs — same as app interior ── */}
      <div style={{position:'absolute',top:'-10%',right:'-5%',width:540,height:540,borderRadius:'50%',background:`radial-gradient(circle, ${orbTeal} 0%, transparent 70%)`,animation:'orbFloat 9s ease-in-out infinite',pointerEvents:'none',willChange:'transform'}} />
      <div style={{position:'absolute',bottom:'-12%',left:'-6%',width:660,height:660,borderRadius:'50%',background:`radial-gradient(circle, ${orbViolet} 0%, transparent 70%)`,animation:'orbFloat 13s ease-in-out infinite reverse',pointerEvents:'none',willChange:'transform'}} />
      <div style={{position:'absolute',top:'40%',left:'30%',width:320,height:320,borderRadius:'50%',background:`radial-gradient(circle, rgba(0,168,228,0.04) 0%, transparent 70%)`,animation:'orbFloat 17s ease-in-out infinite',animationDelay:'-6s',pointerEvents:'none',willChange:'transform'}} />

      {/* ── Grid overlay ── */}
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${isLight?'rgba(0,0,0,0.022)':'rgba(255,255,255,0.016)'} 1px, transparent 1px), linear-gradient(90deg, ${isLight?'rgba(0,0,0,0.022)':'rgba(255,255,255,0.016)'} 1px, transparent 1px)`,backgroundSize:'64px 64px',pointerEvents:'none'}} />

      {/* ── Theme toggle ── */}
      {toggleTheme && (
        <button onClick={toggleTheme} style={{
          position:'absolute', top:20, left:20,
          background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
          border:`1px solid ${isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.1)'}`,
          borderRadius:999, padding:'6px 14px', cursor:'pointer',
          color: isLight ? '#0c1030' : '#eef0ff', fontSize:12, fontFamily:'inherit',
          display:'flex', alignItems:'center', gap:6, transition:'all 0.2s ease',
          backdropFilter:'blur(10px)',
        }}>
          {isLight ? '🌙 داكن' : '☀️ فاتح'}
        </button>
      )}

      {/* ── Card ── */}
      <div style={{width:'100%',maxWidth:400,position:'relative',zIndex:1,animation:'fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) both'}}>

        {/* ── Brand header ── */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:72, height:72, borderRadius:22,
            background: isLight ? 'rgba(0,228,184,0.08)' : 'rgba(0,228,184,0.07)',
            border:'1.5px solid rgba(0,228,184,0.25)',
            marginBottom:16, animation:'pulseGlow 4s ease-in-out infinite',
            boxShadow:'0 0 40px rgba(0,228,184,0.15)',
          }}>
            <MawjLogo size={46} color="#00e4b8" animated />
          </div>
          <h1 style={{
            fontSize:32, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1,
            background:'linear-gradient(135deg, #00e4b8 0%, #ffffff 55%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            margin:'0 0 6px',
          }}>مَوج</h1>
          <p style={{color: isLight?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.2)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase'}}>نظام إدارة المبيعات</p>
        </div>

        {/* ── Login card ── */}
        <div style={{
          background: isLight ? 'rgba(255,255,255,0.88)' : 'rgba(8,10,24,0.92)',
          backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
          border:`1.5px solid ${isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.07)'}`,
          borderRadius:24, padding:'28px 24px',
          boxShadow: isLight ? '0 20px 60px rgba(0,0,0,0.08)' : '0 32px 80px rgba(0,0,0,0.55)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Wave accent top */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,228,184,0.5),transparent)',pointerEvents:'none'}} />

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:20}}>
            {/* Email */}
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:isLight?'#4a5280':'var(--text-sec)',marginBottom:7,letterSpacing:'0.07em',textTransform:'uppercase'}}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"
                style={{width:'100%',padding:'11px 14px',background:isLight?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)',border:`1.5px solid ${isLight?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.08)'}`,borderRadius:12,color:isLight?'#0c1030':'#eef0ff',fontSize:13,outline:'none',transition:'all 0.18s ease',direction:'ltr',textAlign:'left',fontFamily:'inherit',boxSizing:'border-box'}}
                onFocus={e=>{e.target.style.borderColor='#00e4b8';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
                onBlur={e=>{e.target.style.borderColor=isLight?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.08)';e.target.style.boxShadow='none'}}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:isLight?'#4a5280':'var(--text-sec)',marginBottom:7,letterSpacing:'0.07em',textTransform:'uppercase'}}>كلمة المرور</label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"
                  style={{width:'100%',padding:'11px 44px 11px 14px',background:isLight?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)',border:`1.5px solid ${isLight?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.08)'}`,borderRadius:12,color:isLight?'#0c1030':'#eef0ff',fontSize:13,outline:'none',transition:'all 0.18s ease',direction:'ltr',textAlign:'left',fontFamily:'inherit',boxSizing:'border-box'}}
                  onFocus={e=>{e.target.style.borderColor='#00e4b8';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.1)'}}
                  onBlur={e=>{e.target.style.borderColor=isLight?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.08)';e.target.style.boxShadow='none'}}
                />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1,padding:4,color:isLight?'#9098c0':'#454870'}}>
                  {showPass?'🙈':'👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{padding:'10px 14px',background:'rgba(255,71,87,0.09)',border:'1px solid rgba(255,71,87,0.22)',borderRadius:10,fontSize:12,color:'#ff4757',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px',
              background: loading ? 'rgba(0,228,184,0.4)' : 'linear-gradient(135deg,#00e4b8,#00b894)',
              border:'none', borderRadius:12, color:'#050810', fontSize:14, fontWeight:900,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit',
              transition:'all 0.22s ease',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(0,228,184,0.38)',
              letterSpacing:'0.02em',
            }}>
              {loading
                ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite'}}>
                      <circle cx="12" cy="12" r="10" fill="none" stroke="#050810" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
                    </svg>
                    جاري الدخول...
                  </span>
                : 'تسجيل الدخول'
              }
            </button>
          </form>
        </div>

        <p style={{textAlign:'center',marginTop:20,fontSize:10,color:isLight?'rgba(0,0,0,0.25)':'rgba(255,255,255,0.18)',letterSpacing:'0.04em'}}>
          تم التصميم بواسطة <span style={{color:'#00e4b8',fontWeight:700}}>إبراهيم كنعي</span>
        </p>
      </div>

      <style>{`
        @keyframes orbFloat { 0%,100%{transform:translateY(0) scale(1)} 33%{transform:translateY(-22px) scale(1.02)} 66%{transform:translateY(-10px) scale(0.98)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 40px rgba(0,228,184,0.15)} 50%{box-shadow:0 0 60px rgba(0,228,184,0.45),0 0 90px rgba(0,228,184,0.1)} }
        @keyframes fadeInUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
