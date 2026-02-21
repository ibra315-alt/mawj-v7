import React, { useEffect, useRef } from 'react'

export default function CursorSpotlight() {
  const spotRef = useRef(null)

  useEffect(() => {
    const el = spotRef.current
    if (!el) return

    let x = 0, y = 0, tx = 0, ty = 0
    let raf

    function onMove(e) {
      tx = e.clientX
      ty = e.clientY
    }

    function animate() {
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      if (el) {
        el.style.left = x + 'px'
        el.style.top  = y + 'px'
      }
      raf = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(animate)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={spotRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        width: 400,
        height: 400,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(0,228,184,0.06) 0%, rgba(0,228,184,0.02) 40%, transparent 70%)',
        transition: 'opacity 0.3s ease',
      }}
    />
  )
}
