import React from 'react'

/* ══════════════════════════════════════════════════
   BG CANVAS v3 — CRYSTAL LUXURY
   Soft ambient orbs + subtle noise texture
   Teal · Indigo · Gold — floating slowly
   Particles replaced with cleaner glow approach
══════════════════════════════════════════════════ */

export default function BgCanvas() {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <style>{`
        @keyframes crystalA {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-35px,25px) scale(1.04); }
          66%  { transform: translate(20px,-18px) scale(0.97); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes crystalB {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(30px,-22px) scale(1.06); }
          66%  { transform: translate(-18px,28px) scale(0.96); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes crystalC {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.06; }
          50%     { transform: translate(15px,-25px) scale(1.08); opacity:0.10; }
        }
      `}</style>

      {/* Noise texture — very subtle */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.02 }}>
        <filter id="mawj-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#mawj-noise)"/>
      </svg>

      {/* Orb 1 — Teal, top-right */}
      <div style={{
        position:'absolute', top:'-12%', right:'-8%',
        width:'min(65vw,650px)', height:'min(65vw,650px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(0,228,184,0.9), transparent 65%)',
        filter:'blur(140px)', opacity:0.10, willChange:'transform',
        animation:'crystalA 20s ease-in-out infinite alternate',
      }}/>

      {/* Orb 2 — Indigo, bottom-left */}
      <div style={{
        position:'absolute', bottom:'-12%', left:'-8%',
        width:'min(55vw,550px)', height:'min(55vw,550px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.8), transparent 65%)',
        filter:'blur(140px)', opacity:0.08, willChange:'transform',
        animation:'crystalB 24s ease-in-out infinite alternate',
        animationDelay:'-8s',
      }}/>

      {/* Orb 3 — Gold, center-ish */}
      <div style={{
        position:'absolute', top:'38%', left:'30%',
        width:'min(35vw,350px)', height:'min(35vw,350px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(201,169,110,0.6), transparent 65%)',
        filter:'blur(120px)', opacity:0.06, willChange:'transform',
        animation:'crystalC 28s ease-in-out infinite alternate',
        animationDelay:'-14s',
      }}/>
    </div>
  )
}
