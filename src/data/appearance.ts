import { Settings } from './db'
import type { Preferences, OrbConfig, AppearancePreset } from '../types'

/* ══════════════════════════════════════════════════
   APPEARANCE v10 — Dual-Mode Sky Blue Glassmorphism
   Dark: deep midnight blue #0A1628
   Light: pale ice blue #E8F2FF
   Shared: Bleu de France accent palette
══════════════════════════════════════════════════ */

export const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  accent: '#318CE7',
  infoColor: '#7EB8F7',
  successColor: '#5DD8A4',
  dangerColor: '#F87171',
  warningColor: '#FBBF24',
  bgColor: '#0A1628',
  font: "'Almarai', sans-serif",
  fontSize: 'md',
  fontWeight: 'regular',
  radius: 'rounded',
  density: 'normal',
  animations: true,
  animationSpeed: 'normal',
  springBounce: true,
  glassBlur: 48,
  glassSaturation: 1.7,
  glassPanelOpacity: 8,
  noiseTexture: true,
  noiseIntensity: 2.5,
  orbs: true,
  orbConfigs: [
    { color: '#318CE7', opacity: 0.28, speed: 28 },
    { color: '#0095C7', opacity: 0.22, speed: 34 },
    { color: '#64B4E6', opacity: 0.18, speed: 22 },
    { color: '#3C5AB4', opacity: 0.16, speed: 40 },
  ],
}

export const LIGHT_PREFS: Partial<Preferences> = {
  theme: 'light',
  bgColor: '#E8F2FF',
  glassPanelOpacity: 55,
  glassBlur: 36,
  glassSaturation: 1.5,
  orbConfigs: [
    { color: '#318CE7', opacity: 0.14, speed: 28 },
    { color: '#0095C7', opacity: 0.12, speed: 34 },
    { color: '#64B4E6', opacity: 0.10, speed: 22 },
    { color: '#3C5AB4', opacity: 0.08, speed: 40 },
  ],
}

export const BUILT_IN_PRESETS: AppearancePreset[] = [
  {
    id: 'sky-night',
    name: 'سماء الليل',
    prefs: { ...DEFAULT_PREFS },
  },
  {
    id: 'sea-dawn',
    name: 'فجر البحر',
    prefs: {
      theme: 'light',
      accent: '#0EA5E9',
      infoColor: '#7DD3FC',
      bgColor: '#E0F2FE',
      glassPanelOpacity: 60,
      glassBlur: 36,
      orbConfigs: [
        { color: '#0EA5E9', opacity: 0.14, speed: 24 },
        { color: '#38BDF8', opacity: 0.12, speed: 30 },
        { color: '#7DD3FC', opacity: 0.10, speed: 20 },
        { color: '#0369A1', opacity: 0.08, speed: 38 },
      ],
    },
  },
  {
    id: 'midnight-deep',
    name: 'منتصف الليل',
    prefs: {
      theme: 'dark',
      accent: '#60AEFF',
      bgColor: '#050D1A',
      glassPanelOpacity: 6,
      glassBlur: 56,
      orbConfigs: [
        { color: '#1E3A8A', opacity: 0.35, speed: 32 },
        { color: '#1D4ED8', opacity: 0.25, speed: 40 },
        { color: '#3B82F6', opacity: 0.18, speed: 25 },
        { color: '#6366F1', opacity: 0.15, speed: 45 },
      ],
    },
  },
  {
    id: 'soft-slate',
    name: 'رمادي ناعم',
    prefs: {
      theme: 'light',
      accent: '#6366F1',
      infoColor: '#A5B4FC',
      bgColor: '#EEF2FF',
      glassPanelOpacity: 58,
      glassBlur: 32,
      orbConfigs: [
        { color: '#6366F1', opacity: 0.12, speed: 26 },
        { color: '#818CF8', opacity: 0.10, speed: 32 },
        { color: '#A5B4FC', opacity: 0.08, speed: 20 },
        { color: '#4F46E5', opacity: 0.08, speed: 38 },
      ],
    },
  },
]

// ─── Utility: hex → "r,g,b" ───────────────────────────────────────────────────
export function hexRgb(hex: string): string | null {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : null
}

