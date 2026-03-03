import { createClient, Session, AuthChangeEvent } from '@supabase/supabase-js'
import type { DatabaseOptions, User } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const Auth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession()
    return data.session
  },
  onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback)
    return data.subscription.unsubscribe
  }
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
const settingsCache: Record<string, any> = {}

export const Settings = {
  async get(key: string): Promise<any> {
    if (settingsCache[key] !== undefined) return settingsCache[key]
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    if (error) { settingsCache[key] = null; return null }
    settingsCache[key] = data.value
    return data.value
  },
  async set(key: string, value: any): Promise<void> {
    settingsCache[key] = value
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (error) throw error
  },
  clearCache(key?: string) {
    if (key) delete settingsCache[key]
    else Object.keys(settingsCache).forEach(k => delete settingsCache[k])
  }
}

// ─── QUERY CACHE ──────────────────────────────────────────────────────────────
const queryCache = new Map<string, { data: any[]; ts: number }>()
const CACHE_TTL = 30000

export function invalidateCache(table: string) {
  for (const [key] of queryCache) {
    if (key.startsWith(`${table}:`)) queryCache.delete(key)
  }
}

// ─── DB (CRUD) ────────────────────────────────────────────────────────────────
export const DB = {
  async list<T = any>(table: string, options: DatabaseOptions = {}): Promise<T[]> {
    const cacheKey = `${table}:${JSON.stringify(options)}`
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T[]

    let query = supabase.from(table).select(options.columns || '*')
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.asc ?? false })
    if (options.filters) {
      options.filters.forEach(([col, op, val]) => {
        query = (query as any).filter(col, op, val)
      })
    }
    if (options.limit) query = query.limit(options.limit)
    const { data, error } = await query
    if (error) throw error
    const result = (data || []) as T[]
    queryCache.set(cacheKey, { data: result, ts: Date.now() })
    return result
  },

  async get<T = any>(table: string, id: string): Promise<T> {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
    if (error) throw error
    return data as T
  },

  async insert<T = any>(table: string, row: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) throw error
    invalidateCache(table)
    return data as T
  },

  async update<T = any>(table: string, id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    invalidateCache(table)
    return data as T
  },

  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    invalidateCache(table)
  },

  async upsert<T = any>(table: string, row: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).upsert(row).select().single()
    if (error) throw error
    invalidateCache(table)
    return data as T
  }
}

// ─── ORDER NUMBER ─────────────────────────────────────────────────────────────
let _orderNumberQueue: Promise<string> = Promise.resolve('')
export function generateOrderNumber(): Promise<string> {
  _orderNumberQueue = _orderNumberQueue.then(_generateOrderNumberImpl, _generateOrderNumberImpl)
  return _orderNumberQueue
}
async function _generateOrderNumberImpl(): Promise<string> {
  const today = new Date()
  const prefix = `MWJ-${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}`
  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1)
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].order_number.split('-').pop()!, 10)
    return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`
  }
  return `${prefix}-0001`
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
export const Storage = {
  async upload(bucket: string, path: string, file: File): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return urlData.publicUrl
  }
}
