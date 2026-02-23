import { Settings } from './db'

/* ══════════════════════════════════════════════════
   APPEARANCE — Single source of truth
   Saves to Supabase. Loaded on every mount.
══════════════════════════════════════════════════ */

export const THEMES = [
  /* ── DARK THEMES ── */
  {
    id: 'mawj', name: 'مَوج', emoji: '🌊', desc: 'النيلي العميق', mode: 'dark',
    vars: { '--bg': '#050c1a', '--bg-alt': '#070f22', '--violet': '#2563eb', '--violet-light': '#60a5fa', '--teal': '#00e4b8', '--pink': '#ec4899' }
  },
  {
    id: 'galaxy', name: 'مجرة', emoji: '🌌', desc: 'البنفسجي الكوني', mode: 'dark',
    vars: { '--bg': '#0a0618', '--bg-alt': '#0d0820', '--violet': '#7c3aed', '--violet-light': '#a78bfa', '--teal': '#c084fc', '--pink': '#f472b6' }
  },
  {
    id: 'obsidian', name: 'أوبسيديان', emoji: '🖤', desc: 'الأسود والذهب', mode: 'dark',
    vars: { '--bg': '#0a0a0a', '--bg-alt': '#111111', '--violet': '#525252', '--violet-light': '#a3a3a3', '--teal': '#e6b94a', '--pink': '#f5f5f5' }
  },
  {
    id: 'emerald', name: 'زمرد', emoji: '🌿', desc: 'الغابة الداكنة', mode: 'dark',
    vars: { '--bg': '#051510', '--bg-alt': '#071a13', '--violet': '#065f46', '--violet-light': '#34d399', '--teal': '#10b981', '--pink': '#86efac' }
  },
  {
    id: 'ember', name: 'جمر', emoji: '🔥', desc: 'الدفء والطاقة', mode: 'dark',
    vars: { '--bg': '#0f0a08', '--bg-alt': '#150d09', '--violet': '#9a3412', '--violet-light': '#fb923c', '--teal': '#f97316', '--pink': '#fbbf24' }
  },
  {
    id: 'sakura', name: 'سكورا', emoji: '🌸', desc: 'الوردي الأنيق', mode: 'dark',
    vars: { '--bg': '#0f080e', '--bg-alt': '#140a12', '--violet': '#9d174d', '--violet-light': '#f9a8d4', '--teal': '#ec4899', '--pink': '#fda4af' }
  },
  {
    id: 'arctic', name: 'قطبي', emoji: '🧊', desc: 'النظيف المتجمد', mode: 'dark',
    vars: { '--bg': '#050d14', '--bg-alt': '#07111b', '--violet': '#164e63', '--violet-light': '#67e8f9', '--teal': '#22d3ee', '--pink': '#a5f3fc' }
  },
  {
    id: 'golden', name: 'ذهبي', emoji: '✨', desc: 'الفخامة الملكية', mode: 'dark',
    vars: { '--bg': '#080600', '--bg-alt': '#0f0c00', '--violet': '#78350f', '--violet-light': '#fbbf24', '--teal': '#f59e0b', '--pink': '#fde68a' }
  },

  /* ── LIGHT THEMES ── */
  {
    id: 'l_sahara', name: 'صحراء', emoji: '☀️', desc: 'رملي دافئ', mode: 'light',
    vars: { '--bg': '#fdf6e8', '--bg-alt': '#faf0d8', '--text': '#2d1a00', '--text-sec': '#7a4a10', '--text-muted': '#b8843a', '--violet': '#b45309', '--violet-light': '#d97706', '--teal': '#059669', '--pink': '#dc2626', '--bg-card': 'rgba(255,251,240,0.92)', '--bg-glass': 'rgba(255,245,220,0.78)', '--sidebar-bg': 'rgba(253,246,232,0.98)', '--header-bg': 'rgba(250,240,216,0.96)', '--glass-border': 'rgba(180,83,9,0.14)', '--shadow-card': '0 2px 20px rgba(180,83,9,0.10)' }
  },
  {
    id: 'l_blossom', name: 'زهور', emoji: '🌸', desc: 'وردي ناعم', mode: 'light',
    vars: { '--bg': '#fdf2f8', '--bg-alt': '#fce7f3', '--text': '#500724', '--text-sec': '#9d174d', '--text-muted': '#db2777', '--violet': '#be185d', '--violet-light': '#ec4899', '--teal': '#0891b2', '--pink': '#f43f5e', '--bg-card': 'rgba(255,247,252,0.92)', '--bg-glass': 'rgba(255,236,248,0.80)', '--sidebar-bg': 'rgba(253,242,248,0.98)', '--header-bg': 'rgba(252,231,243,0.96)', '--glass-border': 'rgba(190,24,93,0.14)', '--shadow-card': '0 2px 20px rgba(190,24,93,0.09)' }
  },
  {
    id: 'l_shore', name: 'شاطئ', emoji: '🏖️', desc: 'أزرق محيطي', mode: 'light',
    vars: { '--bg': '#f0f9ff', '--bg-alt': '#e0f2fe', '--text': '#0c2a40', '--text-sec': '#0369a1', '--text-muted': '#0ea5e9', '--violet': '#0369a1', '--violet-light': '#38bdf8', '--teal': '#0891b2', '--pink': '#06b6d4', '--bg-card': 'rgba(240,249,255,0.94)', '--bg-glass': 'rgba(224,242,254,0.80)', '--sidebar-bg': 'rgba(240,249,255,0.98)', '--header-bg': 'rgba(224,242,254,0.96)', '--glass-border': 'rgba(3,105,161,0.14)', '--shadow-card': '0 2px 20px rgba(3,105,161,0.10)' }
  },
  {
    id: 'l_garden', name: 'حديقة', emoji: '🌿', desc: 'أخضر طازج', mode: 'light',
    vars: { '--bg': '#f0fdf4', '--bg-alt': '#dcfce7', '--text': '#052e16', '--text-sec': '#166534', '--text-muted': '#16a34a', '--violet': '#15803d', '--violet-light': '#4ade80', '--teal': '#059669', '--pink': '#f43f5e', '--bg-card': 'rgba(240,253,244,0.94)', '--bg-glass': 'rgba(220,252,231,0.82)', '--sidebar-bg': 'rgba(240,253,244,0.98)', '--header-bg': 'rgba(220,252,231,0.96)', '--glass-border': 'rgba(21,128,61,0.14)', '--shadow-card': '0 2px 20px rgba(21,128,61,0.09)' }
  },
  {
    id: 'l_mist', name: 'ضباب', emoji: '🌫️', desc: 'رمادي هادئ', mode: 'light',
    vars: { '--bg': '#f8fafc', '--bg-alt': '#f1f5f9', '--text': '#0f172a', '--text-sec': '#475569', '--text-muted': '#94a3b8', '--violet': '#475569', '--violet-light': '#94a3b8', '--teal': '#0ea5e9', '--pink': '#e879f9', '--bg-card': 'rgba(255,255,255,0.94)', '--bg-glass': 'rgba(248,250,252,0.85)', '--sidebar-bg': 'rgba(248,250,252,0.98)', '--header-bg': 'rgba(241,245,249,0.96)', '--glass-border': 'rgba(71,85,105,0.14)', '--shadow-card': '0 2px 20px rgba(15,23,42,0.08)' }
  },
  {
    id: 'l_palace', name: 'بلاط', emoji: '👑', desc: 'كريمي فاخر', mode: 'light',
    vars: { '--bg': '#fffbf0', '--bg-alt': '#fef9e4', '--text': '#1a1200', '--text-sec': '#5c4a00', '--text-muted': '#a07c00', '--violet': '#854d0e', '--violet-light': '#ca8a04', '--teal': '#d97706', '--pink': '#dc2626', '--bg-card': 'rgba(255,252,240,0.95)', '--bg-glass': 'rgba(254,249,228,0.85)', '--sidebar-bg': 'rgba(255,251,240,0.98)', '--header-bg': 'rgba(254,249,228,0.97)', '--glass-border': 'rgba(133,77,14,0.14)', '--shadow-card': '0 2px 20px rgba(133,77,14,0.10)' }
  },
]

