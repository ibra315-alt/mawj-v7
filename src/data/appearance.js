import { Settings } from './db'

/* ══════════════════════════════════════════════════
   APPEARANCE — Single source of truth
   Saves to Supabase. Loaded on every mount.
══════════════════════════════════════════════════ */

export const THEMES = [
  {
    id: 'dark',
    name: 'داكن',
    mode: 'dark',
    vars: {}  // all handled by CSS :root
  },
  {
    id: 'light',
    name: 'فاتح',
    mode: 'light',
    vars: {}  // all handled by CSS [data-theme="light"]
  },
]

export const DARK_THEMES  = THEMES.filter(t => t.mode === 'dark')
export const LIGHT_THEMES = THEMES.filter(t => t.mode === 'light')

export const DEFAULT_PREFS = {
  theme:'light', mode:'light', accent:'#38BDF8',
  font:"'Almarai', sans-serif",
  fontSize:'medium', radius:'rounded', density:'normal',
  animations:true, noise:false, spotlight:false,
}

export function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : null
}

function setVar(k,v) { if(v) document.documentElement.style.setProperty(k,v) }

const ALL_THEME_VARS = [
  '--bg','--bg-alt','--bg-surface','--bg-elevated','--bg-hover','--bg-active',
  '--text','--text-sec','--text-muted',
  '--border','--border-strong',
  '--sidebar-bg','--header-bg','--modal-bg',
  '--input-bg','--input-border','--input-focus',
  '--card-shadow','--card-shadow-hover','--float-shadow','--modal-shadow',
  '--action','--action-deep','--action-glow','--action-soft','--action-faint',
  '--info','--info-light','--info-glow','--info-soft','--info-faint',
]

export function applyThemeVars(themeId) {
  // Themes are fully defined in CSS — nothing to do here
}

export function applyAppearance(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs }

  // 1. Apply theme — dark or light (all colors handled by CSS)
  const mode = p.mode === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', mode)

  // 2. Animations toggle
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
    const userKey=userId?`appearance_${userId}`:'appearance'
    let prefs=await Settings.get(userKey)
    if(!prefs) prefs=await Settings.get('global_appearance')

    // Force-migrate v3: overwrite ALL old saved prefs with new sky-blue / light defaults.
    // v1/v2 migrations failed to fully propagate. v3 nukes everything and starts fresh.
    if (!prefs || !prefs._v3) {
      prefs = { ...DEFAULT_PREFS, _v3: true }
      const key = userId ? `appearance_${userId}` : 'appearance'
      Settings.set(key, prefs).catch(() => {})
      Settings.set('global_appearance', prefs).catch(() => {})
      // Also clear any user-specific keys that may have old values
      Settings.clearCache()
    }

    applyAppearance(prefs||DEFAULT_PREFS)
    return prefs||DEFAULT_PREFS
  } catch {
    applyAppearance(DEFAULT_PREFS)
    return DEFAULT_PREFS
  }
}

export async function saveAppearance(prefs,userId) {
  applyAppearance(prefs)
  const key=userId?`appearance_${userId}`:'appearance'
  await Settings.set(key,prefs)
}

export async function saveGlobalDefault(prefs) {
  applyAppearance(prefs)
  await Settings.set('global_appearance',prefs)
  await Settings.set('appearance',prefs)
}
