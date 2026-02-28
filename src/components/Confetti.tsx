import React, { useEffect, useRef } from 'react'

const COLORS = ['#318CE7', 'var(--info)', 'var(--warning)', 'var(--success)', '#0095C7', 'var(--danger)', '#ffffff']
const COUNT  = 120

interface ConfettiPiece {
  x: number; y: number; r: number; color: string
  vx: number; vy: number; spin: number; angle: number
  shape: 'rect' | 'circle'; w: number; h: number; life: number
}

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pieces    = useRef<ConfettiPiece[]>([])
  const raf       = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    pieces.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 80,
      r: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI * 2,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      w: 6 + Math.random() * 8,
      h: 3 + Math.random() * 5,
      life: 1,
    }))

    let frame = 0
    function draw() {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      pieces.current.forEach(p => {
        p.x  += p.vx
        p.y  += p.vy
        p.vy += 0.08
        p.angle += p.spin
        p.life = Math.max(0, 1 - (p.y / (canvas.height * 1.2)))
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.r, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
        if (p.y < canvas.height + 40) alive = true
      })
      if (alive && frame < 300) raf.current = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}
    />
  )
}
