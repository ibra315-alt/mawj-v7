import { Settings } from './db'

/* ══════════════════════════════════════════════════
   APPEARANCE — Single source of truth
   Saves to Supabase. Loaded on every mount.
   Used by App.jsx (load) and Settings.jsx (save+apply)
══════════════════════════════════════════════════ */

export const THEMES = [
  { id:'mawj',     name:'مَوج',       emoji:'🌊', desc:'النيلي العميق',
    vars:{ '--bg':'#050c1a','--bg-alt':'#070f22','--violet':'#2563eb','--violet-light':'#60a5fa','--teal':'#00e4b8','--pink':'#ec4899' } },
  { id:'galaxy',   name:'مجرة',       emoji:'🌌', desc:'البنفسجي الكوني',
    vars:{ '--bg':'#0a0618','--bg-alt':'#0d0820','--violet':'#7c3aed','--violet-light':'#a78bfa','--teal':'#c084fc','--pink':'#f472b6' } },
  { id:'obsidian', name:'أوبسيديان',  emoji:'🖤', desc:'الأسود والذهب',
    vars:{ '--bg':'#0a0a0a','--bg-alt':'#111111','--violet':'#525252','--violet-light':'#a3a3a3','--teal':'#e6b94a','--pink':'#f5f5f5' } },
  { id:'emerald',  name:'زمرد',       emoji:'🌿', desc:'الغابة الداكنة',
    vars:{ '--bg':'#051510','--bg-alt':'#071a13','--violet':'#065f46','--violet-light':'#34d399','--teal':'#10b981','--pink':'#86efac' } },
  { id:'ember',    name:'جمر',        emoji:'🔥', desc:'الدفء والطاقة',
    vars:{ '--bg':'#0f0a08','--bg-alt':'#150d09','--violet':'#9a3412','--violet-light':'#fb923c','--teal':'#f97316','--pink':'#fbbf24' } },
  { id:'sakura',   name:'سكورا',      emoji:'🌸', desc:'الوردي الأنيق',
    vars:{ '--bg':'#0f080e','--bg-alt':'#140a12','--violet':'#9d174d','--violet-light':'#f9a8d4','--teal':'#ec4899','--pink':'#fda4af' } },
  { id:'arctic',   name:'قطبي',       emoji:'🧊', desc:'النظيف المتجمد',
    vars:{ '--bg':'#050d14','--bg-alt':'#07111b','--violet':'#164e63','--violet-light':'#67e8f9','--teal':'#22d3ee','--pink':'#a5f3fc' } },
  { id:'golden',   name:'ذهبي',       emoji:'✨', desc:'الفخامة الملكية',
    vars:{ '--bg':'#080600','--bg-alt':'#0f0c00','--violet':'#78350f','--violet-light':'#fbbf24','--teal':'#f59e0b','--pink':'#fde68a' } },
]

export const DEFAULT_PREFS = {
  theme:      'mawj',
  mode:       'dark',
  accent:     '#00e4b8',
  font:       "'Noto Kufi Arabic', sans-serif",
  fontSize:   'medium',
  radius:     'rounded',
  density:    'normal',
  animations: true,
  noise:      true,
  spotlight:  true,
}

/* ── helpers ── */
function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : null
}

function setVar(k, v) {
  if (v) document.documentElement.style.setProperty(k, v)
}

function removeVars(list) {
  list.forEach(v => document.documentElement.style.removeProperty(v))
}

const ALL_THEME_VARS = [
  '--bg','--bg-alt','--bg-card','--bg-glass','--bg-glass-hover','--bg-hover',
  '--bg-border','--bg-surface','--sidebar-bg','--header-bg','--modal-bg',
  '--violet','--violet-light','--violet-bright','--violet-glow','--violet-soft','--violet-faint',
  '--teal','--teal-deep','--teal-glow','--teal-soft','--teal-faint',
  '--pink','--pink-glow','--pink-soft',
  '--input-bg','--input-border','--input-focus',
  '--glass-border','--glass-border-strong','--glass-border-teal',
  '--shadow-card','--shadow-float','--shadow-violet','--shadow-teal',
]

