import React from 'react'

export default function BgCanvas() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(35px,-25px) scale(1.04); }
          66%  { transform: translate(-18px,18px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-40px,20px) scale(1.06); }
          66%  { transform: translate(22px,-35px) scale(0.96); }
        }
        @keyframes orbFloat3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%  { transform: translate(20px,28px) scale(1.03); }
        }
        @keyframes arcMorph1 {
          0%,100% { d: path("M-100,900 C200,600 500,800 800,500 C1100,200 1300,400 1600,100"); }
          50%     { d: path("M-100,800 C200,500 500,700 800,400 C1100,100 1300,300 1600,0"); }
        }
        @keyframes arcMorph2 {
          0%,100% { d: path("M-100,700 C150,500 400,650 700,400 C1000,150 1250,350 1600,200"); }
          50%     { d: path("M-100,800 C150,600 400,750 700,500 C1000,250 1250,450 1600,300"); }
        }
        @keyframes arcMorph3 {
          0%,100% { d: path("M1700,800 C1400,600 1100,750 800,500 C500,250 250,450 -100,300"); }
          50%     { d: path("M1700,700 C1400,500 1100,650 800,400 C500,150 250,350 -100,200"); }
        }
        @keyframes arcMorph4 {
          0%,100% { d: path("M300,-100 C200,200 500,300 600,600 C700,900 1000,750 1100,1000"); }
          50%     { d: path("M400,-100 C300,200 600,300 700,600 C800,900 1100,750 1200,1000"); }
        }
        @keyframes arcMorph5 {
          0%,100% { d: path("M900,-100 C800,300 1100,400 1000,700 C900,1000 600,850 500,1100"); }
          50%     { d: path("M800,-100 C700,300 1000,400 900,700 C800,1000 500,850 400,1100"); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.5; }
          50%     { opacity: 1; }
        }
      `}</style>

      {/* ── NOISE OVERLAY ─────────────────────────────── */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.03 }}>
        <filter id="mawj-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#mawj-noise)"/>
      </svg>

      {/* ── FLOATING ORBS ─────────────────────────────── */}
      <div style={{
        position:'absolute', top:'-150px', right:'-60px',
        width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 68%)',
        filter:'blur(64px)',
        animation:'orbFloat1 22s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:'-100px', left:'-60px',
        width:440, height:440, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 68%)',
        filter:'blur(64px)',
        animation:'orbFloat2 28s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', top:'40%', left:'20%',
        width:360, height:360, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 68%)',
        filter:'blur(56px)',
        animation:'orbFloat3 18s ease-in-out infinite',
      }}/>

      {/* ── FLOWING ARC CURVES ────────────────────────── */}
      <svg
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Arc 1 — teal, top-left to bottom-right diagonal */}
        <path
          fill="none"
          stroke="rgba(20,184,166,0.18)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ animation:'arcMorph1 20s ease-in-out infinite' }}
          d="M-100,900 C200,600 500,800 800,500 C1100,200 1300,400 1600,100"
        />
        {/* Arc 1 echo — offset, thinner */}
        <path
          fill="none"
          stroke="rgba(20,184,166,0.08)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ animation:'arcMorph1 20s ease-in-out infinite', animationDelay:'-4s' }}
          d="M-100,960 C200,660 500,860 800,560 C1100,260 1300,460 1600,160"
        />

        {/* Arc 2 — violet, crossing from left */}
        <path
          fill="none"
          stroke="rgba(99,102,241,0.15)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ animation:'arcMorph2 26s ease-in-out infinite' }}
          d="M-100,700 C150,500 400,650 700,400 C1000,150 1250,350 1600,200"
        />
        <path
          fill="none"
          stroke="rgba(99,102,241,0.07)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ animation:'arcMorph2 26s ease-in-out infinite', animationDelay:'-8s' }}
          d="M-100,760 C150,560 400,710 700,460 C1000,210 1250,410 1600,260"
        />

        {/* Arc 3 — blue, crossing from right */}
        <path
          fill="none"
          stroke="rgba(37,99,235,0.13)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ animation:'arcMorph3 24s ease-in-out infinite' }}
          d="M1700,800 C1400,600 1100,750 800,500 C500,250 250,450 -100,300"
        />
        <path
          fill="none"
          stroke="rgba(37,99,235,0.06)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ animation:'arcMorph3 24s ease-in-out infinite', animationDelay:'-6s' }}
          d="M1700,860 C1400,660 1100,810 800,560 C500,310 250,510 -100,360"
        />

        {/* Arc 4 — teal, top-to-bottom curve */}
        <path
          fill="none"
          stroke="rgba(20,184,166,0.10)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ animation:'arcMorph4 30s ease-in-out infinite' }}
          d="M300,-100 C200,200 500,300 600,600 C700,900 1000,750 1100,1000"
        />

        {/* Arc 5 — violet, top-to-bottom curve, offset */}
        <path
          fill="none"
          stroke="rgba(99,102,241,0.09)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ animation:'arcMorph5 34s ease-in-out infinite' }}
          d="M900,-100 C800,300 1100,400 1000,700 C900,1000 600,850 500,1100"
        />

        {/* Glow dot — teal accent where arcs intersect */}
        <circle
          cx="800" cy="500" r="3"
          fill="rgba(20,184,166,0.6)"
          style={{ animation:'glowPulse 4s ease-in-out infinite' }}
        />
        <circle
          cx="800" cy="500" r="12"
          fill="rgba(20,184,166,0.08)"
          style={{ animation:'glowPulse 4s ease-in-out infinite', animationDelay:'-1s' }}
        />
      </svg>
    </div>
  )
}