export const DARK_THEMES = THEMES.filter(t => t.mode === 'dark')
export const LIGHT_THEMES = THEMES.filter(t => t.mode === 'light')

export const DEFAULT_PREFS = {
  theme: 'mawj', mode: 'dark', accent: '#00e4b8',
  font: "'Noto Kufi Arabic', sans-serif",
  fontSize: 'medium', radius: 'rounded', density: 'normal',
  animations: true, noise: true, spotlight: true,
}

export function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : null
}

function setVar(k, v) { if (v) document.documentElement.style.setProperty(k, v) }

const ALL_THEME_VARS = [
  '--bg', '--bg-alt', '--bg-card', '--bg-glass', '--bg-glass-hover', '--bg-hover',
  '--bg-border', '--bg-surface', '--sidebar-bg', '--header-bg', '--modal-bg',
  '--violet', '--violet-light', '--violet-bright', '--violet-glow', '--violet-soft', '--violet-faint',
  '--teal', '--teal-deep', '--teal-glow', '--teal-soft', '--teal-faint',
  '--pink', '--pink-glow', '--pink-soft', '--text', '--text-sec', '--text-muted',
  '--input-bg', '--input-border', '--input-focus',
  '--glass-border', '--glass-border-strong', '--glass-border-teal',
  '--shadow-card', '--shadow-float', '--shadow-violet', '--shadow-teal',
]

