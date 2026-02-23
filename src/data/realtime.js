/* ══════════════════════════════════════════════════
   REALTIME MANAGER v9
   Single place for all Supabase subscriptions.
   Prevents duplicate channels across components.
══════════════════════════════════════════════════ */

import { supabase } from './db'

const channels = new Map()

export function subscribe(name, table, events, callback) {
  // Prevent duplicate subscriptions
  if (channels.has(name)) {
    supabase.removeChannel(channels.get(name))
  }

  const channel = supabase
    .channel(name)
    .on('postgres_changes', { event: events, schema: 'public', table }, callback)
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        // Auto-retry after 3 seconds
        setTimeout(() => subscribe(name, table, events, callback), 3000)
      }
    })

  channels.set(name, channel)
  return () => {
    supabase.removeChannel(channel)
    channels.delete(name)
  }
}

export function subscribeOrders(cb)    { return subscribe('rt-orders',    'orders',    '*', cb) }
export function subscribeInventory(cb) { return subscribe('rt-inventory', 'inventory', '*', cb) }
export function subscribeExpenses(cb)  { return subscribe('rt-expenses',  'expenses',  '*', cb) }

export function unsubscribeAll() {
  channels.forEach(ch => supabase.removeChannel(ch))
  channels.clear()
}
