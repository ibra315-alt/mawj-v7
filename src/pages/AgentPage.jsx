import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DB, supabase, Settings as SettingsDB } from '../data/db'
import { formatCurrency } from '../data/constants'

/* ══════════════════════════════════════════════════════════════
   MAWJ AGENT PAGE v2.0
   ─────────────────────────────────────────────────────────────
   Full agentic system with:
   • 20 tools (read + write + WhatsApp + memory + analysis)
   • Long-term memory (agent_memory table)
   • Dry-run mode + Undo stack
   • Cost / token tracking
   • Saved workflows (multi-step sequences)
   • Custom SQL tools
   • WhatsApp send integration
   • System analyzer (finds bugs + improvements)
   • All providers (Claude / Gemini / GPT / DeepSeek)
══════════════════════════════════════════════════════════════ */

// ── Token cost table (per 1M tokens, USD) ────────────────────
const TOKEN_COSTS = {
  'claude-haiku-4-5-20251001':    { in: 0.80, out: 4.00 },
  'claude-sonnet-4-20250514':     { in: 3.00, out: 15.00 },
  'claude-opus-4-6':              { in: 15.00, out: 75.00 },
  'gemini-2.5-flash':             { in: 0.15, out: 0.60 },
  'gemini-2.5-pro':               { in: 1.25, out: 10.00 },
  'gpt-4o-mini':                  { in: 0.15, out: 0.60 },
  'gpt-4o':                       { in: 2.50, out: 10.00 },
  'deepseek-chat':                { in: 0.27, out: 1.10 },
}

function estimateCost(model, inTokens, outTokens) {
  const c = TOKEN_COSTS[model] || { in: 1.00, out: 4.00 }
  return ((inTokens * c.in) + (outTokens * c.out)) / 1_000_000
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4)
}

// ── Multi-provider callAI ─────────────────────────────────────
function detectProvider(model = '') {
  if (model.startsWith('gemini'))   return 'google'
  if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai'
  if (model.startsWith('deepseek')) return 'deepseek'
  return 'anthropic'
}

async function callAI(messages, systemPrompt, model, maxTokens = 1500, apiKeys = {}) {
  const provider = detectProvider(model)

  if (provider === 'anthropic') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('غير مسجّل الدخول')
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages }),
      }
    )
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `خطأ ${res.status}`) }
    const d = await res.json()
    if (d.error) throw new Error(d.error)
    return d.content?.[0]?.text || ''
  }

  if (provider === 'google') {
    const key = apiKeys.google_api_key
    if (!key) throw new Error('مفتاح Google AI غير موجود — أضفه في الإعدادات')
    const gemMsgs = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: gemMsgs,
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        }),
      }
    )
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `خطأ Gemini`) }
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  const key = provider === 'openai' ? apiKeys.openai_api_key : apiKeys.deepseek_api_key
  if (!key) throw new Error(`مفتاح ${provider} غير موجود`)
  const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model, max_tokens: maxTokens, temperature: 0.3,
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
    }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `خطأ`) }
  const d = await res.json()
  return d.choices?.[0]?.message?.content || ''
}

// ── Tool parse / strip ────────────────────────────────────────
function parseToolCall(text) {
  const idx = text.indexOf('[TOOL:')
  if (idx === -1) return null
  const end = text.indexOf(']', idx)
  if (end === -1) return null
  try { return JSON.parse(text.slice(idx + 6, end)) } catch { return null }
}