// ─── Apply preferences to DOM CSS variables ────────────────────────────────────
export function applyAppearance(prefs: Partial<Preferences>) {
  const p: Preferences = { ...DEFAULT_PREFS, ...prefs }
  const root = document.documentElement
  const isLight = p.theme === 'light' || (p.theme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)

  // Theme attribute
  if (isLight) {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }

  // Accent color + rgb variants
  root.style.setProperty('--action', p.accent)
  const accentRgb = hexRgb(p.accent)
  if (accentRgb) {
    root.style.setProperty('--action-rgb', accentRgb)
    root.style.setProperty('--action-soft', `rgba(${accentRgb},0.12)`)
    root.style.setProperty('--action-glow', `rgba(${accentRgb},0.20)`)
    root.style.setProperty('--action-faint', `rgba(${accentRgb},0.06)`)
  }

  // Semantic colors
  root.style.setProperty('--info', p.infoColor)
  root.style.setProperty('--success', p.successColor)
  root.style.setProperty('--danger', p.dangerColor)
  root.style.setProperty('--warning', p.warningColor)

  const infoRgb = hexRgb(p.infoColor)
  if (infoRgb) root.style.setProperty('--info-rgb', infoRgb)
  const successRgb = hexRgb(p.successColor)
  if (successRgb) root.style.setProperty('--success-rgb', successRgb)
  const dangerRgb = hexRgb(p.dangerColor)
  if (dangerRgb) root.style.setProperty('--danger-rgb', dangerRgb)

  // Glass effect
  const blur = `blur(${p.glassBlur}px) saturate(${p.glassSaturation})`
  const blurMd = `blur(${Math.round(p.glassBlur * 1.15)}px) saturate(${p.glassSaturation + 0.1})`
  const blurLg = `blur(${Math.round(p.glassBlur * 1.33)}px) saturate(${p.glassSaturation + 0.2})`
  root.style.setProperty('--glass-blur', blur)
  root.style.setProperty('--glass-blur-md', blurMd)
  root.style.setProperty('--glass-blur-lg', blurLg)

  // Panel opacity
  const op = isLight ? p.glassPanelOpacity / 100 : Math.min(p.glassPanelOpacity / 100, 0.15)
  const opElevated = isLight ? Math.min(op + 0.12, 0.85) : Math.min(op + 0.04, 0.22)
  root.style.setProperty('--bg-surface', `rgba(255,255,255,${op})`)
  root.style.setProperty('--bg-elevated', `rgba(255,255,255,${opElevated})`)

  // Noise texture
  root.style.setProperty('--noise-opacity', p.noiseTexture ? `${p.noiseIntensity / 100}` : '0')

  // Font
  root.style.setProperty('--font-arabic', p.font)

  // Font size scale
  const fontScales: Record<string, string> = {
    sm: '0.85', md: '1', lg: '1.1', xl: '1.2'
  }
  root.style.setProperty('--font-scale', fontScales[p.fontSize] || '1')

  // Border radius
  const radiusMap: Record<string, { sm: string; md: string; lg: string; xl: string }> = {
    sharp:   { sm: '4px',  md: '6px',  lg: '8px',  xl: '10px' },
    rounded: { sm: '8px',  md: '12px', lg: '16px', xl: '20px' },
    pill:    { sm: '12px', md: '18px', lg: '24px', xl: '32px' },
  }
  const rKey = typeof p.radius === 'string' ? p.radius : 'rounded'
  const radii = radiusMap[rKey] || radiusMap.rounded
  root.style.setProperty('--r-sm', radii.sm)
  root.style.setProperty('--r-md', radii.md)
  root.style.setProperty('--r-lg', radii.lg)
  root.style.setProperty('--r-xl', radii.xl)

  // Animation speed
  const speedMap: Record<string, string> = {
    slow: '1.6', normal: '1', fast: '0.6', none: '0.01'
  }
  const speedMult = speedMap[p.animationSpeed] || '1'
  root.style.setProperty('--dur-fast', `${Math.round(120 * parseFloat(speedMult))}ms`)
  root.style.setProperty('--dur-base', `${Math.round(180 * parseFloat(speedMult))}ms`)
  root.style.setProperty('--dur-slow', `${Math.round(240 * parseFloat(speedMult))}ms`)

  // Animations kill-switch
  const animStyle = document.getElementById('mawj-anim-style') || document.createElement('style')
  animStyle.id = 'mawj-anim-style'
  animStyle.textContent = (!p.animations || p.animationSpeed === 'none') ? `
    .page,.stagger>*{animation:none!important}
    *{transition-duration:0.01ms!important}
  ` : ''
  if (!document.getElementById('mawj-anim-style')) document.head.appendChild(animStyle)

  // Density
  const densityMap: Record<string, string> = { compact: '0.75', normal: '1', spacious: '1.25' }
  root.style.setProperty('--density', densityMap[p.density] || '1')

  // Orb visibility (CSS flag picked up by BgCanvas)
  root.style.setProperty('--orbs-visible', p.orbs ? '1' : '0')

  // Expose orb configs as CSS vars for BgCanvas
  if (p.orbConfigs) {
    p.orbConfigs.forEach((orb, i) => {
      root.style.setProperty(`--orb-${i + 1}-color`, orb.color)
      root.style.setProperty(`--orb-${i + 1}-opacity`, String(orb.opacity))
      root.style.setProperty(`--orb-${i + 1}-speed`, `${orb.speed}s`)
    })
  }

  // Store current prefs on window for access by components
  ;(window as any).__mawjPrefs = p
}

// ─── Load and apply from Supabase Settings ────────────────────────────────────
export async function loadAndApplyAppearance(userId?: string): Promise<Preferences> {
  try {
    const userKey = userId ? `appearance_${userId}` : 'appearance'
    let prefs = await Settings.get(userKey)
    if (!prefs) prefs = await Settings.get('global_appearance')

    // v10 migration: ensure new keys exist
    if (!prefs || !prefs._v10) {
      prefs = { ...DEFAULT_PREFS, _v10: true }
      const key = userId ? `appearance_${userId}` : 'appearance'
      Settings.set(key, prefs).catch(() => {})
      Settings.set('global_appearance', prefs).catch(() => {})
      Settings.clearCache()
    }

    applyAppearance(prefs || DEFAULT_PREFS)
    return prefs || DEFAULT_PREFS
  } catch {
    applyAppearance(DEFAULT_PREFS)
    return DEFAULT_PREFS
  }
}

export async function saveAppearance(prefs: Partial<Preferences>, userId?: string): Promise<void> {
  applyAppearance(prefs)
  const key = userId ? `appearance_${userId}` : 'appearance'
  await Settings.set(key, prefs)
}

export async function saveGlobalDefault(prefs: Partial<Preferences>): Promise<void> {
  applyAppearance(prefs)
  await Settings.set('global_appearance', prefs)
  await Settings.set('appearance', prefs)
}
