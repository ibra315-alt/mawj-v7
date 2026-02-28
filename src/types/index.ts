// ─── Core Domain Types ───────────────────────────────────────────────────────

export type UserRole = 'admin' | 'accountant' | 'sales' | 'viewer'

export interface User {
  id: string
  email: string
  role: UserRole
  name?: string
  avatar_url?: string
  created_at?: string
  [key: string]: any
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'not_delivered'

export interface OrderItem {
  id?: string
  name: string
  qty: number
  price?: number
  cost?: number
}

export interface InternalNote {
  text: string
  time: string
  user?: string
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  customer_city?: string
  customer_email?: string
  order_date?: string
  created_at: string
  updated_at?: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  subtotal?: number
  discount_amount?: number
  discount_code?: string
  gross_profit?: number
  product_cost?: number
  hayyak_fee?: number
  hayyak_remittance_id?: string
  is_replacement?: boolean
  replacement_for?: string
  delivery_date?: string
  tracking_number?: string
  source?: 'instagram' | 'tiktok' | 'website' | 'walk_in' | 'other'
  internal_notes?: InternalNote[]
  notes?: string
  [key: string]: any
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string
  name: string
  sku?: string
  category?: string
  description?: string
  stock_qty: number
  cost_price: number
  sell_price?: number
  low_stock_threshold: number
  active: boolean
  supplier_id?: string
  image_url?: string
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export interface StockMovement {
  id: string
  item_id: string
  item_name: string
  delta: number
  qty: number
  note: string
  time: string
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  active: boolean
  created_at?: string
  [key: string]: any
}

export interface SupplierPurchase {
  id: string
  supplier_id: string
  amount: number
  description?: string
  date?: string
  created_at: string
  [key: string]: any
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string
  category: string
  amount: number
  description?: string
  date?: string
  created_at: string
  updated_at?: string
  [key: string]: any
}

// ─── Partners / Settlements ───────────────────────────────────────────────────

export interface Settlement {
  id: string
  partner_name: string
  amount: number
  period?: string
  notes?: string
  created_at: string
  [key: string]: any
}

export interface CapitalEntry {
  id: string
  partner_name: string
  amount: number
  description?: string
  date?: string
  created_at: string
  [key: string]: any
}

export interface Withdrawal {
  id: string
  partner_name: string
  amount: number
  type?: string
  description?: string
  date?: string
  created_at: string
  [key: string]: any
}

// ─── Products (from Settings) ────────────────────────────────────────────────

export interface Product {
  id?: string
  name: string
  sku?: string
  price: number
  cost_price?: number
  category?: string
  active: boolean
  color?: string
  image_url?: string
}

// ─── Discounts ───────────────────────────────────────────────────────────────

export interface Discount {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  max_uses?: number
  uses?: number
  active: boolean
  created_at?: string
  [key: string]: any
}

// ─── Appearance / Preferences ────────────────────────────────────────────────

export interface OrbConfig {
  color: string
  opacity: number
  speed: number
}

export interface Preferences {
  theme: 'dark' | 'light' | 'auto'
  accent: string
  infoColor: string
  successColor: string
  dangerColor: string
  warningColor: string
  bgColor: string
  font: string
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  fontWeight: 'light' | 'regular' | 'semibold'
  radius: 'sharp' | 'rounded' | 'pill' | number
  density: 'compact' | 'normal' | 'spacious'
  animations: boolean
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none'
  springBounce: boolean
  glassBlur: number
  glassSaturation: number
  glassPanelOpacity: number
  noiseTexture: boolean
  noiseIntensity: number
  orbs: boolean
  orbConfigs?: OrbConfig[]
  [key: string]: any
}

export interface AppearancePreset {
  id: string
  name: string
  prefs: Partial<Preferences>
}

// ─── Database Layer ──────────────────────────────────────────────────────────

export type FilterTuple = [string, string, any]

export interface DatabaseOptions {
  orderBy?: string
  asc?: boolean
  filters?: FilterTuple[]
  limit?: number
}

// ─── Realtime ────────────────────────────────────────────────────────────────

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export interface RealtimePayload<T = Record<string, any>> {
  type: RealtimeEventType
  schema: string
  table: string
  record: T
  old_record?: T
}

// ─── Routing / Layout ────────────────────────────────────────────────────────

export interface PageProps {
  user: User
  onNavigate: (page: string) => void
}

export type RoleAccess = Record<UserRole, string[]>

// ─── Settings (JSONB key-value) ──────────────────────────────────────────────

export interface SettingsRow {
  key: string
  value: any
  updated_at?: string
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

export interface WhatsAppMessage {
  id: string
  from: string
  body: string
  timestamp: number
  type?: string
  media_url?: string
  [key: string]: any
}
