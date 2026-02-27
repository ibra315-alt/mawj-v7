import React, { useEffect, useRef } from 'react'

export default function CursorSpotlight() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let x = -500, y = -500
    let tx = -500, ty = -500
    let raf

    const onMove = (e) => { tx = e.clientX; ty = e.clientY }

    const tick = () => {
      x += (tx - x) * 0.1
      y += (ty - y) * 0.1
      // transform only — never triggers layout or paint, pure compositor layer
      el.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 400,
        height: 400,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9998,
        willChange: 'transform',
        background: 'radial-gradient(circle, rgba(56,189,248,0.055) 0%, rgba(56,189,248,0.015) 50%, transparent 70%)',
      }}
    />
  )
}
