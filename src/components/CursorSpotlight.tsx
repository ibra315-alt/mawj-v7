import React, { useEffect, useRef } from 'react'

export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let x = -500, y = -500
    let tx = -500, ty = -500
    let raf: number
    let active = true

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }

    const tick = () => {
      if (!active) return
      x += (tx - x) * 0.1
      y += (ty - y) * 0.1
      el.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      active = false
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
        background: 'radial-gradient(circle, rgba(var(--action-rgb),0.055) 0%, rgba(var(--action-rgb),0.015) 50%, transparent 70%)',
      }}
    />
  )
}
