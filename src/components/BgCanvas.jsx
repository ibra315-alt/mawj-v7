import React from 'react'

/* ══════════════════════════════════════════════════
   BG CANVAS — Liquid Glass ambient background
   Soft color orbs + gentle floating particles
══════════════════════════════════════════════════ */

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${(i * 12.5 + 5) % 100}%`,
  delay: `${(i * 0.9) % 8}s`,
  duration: `${10 + (i % 4)}s`,
  size: i % 2 === 0 ? 2 : 3,
  color: i % 2 === 0 ? 'rgba(var(--action-rgb),0.25)' : 'rgba(var(--info-rgb),0.20)',
}))

export default function BgCanvas() {
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
          10%  { opacity:0.4; }
          90%  { opacity:0.05; }
          100% { opacity:0; transform:translateY(-100vh) scale(1.2); }
        }
      `}</style>

      {/* Orb 1 — blue, top-right */}
      <div style={{
        position:'absolute', top:'-12%', right:'-8%',
        width:'min(60vw,600px)', height:'min(60vw,600px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(var(--action-rgb),0.8), transparent 65%)',
        filter:'blur(120px)', opacity: 0.06, willChange:'transform',
        animation:'auroraA 22s ease-in-out infinite alternate',
      }}/>

      {/* Orb 2 — purple, bottom-left */}
      <div style={{
        position:'absolute', bottom:'-12%', left:'-8%',
        width:'min(55vw,550px)', height:'min(55vw,550px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(var(--info-rgb),0.7), transparent 65%)',
        filter:'blur(120px)', opacity: 0.05, willChange:'transform',
        animation:'auroraB 26s ease-in-out infinite alternate',
        animationDelay:'-8s',
      }}/>

      {/* Gentle particles */}
      {PARTICLES.map(p => (
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
