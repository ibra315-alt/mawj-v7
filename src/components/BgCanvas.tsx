import React from 'react'

/* ══════════════════════════════════════════════════
   BG CANVAS v12 — Sky Blue Glassmorphism Orbs
   4 animated radial gradient divs (pure CSS)
   Colors/opacity driven by CSS custom properties
   set by applyAppearance() in appearance.ts
══════════════════════════════════════════════════ */

export default function BgCanvas() {
  return (
    <div aria-hidden="true" className="bg-orbs">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <div className="bg-orb bg-orb-4" />
    </div>
  )
}
