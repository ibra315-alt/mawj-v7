import { useEffect } from 'react'

/* ══════════════════════════════════════════════════
   LIQUID GLASS PROVIDER — Dynamic Specular Highlights
   Sets --lg-light-x and --lg-light-y CSS custom properties
   on <html> based on cursor position. All glass surfaces
   consume these via CSS for free — no per-element JS.

   Mobile: no mousemove → defaults stay at 50/50 = identical
   to the previous static appearance. Zero perf cost.
══════════════════════════════════════════════════ */

export default function LiquidGlassProvider() {
  useEffect(() => {
    // Skip on touch-only devices
    if (window.matchMedia('(hover: none)').matches) return

    const root = document.documentElement
    let tx = 50, ty = 50  // target (raw from mouse)
    let cx = 50, cy = 50  // current (lerped)
    let active = true
    let raf: number

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) * 100
      ty = (e.clientY / window.innerHeight) * 100
    }

    const tick = () => {
      if (!active) return

      // Lerp toward target — smooth 60fps without layout thrash
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08

      // Only update if moved enough (avoid subpixel noise)
      root.style.setProperty('--lg-light-x', cx.toFixed(1))
      root.style.setProperty('--lg-light-y', cy.toFixed(1))

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      active = false
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
      // Reset to center defaults
      root.style.removeProperty('--lg-light-x')
      root.style.removeProperty('--lg-light-y')
    }
  }, [])

  return null
}
