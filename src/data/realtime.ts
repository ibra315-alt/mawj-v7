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
        const retries = (channels.get(name + ':retries') as number) || 0
        if (retries < 5) {
          const delay = Math.min(3000 * Math.pow(2, retries), 30000)
          channels.set(name + ':retries', retries + 1)
          console.warn(`[realtime] ${name} error, retry ${retries + 1}/5 in ${delay}ms`)
          setTimeout(() => subscribe(name, table, events, callback), delay)
        } else {
          console.error(`[realtime] ${name} — max retries reached, giving up`)
        }
      } else if (status === 'SUBSCRIBED') {
        channels.delete(name + ':retries')
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
