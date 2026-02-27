// ─── COLORS ──────────────────────────────────────────────────
export const COLORS = {
  action: '#38BDF8',
  info: '#3B82F6',
  amber: '#f59e0b',
  red: '#EF4444',
  gold: '#e6b94a',
  blue: '#3b82f6',
  green: '#10b981',
  gray: '#6b7280',
}

export const FONTS = {
  'Almarai': "'Almarai', sans-serif",
  'Inter': "'Inter', sans-serif",
}

export const SOURCE_LABELS = {
  instagram: 'إنستغرام',
  tiktok: 'تيك توك',
  website: 'الموقع',
  walk_in: 'زيارة مباشرة',
  other: 'أخرى',
}

export const SOURCE_ICONS = {
  instagram: '📸',
  tiktok: '🎵',
  website: '🌐',
  walk_in: '🚶',
  other: '📦',
}

export const ROLE_LABELS = {
  admin: 'مدير',
  accountant: 'محاسب',
  sales: 'مبيعات',
  viewer: 'مشاهد',
}

export const EXPENSE_CATEGORIES = [
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

export const UAE_CITIES = [
  'أبوظبي','دبي','الشارقة','عجمان','أم القيوين','رأس الخيمة','الفجيرة',
]

export const CURRENCY_SYMBOL = 'د.إ'

export function formatCurrency(amount) {
  const num = parseFloat(amount) || 0
  return `${num.toLocaleString('ar-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} د.إ`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-AE', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-AE', { month: 'short', day: 'numeric' })
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${Math.floor(hours / 24)} يوم`
}
