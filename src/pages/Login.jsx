import React, { useState } from 'react'
import { Auth } from '../data/db'
import MawjLogo from '../components/Logo'

/* ══════════════════════════════════════════════════
   LOGIN v8.5 — Deep indigo-violet atmospheric
   Glassmorphism card · Teal-violet-pink gradients
══════════════════════════════════════════════════ */
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

  const bg   = isLight ? '#e8e5f5' : '#07051c'
  const cardBg   = isLight ? 'rgba(255,255,255,0.88)' : 'rgba(12,8,38,0.90)'
  const cardBdr  = isLight ? 'rgba(124,58,237,0.18)' : 'rgba(167,139,250,0.22)'
  const inputBg  = isLight ? 'rgba(255,255,255,0.80)' : 'rgba(124,58,237,0.07)'
  const inputBdr = isLight ? 'rgba(124,58,237,0.18)' : 'rgba(167,139,250,0.16)'
  const textC    = isLight ? '#0e0a2e' : '#e8e0ff'
  const textSec  = isLight ? '#4a3f7a' : '#9d8fd4'
  const gridC    = isLight ? 'rgba(124,58,237,0.03)' : 'rgba(167,139,250,0.025)'

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',alignItems:'center',justifyContent:'center',
      background:bg,
      position:'relative',overflow:'hidden',padding:16,
      transition:'background 0.4s ease',
    }}>

      {/* ── 4 atmospheric orbs ── */}
      <div style={{position:'absolute',top:'-8%',right:'-4%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 68%)',animation:'orbFloat 11s ease-in-out infinite',pointerEvents:'none',willChange:'transform'}} />
      <div style={{position:'absolute',bottom:'-15%',left:'-8%',width:720,height:720,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.08) 0%,transparent 68%)',animation:'orbFloat 15s ease-in-out infinite reverse',pointerEvents:'none',willChange:'transform'}} />
      <div style={{position:'absolute',top:'35%',left:'25%',width:380,height:380,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,228,184,0.06) 0%,transparent 68%)',animation:'orbFloat 19s ease-in-out infinite',animationDelay:'-7s',pointerEvents:'none',willChange:'transform'}} />
      <div style={{position:'absolute',top:'10%',left:'55%',width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(236,72,153,0.05) 0%,transparent 68%)',animation:'orbFloat 25s ease-in-out infinite reverse',animationDelay:'-12s',pointerEvents:'none',willChange:'transform'}} />

      {/* ── Violet-tinted grid ── */}
      <div style={{
        position:'absolute',inset:0,pointerEvents:'none',
        backgroundImage:`linear-gradient(${gridC} 1px,transparent 1px),linear-gradient(90deg,${gridC} 1px,transparent 1px)`,
        backgroundSize:'64px 64px',
      }} />

      {/* ── Radial mesh overlay ── */}
      <div style={{
        position:'absolute',inset:0,pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(124,58,237,0.15) 0%,transparent 60%)',
        opacity: isLight ? 0.5 : 1,
      }} />

      {/* ── Theme toggle ── */}
      {toggleTheme && (
        <button onClick={toggleTheme} style={{
          position:'absolute',top:20,left:20,
          background: isLight ? 'rgba(124,58,237,0.08)' : 'rgba(167,139,250,0.08)',
          border:`1px solid ${isLight?'rgba(124,58,237,0.18)':'rgba(167,139,250,0.16)'}`,
          borderRadius:999,padding:'7px 14px',cursor:'pointer',
          color: textSec, fontSize:12,fontFamily:'inherit',
          display:'flex',alignItems:'center',gap:6,
          backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
          transition:'all 0.2s ease',
        }}>
          {isLight ? '🌙 داكن' : '☀️ فاتح'}
        </button>
      )}

      {/* ── Main card container ── */}
      <div style={{
        width:'100%',maxWidth:420,position:'relative',zIndex:1,
        animation:'fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) both',
      }}>

        {/* ── Brand header ── */}
        <div style={{textAlign:'center',marginBottom:32}}>
          {/* Logo circle */}
          <div style={{
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:76,height:76,borderRadius:22,
            background:isLight
              ? 'linear-gradient(135deg,rgba(0,228,184,0.12),rgba(124,58,237,0.10))'
              : 'linear-gradient(135deg,rgba(0,228,184,0.08),rgba(124,58,237,0.14))',
            border:'1.5px solid rgba(167,139,250,0.28)',
            marginBottom:18,
            boxShadow:'0 0 48px rgba(124,58,237,0.25),0 0 20px rgba(0,228,184,0.15)',
            animation:'pulseViolet 4s ease-in-out infinite',
          }}>
            {/* Wave SVG mark */}
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="loginLogo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00e4b8"/>
                  <stop offset="0.5" stopColor="#a78bfa"/>
                  <stop offset="1" stopColor="#ec4899"/>
                </linearGradient>
              </defs>
              <path d="M4 20c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
                stroke="url(#loginLogo)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M4 14c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
                stroke="url(#loginLogo)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
            </svg>
          </div>

          {/* مَوج heading */}
          <h1 style={{
            fontSize:36,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1,
            background:'linear-gradient(135deg,#00e4b8,#a78bfa,#ec4899)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            margin:'0 0 6px',
          }}>مَوج</h1>
          <p style={{
            color:isLight?'rgba(74,63,122,0.5)':'rgba(167,139,250,0.35)',
            fontSize:11,letterSpacing:'0.10em',textTransform:'uppercase',
          }}>نظام إدارة المبيعات</p>
        </div>

        {/* ── Login glass card ── */}
        <div style={{
          background:cardBg,
          backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',
          border:`1.5px solid ${cardBdr}`,
          borderRadius:24,padding:'28px 24px',
          boxShadow: isLight
            ? '0 20px 60px rgba(100,80,180,0.12)'
            : '0 32px 80px rgba(7,5,28,0.6),0 0 0 1px rgba(167,139,250,0.08)',
          position:'relative',overflow:'hidden',
        }}>
          {/* Violet-teal top accent */}
          <div style={{
            position:'absolute',top:0,left:0,right:0,height:2,
            background:'linear-gradient(90deg,transparent,rgba(167,139,250,0.6),rgba(0,228,184,0.5),rgba(236,72,153,0.4),transparent)',
            pointerEvents:'none',
          }} />
          {/* Corner glow orb */}
          <div style={{
            position:'absolute',top:-40,right:-40,
            width:120,height:120,borderRadius:'50%',
            background:'rgba(124,58,237,0.08)',filter:'blur(30px)',
            pointerEvents:'none',
          }} />

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:20,position:'relative'}}>

            {/* Email */}
            <div>
              <label style={{
                display:'block',fontSize:10,fontWeight:700,
                color:textSec,marginBottom:7,
                letterSpacing:'0.07em',textTransform:'uppercase',
              }}>البريد الإلكتروني</label>
              <input
                type="email" value={email}
                onChange={e=>setEmail(e.target.value)}
                required placeholder="you@example.com"
                style={{
                  width:'100%',padding:'11px 14px',
                  background:inputBg,
                  border:`1.5px solid ${inputBdr}`,
                  borderRadius:12,color:textC,fontSize:13,outline:'none',
                  transition:'all 0.18s ease',
                  direction:'ltr',textAlign:'left',fontFamily:'inherit',
                  boxSizing:'border-box',
                  backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
                }}
                onFocus={e=>{
                  e.target.style.borderColor='rgba(167,139,250,0.55)'
                  e.target.style.boxShadow='0 0 0 3px rgba(124,58,237,0.14)'
                }}
                onBlur={e=>{
                  e.target.style.borderColor=inputBdr
                  e.target.style.boxShadow='none'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display:'block',fontSize:10,fontWeight:700,
                color:textSec,marginBottom:7,
                letterSpacing:'0.07em',textTransform:'uppercase',
              }}>كلمة المرور</label>
              <div style={{position:'relative'}}>
                <input
                  type={showPass?'text':'password'} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  required placeholder="••••••••"
                  style={{
                    width:'100%',padding:'11px 44px 11px 14px',
                    background:inputBg,
                    border:`1.5px solid ${inputBdr}`,
                    borderRadius:12,color:textC,fontSize:13,outline:'none',
                    transition:'all 0.18s ease',
                    direction:'ltr',textAlign:'left',fontFamily:'inherit',
                    boxSizing:'border-box',
                    backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
                  }}
                  onFocus={e=>{
                    e.target.style.borderColor='rgba(167,139,250,0.55)'
                    e.target.style.boxShadow='0 0 0 3px rgba(124,58,237,0.14)'
                  }}
                  onBlur={e=>{
                    e.target.style.borderColor=inputBdr
                    e.target.style.boxShadow='none'
                  }}
                />
                <button
                  type="button" onClick={()=>setShowPass(p=>!p)}
                  style={{
                    position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',cursor:'pointer',
                    fontSize:15,lineHeight:1,padding:4,
                    color:isLight?'rgba(74,63,122,0.5)':'rgba(167,139,250,0.4)',
                  }}
                >
                  {showPass?'🙈':'👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding:'10px 14px',
                background:'rgba(255,71,87,0.09)',
                border:'1px solid rgba(255,71,87,0.24)',
                borderRadius:10,fontSize:12,color:'#ff4757',
                textAlign:'center',display:'flex',alignItems:'center',
                justifyContent:'center',gap:6,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%',padding:'13px',
              background: loading
                ? 'rgba(0,228,184,0.35)'
                : 'linear-gradient(135deg,#00e4b8,#00c49f)',
              border:'none',borderRadius:12,
              color:'#07051c',fontSize:14,fontWeight:900,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'inherit',
              transition:'all 0.22s ease',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(0,228,184,0.42)',
              letterSpacing:'0.02em',
            }}>
              {loading ? (
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite'}}>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#07051c" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
                  </svg>
                  جاري الدخول...
                </span>
              ) : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        {/* Footer credit */}
        <p style={{
          textAlign:'center',marginTop:20,
          fontSize:10,color:isLight?'rgba(74,63,122,0.35)':'rgba(167,139,250,0.25)',
          letterSpacing:'0.04em',
        }}>
          تم التصميم بواسطة{' '}
          <span style={{
            background:'linear-gradient(135deg,var(--teal),var(--violet-light))',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            fontWeight:700,
          }}>إبراهيم كنعي</span>
        </p>
      </div>

      <style>{`
        @keyframes orbFloat    { 0%,100%{transform:translateY(0) scale(1)} 33%{transform:translateY(-28px) scale(1.02)} 66%{transform:translateY(-12px) scale(0.98)} }
        @keyframes pulseViolet { 0%,100%{box-shadow:0 0 48px rgba(124,58,237,0.25),0 0 20px rgba(0,228,184,0.15)} 50%{box-shadow:0 0 72px rgba(124,58,237,0.45),0 0 36px rgba(0,228,184,0.22)} }
        @keyframes fadeInUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin        { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
