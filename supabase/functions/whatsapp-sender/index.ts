// supabase/functions/whatsapp-sender/index.ts
// ── Sends WhatsApp messages via Meta Cloud API ────────────
// Deploy: supabase functions deploy whatsapp-sender
// Env vars needed: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth check ───────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    // ── Parse request ─────────────────────────────────────
    const { to, message, recipients } = await req.json()
    // `to` = single number | `recipients` = array of numbers
    const targets: string[] = recipients || (to ? [to] : [])
    if (!targets.length) throw new Error('No recipients specified')
    if (!message) throw new Error('No message provided')

    const token   = Deno.env.get('WHATSAPP_TOKEN')
    const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
    if (!token || !phoneId) throw new Error('WhatsApp credentials not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in Supabase secrets.')

    const results = []

    for (const number of targets) {
      // Normalize: remove spaces/dashes, ensure starts with country code
      const normalized = number.replace(/[\s\-\(\)]/g, '').replace(/^0/, '971')

      const waRes = await fetch(
        `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type:    'individual',
            to:                normalized,
            type:              'text',
            text:              { body: message, preview_url: false },
          }),
        }
      )

      const waData = await waRes.json()
      if (!waRes.ok) {
        results.push({ number: normalized, ok: false, error: waData.error?.message || `HTTP ${waRes.status}` })
      } else {
        results.push({ number: normalized, ok: true, message_id: waData.messages?.[0]?.id })
      }
    }

    // ── Log to agent_runs ──────────────────────────────────
    await supabase.from('agent_runs').insert({
      task: `WhatsApp: ${message.slice(0, 80)}...`,
      triggered_by: 'agent',
      status: results.every(r => r.ok) ? 'completed' : 'failed',
      whatsapp_to: targets.join(', '),
      completed_at: new Date().toISOString(),
    })

    const allOk = results.every(r => r.ok)
    return new Response(JSON.stringify({ ok: allOk, results }), {
      status: allOk ? 200 : 207,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
