// ─── COLORS ───────────────────────────────────────────────────────────────────
export const COLORS = {
  action: 'var(--action)',
  info: 'var(--info)',
  amber: 'var(--warning)',
  red: 'var(--danger)',
  gold: '#e6b94a',
  blue: 'var(--info)',
  green: 'var(--success)',
  gray: 'var(--text-muted)',
} as const

export const FONTS: Record<string, string> = {
  'Almarai': "'Almarai', sans-serif",
  'Cairo': "'Cairo', sans-serif",
  'Tajawal': "'Tajawal', sans-serif",
  'Inter': "'Inter', sans-serif",
}

export const SOURCE_LABELS: Record<string, string> = {
  instagram: 'إنستغرام',
  tiktok: 'تيك توك',
  website: 'الموقع',
  walk_in: 'زيارة مباشرة',
  other: 'أخرى',
}

export const SOURCE_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  website: '🌐',
  walk_in: '🚶',
  other: '📦',
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير',
  accountant: 'محاسب',
  sales: 'مبيعات',
  viewer: 'مشاهد',
}

export const EXPENSE_CATEGORIES: string[] = [
  'شحن وتوصيل',
  'مستلزمات التغليف',
  'إعلانات وتسويق',
  'إيجار',
  'رواتب',
  'مشتريات',
  'صيانة',
  'اتصالات',
  'أخرى',
]

export const UAE_CITIES: string[] = [
  'أبوظبي', 'دبي', 'الشارقة', 'عجمان', 'أم القيوين', 'رأس الخيمة', 'الفجيرة',
]

export const CURRENCY_SYMBOL = 'د.إ'

export function formatCurrency(amount: number | string): string {
  const num = parseFloat(String(amount)) || 0
  return `${num.toLocaleString('ar-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} د.إ`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-AE', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-AE', { month: 'short', day: 'numeric' })
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${Math.floor(hours / 24)} يوم`
}
