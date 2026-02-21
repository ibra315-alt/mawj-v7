import React from 'react'

// Mini sparkline chart — last N data points
export default function Sparkline({ data = [], color = '#00e4b8', width = 80, height = 32 }) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  const pathD = `M ${pts.join(' L ')}`

  // Fill path (close to bottom)
  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`

  const lastUp = data[data.length - 1] >= data[data.length - 2]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill */}
      <path d={fillD} fill={`url(#spark-fill-${color.replace('#','')})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last dot */}
      <circle
        cx={width}
        cy={parseFloat(pts[pts.length-1].split(',')[1])}
        r="3"
        fill={color}
        style={{ filter:`drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}