export function applyThemeVars(themeId) {
  const t = THEMES.find(t => t.id === themeId)
  if (!t) return
  if (t.mode === 'light') {
    Object.entries(t.vars).forEach(([k, v]) => setVar(k, v))
    return
  }
  const bg = t.vars['--bg'], violet = t.vars['--violet'], vLight = t.vars['--violet-light']
  const teal = t.vars['--teal'], pink = t.vars['--pink'] || vLight
  const bgRgb = hexRgb(bg), vRgb = hexRgb(violet), tRgb = hexRgb(teal), pRgb = hexRgb(pink)
  const vars = {
    '--bg': bg, '--bg-alt': t.vars['--bg-alt'] || bg,
    '--violet': violet, '--violet-light': vLight, '--violet-bright': vLight,
    '--violet-glow': vRgb ? `rgba(${vRgb},0.28)` : '', '--violet-soft': vRgb ? `rgba(${vRgb},0.14)` : '', '--violet-faint': vRgb ? `rgba(${vRgb},0.06)` : '',
    '--teal': teal, '--teal-deep': teal,
    '--teal-glow': tRgb ? `rgba(${tRgb},0.22)` : '', '--teal-soft': tRgb ? `rgba(${tRgb},0.10)` : '', '--teal-faint': tRgb ? `rgba(${tRgb},0.05)` : '',
    '--pink': pink, '--pink-glow': pRgb ? `rgba(${pRgb},0.22)` : '', '--pink-soft': pRgb ? `rgba(${pRgb},0.10)` : '',
    '--bg-card': bgRgb ? `rgba(${bgRgb},0.88)` : '', '--bg-glass': vRgb ? `rgba(${vRgb},0.07)` : '',
    '--bg-glass-hover': vRgb ? `rgba(${vRgb},0.14)` : '', '--bg-hover': vRgb ? `rgba(${vRgb},0.08)` : '',
    '--bg-border': vRgb ? `rgba(${vRgb},0.16)` : '', '--bg-surface': vRgb ? `rgba(${vRgb},0.05)` : '',
    '--sidebar-bg': bgRgb ? `rgba(${bgRgb},0.97)` : '', '--header-bg': bgRgb ? `rgba(${bgRgb},0.93)` : '', '--modal-bg': bgRgb ? `rgba(${bgRgb},0.99)` : '',
    '--input-bg': vRgb ? `rgba(${vRgb},0.08)` : '', '--input-border': vRgb ? `rgba(${vRgb},0.18)` : '', '--input-focus': vRgb ? `rgba(${vRgb},0.35)` : '',
    '--glass-border': vRgb ? `rgba(${vRgb},0.18)` : '', '--glass-border-strong': vRgb ? `rgba(${vRgb},0.30)` : '', '--glass-border-teal': tRgb ? `rgba(${tRgb},0.22)` : '',
    '--shadow-card': bgRgb && vRgb ? `0 4px 32px rgba(${bgRgb},0.6),0 1px 0 rgba(${vRgb},0.08) inset` : '',
    '--shadow-float': bgRgb && vRgb ? `0 24px 64px rgba(${bgRgb},0.75),0 0 0 1px rgba(${vRgb},0.10)` : '',
    '--shadow-violet': vRgb ? `0 8px 32px rgba(${vRgb},0.35)` : '', '--shadow-teal': tRgb ? `0 8px 32px rgba(${tRgb},0.28)` : '',
  }
  Object.entries(vars).forEach(([k, v]) => setVar(k, v))
}

