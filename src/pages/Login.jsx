import React, { useState } from 'react'
import { Auth } from '../data/db'
import MawjLogo from '../components/Logo'

export default function Login({ theme, toggleTheme }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

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

  const isLight = theme === 'light'

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background: isLight ? '#f0f4ff' : '#060810',
      position:'relative', overflow:'hidden', padding:16,
      transition:'background 0.3s ease',
    }}>
      {/* Animated orbs */}
      <div style={{position:'absolute',top:'-10%',right:'-5%',width:500,height:500,borderRadius:'50%',background:`radial-gradient(circle, ${isLight?'rgba(0,228,184,0.08)':'rgba(0,228,184,0.1)'} 0%, transparent 70%)`,animation:'float 8s ease-in-out infinite',pointerEvents:'none'}} />
      <div style={{position:'absolute',bottom:'-10%',left:'-5%',width:600,height:600,borderRadius:'50%',background:`radial-gradient(circle, ${isLight?'rgba(124,58,237,0.06)':'rgba(124,58,237,0.1)'} 0%, transparent 70%)`,animation:'float 10s ease-in-out infinite reverse',pointerEvents:'none'}} />

      {/* Grid */}
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${isLight?'rgba(0,0,0,0.03)':'rgba(255,255,255,0.02)'} 1px, transparent 1px), linear-gradient(90deg, ${isLight?'rgba(0,0,0,0.03)':'rgba(255,255,255,0.02)'} 1px, transparent 1px)`,backgroundSize:'60px 60px',pointerEvents:'none'}} />

      {/* Theme toggle top-left */}
      {toggleTheme && (
        <button onClick={toggleTheme} style={{
          position:'absolute',top:20,left:20,
          background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          border:`1px solid ${isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)'}`,
          borderRadius:99, padding:'6px 14px', cursor:'pointer',
          color: isLight ? '#0f1124' : '#eef0ff', fontSize:13, fontFamily:'inherit',
          display:'flex', alignItems:'center', gap:6,
        }}>
          {isLight ? '🌙 داكن' : '☀️ فاتح'}
        </button>
      )}

      <div style={{width:'100%',maxWidth:420,position:'relative',zIndex:1,animation:'fadeInUp 0.5s ease both'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:72,height:72,borderRadius:22,background: isLight?'rgba(0,228,184,0.1)':'rgba(0,228,184,0.08)',border:'1px solid rgba(0,228,184,0.3)',marginBottom:16,boxShadow:'0 0 40px rgba(0,228,184,0.2)',animation:'pulseGlow 3s ease-in-out infinite'}}>
            <MawjLogo size={44} color="#00e4b8" animated />
          </div>
          <h1 style={{fontSize:30,fontWeight:900,letterSpacing:'-0.03em',background:'linear-gradient(135deg, #00e4b8, #ffffff, #7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>مَوج</h1>
          <p style={{color: isLight?'#9098c0':'#454870', fontSize:12,marginTop:5,letterSpacing:'0.06em'}}>نظام إدارة المبيعات</p>
        </div>

        {/* Card */}
        <div style={{
          background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(10,12,24,0.9)',
          backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
          border:`1px solid ${isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)'}`,
          borderRadius:24, padding:'32px 28px',
          boxShadow: isLight ? '0 20px 60px rgba(0,0,0,0.1)' : '0 32px 80px rgba(0,0,0,0.5)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,228,184,0.5),transparent)'}} />

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color: isLight?'#4a5280':'var(--text-sec)',marginBottom:7,letterSpacing:'0.05em'}}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"
                style={{width:'100%',padding:'12px 16px',background:isLight?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.05)',border:`1px solid ${isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)'}`,borderRadius:12,color:isLight?'#0f1124':'#eef0ff',fontSize:14,outline:'none',transition:'all 0.2s ease',direction:'ltr',textAlign:'left',fontFamily:'inherit'}}
                onFocus={e=>{e.target.style.borderColor='#00e4b8';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12)'}}
                onBlur={e=>{e.target.style.borderColor=isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)';e.target.style.boxShadow='none'}}
              />
            </div>

            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:isLight?'#4a5280':'var(--text-sec)',marginBottom:7,letterSpacing:'0.05em'}}>كلمة المرور</label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"
                  style={{width:'100%',padding:'12px 44px 12px 16px',background:isLight?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.05)',border:`1px solid ${isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)'}`,borderRadius:12,color:isLight?'#0f1124':'#eef0ff',fontSize:14,outline:'none',transition:'all 0.2s ease',direction:'ltr',textAlign:'left',fontFamily:'inherit'}}
                  onFocus={e=>{e.target.style.borderColor='#00e4b8';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12)'}}
                  onBlur={e=>{e.target.style.borderColor=isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)';e.target.style.boxShadow='none'}}
                />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,lineHeight:1,padding:4,color:isLight?'#9098c0':'#454870'}}>
                  {showPass?'🙈':'👁️'}
                </button>
              </div>
            </div>

            {error && <div style={{padding:'10px 14px',background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:10,fontSize:13,color:'#ff4757',textAlign:'center'}}>{error}</div>}

            <button type="submit" disabled={loading} style={{
              width:'100%',padding:'14px',marginTop:4,
              background:loading?'rgba(0,228,184,0.5)':'linear-gradient(135deg,#00e4b8,#00c49a)',
              border:'none',borderRadius:12,color:'#060810',fontSize:15,fontWeight:800,
              cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',
              transition:'all 0.25s ease',
              boxShadow:loading?'none':'0 4px 20px rgba(0,228,184,0.4)',
              letterSpacing:'0.02em',
            }}
              onMouseEnter={e=>{if(!loading){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,228,184,0.55)'}}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,228,184,0.4)'}}
            >
              {loading
                ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite'}}><circle cx="12" cy="12" r="10" fill="none" stroke="#060810" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/></svg>
                    جاري الدخول...
                  </span>
                : 'تسجيل الدخول'
              }
            </button>
          </form>
        </div>

        <p style={{textAlign:'center',marginTop:18,fontSize:11,color:isLight?'#9098c0':'#454870',letterSpacing:'0.03em'}}>
          تم التصميم بواسطة <span style={{color:'#00e4b8',fontWeight:700}}>إبراهيم كنعي</span>
        </p>
      </div>

      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 40px rgba(0,228,184,0.2)}50%{box-shadow:0 0 60px rgba(0,228,184,0.5)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