/* ── Apply color theme vars to :root ── */
export function applyThemeVars(themeId) {
  const t = THEMES.find(t => t.id === themeId)
  if (!t) return

  const bg = t.vars['--bg'], violet = t.vars['--violet']
  const vLight = t.vars['--violet-light'], teal = t.vars['--teal']
  const pink = t.vars['--pink'] || vLight

  const bgRgb = hexRgb(bg), vRgb = hexRgb(violet)
  const tRgb  = hexRgb(teal), pRgb = hexRgb(pink)

  const vars = {
    '--bg': bg, '--bg-alt': t.vars['--bg-alt'] || bg,
    '--violet': violet, '--violet-light': vLight, '--violet-bright': vLight,
    '--violet-glow':  vRgb ? `rgba(${vRgb},0.28)` : '',
    '--violet-soft':  vRgb ? `rgba(${vRgb},0.14)` : '',
    '--violet-faint': vRgb ? `rgba(${vRgb},0.06)` : '',
    '--teal': teal, '--teal-deep': teal,
    '--teal-glow':  tRgb ? `rgba(${tRgb},0.22)` : '',
    '--teal-soft':  tRgb ? `rgba(${tRgb},0.10)` : '',
    '--teal-faint': tRgb ? `rgba(${tRgb},0.05)` : '',
    '--pink': pink,
    '--pink-glow': pRgb ? `rgba(${pRgb},0.22)` : '',
    '--pink-soft': pRgb ? `rgba(${pRgb},0.10)` : '',
    '--bg-card':        bgRgb ? `rgba(${bgRgb},0.88)` : '',
    '--bg-glass':       vRgb  ? `rgba(${vRgb},0.07)`  : '',
    '--bg-glass-hover': vRgb  ? `rgba(${vRgb},0.14)`  : '',
    '--bg-hover':       vRgb  ? `rgba(${vRgb},0.08)`  : '',
    '--bg-border':      vRgb  ? `rgba(${vRgb},0.16)`  : '',
    '--bg-surface':     vRgb  ? `rgba(${vRgb},0.05)`  : '',
    '--sidebar-bg': bgRgb ? `rgba(${bgRgb},0.97)` : '',
    '--header-bg':  bgRgb ? `rgba(${bgRgb},0.93)` : '',
    '--modal-bg':   bgRgb ? `rgba(${bgRgb},0.99)` : '',
    '--input-bg':     vRgb ? `rgba(${vRgb},0.08)` : '',
    '--input-border': vRgb ? `rgba(${vRgb},0.18)` : '',
    '--input-focus':  vRgb ? `rgba(${vRgb},0.35)` : '',
    '--glass-border':         vRgb ? `rgba(${vRgb},0.18)` : '',
    '--glass-border-strong':  vRgb ? `rgba(${vRgb},0.30)` : '',
    '--glass-border-teal':    tRgb ? `rgba(${tRgb},0.22)` : '',
    '--shadow-card':  bgRgb&&vRgb ? `0 4px 32px rgba(${bgRgb},0.6),0 1px 0 rgba(${vRgb},0.08) inset` : '',
    '--shadow-float': bgRgb&&vRgb ? `0 24px 64px rgba(${bgRgb},0.75),0 0 0 1px rgba(${vRgb},0.10)` : '',
    '--shadow-violet': vRgb ? `0 8px 32px rgba(${vRgb},0.35)` : '',
    '--shadow-teal':   tRgb ? `0 8px 32px rgba(${tRgb},0.28)` : '',
  }

  Object.entries(vars).forEach(([k, v]) => setVar(k, v))
}

/* ── Apply full prefs object to DOM ── */
export function applyAppearance(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs }

  // Mode (dark/light)
  document.documentElement.setAttribute('data-theme', p.mode)

  if (p.mode === 'light') {
    // Clear all inline overrides — let [data-theme="light"] CSS take over
    removeVars(ALL_THEME_VARS)
  } else {
    // Apply color theme
    applyThemeVars(p.theme)
    // Override teal with custom accent if set and different from theme default
    const themeDefault = THEMES.find(t => t.id === p.theme)?.vars['--teal']
    if (p.accent && p.accent !== themeDefault) {
      const rgb = hexRgb(p.accent)
      if (rgb) {
        setVar('--teal', p.accent)
        setVar('--teal-glow', `rgba(${rgb},0.22)`)
        setVar('--teal-soft', `rgba(${rgb},0.10)`)
        setVar('--teal-faint', `rgba(${rgb},0.05)`)
      }
    }
  }

  // Font
  if (p.font) {
    const s = document.getElementById('mawj-font-style') || document.createElement('style')
    s.id = 'mawj-font-style'
    s.textContent = `*, input, button, select, textarea { font-family: ${p.font} !important; }`
    document.head.appendChild(s)
  }

  // Font size
  const fsMap = { small: 13, medium: 14, large: 16 }
  document.documentElement.style.fontSize = (fsMap[p.fontSize] || 14) + 'px'

  // Border radius
  const radMap = { sharp: '6px', rounded: '18px', pill: '28px' }
  const radSmMap = { sharp: '4px', rounded: '12px', pill: '18px' }
  setVar('--radius', radMap[p.radius] || '18px')
  setVar('--radius-sm', radSmMap[p.radius] || '12px')

  // Density
  const densityStyle = document.getElementById('mawj-density-style') || document.createElement('style')
  densityStyle.id = 'mawj-density-style'
  densityStyle.textContent = p.density === 'compact'
    ? '.page{padding:10px 10px 80px!important}'
    : p.density === 'comfortable'
    ? '.page{padding:28px 28px 96px!important}'
    : ''
  document.head.appendChild(densityStyle)

  // Animations
  const animStyle = document.getElementById('mawj-anim-style') || document.createElement('style')
  animStyle.id = 'mawj-anim-style'
  animStyle.textContent = p.animations ? '' : `
    .page{animation:none!important} .stagger>*{animation:none!important}
    @keyframes pageIn{from{}to{}} @keyframes cardEntrance{from{}to{}}
    @keyframes fadeInUp{from{}to{}} @keyframes shimmerSlide{from{}to{}}
    @keyframes toastIn{from{}to{}} @keyframes sheetUp{from{}to{}}
    @keyframes modalIn{from{}to{}}
  `
  document.head.appendChild(animStyle)

  // Noise
  setVar('--noise-opacity', p.noise ? '0.28' : '0')
}

/* ── Load from Supabase and apply ── */
export async function loadAndApplyAppearance() {
  try {
    const saved = await Settings.get('appearance')
    applyAppearance(saved || DEFAULT_PREFS)
    return saved || DEFAULT_PREFS
  } catch {
    applyAppearance(DEFAULT_PREFS)
    return DEFAULT_PREFS
  }
}

/* ── Save to Supabase and apply ── */
export async function saveAppearance(prefs) {
  applyAppearance(prefs) // apply immediately (optimistic)
  await Settings.set('appearance', prefs)
}
