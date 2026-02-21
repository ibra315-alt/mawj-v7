import React, { useState } from 'react'
import { Auth } from '../data/db'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await Auth.signIn(email, password)
    } catch (err) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#060810', position:'relative', overflow:'hidden', padding:16,
    }}>
      {/* Animated background orbs */}
      <div style={{position:'absolute',top:'-10%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle, rgba(0,228,184,0.12) 0%, transparent 70%)',animation:'float 8s ease-in-out infinite',pointerEvents:'none'}} />
      <div style={{position:'absolute',bottom:'-10%',left:'-5%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',animation:'float 10s ease-in-out infinite reverse',pointerEvents:'none'}} />
      <div style={{position:'absolute',top:'40%',left:'30%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle, rgba(0,228,184,0.05) 0%, transparent 70%)',animation:'float 6s ease-in-out infinite',pointerEvents:'none'}} />

      {/* Grid overlay */}
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize:'60px 60px',pointerEvents:'none',
      }} />

      <div style={{width:'100%',maxWidth:420,position:'relative',zIndex:1,animation:'fadeInUp 0.5s ease both'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:64,height:64,borderRadius:20,
            background:'linear-gradient(135deg, rgba(0,228,184,0.15), rgba(124,58,237,0.15))',
            border:'1px solid rgba(0,228,184,0.3)',
            marginBottom:16,
            boxShadow:'0 0 40px rgba(0,228,184,0.2)',
            animation:'pulseGlow 3s ease-in-out infinite',
          }}>
            <span style={{fontSize:28}}>🌊</span>
          </div>
          <h1 style={{
            fontSize:32,fontWeight:900,letterSpacing:'-0.03em',
            background:'linear-gradient(135deg, var(--teal), #ffffff, var(--violet))',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            backgroundSize:'200% 200%',
          }}>مَوج</h1>
          <p style={{color:'var(--text-muted)',fontSize:13,marginTop:6,letterSpacing:'0.05em'}}>نظام إدارة المبيعات</p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(10,12,24,0.85)',
          backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:24,
          padding:'32px 28px',
          boxShadow:'0 32px 80px rgba(0,0,0,0.5), 0 0 40px rgba(0,228,184,0.05)',
          position:'relative',overflow:'hidden',
        }}>
          {/* Top shimmer line */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg, transparent, rgba(0,228,184,0.6), transparent)'}} />

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--text-sec)',marginBottom:7,letterSpacing:'0.05em'}}>البريد الإلكتروني</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{
                  width:'100%',padding:'12px 16px',background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,
                  color:'var(--text)',fontSize:14,outline:'none',transition:'all 0.2s ease',
                  direction:'ltr',textAlign:'left',fontFamily:'var(--font)',
                }}
                onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12)'}}
                onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.boxShadow='none'}}
              />
            </div>

            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--text-sec)',marginBottom:7,letterSpacing:'0.05em'}}>كلمة المرور</label>
              <div style={{position:'relative'}}>
                <input
                  type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required
                  placeholder="••••••••"
                  style={{
                    width:'100%',padding:'12px 44px 12px 16px',background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,
                    color:'var(--text)',fontSize:14,outline:'none',transition:'all 0.2s ease',
                    direction:'ltr',textAlign:'left',fontFamily:'var(--font)',
                  }}
                  onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(0,228,184,0.12)'}}
                  onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.boxShadow='none'}}
                />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:16,lineHeight:1,padding:4}}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{padding:'10px 14px',background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:10,fontSize:13,color:'var(--red)',textAlign:'center',animation:'fadeInUp 0.2s ease'}}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width:'100%',padding:'14px',marginTop:4,
                background: loading ? 'rgba(0,228,184,0.5)' : 'linear-gradient(135deg, var(--teal) 0%, #00c49a 100%)',
                border:'none',borderRadius:12,
                color:'#060810',fontSize:15,fontWeight:800,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'var(--font)',
                transition:'all 0.25s ease',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,228,184,0.4)',
                letterSpacing:'0.02em',
              }}
              onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,228,184,0.55)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,228,184,0.4)' }}
            >
              {loading ? (
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{animation:'spin 0.7s linear infinite'}}><circle cx="12" cy="12" r="10" fill="none" stroke="#060810" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/></svg>
                  جاري الدخول...
                </span>
              ) : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        <p style={{textAlign:'center',marginTop:20,fontSize:11,color:'var(--text-muted)',letterSpacing:'0.03em'}}>
          Mawj ERP v7.0 · Powered by Supabase
        </p>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 40px rgba(0,228,184,0.2)} 50%{box-shadow:0 0 60px rgba(0,228,184,0.5)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
