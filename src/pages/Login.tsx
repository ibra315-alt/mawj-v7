import React, { useState } from 'react'
import { Auth } from '../data/db'

/* ══════════════════════════════════════════════════
   LOGIN v11 — Liquid Glass
   Clean · RTL-first · Bright Blue accent
══════════════════════════════════════════════════ */
export default function Login() {
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

      {/* Premium background orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb-1"/>
        <div className="bg-orb bg-orb-2"/>
        <div className="bg-orb bg-orb-3"/>
        <div className="bg-waves">
          <div className="bg-wave bg-wave-1"/>
          <div className="bg-wave bg-wave-2"/>
          <div className="bg-wave bg-wave-3"/>
        </div>
      </div>

      {/* Card — Liquid Glass */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--modal-bg)',
        backdropFilter: 'var(--glass-blur-lg)',
        WebkitBackdropFilter: 'var(--glass-blur-lg)',
        boxShadow: 'var(--float-shadow)',
        border: '1px solid var(--border)',
        borderTopColor: 'var(--glass-edge)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        animation: 'cardEntrance var(--dur-base) var(--ease-out) both',
        position: 'relative', zIndex: 1,
      }}>

        {/* Teal top accent bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--action), var(--info-light))',
        }}/>

        <div style={{ padding: '36px 32px 32px' }}>

          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 'var(--r-md)',
              background: 'var(--action-soft)', marginBottom: 16,
            }}>
              <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="llg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--action)"/>
                    <stop offset="1" stopColor="var(--info)"/>
                  </linearGradient>
                </defs>
                <path d="M4 20c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
                  stroke="url(#llg)" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M4 14c3-5 6-5 8.5 0s5.5 5 8.5 0c2-3.5 4.5-4.5 7-2"
                  stroke="url(#llg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
              </svg>
            </div>
            <div style={{
              fontSize: 28, fontWeight: 900,
              background: 'linear-gradient(135deg, var(--action), var(--info-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              lineHeight: 1, marginBottom: 6,
            }}>مَوج</div>
            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}>نظام إدارة المبيعات</div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', marginBottom: 8,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1.5px solid var(--input-border)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text)', fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                  direction: 'ltr', textAlign: 'left',
                  transition: 'border-color 120ms ease, box-shadow 120ms ease',
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
                letterSpacing: '0.05em', textTransform: 'uppercase',
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
                    /* padding-left for eye icon on left (trailing in RTL) */
                    padding: '11px 14px 11px 44px',
                    background: 'var(--bg-elevated)',
                    border: '1.5px solid var(--input-border)',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--text)', fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none', boxSizing: 'border-box',
                    direction: 'rtl', textAlign: 'right',
                    letterSpacing: showPass ? 'normal' : '0.12em',
                    transition: 'border-color 120ms ease, box-shadow 120ms ease',
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
                {/* Eye toggle — left side (trailing in RTL = end of input) */}
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', left: 12, top: '50%',
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
                background: 'rgba(var(--danger-rgb),0.08)',
                borderRadius: 'var(--r-sm)',
                fontSize: 12, color: 'var(--danger-light)',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? 'var(--bg-hover)' : 'var(--action)',
                border: 'none', borderRadius: 'var(--r-sm)',
                color: loading ? 'var(--text-muted)' : '#ffffff',
                fontSize: 14, fontWeight: 900,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 120ms ease, transform 100ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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

        {/* Footer credit */}
        <div style={{
          padding: '12px 32px 20px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          تم التصميم بواسطة{' '}
          <span style={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--action), var(--info-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>إبراهيم كنعي</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
