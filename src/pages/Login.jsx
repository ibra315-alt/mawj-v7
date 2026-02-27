import React, { useState } from 'react'
import { Auth } from '../data/db'
import MawjLogo from '../components/Logo'

/* ══════════════════════════════════════════════════
   LOGIN v10 — CRYSTAL LUXURY
   Glass card · Teal-Gold branding · Ambient orbs
   The first thing you see = the brand promise
══════════════════════════════════════════════════ */
export default function Login({ theme, toggleTheme }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  const isDark = theme !== 'light'

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
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      padding: '20px',
      direction: 'rtl',
      position: 'relative',
      zIndex: 0,
    }}>

      {/* ── Ambient orbs ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }} aria-hidden="true">
        {/* Teal orb — top right */}
        <div style={{
          position:'absolute', top:'-15%', right:'-8%',
          width:'min(60vw,600px)', height:'min(60vw,600px)', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,228,184,0.8), transparent 65%)',
          filter:'blur(120px)', opacity:0.12,
          animation:'orbDrift1 20s ease-in-out infinite alternate',
        }}/>
        {/* Indigo orb — bottom left */}
        <div style={{
          position:'absolute', bottom:'-15%', left:'-8%',
          width:'min(55vw,550px)', height:'min(55vw,550px)', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(99,102,241,0.8), transparent 65%)',
          filter:'blur(120px)', opacity:0.10,
          animation:'orbDrift2 26s ease-in-out infinite alternate',
        }}/>
        {/* Gold orb — center */}
        <div style={{
          position:'absolute', top:'40%', left:'40%',
          width:'min(35vw,350px)', height:'min(35vw,350px)', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(201,169,110,0.6), transparent 65%)',
          filter:'blur(100px)', opacity:0.08,
          animation:'orbDrift3 22s ease-in-out infinite alternate',
        }}/>
        {/* Subtle noise */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.02 }}>
          <filter id="loginNoise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter>
          <rect width="100%" height="100%" filter="url(#loginNoise)"/>
        </svg>
      </div>

      {/* ── Theme toggle ── */}
      {toggleTheme && (
        <button
          onClick={toggleTheme}
          style={{
            position: 'absolute', top: 20, left: 20, zIndex:10,
            padding: '8px 14px', borderRadius: 'var(--r-pill)',
            background: 'var(--bg-surface)',
            backdropFilter: 'var(--glass-blur-subtle)',
            WebkitBackdropFilter: 'var(--glass-blur-subtle)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)',
            color: 'var(--text-sec)', fontSize: 12,
            fontFamily: 'inherit', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 120ms ease',
          }}
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
          {isDark ? 'فاتح' : 'داكن'}
        </button>
      )}

      {/* ── Glass Login Card ── */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: isDark ? 'rgba(13,14,20,0.65)' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(48px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(48px) saturate(1.5)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: isDark
          ? '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
          : '0 24px 80px rgba(15,14,12,0.12)',
        borderRadius: 'var(--r-2xl)',
        overflow: 'hidden',
        animation: 'cardEntrance 400ms var(--ease-out) both',
        position: 'relative', zIndex: 1,
      }}>

        {/* Top accent — teal to gold gradient */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, var(--action), var(--gold-500), var(--action))',
          opacity: 0.6,
        }}/>

        <div style={{ padding: '40px 36px 36px' }}>

          {/* ── Brand Section ── */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            {/* Logo with glass frame */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 72, height: 72, borderRadius: 'var(--r-lg)',
              background: 'var(--action-soft)',
              border: '1px solid rgba(0,228,184,0.10)',
              marginBottom: 20,
              boxShadow: '0 8px 32px var(--action-glow)',
            }}>
              <MawjLogo size={40} color="var(--action)" animated />
            </div>

            {/* Brand name — gold gradient */}
            <div style={{
              fontSize: 36, fontWeight: 900,
              background: 'linear-gradient(135deg, var(--action), var(--gold-500))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              lineHeight: 1.1, marginBottom: 8,
            }}>مَوج</div>

            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              letterSpacing: '0.12em', fontWeight: 500,
            }}>CRYSTAL GIFTS ERP</div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', marginBottom: 8,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--input-bg)',
                  backdropFilter: 'var(--glass-blur-subtle)',
                  WebkitBackdropFilter: 'var(--glass-blur-subtle)',
                  border: '1.5px solid var(--input-border)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text)', fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                  direction: 'ltr', textAlign: 'left',
                  transition: 'border-color 160ms ease, box-shadow 160ms ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--action)'
                  e.target.style.boxShadow = '0 0 0 3px var(--action-faint)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--input-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', marginBottom: 8,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 48px',
                    background: 'var(--input-bg)',
                    backdropFilter: 'var(--glass-blur-subtle)',
                    WebkitBackdropFilter: 'var(--glass-blur-subtle)',
                    border: '1.5px solid var(--input-border)',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--text)', fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none', boxSizing: 'border-box',
                    direction: 'rtl', textAlign: 'right',
                    letterSpacing: showPass ? 'normal' : '0.12em',
                    transition: 'border-color 160ms ease, box-shadow 160ms ease',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--action)'
                    e.target.style.boxShadow = '0 0 0 3px var(--action-faint)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--input-border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: 4,
                    color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 120ms ease',
                  }}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.10)',
                borderRadius: 'var(--r-sm)',
                fontSize: 12, color: 'var(--danger-light)',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* Submit — premium button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'var(--bg-hover)' : 'var(--action)',
                border: 'none', borderRadius: 'var(--r-sm)',
                color: loading ? 'var(--text-muted)' : '#031a13',
                fontSize: 14, fontWeight: 900,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 160ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 20px var(--action-glow)',
              }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
                  </svg>
                  جاري الدخول...
                </>
              ) : 'تسجيل الدخول'}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 36px 20px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          تم التصميم بواسطة{' '}
          <span style={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--action), var(--gold-500))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>إبراهيم كنعي</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes orbDrift1 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-30px,20px) scale(1.05); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes orbDrift2 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(35px,-25px) scale(1.06); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes orbDrift3 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-20px,25px) scale(1.04); }
          100% { transform: translate(0,0) scale(1); }
        }
      `}</style>
    </div>
  )
}
