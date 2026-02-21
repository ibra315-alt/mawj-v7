import React, { useState } from 'react'
import { Auth } from '../data/db'
import { Btn, Input, Spinner } from '../components/ui'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return }
    setLoading(true)
    setError('')
    try {
      await Auth.signIn(email, password)
      onLogin()
    } catch (err) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,228,184,0.06) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
        top: '20%',
        right: '20%',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 400,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(0,228,184,0.2), rgba(124,58,237,0.2))',
            border: '1px solid rgba(0,228,184,0.3)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, background: 'linear-gradient(135deg, #00e4b8, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>م</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 6px', color: 'var(--text)' }}>مَوج</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>نظام إدارة المبيعات</p>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              dir="ltr"
            />
            <Input
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              dir="ltr"
            />

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(255,71,87,0.1)',
                border: '1px solid rgba(255,71,87,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--red)',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <Btn
              type="submit"
              loading={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }}
            >
              {loading ? 'جاري الدخول...' : 'دخول'}
            </Btn>
          </form>
        </div>
      </div>
    </div>
  )
}
