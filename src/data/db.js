import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})

// ─── AUTH ────────────────────────────────────────────────────
export const Auth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  },
  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange(callback)
    return data.subscription.unsubscribe
  }
}

// ─── SETTINGS ────────────────────────────────────────────────
const settingsCache = {}

export const Settings = {
  async get(key) {
    if (settingsCache[key] !== undefined) return settingsCache[key]
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    if (error) return null
    settingsCache[key] = data.value
    return data.value
  },
  async set(key, value) {
    settingsCache[key] = value
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (error) throw error
  },
  clearCache(key) {
    if (key) delete settingsCache[key]
    else Object.keys(settingsCache).forEach(k => delete settingsCache[k])
  }
}

// ─── QUERY CACHE ────────────────────────────────────────────
const queryCache = new Map()
const CACHE_TTL = 30000 // 30 seconds

export function invalidateCache(table) {
  for (const [key] of queryCache) {
    if (key.startsWith(`${table}:`)) queryCache.delete(key)
  }
}

// ─── DB (CRUD) ───────────────────────────────────────────────
export const DB = {
  async list(table, options = {}) {
    const cacheKey = `${table}:${JSON.stringify(options)}`
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

    let query = supabase.from(table).select('*')
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.asc ?? false })
    if (options.filters) {
      options.filters.forEach(([col, op, val]) => {
        query = query.filter(col, op, val)
      })
    }
    if (options.limit) query = query.limit(options.limit)
    const { data, error } = await query
    if (error) throw error
    const result = data || []
    queryCache.set(cacheKey, { data: result, ts: Date.now() })
    return result
  },

  async get(table, id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async insert(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) throw error
    invalidateCache(table)
    return data
  },

  async update(table, id, updates) {
    const { data, error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    invalidateCache(table)
    return data
  },

  async delete(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    invalidateCache(table)
  },

  async upsert(table, row) {
    const { data, error } = await supabase.from(table).upsert(row).select().single()
    if (error) throw error
    invalidateCache(table)
    return data
  }
}

// ─── ORDER NUMBER (with retry to avoid race conditions) ─────
let _orderNumberLock = false
export async function generateOrderNumber() {
  // Simple mutex to prevent concurrent generation
  while (_orderNumberLock) await new Promise(r => setTimeout(r, 50))
  _orderNumberLock = true
  try {
    const today = new Date()
    const prefix = `MWJ-${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}`
    const { data } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].order_number.split('-').pop(), 10)
      return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`
    }
    return `${prefix}-0001`
  } finally {
    _orderNumberLock = false
  }
}

// ─── STORAGE ─────────────────────────────────────────────────
export const Storage = {
  async upload(bucket, path, file) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return urlData.publicUrl
  }
}