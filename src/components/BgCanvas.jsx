import React from 'react'

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${(i * 4.1 + 2) % 100}%`,
  delay: `${(i * 0.4) % 7}s`,
  duration: `${6 + (i % 5)}s`,
  size: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 4,
  color: i % 2 === 0 ? 'rgba(20,184,166,0.7)' : 'rgba(99,102,241,0.6)',
}))

export default function BgCanvas() {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <style>{`
        @keyframes auroraA {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-40px,30px) scale(1.06); }
          66%  { transform: translate(25px,-20px) scale(0.96); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes auroraB {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(35px,-25px) scale(1.08); }
          66%  { transform: translate(-20px,30px) scale(0.95); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes auroraC {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.12; }
          50%     { transform: translate(20px,-30px) scale(1.1); opacity:0.18; }
        }
        @keyframes particleRise {
          0%   { opacity:0; transform:translateY(0) scale(0); }
          10%  { opacity:0.8; }
          90%  { opacity:0.2; }
          100% { opacity:0; transform:translateY(-100vh) scale(1.3); }
        }
      `}</style>

      {/* Noise */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.025 }}>
        <filter id="mawj-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#mawj-noise)"/>
      </svg>

      {/* Orb 1 — teal, top-right */}
      <div style={{
        position:'absolute', top:'-15%', right:'-10%',
        width:'min(70vw,700px)', height:'min(70vw,700px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(20,184,166,1), transparent 65%)',
        filter:'blur(130px)', opacity:0.16, willChange:'transform',
        animation:'auroraA 18s ease-in-out infinite alternate',
      }}/>

      {/* Orb 2 — violet, bottom-left */}
      <div style={{
        position:'absolute', bottom:'-15%', left:'-10%',
        width:'min(65vw,650px)', height:'min(65vw,650px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,1), transparent 65%)',
        filter:'blur(130px)', opacity:0.14, willChange:'transform',
        animation:'auroraB 22s ease-in-out infinite alternate',
        animationDelay:'-8s',
      }}/>

      {/* Orb 3 — merge center */}
      <div style={{
        position:'absolute', top:'35%', left:'35%',
        width:'min(40vw,400px)', height:'min(40vw,400px)', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.5), transparent 65%)',
        filter:'blur(110px)', opacity:0.12, willChange:'transform',
        animation:'auroraC 28s ease-in-out infinite alternate',
        animationDelay:'-14s',
      }}/>

      {/* Floating particles */}
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
