import React from 'react'

// Mawj logo — traced from the uploaded brand asset
// Animated version with draw-on effect
export default function MawjLogo({ size = 48, animated = false, color = 'var(--teal)' }) {
  const style = animated ? {
    strokeDasharray: 1000,
    strokeDashoffset: 1000,
    animation: 'drawLogo 1.8s ease forwards',
  } : {}

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {animated && (
        <style>{`
          @keyframes drawLogo {
            to { stroke-dashoffset: 0; }
          }
          @keyframes fillLogo {
            0%   { fill-opacity: 0; }
            60%  { fill-opacity: 0; }
            100% { fill-opacity: 1; }
          }
        `}</style>
      )}
      {/* Outer glow */}
      {animated && (
        <circle cx="100" cy="100" r="95" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15" />
      )}
      {/*
        SVG path traced from the موج calligraphic logo.
        The letterform has:
        - A large ع-like form on the right
        - Central و loop
        - Left ج/م descender with a circular dot
        We approximate this with clean bezier paths.
      */}
      <g style={animated ? { animation: 'fillLogo 2s ease forwards' } : {}}>
        {/* Main موج wordmark — stylized paths */}
        {/* م - right portion, top arc */}
        <path
          d="M155 55 C155 40, 140 32, 125 35 C110 38, 100 50, 100 65 C100 75, 107 82, 118 82 C130 82, 140 74, 140 63 C140 54, 133 48, 124 48 C116 48, 110 54, 110 62"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={style}
        />
        {/* و - central vertical loop */}
        <path
          d="M100 65 C100 50, 88 38, 74 38 C60 38, 50 50, 50 65 C50 80, 60 90, 74 90 C85 90, 94 83, 97 73"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={style}
        />
        {/* ج - left descender going down */}
        <path
          d="M74 90 C74 105, 70 118, 62 128 C54 138, 44 142, 38 145"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={style}
        />
        {/* ج - bottom curve hooking right */}
        <path
          d="M38 145 C28 148, 22 155, 26 163 C30 171, 44 172, 58 165 C72 158, 80 145, 78 133"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={style}
        />
        {/* Dot under ج */}
        <circle
          cx="38"
          cy="158"
          r="7"
          fill={color}
          style={animated ? { animation: 'fillLogo 2.2s ease forwards' } : {}}
        />
        {/* م - right side descender */}
        <path
          d="M155 55 C162 55, 170 60, 172 70 C174 80, 168 90, 158 95 C148 100, 136 98, 130 90"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={style}
        />
        {/* Connecting stroke م to و */}
        <path
          d="M118 82 C112 88, 106 88, 100 85"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={style}
        />
      </g>
    </svg>
  )
}

// Inline SVG string version for use in Login background etc.
export function MawjLogoImg({ size = 48, color = '#00e4b8' }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="موج"
      style={{ objectFit: 'contain' }}
    />
  )
}
