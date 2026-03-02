import { useEffect } from 'react'

/* ══════════════════════════════════════════════════
   LIQUID GLASS PROVIDER — Dynamic Specular Highlights
   Sets --lg-light-x and --lg-light-y CSS custom properties
   on <html> based on cursor position. All glass surfaces
   consume these via CSS for free — no per-element JS.

   Mobile: no mousemove → defaults stay at 50/50 = identical
   to the previous static appearance. Zero perf cost.

   Throttled: only updates CSS vars when values change by >0.5
   to avoid unnecessary style recalculations.
══════════════════════════════════════════════════ */

export default function LiquidGlassProvider() {
  useEffect(() => {
    // Skip on touch-only devices
    if (window.matchMedia('(hover: none)').matches) return

    const root = document.documentElement
    let tx = 50, ty = 50  // target (raw from mouse)
    let cx = 50, cy = 50  // current (lerped)
    let lastX = 50, lastY = 50  // last written to CSS
    let active = true
    let raf: number
    let hasMoved = false

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) * 100
      ty = (e.clientY / window.innerHeight) * 100
      hasMoved = true
    }

    const tick = () => {
      if (!active) return

      if (hasMoved) {
        // Lerp toward target
        cx += (tx - cx) * 0.08
        cy += (ty - cy) * 0.08

        // Only write to CSS if changed enough (avoids constant style recalc)
        const dx = Math.abs(cx - lastX)
        const dy = Math.abs(cy - lastY)
        if (dx > 0.5 || dy > 0.5) {
          const rx = Math.round(cx)
          const ry = Math.round(cy)
          root.style.setProperty('--lg-light-x', String(rx))
          root.style.setProperty('--lg-light-y', String(ry))
          lastX = cx
          lastY = cy
        }

        // Stop ticking once converged
        if (dx < 0.1 && dy < 0.1) hasMoved = false
      }

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      active = false
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
      root.style.removeProperty('--lg-light-x')
      root.style.removeProperty('--lg-light-y')
    }
  }, [])

  return null
}