function stripToolCall(text) {
  // Strip ALL [TOOL:{...}] blocks from text
  let result = text
  let safety = 0
  while (result.includes('[TOOL:') && safety++ < 10) {
    const idx = result.indexOf('[TOOL:')
    // Find matching closing ] by tracking brace depth
    let depth = 0
    let end = -1
    for (let i = idx + 6; i < result.length; i++) {
      if (result[i] === '{') depth++
      else if (result[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
    }
    if (end === -1 || result[end] !== ']') break
    result = (result.slice(0, idx) + result.slice(end + 1)).trim()
  }
  return result.trim()
}

// ── Mutation tools (need confirmation) ───────────────────────
const MUTATION_TOOLS = new Set([
  'update_orders_status', 'create_order', 'add_expense',
  'link_remittance', 'update_inventory', 'create_remittance',
  'send_whatsapp', 'delete_memory',
  // save_memory is intentionally excluded — agent saves automatically without confirmation
])

// ── Tool executor ─────────────────────────────────────────────
async function executeTool(name, params, undoStack, dryRun = false) {
  if (dryRun && MUTATION_TOOLS.has(name)) {
    return { dry_run: true, would_execute: name, params, message: `[تجريبي] سيتم تنفيذ: ${name}` }
  }

  switch (name) {

    case 'get_summary': {
      const [orders, expenses] = await Promise.all([DB.list('orders'), DB.list('expenses')])
      const now = new Date()
      const todayS = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yestS  = new Date(todayS); yestS.setDate(yestS.getDate() - 1)
      const monthS = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMS = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastME = new Date(now.getFullYear(), now.getMonth(), 0)
      const bd = (o, from, to) => { const d = new Date(o.order_date || o.created_at); return d >= from && (!to || d < to) }
      const todayO = orders.filter(o => bd(o, todayS))
      const yestO  = orders.filter(o => bd(o, yestS, todayS))
      const monthO = orders.filter(o => bd(o, monthS))
      const lastMO = orders.filter(o => bd(o, lastMS, lastME))
      const monthE = expenses.filter(e => new Date(e.date) >= monthS)
      const sum = arr => arr.reduce((s, o) => s + (o.total || 0), 0)
      const gp  = arr => arr.reduce((s, o) => s + (o.gross_profit || 0), 0)
      const revChange = yestO.length ? ((sum(todayO) - sum(yestO)) / sum(yestO) * 100).toFixed(0) + '%' : 'لا مقارنة'
      return {
        today:       { orders: todayO.length, revenue: sum(todayO), gross_profit: gp(todayO), vs_yesterday: revChange },
        yesterday:   { orders: yestO.length,  revenue: sum(yestO) },
        month:       { orders: monthO.length,  revenue: sum(monthO), gross_profit: gp(monthO), expenses: monthE.reduce((s, e) => s + (e.amount || 0), 0), net: gp(monthO) - monthE.reduce((s, e) => s + (e.amount || 0), 0), delivered: monthO.filter(o => o.status === 'delivered').length, not_delivered: monthO.filter(o => o.status === 'not_delivered').length, replacements: monthO.filter(o => o.is_replacement).length },
        last_month:  { orders: lastMO.length,  revenue: sum(lastMO) },
        in_progress: orders.filter(o => ['new','ready','with_hayyak'].includes(o.status)).length,
        pending_cod: { count: orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id).length, total: orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id).reduce((s, o) => s + (o.total || 0), 0) },
      }
    }

    case 'list_orders': {
      let orders = await DB.list('orders', { orderBy: 'created_at' })
      if (params.status) { const st = Array.isArray(params.status) ? params.status : [params.status]; orders = orders.filter(o => st.includes(o.status)) }
      if (params.date_from) orders = orders.filter(o => new Date(o.order_date || o.created_at) >= new Date(params.date_from))
      if (params.date_to)   orders = orders.filter(o => new Date(o.order_date || o.created_at) <= new Date(params.date_to))
      if (params.hayyak_only)   orders = orders.filter(o => o.hayyak_tracking || o.status === 'with_hayyak')
      if (params.no_remittance) orders = orders.filter(o => !o.hayyak_remittance_id)
      if (params.is_replacement) orders = orders.filter(o => o.is_replacement)
      const limit = params.limit || 50
      return { count: orders.length, orders: orders.slice(0, limit).map(o => ({ id: o.id, ref: o.order_ref, customer: o.customer_name, phone: o.customer_phone, status: o.status, total: o.total, date: (o.order_date || o.created_at || '').slice(0, 10), city: o.customer_city, is_replacement: o.is_replacement })) }
    }

    case 'search_order': {
      const orders = await DB.list('orders')
      const q = (params.query || '').toLowerCase()
      const matches = orders.filter(o =>
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.order_ref?.toLowerCase().includes(q) ||
        o.id === params.query
      )
      return { count: matches.length, orders: matches.slice(0, 20).map(o => ({ id: o.id, ref: o.order_ref, customer: o.customer_name, phone: o.customer_phone, status: o.status, total: o.total, date: (o.order_date || o.created_at || '').slice(0, 10), city: o.customer_city })) }
    }

    case 'get_customer_history': {
      const orders = await DB.list('orders')
      const phone = params.phone || params.customer_name || ''
      const customer = orders.filter(o => o.customer_phone === phone || o.customer_name?.toLowerCase().includes(phone.toLowerCase()))
      const total = customer.reduce((s, o) => s + (o.total || 0), 0)
      return { customer_name: customer[0]?.customer_name, total_orders: customer.length, total_spent: total, replacement_count: customer.filter(o => o.is_replacement).length, statuses: customer.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {}), orders: customer.slice(0, 20).map(o => ({ ref: o.order_ref, date: (o.order_date || o.created_at || '').slice(0, 10), status: o.status, total: o.total })) }
    }

    case 'update_orders_status': {
      if (!params.order_ids?.length) return { ok: false, error: 'لا توجد طلبات' }
      const prev = await Promise.all(params.order_ids.map(id => DB.get('orders', id).catch(() => null)))
      undoStack.push({ action: 'update_orders_status', data: prev.filter(Boolean).map(o => ({ id: o.id, status: o.status })) })
      const { error } = await supabase.from('orders').update({ status: params.new_status, updated_at: new Date().toISOString() }).in('id', params.order_ids)
      if (error) return { ok: false, error: error.message }
      return { ok: true, updated: params.order_ids.length, new_status: params.new_status }
    }

    case 'create_order': {
      const p = params
      if (!p.customer_name || !p.total) return { ok: false, error: 'الاسم والإجمالي مطلوبان' }
      undoStack.push({ action: 'create_order', data: null })
      const { data, error } = await supabase.from('orders').insert([{
        customer_name: p.customer_name, customer_phone: p.phone || '', customer_city: p.city || '',
        total: p.total, gross_profit: p.gross_profit || p.total * 0.35,
        status: p.status || 'new', order_date: new Date().toISOString().slice(0, 10),
        items: p.items || [], notes: p.notes || '',
      }]).select().single()
      if (error) return { ok: false, error: error.message }
      undoStack[undoStack.length - 1].data = { id: data.id }
      return { ok: true, order_id: data.id, ref: data.order_ref }
    }

    case 'update_inventory': {
      if (!params.product_id && !params.product_name) return { ok: false, error: 'المنتج مطلوب' }
      let id = params.product_id
      if (!id) {
        const inv = await DB.list('inventory')
        const found = inv.find(i => i.name?.toLowerCase().includes(params.product_name?.toLowerCase()))
        if (!found) return { ok: false, error: `منتج غير موجود: ${params.product_name}` }
        id = found.id
        undoStack.push({ action: 'update_inventory', data: { id, stock_qty: found.stock_qty } })
      }
      const { error } = await supabase.from('inventory').update({ stock_qty: params.quantity, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return { ok: false, error: error.message }
      return { ok: true, product_id: id, new_qty: params.quantity }
    }

    case 'calculate_partner_split': {
      const [orders, expenses, withdrawals] = await Promise.all([DB.list('orders'), DB.list('expenses'), DB.list('withdrawals')])
      const from = params.date_from ? new Date(params.date_from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const to   = params.date_to   ? new Date(params.date_to)   : new Date()
      const filtered = orders.filter(o => { const d = new Date(o.order_date || o.created_at); return d >= from && d <= to })
      const filtExp  = expenses.filter(e => { const d = new Date(e.date); return d >= from && d <= to })
      const filtWith = withdrawals.filter(w => { const d = new Date(w.date); return d >= from && d <= to })
      const totalGP  = filtered.reduce((s, o) => s + (o.gross_profit || 0), 0)
      const totalExp = filtExp.reduce((s, e) => s + (e.amount || 0), 0)
      const netProfit = totalGP - totalExp
      const partners = await SettingsDB.get('partners') || [{ name: 'إبراهيم', share: 50 }, { name: 'إحسان', share: 50 }]
      const split = partners.map(p => ({
        name: p.name,
        share_pct: p.share,
        gross_share: (totalGP * p.share / 100),
        net_share:   (netProfit * p.share / 100),
        withdrawn:   filtWith.filter(w => w.partner_id === p.id).reduce((s, w) => s + (w.amount || 0), 0),
      }))
      split.forEach(p => { p.balance = p.net_share - p.withdrawn })
      return { period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }, total_gross_profit: totalGP, total_expenses: totalExp, net_profit: netProfit, partners: split }
    }

    case 'reconcile_hayyak_cod': {
      const [orders, remittances] = await Promise.all([DB.list('orders'), DB.list('hayyak_remittances')])
      const unlinked = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
      const openRem  = remittances.filter(r => !r.fully_reconciled)
      const suggestions = openRem.slice(0, 10).map(rem => {
        const remDate = new Date(rem.date)
        const nearby = unlinked.filter(o => Math.abs(new Date(o.order_date || o.created_at) - remDate) / 86400000 <= 7)
        return { remittance_id: rem.id, ref: rem.reference, amount: rem.amount, date: rem.date, candidate_orders: nearby.slice(0, 5).map(o => ({ id: o.id, ref: o.order_ref, total: o.total })) }
      })
      return { unlinked_orders: unlinked.length, open_remittances: openRem.length, suggestions }
    }

    case 'create_remittance': {
      if (!params.amount || !params.reference) return { ok: false, error: 'المبلغ والمرجع مطلوبان' }
      const { data, error } = await supabase.from('hayyak_remittances').insert([{
        amount: params.amount, reference: params.reference,
        date: params.date || new Date().toISOString().slice(0, 10),
        notes: params.notes || '',
      }]).select().single()
      if (error) return { ok: false, error: error.message }
      undoStack.push({ action: 'create_remittance', data: { id: data.id } })
      return { ok: true, remittance_id: data.id, amount: data.amount }
    }

    case 'link_remittance': {
      if (!params.order_ids?.length || !params.remittance_id) return { ok: false, error: 'بيانات ناقصة' }
      const prev = await Promise.all(params.order_ids.map(id => DB.get('orders', id).catch(() => null)))
      undoStack.push({ action: 'link_remittance', data: prev.filter(Boolean).map(o => ({ id: o.id, hayyak_remittance_id: o.hayyak_remittance_id })) })
      const { error } = await supabase.from('orders').update({ hayyak_remittance_id: params.remittance_id }).in('id', params.order_ids)
      if (error) return { ok: false, error: error.message }
      return { ok: true, linked: params.order_ids.length }
    }

    case 'detect_anomalies': {
      const orders = await DB.list('orders')
      const now = new Date()
      const todayS  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const day7    = new Date(todayS); day7.setDate(day7.getDate() - 7)
      const day14   = new Date(todayS); day14.setDate(day14.getDate() - 14)
      const monthS  = new Date(now.getFullYear(), now.getMonth(), 1)
      const bd = (o, f, t) => { const d = new Date(o.order_date || o.created_at); return d >= f && (!t || d < t) }
      const todayO = orders.filter(o => bd(o, todayS))
      const last7  = orders.filter(o => bd(o, day7, todayS))
      const prev7  = orders.filter(o => bd(o, day14, day7))
      const monthO = orders.filter(o => bd(o, monthS))
      const avg7   = last7.reduce((s, o) => s + (o.total || 0), 0) / 7
      const avgPrev= prev7.reduce((s, o) => s + (o.total || 0), 0) / 7
      const tRev   = todayO.reduce((s, o) => s + (o.total || 0), 0)
      const replRate = monthO.length ? monthO.filter(o => o.is_replacement).length / monthO.length : 0
      const ndRate   = monthO.length ? monthO.filter(o => o.status === 'not_delivered').length / monthO.length : 0
      const anomalies = []
      if (tRev < avg7 * 0.5 && avg7 > 0) anomalies.push({ type: 'low_today_revenue', severity: 'high', msg: `إيرادات اليوم (${formatCurrency(tRev)}) أقل من 50% من المتوسط الأسبوعي (${formatCurrency(avg7)})` })
      if (todayO.length === 0) anomalies.push({ type: 'zero_orders', severity: 'medium', msg: 'لا توجد طلبات اليوم' })
      if (replRate > 0.15) anomalies.push({ type: 'high_replacements', severity: 'high', msg: `نسبة الاستبدال ${(replRate * 100).toFixed(1)}% — مرتفعة` })
      if (ndRate > 0.20) anomalies.push({ type: 'high_not_delivered', severity: 'medium', msg: `نسبة عدم التسليم ${(ndRate * 100).toFixed(1)}%` })
      if (avg7 < avgPrev * 0.7 && avgPrev > 0) anomalies.push({ type: 'weekly_drop', severity: 'medium', msg: `إيرادات الأسبوع الأخير انخفضت ${Math.round((1 - avg7 / avgPrev) * 100)}%` })
      return { anomalies, total_anomalies: anomalies.length, stats: { today_orders: todayO.length, today_revenue: tRev, avg_daily_7d: Math.round(avg7), replacement_rate: `${(replRate * 100).toFixed(1)}%`, not_delivered_rate: `${(ndRate * 100).toFixed(1)}%` } }
    }

    case 'generate_whatsapp_report': {
      const [orders, expenses] = await Promise.all([DB.list('orders'), DB.list('expenses')])
      const now = new Date()
      let from, label
      if (params.period === 'week') { from = new Date(now); from.setDate(from.getDate() - 7); label = 'الأسبوع الماضي' }
      else if (params.period === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); label = 'هذا الشهر' }
      else { from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); label = 'اليوم' }
      const ords = orders.filter(o => new Date(o.order_date || o.created_at) >= from)
      const exps = expenses.filter(e => new Date(e.date) >= from)
      const rev  = ords.reduce((s, o) => s + (o.total || 0), 0)
      const gp   = ords.reduce((s, o) => s + (o.gross_profit || 0), 0)
      const exp  = exps.reduce((s, e) => s + (e.amount || 0), 0)
      const cityMap = {}
      ords.forEach(o => { const c = o.customer_city || 'أخرى'; cityMap[c] = (cityMap[c] || 0) + 1 })
      const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c}: ${n}`).join(' | ')
      const lines = [
        `📊 *تقرير موج — ${label}*`, `📅 ${now.toLocaleDateString('ar-AE')}`, '',
        `🛒 الطلبات: ${ords.length}`, `💰 الإيرادات: ${formatCurrency(rev)}`,
        `📈 الربح الإجمالي: ${formatCurrency(gp)}`, `💸 المصاريف: ${formatCurrency(exp)}`,
        `✅ الصافي: ${formatCurrency(gp - exp)}`, '',
        `✅ مسلّم: ${ords.filter(o => o.status === 'delivered').length} | 🔄 استبدال: ${ords.filter(o => o.is_replacement).length} | ❌ لم يُسلَّم: ${ords.filter(o => o.status === 'not_delivered').length}`,
        topCities ? `🌆 أبرز المناطق: ${topCities}` : '',
        '', '_موج للهدايا الكريستالية_',
      ]
      return { report: lines.filter(l => l !== '').join('\n'), stats: { orders: ords.length, revenue: rev, net: gp - exp } }
    }

    case 'send_whatsapp': {
      if (!params.message) return { ok: false, error: 'الرسالة مطلوبة' }
      const waConfig = await SettingsDB.get('whatsapp_config') || {}
      let targets = params.to ? [params.to] : []
      if (params.send_to_all || !targets.length) {
        targets = (waConfig.recipients || []).filter(r => r.enabled).map(r => r.number)
      }
      if (!targets.length) return { ok: false, error: 'لا توجد أرقام مضافة في إعدادات واتساب' }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { ok: false, error: 'غير مسجّل الدخول' }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-sender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipients: targets, message: params.message }),
      })
      const d = await res.json()
      return { ok: d.ok, results: d.results, sent_to: targets.length }
    }

    case 'add_expense': {
      if (!params.amount || !params.category) return { ok: false, error: 'المبلغ والفئة مطلوبان' }
      const { data, error } = await supabase.from('expenses').insert([{
        amount: params.amount, category: params.category,
        description: params.description || '', paid_by: params.paid_by || 'company',
        date: params.date || new Date().toISOString().slice(0, 10),
      }]).select().single()
      if (error) return { ok: false, error: error.message }
      undoStack.push({ action: 'add_expense', data: { id: data.id } })
      return { ok: true, expense_id: data.id, amount: data.amount, category: data.category }
    }

    case 'save_memory': {
      if (!params.key || !params.value) return { ok: false, error: 'المفتاح والقيمة مطلوبان' }
      const { error: memErr } = await supabase.from('agent_memory').upsert({
        key: params.key, value: params.value,
        category: params.category || 'general',
        importance: params.importance || 5,
        tags: params.tags || [],
        access_count: 0,
        updated_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
      }, { onConflict: 'key' })
      if (memErr) return { ok: false, error: memErr.message }
      return { ok: true, key: params.key, saved: true }
    }

    case 'search_memory': {
      const q = (params.query || '').toLowerCase()
      const { data } = await supabase.from('agent_memory').select('*')
        .or(params.category ? `category.eq.${params.category}` : 'id.neq.00000000-0000-0000-0000-000000000000')
        .order('importance', { ascending: false })
        .limit(30)
      const results = (data || []).filter(m =>
        !q || m.key?.toLowerCase().includes(q) || m.value?.toLowerCase().includes(q) || (m.tags || []).some(t => t.toLowerCase().includes(q))
      )
      await supabase.from('agent_memory').update({ last_accessed: new Date().toISOString(), access_count: supabase.rpc('increment', { x: 1 }) }).in('id', results.map(m => m.id))
      return { count: results.length, memories: results.slice(0, 20).map(m => ({ key: m.key, value: m.value, category: m.category, importance: m.importance })) }
    }

    case 'delete_memory': {
      if (!params.key) return { ok: false, error: 'المفتاح مطلوب' }
      const { error } = await supabase.from('agent_memory').delete().eq('key', params.key)
      if (error) return { ok: false, error: error.message }
      return { ok: true, deleted: params.key }
    }

    case 'analyze_system': {
      const [orders, expenses, inventory] = await Promise.all([DB.list('orders'), DB.list('expenses'), DB.list('inventory')])
      const now = new Date()
      const issues = []
      const improvements = []
      const monthS = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthO = orders.filter(o => new Date(o.order_date || o.created_at) >= monthS)
      const orphanCOD = orders.filter(o => o.status === 'delivered' && !o.hayyak_remittance_id)
      const zeroStock = inventory.filter(i => !i.stock_qty || i.stock_qty <= 0)
      const stuckOrders = orders.filter(o => {
        if (!['with_hayyak', 'new', 'ready'].includes(o.status)) return false
        const days = (now - new Date(o.order_date || o.created_at)) / 86400000
        return days > 7
      })
      const missingCosts = orders.filter(o => !o.gross_profit && o.total > 0)
      if (orphanCOD.length)   issues.push({ severity: 'high',   type: 'orphan_cod',     msg: `${orphanCOD.length} طلب مسلّم بدون حوالة حياك — COD معلق`, impact: `${formatCurrency(orphanCOD.reduce((s, o) => s + (o.total || 0), 0))} غير مسوّاة` })
      if (stuckOrders.length) issues.push({ severity: 'high',   type: 'stuck_orders',   msg: `${stuckOrders.length} طلب عالق أكثر من 7 أيام`, orders: stuckOrders.slice(0, 5).map(o => o.order_ref) })
      if (missingCosts.length)issues.push({ severity: 'medium', type: 'missing_cost',   msg: `${missingCosts.length} طلب بدون ربح إجمالي محسوب` })
      if (zeroStock.length)   issues.push({ severity: 'medium', type: 'zero_stock',     msg: `${zeroStock.length} منتج نفد مخزونه`, products: zeroStock.slice(0, 5).map(i => i.name) })
      const replRate = monthO.length ? monthO.filter(o => o.is_replacement).length / monthO.length : 0
      if (replRate > 0.12) improvements.push({ type: 'replacement_review', msg: `نسبة الاستبدال ${(replRate * 100).toFixed(1)}% — راجع أسباب العودة وحسّن جودة التغليف` })
      const topCity = Object.entries(orders.reduce((acc, o) => { const c = o.customer_city || 'أخرى'; acc[c] = (acc[c] || 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1])[0]
      if (topCity) improvements.push({ type: 'market_focus', msg: `${topCity[0]} هي أعلى مدينة بـ${topCity[1]} طلب — ركّز عليها في حملات TikTok` })
      return { issues, improvements, summary: { total_issues: issues.length, high_severity: issues.filter(i => i.severity === 'high').length, total_improvements: improvements.length }, scanned_at: now.toISOString() }
    }

    case 'execute_custom_tool': {
      if (!params.tool_name) return { ok: false, error: 'اسم الأداة مطلوب' }
      const { data: toolDef } = await supabase.from('agent_custom_tools').select('*').eq('name', params.tool_name).eq('enabled', true).single()
      if (!toolDef) return { ok: false, error: `أداة مخصصة غير موجودة: ${params.tool_name}` }
      let sql = toolDef.sql_query
      for (const [k, v] of Object.entries(params.tool_params || {})) {
        sql = sql.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v).replace(/'/g, "''"))
      }
      const { data, error } = await supabase.rpc('run_agent_query', { query_text: sql })
      if (error) return { ok: false, error: error.message }
      return { ok: true, data, row_count: Array.isArray(data) ? data.length : 1 }
    }

    default:
      return { ok: false, error: `أداة غير معروفة: ${name}` }
  }
}

// ── Tool definitions for AI ───────────────────────────────────
const TOOL_DEFS = `
أدواتك (استخدم [TOOL:{"name":"...","params":{...}}]):

READ:
1. get_summary — ملخص شامل (لا params)
2. list_orders — params: {status?,date_from?,date_to?,hayyak_only?,no_remittance?,is_replacement?,limit?}
3. search_order — params: {query} (اسم/هاتف/رقم طلب)
4. get_customer_history — params: {phone?|customer_name?}
5. reconcile_hayyak_cod — تحليل COD المعلق (لا params)
6. detect_anomalies — كشف انحرافات (لا params)
7. search_memory — params: {query?,category?}
8. analyze_system — فحص كامل للنظام وإيجاد المشاكل (لا params)

GENERATE:
9. generate_whatsapp_report — params: {period:"today"|"week"|"month"}
10. calculate_partner_split — params: {date_from?,date_to?}

WRITE ⚠️ (تحتاج تأكيد):
11. update_orders_status — params: {order_ids:[],new_status:"ready"|"delivered"|"new"|"cancelled"}
12. create_order — params: {customer_name,total,phone?,city?,status?,items?,gross_profit?}
13. update_inventory — params: {product_name?,product_id?,quantity}
14. add_expense — params: {amount,category,description?,paid_by?,date?}
15. create_remittance — params: {amount,reference,date?,notes?}
16. link_remittance — params: {order_ids:[],remittance_id}
17. send_whatsapp ⚠️ — params: {message,to?,send_to_all?}
18. save_memory ⚠️ — params: {key,value,category?,importance?,tags?}
19. delete_memory ⚠️ — params: {key}
20. execute_custom_tool — params: {tool_name,tool_params?}

قواعد صارمة:
- لا تُظهر تفكيرك. ابدأ برد مباشر أو أداة.
- ابدأ دائماً بـ get_summary أو list_orders قبل أي تعديل.
- بعد كل [RESULT:...] واصل حتى تكتمل المهمة.
- عند الانتهاء، لخّص ما تم بدون [TOOL:...].
- احفظ المعلومات المهمة في الذاكرة تلقائياً (save_memory).
`

const AGENT_SYSTEM = `أنت وكيل ذكي متكامل لشركة موج للهدايا الكريستالية في الإمارات.
مهمتك تنفيذ المهام المعقدة بدقة، تحليل البيانات، وتحسين النظام.
أجب دائماً بالعربية. كن دقيقاً وعملياً.
لا تُظهر تفكيرك الداخلي. لا تكتب THOUGHT أو أفكر في ردودك.
احفظ كل ملاحظة مهمة في الذاكرة تلقائياً.

قواعد صارمة للردود:
- بعد كل [RESULT:...] حلّل البيانات وقدّم ردّاً واضحاً بالعربية — لا تعرض JSON خاماً أبداً.
- اعرض الأرقام والنتائج بتنسيق قابل للقراءة مع رموز تعبيرية.
- إذا وجدت مشاكل أو فرص، اذكرها بوضوح مع التوصيات.
- استخدم save_memory تلقائياً بعد كل تحليل لحفظ الأنماط والملاحظات — بدون انتظار طلب من المستخدم.
- كل نتيجة من analyze_system أو detect_anomalies يجب أن تُحفظ في الذاكرة فوراً.
- المفاتيح المقترحة: "stock_issues", "replacement_rate", "top_city", "cod_pending", "system_health".
${TOOL_DEFS}`

// ── Styling ───────────────────────────────────────────────────
const S = {
  card:  { background: 'var(--bg-glass)', border: '1.5px solid var(--glass-border)', borderRadius: 'var(--r-lg,16px)', padding: 16 },
  step:  (st) => ({ display: 'flex', gap: 10, padding: '10px 12px', background: st === 'done' ? 'rgba(56,189,248,0.05)' : st === 'error' ? 'rgba(239,68,68,0.05)' : st === 'confirm' ? 'rgba(245,158,11,0.08)' : 'var(--bg-hover)', border: `1px solid ${st === 'done' ? 'rgba(56,189,248,0.2)' : st === 'error' ? 'rgba(239,68,68,0.2)' : st === 'confirm' ? 'rgba(245,158,11,0.2)' : 'var(--bg-border)'}`, borderRadius: 'var(--r-md,12px)', transition: 'all 0.2s' }),
  pill:  (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${color}18`, color }),
  btn:   (v = 'primary') => ({ padding: '8px 16px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: v === 'primary' ? 'linear-gradient(135deg,var(--action),var(--action-deep))' : v === 'danger' ? 'rgba(239,68,68,0.1)' : v === 'confirm' ? 'rgba(245,158,11,0.15)' : 'var(--bg-hover)', color: v === 'primary' ? '#ffffff' : v === 'danger' ? 'var(--danger,#ef4444)' : v === 'confirm' ? '#f59e0b' : 'var(--text)', transition: 'all 0.15s' }),
  input: { padding: '9px 13px', background: 'var(--bg-hover)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' },
}

const TOOL_ICONS = { get_summary: '📊', list_orders: '📋', search_order: '🔍', get_customer_history: '👤', reconcile_hayyak_cod: '🔄', detect_anomalies: '⚠️', search_memory: '🧠', analyze_system: '🔬', generate_whatsapp_report: '📱', calculate_partner_split: '🤝', update_orders_status: '✏️', create_order: '🛒', update_inventory: '📦', add_expense: '💸', create_remittance: '🏦', link_remittance: '🔗', send_whatsapp: '💬', save_memory: '💾', delete_memory: '🗑️', execute_custom_tool: '⚙️' }
const TOOL_LABELS = { get_summary: 'ملخص النظام', list_orders: 'عرض الطلبات', search_order: 'بحث طلب', get_customer_history: 'تاريخ العميل', reconcile_hayyak_cod: 'تسوية حياك', detect_anomalies: 'كشف انحرافات', search_memory: 'بحث ذاكرة', analyze_system: 'تحليل النظام', generate_whatsapp_report: 'تقرير واتساب', calculate_partner_split: 'حساب الأرباح', update_orders_status: 'تحديث الحالة', create_order: 'إنشاء طلب', update_inventory: 'تحديث المخزون', add_expense: 'إضافة مصروف', create_remittance: 'حوالة حياك', link_remittance: 'ربط حوالة', send_whatsapp: 'إرسال واتساب', save_memory: 'حفظ في الذاكرة', delete_memory: 'حذف من الذاكرة', execute_custom_tool: 'أداة مخصصة' }

const QUICK_TASKS = [
  { icon: '🔬', label: 'تحليل النظام',    task: 'افحص النظام بالكامل واكشف أي مشاكل أو فرص للتحسين، ثم احفظ ملاحظاتك في الذاكرة' },
  { icon: '📊', label: 'تقرير الصباح',    task: 'أنشئ تقرير اليوم مقارنةً بالأمس وأرسله على واتساب لجميع المستخدمين' },
  { icon: '⚠️', label: 'فحص انحرافات',   task: 'افحص الأداء، اكشف الانحرافات، وأخبرني بما يحتاج تدخلاً فورياً' },
  { icon: '🔄', label: 'تسوية حياك',     task: 'حلل الطلبات المسلّمة بدون حوالة حياك وقترح المطابقة' },
  { icon: '🤝', label: 'حساب الأرباح',   task: 'احسب حصص إبراهيم وإحسان لهذا الشهر مع تفاصيل المسحوبات' },
  { icon: '📱', label: 'ملخص أسبوعي',    task: 'أنشئ ملخصاً أسبوعياً شاملاً مع التوصيات وأرسله على واتساب' },
  { icon: '✅', label: 'أكّد الطلبات',   task: 'اعرض الطلبات مع حياك أكثر من 3 أيام واقترح تحديث حالتها لمسلّم' },
  { icon: '🧠', label: 'استعرض ذاكرتي',  task: 'اعرض كل ما تحفظه عن النظام والأنماط التي لاحظتها' },
]

// ── Main Component ─────────────────────────────────────────────
export default function AgentPage({ user, onNavigate }) {
  const [tab, setTab]                   = useState('task')
  const [input, setInput]               = useState('')
  const [running, setRunning]           = useState(false)
  const [dryRun, setDryRun]             = useState(false)
  const [steps, setSteps]               = useState([])
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [confirmResolve, setConfirmResolve] = useState(null)
  const [undoStack]                     = useState([])
  const [costTracker, setCostTracker]   = useState({ totalCost: 0, totalRuns: 0, totalTokens: 0 })
  const [aiCfg, setAiCfg]               = useState(null)
  const [waConfig, setWaConfig]         = useState(null)
  // Memory tab
  const [memories, setMemories]         = useState([])
  const [memSearch, setMemSearch]       = useState('')
  const [memLoading, setMemLoading]     = useState(false)
  const [editingMem, setEditingMem]     = useState(null)
  // Workflows tab
  const [workflows, setWorkflows]       = useState([])
  const [newWf, setNewWf]               = useState({ name: '', tasks: [''], icon: '⚡', schedule: null })
  const [wfRunning, setWfRunning]       = useState(null)
  // Custom tools tab
  const [customTools, setCustomTools]   = useState([])
  const [newTool, setNewTool]           = useState({ name: '', label: '', description: '', sql_query: '' })
  // Analytics
  const [runs, setRuns]                 = useState([])
  const stepsEndRef                     = useRef()

  useEffect(() => {
    SettingsDB.get('ai_settings').then(v => v && setAiCfg(v))
    SettingsDB.get('whatsapp_config').then(v => v && setWaConfig(v))
    loadWorkflows()
    loadCustomTools()
    loadRuns()
    loadCostTracker()
  }, [])

  useEffect(() => { stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [steps])

  async function loadMemories() {
    setMemLoading(true)
    const { data } = await supabase.from('agent_memory').select('*').order('importance', { ascending: false }).limit(100)
    setMemories(data || [])
    setMemLoading(false)
  }

  async function loadWorkflows() {
    const { data } = await supabase.from('agent_workflows').select('*').order('created_at', { ascending: false })
    setWorkflows(data || [])
  }

  async function loadCustomTools() {
    const { data } = await supabase.from('agent_custom_tools').select('*').order('created_at', { ascending: false })
    setCustomTools(data || [])
  }

  async function loadRuns() {
    const { data } = await supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(50)
    setRuns(data || [])
  }

  async function loadCostTracker() {
    const { data } = await supabase.from('agent_runs').select('cost_usd,input_tokens,output_tokens')
    if (data) {
      setCostTracker({
        totalCost: data.reduce((s, r) => s + (r.cost_usd || 0), 0),
        totalRuns: data.length,
        totalTokens: data.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
      })
    }
  }

  // ── Confirmation ────────────────────────────────────────────
  async function waitForConfirm(stepId) {
    return new Promise(resolve => {
      setPendingConfirm(stepId)
      setConfirmResolve(() => resolve)
    })
  }
  function handleConfirm(confirmed) {
    setPendingConfirm(null)
    if (confirmResolve) { confirmResolve(confirmed); setConfirmResolve(null) }
  }

  // ── Undo last action ────────────────────────────────────────
  async function handleUndo() {
    if (!undoStack.length) return
    const last = undoStack.pop()
    try {
      if (last.action === 'update_orders_status' && last.data) {
        for (const o of last.data) {
          await supabase.from('orders').update({ status: o.status }).eq('id', o.id)
        }
        setSteps(prev => [...prev, { id: 'undo-' + Date.now(), type: 'system', content: `↩️ تم التراجع: استعادة حالة ${last.data.length} طلب`, status: 'done' }])
      } else if ((last.action === 'add_expense' || last.action === 'create_order' || last.action === 'create_remittance') && last.data?.id) {
        const tableMap = { add_expense: 'expenses', create_order: 'orders', create_remittance: 'hayyak_remittances' }
        await supabase.from(tableMap[last.action]).delete().eq('id', last.data.id)
        setSteps(prev => [...prev, { id: 'undo-' + Date.now(), type: 'system', content: `↩️ تم التراجع: حذف ${last.action}`, status: 'done' }])
      }
    } catch (e) {
      setSteps(prev => [...prev, { id: 'undo-err-' + Date.now(), type: 'error', content: `خطأ في التراجع: ${e.message}`, status: 'error' }])
    }
  }

  // ── Agentic loop ─────────────────────────────────────────────
  const runAgent = useCallback(async (taskText, label) => {
    const text = taskText || input.trim()
    if (!text || running) return
    setInput('')
    setRunning(true)
    setSteps([])
    setTab('task')
    undoStack.length = 0

    const model     = aiCfg?.model     || 'claude-sonnet-4-20250514'
    const maxTokens = aiCfg?.max_tokens || 1500
    const apiKeys   = aiCfg?.api_keys   || {}

    setSteps([{ id: 'task-0', type: 'user', content: label || text, status: 'done' }])

    // Load memories for context
    const { data: mems } = await supabase.from('agent_memory').select('key,value,importance').order('importance', { ascending: false }).limit(25)
    const memCtx = mems?.length ? `\nذاكرتي عن هذا النظام:\n${mems.map(m => `• ${m.key}: ${m.value}`).join('\n')}` : ''

    const sysPrompt = AGENT_SYSTEM + memCtx + (dryRun ? '\n\n⚠️ وضع التجريب مفعّل — لا تنفذ أي تعديلات على البيانات فعلياً.' : '')

    const messages = [{ role: 'user', content: text }]
    let iterations = 0
    let totalInTokens = 0
    let totalOutTokens = 0
    const MAX_ITER = 15

    while (iterations < MAX_ITER) {
      iterations++
      const thinkId = `think-${iterations}`
      setSteps(prev => [...prev, { id: thinkId, type: 'thinking', content: `يفكّر... (خطوة ${iterations})`, status: 'running' }])

      let aiText = ''
      try {
        const fullHistory = messages.map(m => ({ role: m.role, content: m.content }))
        totalInTokens += fullHistory.reduce((s, m) => s + estimateTokens(m.content), 0) + estimateTokens(sysPrompt)
        aiText = await callAI(fullHistory, sysPrompt, model, maxTokens, apiKeys)
        totalOutTokens += estimateTokens(aiText)
      } catch (err) {
        setSteps(prev => prev.filter(s => s.id !== thinkId))
        setSteps(prev => [...prev, { id: `err-${iterations}`, type: 'error', content: `خطأ في الاتصال: ${err.message}`, status: 'error' }])
        break
      }
      setSteps(prev => prev.filter(s => s.id !== thinkId))

      const toolCall  = parseToolCall(aiText)
      const visible   = stripToolCall(aiText)
      if (visible) setSteps(prev => [...prev, { id: `msg-${iterations}`, type: toolCall ? 'msg' : 'answer', content: visible, status: 'done' }])
      if (!toolCall) break

      const isMutation = MUTATION_TOOLS.has(toolCall.name) && !dryRun
      const stepId = `tool-${iterations}-${toolCall.name}`
      setSteps(prev => [...prev, { id: stepId, type: 'tool', tool: toolCall.name, params: toolCall.params, status: isMutation ? 'confirm' : 'running', result: null }])

      if (isMutation) {
        const confirmed = await waitForConfirm(stepId)
        if (!confirmed) {
          setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'cancelled' } : s))
          messages.push({ role: 'assistant', content: aiText })
          messages.push({ role: 'user', content: '[RESULT:{"ok":false,"cancelled":true}]' })
          continue
        }
      }

      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'running' } : s))
      let result
      try {
        result = await executeTool(toolCall.name, toolCall.params, undoStack, dryRun)
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'done', result } : s))

        // ── Auto-save key findings to memory ──────────────────
        if (!dryRun && toolCall.name === 'analyze_system' && result.issues) {
          const high = result.issues.filter(i => i.severity === 'high').map(i => i.msg).join(' | ')
          const impr = result.improvements?.map(i => i.msg).join(' | ') || ''
          if (high) await supabase.from('agent_memory').upsert({ key: 'system_issues_latest', value: high, category: 'alert', importance: 8, access_count: 0, tags: ['system_analysis'], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
          if (impr) await supabase.from('agent_memory').upsert({ key: 'system_improvements_latest', value: impr, category: 'improvement', importance: 6, tags: ['system_analysis'], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
          await supabase.from('agent_memory').upsert({ key: 'last_system_scan', value: `فُحص في ${new Date().toLocaleDateString('ar-AE')} — ${result.summary?.total_issues || 0} مشكلة، ${result.summary?.total_improvements || 0} فرصة`, category: 'observation', importance: 5, access_count: 0, tags: ['system_analysis'], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
        }
        if (!dryRun && toolCall.name === 'detect_anomalies' && result.anomalies?.length) {
          const msg = result.anomalies.map(a => a.msg).join(' | ')
          await supabase.from('agent_memory').upsert({ key: 'latest_anomalies', value: msg, category: 'alert', importance: 8, tags: ['anomaly'], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
        }
        if (!dryRun && toolCall.name === 'get_summary' && result.month) {
          const val = `إيرادات الشهر ${result.month.revenue?.toFixed(0)} د.إ | صافي ${result.month.net?.toFixed(0)} د.إ | طلبات ${result.month.orders} | استبدال ${result.month.replacements}`
          await supabase.from('agent_memory').upsert({ key: 'last_monthly_summary', value: val, category: 'observation', importance: 6, tags: ['summary'], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
        }
        if (!dryRun && toolCall.name === 'calculate_partner_split' && result.partners) {
          const val = result.partners.map(p => `${p.name}: صافي ${p.net_share?.toFixed(0)} د.إ (${p.share_pct}%)`).join(' | ')
          await supabase.from('agent_memory').upsert({ key: 'last_partner_split', value: val, category: 'decision', importance: 7, tags: ['partners','finance'], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
        }
      } catch (err) {
        result = { ok: false, error: err.message }
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'error', result } : s))
      }

      messages.push({ role: 'assistant', content: aiText })
      messages.push({ role: 'user', content: `[RESULT:${JSON.stringify(result)}]` })
    }

    if (iterations >= MAX_ITER) {
      setSteps(prev => [...prev, { id: 'limit', type: 'error', content: 'وصل الوكيل للحد الأقصى (15 خطوة). قسّم المهمة.', status: 'error' }])
    }

    // Cost tracking
    const cost = estimateCost(model, totalInTokens, totalOutTokens)
    await supabase.from('agent_runs').insert({
      task: label || text, model,
      input_tokens: totalInTokens, output_tokens: totalOutTokens, cost_usd: cost,
      triggered_by: 'user', status: 'completed', completed_at: new Date().toISOString(),
    })
    setCostTracker(prev => ({ totalCost: prev.totalCost + cost, totalRuns: prev.totalRuns + 1, totalTokens: prev.totalTokens + totalInTokens + totalOutTokens }))

    setRunning(false)
  }, [input, running, aiCfg, dryRun, undoStack])

  // ── Save workflow ────────────────────────────────────────────
  async function saveWorkflow() {
    if (!newWf.name.trim() || !newWf.tasks[0]?.trim()) return
    const { data } = await supabase.from('agent_workflows').insert([{ name: newWf.name, icon: newWf.icon, tasks: newWf.tasks.filter(Boolean), schedule: newWf.schedule, enabled: false }]).select().single()
    if (data) { setWorkflows(prev => [data, ...prev]); setNewWf({ name: '', tasks: [''], icon: '⚡', schedule: null }) }
  }

  async function toggleWorkflow(id, enabled) {
    await supabase.from('agent_workflows').update({ enabled }).eq('id', id)
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled } : w))
  }

  async function deleteWorkflow(id) {
    await supabase.from('agent_workflows').delete().eq('id', id)
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  // ── Save custom tool ─────────────────────────────────────────
  async function saveCustomTool() {
    if (!newTool.name.trim() || !newTool.sql_query.trim()) return
    const { data } = await supabase.from('agent_custom_tools').insert([{ ...newTool, enabled: true }]).select().single()
    if (data) { setCustomTools(prev => [data, ...prev]); setNewTool({ name: '', label: '', description: '', sql_query: '' }) }
  }

  async function deleteCustomTool(id) {
    await supabase.from('agent_custom_tools').delete().eq('id', id)
    setCustomTools(prev => prev.filter(t => t.id !== id))
  }

  // ── Memory operations ────────────────────────────────────────
  async function saveMem(id, key, value, importance) {
    await supabase.from('agent_memory').update({ key, value, importance, updated_at: new Date().toISOString() }).eq('id', id)
    setMemories(prev => prev.map(m => m.id === id ? { ...m, key, value, importance } : m))
    setEditingMem(null)
  }

  async function deleteMem(id) {
    await supabase.from('agent_memory').delete().eq('id', id)
    setMemories(prev => prev.filter(m => m.id !== id))
  }

  const TABS = [
    { id: 'task', label: 'مهمة', icon: '⚡' },
    { id: 'workflows', label: 'سير العمل', icon: '🔁' },
    { id: 'memory', label: 'الذاكرة', icon: '🧠' },
    { id: 'tools', label: 'أدوات مخصصة', icon: '⚙️' },
    { id: 'analytics', label: 'التكاليف', icon: '📊' },
  ]

  const filteredMems = memories.filter(m => !memSearch || m.key?.toLowerCase().includes(memSearch.toLowerCase()) || m.value?.toLowerCase().includes(memSearch.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', direction: 'rtl', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,var(--action),var(--action-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 24px rgba(56,189,248,0.3)' }}>🤖</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>وكيل موج v2</h2>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>20 أداة · ذاكرة دائمة · واتساب · تحليل النظام</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {aiCfg?.model && <span style={S.pill('var(--action)')}>{aiCfg.model.split('-').slice(0, 3).join('-')}</span>}
          <span style={S.pill(dryRun ? '#f59e0b' : 'var(--text-muted)')}>{dryRun ? '🧪 تجريبي' : '⚡ حي'}</span>
          <button onClick={() => setDryRun(d => !d)} style={{ ...S.btn(''), fontSize: 11, padding: '5px 10px' }}>
            {dryRun ? 'إلغاء التجريب' : 'وضع تجريبي'}
          </button>
          {undoStack.length > 0 && <button onClick={handleUndo} style={{ ...S.btn('danger'), fontSize: 11, padding: '5px 10px' }}>↩️ تراجع</button>}
          {running && <span style={{ ...S.pill('#f59e0b'), animation: 'pulse 1s ease infinite' }}>⚡ يعمل...</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '16px 20px 0', borderBottom: '1px solid var(--bg-border)', gap: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'memory') loadMemories() }} style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: tab === t.id ? 800 : 500, background: 'none', color: tab === t.id ? 'var(--action)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--action)' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ TASK TAB ══ */}
      {tab === 'task' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dryRun && (
              <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--r-sm)', fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                🧪 وضع تجريبي — الوكيل سيخطط ويُحلل بدون تعديل أي بيانات
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) runAgent() }} placeholder="اوصف المهمة... مثال: حلّل الطلبات المعلقة وأخبرني بما يحتاج تدخلاً الآن" rows={2} disabled={running} style={{ ...S.input, flex: 1, resize: 'none', maxHeight: 120, opacity: running ? 0.6 : 1 }} />
              <button onClick={() => runAgent()} disabled={running || !input.trim()} style={{ ...S.btn('primary'), padding: '10px 20px', flexShrink: 0, opacity: running || !input.trim() ? 0.5 : 1 }}>
                {running ? '⏳' : '▶ تشغيل'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ctrl+Enter للتشغيل</div>
          </div>

          {steps.length === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8 }}>
              {QUICK_TASKS.map(q => (
                <button key={q.label} onClick={() => runAgent(q.task, `${q.icon} ${q.label}`)} disabled={running} style={{ ...S.card, cursor: 'pointer', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', border: '1px solid var(--bg-border)', transition: 'border-color 0.15s', opacity: running ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bg-border)'}>
                  <div style={{ fontSize: 22 }}>{q.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{q.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{q.task.slice(0, 55)}...</div>
                </button>
              ))}
            </div>
          )}

          {steps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map(s => (
                <div key={s.id} style={S.step(s.status)}>
                  <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                    {s.type === 'user' ? '💬' : s.type === 'thinking' ? '⏳' : s.type === 'answer' ? '✅' : s.type === 'error' ? '❌' : s.type === 'system' ? '🔧' : s.type === 'tool' ? (TOOL_ICONS[s.tool] || '⚙️') : '🤖'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {s.type === 'tool' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{TOOL_LABELS[s.tool] || s.tool}</span>
                        <span style={{ ...S.pill(s.status === 'done' ? 'var(--action)' : s.status === 'error' ? '#ef4444' : s.status === 'confirm' ? '#f59e0b' : s.status === 'cancelled' ? 'var(--text-muted)' : 'var(--info-light)'), fontSize: 9 }}>
                          {s.status === 'done' ? '✓ تم' : s.status === 'error' ? '✗ خطأ' : s.status === 'confirm' ? '⚠️ تأكيد' : s.status === 'cancelled' ? 'ملغى' : '⏳'}
                        </span>
                        {MUTATION_TOOLS.has(s.tool) && <span style={S.pill('#ef4444')}>يعدّل</span>}
                        {s.status === 'done' && s.result?.dry_run && <span style={S.pill('#f59e0b')}>تجريبي</span>}
                      </div>
                    )}
                    {s.type === 'tool' && s.params && Object.keys(s.params).length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '5px 10px', borderRadius: 'var(--r-sm)', marginBottom: 6, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', wordBreak: 'break-all' }}>
                        {JSON.stringify(s.params).slice(0, 200)}
                      </div>
                    )}
                    {s.status === 'confirm' && pendingConfirm === s.id && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => handleConfirm(true)} style={{ ...S.btn('confirm'), fontSize: 12, padding: '6px 14px' }}>✓ نفّذ</button>
                        <button onClick={() => handleConfirm(false)} style={{ ...S.btn('danger'), fontSize: 12, padding: '6px 14px' }}>✕ إلغاء</button>
                      </div>
                    )}
                    {s.type === 'tool' && s.result && (
                      <details>
                        <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginTop: 4 }}>النتيجة ←</summary>
                        <div style={{ fontSize: 11, color: 'var(--text-sec)', background: 'var(--bg-hover)', padding: '8px', borderRadius: 'var(--r-sm)', marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto' }}>
                          {JSON.stringify(s.result, null, 2)}
                        </div>
                      </details>
                    )}
                    {s.result?.report && (
                      <div style={{ marginTop: 8, padding: 12, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 'var(--r-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#25d366' }}>📱 تقرير جاهز</span>
                          <button onClick={() => navigator.clipboard.writeText(s.result.report)} style={{ ...S.btn(''), fontSize: 10, padding: '3px 8px', background: 'rgba(37,211,102,0.15)', color: '#25d366' }}>نسخ</button>
                        </div>
                        <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', lineHeight: 1.6, color: 'var(--text)' }}>{s.result.report}</pre>
                      </div>
                    )}
                    {['user','msg','answer','error','thinking','system'].includes(s.type) && (
                      <div style={{ fontSize: 13, color: s.type === 'error' ? '#ef4444' : 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.content}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={stepsEndRef} />
              {!running && (
                <button onClick={() => setSteps([])} style={{ ...S.btn(''), fontSize: 11, alignSelf: 'flex-start', padding: '6px 12px' }}>↺ مهمة جديدة</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ WORKFLOWS TAB ══ */}
      {tab === 'workflows' && (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...S.card, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>➕ سير عمل جديد</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newWf.icon} onChange={e => setNewWf(p => ({ ...p, icon: e.target.value }))} style={{ ...S.input, width: 48, textAlign: 'center', fontSize: 18 }} placeholder="⚡" />
                <input value={newWf.name} onChange={e => setNewWf(p => ({ ...p, name: e.target.value }))} style={S.input} placeholder="اسم سير العمل..." />
              </div>
              {newWf.tasks.map((task, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 20, marginTop: 10 }}>{i + 1}.</span>
                  <input value={task} onChange={e => { const t = [...newWf.tasks]; t[i] = e.target.value; setNewWf(p => ({ ...p, tasks: t })) }} style={S.input} placeholder="نص المهمة..." />
                  {i > 0 && <button onClick={() => setNewWf(p => ({ ...p, tasks: p.tasks.filter((_, j) => j !== i) }))} style={{ ...S.btn('danger'), padding: '6px 10px', fontSize: 12 }}>✕</button>}
                </div>
              ))}
              <button onClick={() => setNewWf(p => ({ ...p, tasks: [...p.tasks, ''] }))} style={{ ...S.btn(''), fontSize: 11, alignSelf: 'flex-start', padding: '6px 12px' }}>+ إضافة خطوة</button>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={newWf.schedule?.type || ''} onChange={e => setNewWf(p => ({ ...p, schedule: e.target.value ? { type: e.target.value, hour: 9 } : null }))} style={{ ...S.input, width: 'auto', flex: 1 }}>
                  <option value="">بدون جدول (يدوي فقط)</option>
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                </select>
                {newWf.schedule?.type && (
                  <input type="number" min="0" max="23" value={newWf.schedule.hour || 9} onChange={e => setNewWf(p => ({ ...p, schedule: { ...p.schedule, hour: parseInt(e.target.value) } }))} style={{ ...S.input, width: 70 }} placeholder="الساعة" />
                )}
                {newWf.schedule?.type === 'weekly' && (
                  <select value={newWf.schedule.day || 0} onChange={e => setNewWf(p => ({ ...p, schedule: { ...p.schedule, day: parseInt(e.target.value) } }))} style={{ ...S.input, width: 'auto' }}>
                    {['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                )}
              </div>
              <button onClick={saveWorkflow} style={S.btn('primary')}>💾 حفظ سير العمل</button>
            </div>
          </div>

          {workflows.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>لا توجد سير عمل بعد.</div>}

          {workflows.map(wf => (
            <div key={wf.id} style={{ ...S.card, border: `1.5px solid ${wf.enabled ? 'rgba(56,189,248,0.25)' : 'var(--bg-border)'}`, opacity: wf.enabled ? 1 : 0.75 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20 }}>{wf.icon || '⚡'}</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{wf.name}</span>
                    {wf.schedule && <span style={S.pill('var(--info-light)')}>{wf.schedule.type === 'daily' ? `يومي ${wf.schedule.hour}:00` : wf.schedule.type === 'weekly' ? `أسبوعي / ${['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'][wf.schedule.day]}` : `شهري / يوم ${wf.schedule.day_of_month}`}</span>}
                    {wfRunning === wf.id && <span style={{ ...S.pill('#f59e0b'), animation: 'pulse 1s infinite' }}>⚡ يعمل</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {wf.tasks.map((t, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i + 1}. {t}</div>)}
                  </div>
                  {wf.last_run && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>آخر تشغيل: {new Date(wf.last_run).toLocaleString('ar-AE')}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => toggleWorkflow(wf.id, !wf.enabled)} style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', background: wf.enabled ? 'var(--action)' : 'var(--bg-hover)', position: 'relative', transition: 'background 150ms' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: wf.enabled ? 3 : 'auto', right: wf.enabled ? 'auto' : 3, transition: 'all 150ms' }} />
                  </button>
                  <button onClick={() => { setWfRunning(wf.id); runAgent(wf.tasks.join(' ثم '), wf.name).finally(() => setWfRunning(null)) }} disabled={running} style={{ ...S.btn(''), fontSize: 10, padding: '4px 8px' }}>▶ تشغيل</button>
                  <button onClick={() => deleteWorkflow(wf.id)} style={{ ...S.btn('danger'), fontSize: 10, padding: '4px 8px' }}>حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ MEMORY TAB ══ */}
      {tab === 'memory' && (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={memSearch} onChange={e => setMemSearch(e.target.value)} placeholder="ابحث في الذاكرة..." style={{ ...S.input, flex: 1 }} />
            <button onClick={loadMemories} style={{ ...S.btn(''), fontSize: 12, padding: '8px 14px' }}>تحديث</button>
          <button onClick={async () => {
            const { error } = await supabase.from('agent_memory').upsert({ key: 'memory_test', value: `اختبار ${new Date().toLocaleString('ar-AE')}`, category: 'general', importance: 1, access_count: 0, tags: [], updated_at: new Date().toISOString(), last_accessed: new Date().toISOString() }, { onConflict: 'key' })
            if (error) alert('خطأ: ' + error.message)
            else { await loadMemories(); alert('تم الحفظ ✓') }
          }} style={{ ...S.btn(''), fontSize: 12, padding: '8px 14px', background: 'rgba(56,189,248,0.1)', color: 'var(--action)' }}>🧪 اختبار الحفظ</button>
          </div>
          {memLoading && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>جاري التحميل...</div>}
          {!memLoading && filteredMems.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>لا توجد ذاكرة بعد. شغّل الوكيل وسيحفظ ملاحظاته تلقائياً.</div>}
          {filteredMems.map(m => (
            <div key={m.id} style={{ ...S.card, padding: '12px 14px' }}>
              {editingMem === m.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input defaultValue={m.key} id={`key-${m.id}`} style={S.input} placeholder="المفتاح" />
                  <textarea defaultValue={m.value} id={`val-${m.id}`} rows={3} style={{ ...S.input, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min={1} max={10} defaultValue={m.importance} id={`imp-${m.id}`} style={{ ...S.input, width: 80 }} />
                    <button onClick={() => saveMem(m.id, document.getElementById(`key-${m.id}`).value, document.getElementById(`val-${m.id}`).value, parseInt(document.getElementById(`imp-${m.id}`).value))} style={{ ...S.btn('primary'), flex: 1 }}>حفظ</button>
                    <button onClick={() => setEditingMem(null)} style={S.btn('')}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--action)' }}>{m.key}</span>
                      <span style={S.pill(m.importance >= 8 ? '#ef4444' : m.importance >= 5 ? '#f59e0b' : 'var(--text-muted)')}>أهمية {m.importance}</span>
                      <span style={S.pill('var(--info-light)')}>{m.category}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.5 }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(m.updated_at).toLocaleString('ar-AE')} · وصل {m.access_count || 0} مرة</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setEditingMem(m.id)} style={{ ...S.btn(''), fontSize: 11, padding: '4px 8px' }}>✏️</button>
                    <button onClick={() => deleteMem(m.id)} style={{ ...S.btn('danger'), fontSize: 11, padding: '4px 8px' }}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ CUSTOM TOOLS TAB ══ */}
      {tab === 'tools' && (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...S.card, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>➕ أداة مخصصة جديدة</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>اكتب استعلام SQL بمعاملات مثل: SELECT * FROM orders WHERE status = '{'{{status}}'}' LIMIT 10</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={newTool.name} onChange={e => setNewTool(p => ({ ...p, name: e.target.value }))} style={{ ...S.input, fontFamily: 'monospace', direction: 'ltr' }} placeholder="tool_name_snake_case" />
                <input value={newTool.label} onChange={e => setNewTool(p => ({ ...p, label: e.target.value }))} style={S.input} placeholder="الاسم العربي" />
              </div>
              <input value={newTool.description} onChange={e => setNewTool(p => ({ ...p, description: e.target.value }))} style={S.input} placeholder="وصف الأداة للمساعد الذكي..." />
              <textarea value={newTool.sql_query} onChange={e => setNewTool(p => ({ ...p, sql_query: e.target.value }))} rows={4} style={{ ...S.input, resize: 'vertical', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }} placeholder="SELECT * FROM orders WHERE status = '{{status}}' AND total > {{min_total}} LIMIT 20" />
              <button onClick={saveCustomTool} style={S.btn('primary')}>💾 حفظ الأداة</button>
            </div>
          </div>

          {customTools.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>لا توجد أدوات مخصصة. أنشئ أداة وسيستخدمها الوكيل تلقائياً.</div>}

          {customTools.map(t => (
            <div key={t.id} style={{ ...S.card, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{t.label}</span>
                    <span style={{ ...S.pill('var(--action)'), fontFamily: 'monospace', direction: 'ltr' }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t.description}</div>
                  <code style={{ fontSize: 10, color: 'var(--text-sec)', background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: 4, display: 'block', direction: 'ltr', textAlign: 'left', wordBreak: 'break-all' }}>{t.sql_query.slice(0, 120)}{t.sql_query.length > 120 ? '...' : ''}</code>
                </div>
                <button onClick={() => deleteCustomTool(t.id)} style={{ ...S.btn('danger'), fontSize: 11, padding: '5px 10px', flexShrink: 0 }}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ANALYTICS TAB ══ */}
      {tab === 'analytics' && (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'إجمالي التكلفة', value: `$${costTracker.totalCost.toFixed(4)}`, icon: '💵', color: 'var(--action)' },
              { label: 'عدد التشغيلات', value: costTracker.totalRuns, icon: '⚡', color: 'var(--info-light)' },
              { label: 'إجمالي الرموز', value: costTracker.totalTokens.toLocaleString(), icon: '🔢', color: 'var(--pink)' },
            ].map(stat => (
              <div key={stat.label} style={{ ...S.card, textAlign: 'center', padding: '14px 10px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>آخر التشغيلات</div>
            <button onClick={loadRuns} style={{ ...S.btn(''), fontSize: 11, padding: '5px 10px' }}>تحديث</button>
          </div>

          {runs.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>لا توجد سجلات بعد.</div>}

          {runs.slice(0, 30).map(run => (
            <div key={run.id} style={{ ...S.card, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.task}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>{new Date(run.created_at).toLocaleString('ar-AE')}</span>
                  {run.model && <span style={{ direction: 'ltr' }}>{run.model.split('-').slice(0, 3).join('-')}</span>}
                  {run.cost_usd > 0 && <span>${run.cost_usd.toFixed(5)}</span>}
                  {run.input_tokens > 0 && <span>{(run.input_tokens + run.output_tokens).toLocaleString()} رمز</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {run.triggered_by && <span style={S.pill(run.triggered_by === 'whatsapp' ? '#25d366' : run.triggered_by === 'cron' ? '#f59e0b' : 'var(--action)')}>{run.triggered_by === 'whatsapp' ? '💬' : run.triggered_by === 'cron' ? '⏰' : '👤'} {run.triggered_by}</span>}
                <span style={S.pill(run.status === 'completed' ? 'var(--action)' : '#ef4444')}>{run.status === 'completed' ? '✓' : '✗'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )
}
