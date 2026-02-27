import { Settings } from './db'

/* ══════════════════════════════════════════════════
   APPEARANCE — Unified Liquid Glass theme
   No dark/light toggle. Single glass design system.
══════════════════════════════════════════════════ */

export const DEFAULT_PREFS = {
  theme: 'glass',
  accent: '#0A84FF',
  font: "'Almarai', sans-serif",
  fontSize: 'medium',
  radius: 'rounded',
  density: 'normal',
  animations: true,
}

export function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : null
}

export function applyAppearance(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs }

  // Remove any old data-theme attribute
  document.documentElement.removeAttribute('data-theme')

  // Animations toggle
  const as = document.getElementById('mawj-anim-style') || document.createElement('style')
  as.id = 'mawj-anim-style'
  as.textContent = p.animations ? '' : `
    .page,.stagger>*{animation:none!important}
    *{transition-duration:0.01ms!important}
  `
  if (!document.getElementById('mawj-anim-style')) document.head.appendChild(as)
}

export async function loadAndApplyAppearance(userId) {
  try {
    const userKey = userId ? `appearance_${userId}` : 'appearance'
    let prefs = await Settings.get(userKey)
    if (!prefs) prefs = await Settings.get('global_appearance')

    // v4 migration — force glass theme
    if (!prefs || !prefs._v4) {
      prefs = { ...DEFAULT_PREFS, _v4: true }
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
