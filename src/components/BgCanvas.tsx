import React, { useEffect, useRef, useState } from 'react'

/* ══════════════════════════════════════════════════
   BG CANVAS v13 — WebGL Metaball Shader + CSS Fallback
   Desktop: fullscreen <canvas> running a GLSL metaball shader
   at 0.25x resolution for organic merging blobs.
   Mobile / no-WebGL: falls back to the 4 CSS <div> orbs.
   Theme-aware via MutationObserver on data-theme attribute.
   Respects --orbs-visible CSS variable.
══════════════════════════════════════════════════ */

// ── GLSL Shaders ──
const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
uniform float u_time;
uniform vec2  u_res;
uniform vec3  u_c0, u_c1, u_c2, u_c3;
uniform float u_o0, u_o1, u_o2, u_o3;

float metaball(vec2 p, vec2 center, float radius) {
  float d = dot(p - center, p - center);
  return (radius * radius) / (d + 0.0001);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = u_time * 0.12;

  // 4 metaball centers drifting on sine/cosine paths
  vec2 c0 = vec2(
    0.68 * aspect + sin(t * 1.1) * 0.18 * aspect,
    0.72 + cos(t * 0.9) * 0.14
  );
  vec2 c1 = vec2(
    0.25 * aspect + cos(t * 0.8) * 0.15 * aspect,
    0.22 + sin(t * 1.2) * 0.16
  );
  vec2 c2 = vec2(
    0.52 * aspect + sin(t * 0.7 + 1.5) * 0.12 * aspect,
    0.55 + cos(t * 1.0 + 0.8) * 0.18
  );
  vec2 c3 = vec2(
    0.18 * aspect + cos(t * 0.6 + 2.8) * 0.10 * aspect,
    0.82 + sin(t * 0.85 + 1.2) * 0.12
  );

  // Metaball field — 1/dist² summing with varying radii
  float f0 = metaball(p, c0, 0.32);
  float f1 = metaball(p, c1, 0.28);
  float f2 = metaball(p, c2, 0.24);
  float f3 = metaball(p, c3, 0.22);

  // Individual blob colors weighted by their field
  vec3 col = u_c0 * f0 * u_o0
           + u_c1 * f1 * u_o1
           + u_c2 * f2 * u_o2
           + u_c3 * f3 * u_o3;

  float total = f0 * u_o0 + f1 * u_o1 + f2 * u_o2 + f3 * u_o3;

  // Soft threshold — smooth falloff
  float alpha = smoothstep(0.3, 1.8, total) * 0.65;

  // Normalize color if total > 0
  col = total > 0.001 ? col / total : vec3(0.0);

  gl_FragColor = vec4(col, alpha);
}
`

// ── Helpers ──
function parseColor(css: string): [number, number, number] {
  const el = document.createElement('div')
  el.style.color = css
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  document.body.removeChild(el)
  const m = computed.match(/(\d+)/g)
  if (!m) return [0.2, 0.55, 0.9]
  return [parseInt(m[0]) / 255, parseInt(m[1]) / 255, parseInt(m[2]) / 255]
}

function readOrbColors(): { colors: [number, number, number][]; opacities: number[] } {
  const root = getComputedStyle(document.documentElement)
  const get = (prop: string, fallback: string) => root.getPropertyValue(prop).trim() || fallback

  const colors: [number, number, number][] = [
    parseColor(get('--orb-1-color', '#318CE7')),
    parseColor(get('--orb-2-color', '#0095C7')),
    parseColor(get('--orb-3-color', '#64B4E6')),
    parseColor(get('--orb-4-color', '#3C5AB4')),
  ]
  const opacities = [
    parseFloat(get('--orb-1-opacity', '0.28')),
    parseFloat(get('--orb-2-opacity', '0.22')),
    parseFloat(get('--orb-3-opacity', '0.18')),
    parseFloat(get('--orb-4-opacity', '0.16')),
  ]
  return { colors, opacities }
}

function isOrbsVisible(): boolean {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--orbs-visible').trim()
  return v !== '0'
}

// ── WebGL Metaball Canvas ──
function MetaballCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false })
    if (!gl) return

    // Compile shader
    function compileShader(type: number, src: string): WebGLShader | null {
      const s = gl!.createShader(type)
      if (!s) return null
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.warn('Shader compile error:', gl!.getShaderInfoLog(s))
        gl!.deleteShader(s)
        return null
      }
      return s
    }

    const vs = compileShader(gl.VERTEX_SHADER, VERT)
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(prog))
      return
    }

    gl.useProgram(prog)

    // Fullscreen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes  = gl.getUniformLocation(prog, 'u_res')
    const uC    = [0,1,2,3].map(i => gl.getUniformLocation(prog, `u_c${i}`))
    const uO    = [0,1,2,3].map(i => gl.getUniformLocation(prog, `u_o${i}`))

    // Read CSS colors
    let { colors, opacities } = readOrbColors()

    function uploadColors() {
      for (let i = 0; i < 4; i++) {
        gl!.uniform3f(uC[i], colors[i][0], colors[i][1], colors[i][2])
        gl!.uniform1f(uO[i], opacities[i])
      }
    }
    uploadColors()

    // Theme change listener
    const observer = new MutationObserver(() => {
      // Defer one frame so CSS vars update first
      requestAnimationFrame(() => {
        const updated = readOrbColors()
        colors = updated.colors
        opacities = updated.opacities
        gl!.useProgram(prog)
        uploadColors()
      })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // Also listen for custom appearance changes
    const onAppearance = () => {
      requestAnimationFrame(() => {
        const updated = readOrbColors()
        colors = updated.colors
        opacities = updated.opacities
        gl!.useProgram(prog)
        uploadColors()
      })
    }
    window.addEventListener('mawj-appearance-changed', onAppearance)

    // Resize handler — render at 0.25x
    const SCALE = 0.25
    function resize() {
      const w = Math.floor(window.innerWidth * SCALE)
      const h = Math.floor(window.innerHeight * SCALE)
      canvas!.width = w
      canvas!.height = h
      gl!.viewport(0, 0, w, h)
      gl!.uniform2f(uRes, w, h)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Render loop
    let active = true
    let startTime = performance.now()

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    function tick() {
      if (!active) return
      if (!isOrbsVisible()) {
        requestAnimationFrame(tick)
        return
      }
      const t = (performance.now() - startTime) / 1000
      gl!.uniform1f(uTime, t)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('mawj-appearance-changed', onAppearance)
      gl!.deleteProgram(prog)
      gl!.deleteShader(vs)
      gl!.deleteShader(fs)
      gl!.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

// ── CSS Orb Fallback (mobile / no WebGL) ──
function CSSOrbs() {
  return (
    <>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <div className="bg-orb bg-orb-4" />
    </>
  )
}

// ── Main Component ──
export default function BgCanvas() {
  const [useWebGL, setUseWebGL] = useState(false)

  useEffect(() => {
    // Mobile check — no WebGL on narrow screens
    if (window.matchMedia('(max-width: 768px)').matches) return

    // WebGL availability check
    const testCanvas = document.createElement('canvas')
    const ctx = testCanvas.getContext('webgl')
    if (ctx) setUseWebGL(true)
  }, [])

  return (
    <div aria-hidden="true" className="bg-orbs">
      {useWebGL ? <MetaballCanvas /> : <CSSOrbs />}
    </div>
  )
}
