import React, { useEffect, useState } from 'react'

/* ══════════════════════════════════════════════════
   BG CANVAS — Subtle ambient background
   Light mode: very faint orbs only (no particles)
   Dark mode: soft orbs + subtle particles
══════════════════════════════════════════════════ */

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${(i * 8.3 + 5) % 100}%`,
  delay: `${(i * 0.7) % 8}s`,
  duration: `${8 + (i % 4)}s`,
  size: i % 2 === 0 ? 2 : 3,
  color: i % 2 === 0 ? 'rgba(56,189,248,0.5)' : 'rgba(59,130,246,0.4)',
}))

export default function BgCanvas() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Light mode: very subtle, almost invisible orbs
  const orbOpacity = isDark ? 0.12 : 0.04

  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <style>{`
        @keyframes auroraA {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-30px,20px) scale(1.04); }
          66%  { transform: translate(15px,-15px) scale(0.97); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes auroraB {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(25px,-20px) scale(1.06); }
          66%  { transform: translate(-15px,20px) scale(0.96); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes particleRise {
          0%   { opacity:0; transform:translateY(0) scale(0); }
          10%  { opacity:0.6; }
          90%  { opacity:0.1; }
          100% { opacity:0; transform:translateY(-100vh) scale(1.2); }
        }
      `}</style>

      {/* Orb 1 — sky blue, top-right */}
      <div style={{
        position:'absolute', top:'-12%', right:'-8%',
        width:'min(60vw,600px)', height:'min(60vw,600px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(56,189,248,0.8), transparent 65%)',
        filter:'blur(120px)', opacity: orbOpacity, willChange:'transform',
        animation:'auroraA 22s ease-in-out infinite alternate',
        transition:'opacity 0.5s ease',
      }}/>

      {/* Orb 2 — blue, bottom-left */}
      <div style={{
        position:'absolute', bottom:'-12%', left:'-8%',
        width:'min(55vw,550px)', height:'min(55vw,550px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(59,130,246,0.7), transparent 65%)',
        filter:'blur(120px)', opacity: orbOpacity * 0.85, willChange:'transform',
        animation:'auroraB 26s ease-in-out infinite alternate',
        animationDelay:'-8s',
        transition:'opacity 0.5s ease',
      }}/>

      {/* Particles — dark mode only */}
      {isDark && PARTICLES.map(p => (
        <div key={p.id} style={{
          position:'absolute', bottom:'-10px', left:p.left,
          width:p.size, height:p.size, borderRadius:'50%',
          background:p.color,
          animation:`particleRise ${p.duration} linear infinite`,
          animationDelay:p.delay,
        }}/>
      ))}
    </div>
  )
}