export function applyAppearance(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs }
  const t = THEMES.find(t => t.id === p.theme)
  const effectiveMode = t?.mode || p.mode
  document.documentElement.setAttribute('data-theme', effectiveMode)
  if (effectiveMode === 'light') {
    ALL_THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v))
    applyThemeVars(p.theme)
  } else {
    applyThemeVars(p.theme)
    const themeDefault = t?.vars['--teal']
    if (p.accent && p.accent !== themeDefault) {
      const rgb = hexRgb(p.accent)
      if (rgb) { setVar('--teal', p.accent); setVar('--teal-glow', `rgba(${rgb},0.22)`); setVar('--teal-soft', `rgba(${rgb},0.10)`); setVar('--teal-faint', `rgba(${rgb},0.05)`) }
    }
  }
  if (p.font) {
    const s = document.getElementById('mawj-font-style') || document.createElement('style')
    s.id = 'mawj-font-style'
    s.textContent = `*,input,button,select,textarea{font-family:${p.font}!important}`
    document.head.appendChild(s)
  }
  const fsMap = { small: 13, medium: 14, large: 16 }
  document.documentElement.style.fontSize = (fsMap[p.fontSize] || 14) + 'px'
  const radMap = { sharp: '6px', rounded: '18px', pill: '28px' }
  const radSmMap = { sharp: '4px', rounded: '12px', pill: '18px' }
  setVar('--radius', radMap[p.radius] || '18px')
  setVar('--radius-sm', radSmMap[p.radius] || '12px')
  const ds = document.getElementById('mawj-density-style') || document.createElement('style')
  ds.id = 'mawj-density-style'
  ds.textContent = p.density === 'compact' ? '.page{padding:10px 10px 80px!important}' : p.density === 'comfortable' ? '.page{padding:28px 28px 96px!important}' : ''
  document.head.appendChild(ds)
  const as = document.getElementById('mawj-anim-style') || document.createElement('style')
  as.id = 'mawj-anim-style'
  as.textContent = p.animations ? '' : `
    .page{animation:none!important}.stagger>*{animation:none!important}
    @keyframes pageIn{from{}to{}}@keyframes cardEntrance{from{}to{}}
    @keyframes fadeInUp{from{}to{}}@keyframes toastIn{from{}to{}}@keyframes modalIn{from{}to{}}
  `
  document.head.appendChild(as)
  setVar('--noise-opacity', p.noise ? '0.28' : '0')
}

export async function loadAndApplyAppearance(userId) {
  try {
    const userKey = userId ? `appearance_${userId}` : 'appearance'
    let prefs = await Settings.get(userKey)
    if (!prefs) prefs = await Settings.get('global_appearance')
    applyAppearance(prefs || DEFAULT_PREFS)
    return prefs || DEFAULT_PREFS
  } catch {
    applyAppearance(DEFAULT_PREFS)
    return DEFAULT_PREFS
  }
}

export async function saveAppearance(prefs, userId) {
  applyAppearance(prefs)
  const key = userId ? `appearance_${userId}` : 'appearance'
  await Settings.set(key, prefs)
}

export async function saveGlobalDefault(prefs) {
  applyAppearance(prefs)
  await Settings.set('global_appearance', prefs)
  await Settings.set('appearance', prefs)
}