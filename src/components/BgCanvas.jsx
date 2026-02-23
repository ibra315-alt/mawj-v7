/* ══════════════════════════════════════════════════════════════
   BgCanvas — Premium Floating Orbs + Full-Coverage SVG Waves
   موج brand identity: waves flow throughout entire background
══════════════════════════════════════════════════════════════ */
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
      {/* ── NOISE TEXTURE ─────────────────────────────── */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.025 }}>
        <filter id="bg-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise)" opacity="1"/>
      </svg>

      {/* ── FLOATING ORBS ─────────────────────────────── */}
      <div style={{
        position:'absolute', top:'-180px', right:'-80px',
        width:560, height:560, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(20,184,166,0.16) 0%, transparent 70%)',
        filter:'blur(70px)',
        animation:'orbDrift1 22s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:'-120px', left:'-80px',
        width:480, height:480, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)',
        filter:'blur(70px)',
        animation:'orbDrift2 28s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', top:'38%', left:'25%',
        width:380, height:380, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 70%)',
        filter:'blur(60px)',
        animation:'orbDrift3 18s ease-in-out infinite',
      }}/>

      {/* ── SVG WAVES — full coverage ─────────────────── */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wave 1 — teal, slow, top area */}
        <path
          d="M-200,180 C100,120 300,240 500,180 C700,120 900,240 1100,180 C1300,120 1500,240 1700,180"
          fill="none" stroke="rgba(20,184,166,0.12)" strokeWidth="1.5"
          style={{ animation:'wavePath1 20s ease-in-out infinite' }}
        />
        {/* Wave 2 — teal lighter, offset */}
        <path
          d="M-200,220 C150,160 350,280 550,220 C750,160 950,280 1150,220 C1350,160 1550,280 1700,220"
          fill="none" stroke="rgba(20,184,166,0.07)" strokeWidth="1"
          style={{ animation:'wavePath1 26s ease-in-out infinite reverse' }}
        />

        {/* Wave 3 — violet, mid screen */}
        <path
          d="M-200,400 C120,340 320,460 520,400 C720,340 920,460 1120,400 C1320,340 1520,460 1700,400"
          fill="none" stroke="rgba(99,102,241,0.11)" strokeWidth="1.5"
          style={{ animation:'wavePath2 24s ease-in-out infinite' }}
        />
        <path
          d="M-200,440 C180,380 380,500 580,440 C780,380 980,500 1180,440 C1380,380 1580,500 1700,440"
          fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth="1"
          style={{ animation:'wavePath2 30s ease-in-out infinite reverse' }}
        />

        {/* Wave 5 — blue, lower mid */}
        <path
          d="M-200,600 C140,540 340,660 540,600 C740,540 940,660 1140,600 C1340,540 1540,660 1700,600"
          fill="none" stroke="rgba(37,99,235,0.10)" strokeWidth="1.5"
          style={{ animation:'wavePath3 22s ease-in-out infinite' }}
        />
        <path
          d="M-200,640 C160,580 360,700 560,640 C760,580 960,700 1160,640 C1360,580 1560,700 1700,640"
          fill="none" stroke="rgba(37,99,235,0.05)" strokeWidth="1"
          style={{ animation:'wavePath3 18s ease-in-out infinite reverse' }}
        />

        {/* Wave 7 — teal, bottom */}
        <path
          d="M-200,780 C100,720 300,840 500,780 C700,720 900,840 1100,780 C1300,720 1500,840 1700,780"
          fill="none" stroke="rgba(20,184,166,0.09)" strokeWidth="1.5"
          style={{ animation:'wavePath1 16s ease-in-out infinite' }}
        />

        {/* Diagonal accent wave — crosses full screen */}
        <path
          d="M-100,900 C200,700 400,800 600,600 C800,400 1000,500 1200,300 C1400,100 1500,200 1700,0"
          fill="none" stroke="rgba(20,184,166,0.06)" strokeWidth="1"
          style={{ animation:'waveDiag 35s ease-in-out infinite' }}
        />
      </svg>

      <style>{`
        @keyframes orbDrift1 {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(40px,-30px) scale(1.05); }
          66%  { transform: translate(-20px,20px) scale(0.97); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes orbDrift2 {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-50px,25px) scale(1.08); }
          66%  { transform: translate(30px,-40px) scale(0.95); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes orbDrift3 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(25px,35px) scale(1.04); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes wavePath1 {
          0%,100% { d: path("M-200,180 C100,120 300,240 500,180 C700,120 900,240 1100,180 C1300,120 1500,240 1700,180"); }
          50%     { d: path("M-200,200 C100,260 300,140 500,200 C700,260 900,140 1100,200 C1300,260 1500,140 1700,200"); }
        }
        @keyframes wavePath2 {
          0%,100% { d: path("M-200,400 C120,340 320,460 520,400 C720,340 920,460 1120,400 C1320,340 1520,460 1700,400"); }
          50%     { d: path("M-200,420 C120,480 320,360 520,420 C720,480 920,360 1120,420 C1320,480 1520,360 1700,420"); }
        }
        @keyframes wavePath3 {
          0%,100% { d: path("M-200,600 C140,540 340,660 540,600 C740,540 940,660 1140,600 C1340,540 1540,660 1700,600"); }
          50%     { d: path("M-200,620 C140,680 340,560 540,620 C740,680 940,560 1140,620 C1340,680 1540,560 1700,620"); }
        }
        @keyframes waveDiag {
          0%,100% { opacity: 0.8; transform: translateY(0); }
          50%     { opacity: 0.4; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
