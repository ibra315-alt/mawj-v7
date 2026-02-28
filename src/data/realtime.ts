/* ══════════════════════════════════════════════════
   REALTIME MANAGER v9 — TypeScript
   Single place for all Supabase subscriptions.
   Prevents duplicate channels across components.
══════════════════════════════════════════════════ */

import { supabase } from './db'
import type { RealtimePayload, RealtimeEventType } from '../types'

const channels = new Map<string, any>()

export function subscribe(
  name: string,
  table: string,
  events: RealtimeEventType,
  callback: (payload: RealtimePayload) => void
): () => void {
  if (channels.has(name)) {
    supabase.removeChannel(channels.get(name))
  }

  const channel = supabase
    .channel(name)
    .on('postgres_changes', { event: events as any, schema: 'public', table }, callback as any)
    .subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR') {
        setTimeout(() => subscribe(name, table, events, callback), 3000)
      }
    })

  channels.set(name, channel)
  return () => {
    supabase.removeChannel(channel)
    channels.delete(name)
  }
}

export function subscribeOrders(cb: () => void)    { return subscribe('rt-orders',    'orders',    '*', cb as any) }
export function subscribeInventory(cb: () => void) { return subscribe('rt-inventory', 'inventory', '*', cb as any) }
export function subscribeExpenses(cb: () => void)  { return subscribe('rt-expenses',  'expenses',  '*', cb as any) }

export function unsubscribeAll() {
  channels.forEach(ch => supabase.removeChannel(ch))
  channels.clear()
}
