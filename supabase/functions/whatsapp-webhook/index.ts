// supabase/functions/whatsapp-webhook/index.ts
// ── Receives WhatsApp messages and responds via agent ─────
// Deploy: supabase functions deploy whatsapp-webhook
// Register this URL as webhook in Meta Developer Console:
//   https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-webhook
// Verify token: use any string you set in WHATSAPP_VERIFY_TOKEN

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const url = new URL(req.url)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── GET: Webhook verification (Meta handshake) ─────────
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    const expected  = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'mawj_verify_2024'

    if (mode === 'subscribe' && token === expected) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // ── POST: Incoming message ─────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const entry   = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value   = changes?.value
      const msg     = value?.messages?.[0]

      if (!msg || msg.type !== 'text') return new Response('ok', { status: 200 })

      const fromNumber = msg.from       // sender phone number
      const msgText    = msg.text.body  // message text

      // ── Check if sender is authorized ─────────────────
      const { data: waConfig } = await supabase
        .from('settings').select('value').eq('key', 'whatsapp_config').single()

      const config = waConfig?.value || {}
      const recipients: { number: string; name: string }[] = config.recipients || []
      const allowedNumbers = recipients.map((r: { number: string }) =>
        r.number.replace(/[\s\-\(\)]/g, '').replace(/^0/, '971')
      )

      const normalizedFrom = fromNumber.replace(/^971/, '971')
      if (!allowedNumbers.includes(normalizedFrom)) {
        console.log(`Unauthorized sender: ${fromNumber}`)
        return new Response('ok', { status: 200 })
      }

      const senderName = recipients.find((r: { number: string; name: string }) =>
        r.number.replace(/[\s\-\(\)]/g, '').replace(/^0/, '971') === normalizedFrom
      )?.name || 'المستخدم'

      // ── Build system context ───────────────────────────
      const now = new Date()
      const { data: orders }   = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500)
      const { data: expenses } = await supabase.from('expenses').select('*').order('date', { ascending: false }).limit(100)
      const { data: memories } = await supabase.from('agent_memory').select('*').order('importance', { ascending: false }).limit(20)

      const ordersData = orders || []
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const todayOrds = ordersData.filter((o: Record<string, unknown>) => new Date(String(o.order_date || o.created_at)) >= todayStart)
      const monthOrds = ordersData.filter((o: Record<string, unknown>) => new Date(String(o.order_date || o.created_at)) >= monthStart)
      const tRev = todayOrds.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.total) || 0), 0)
      const mRev = monthOrds.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.total) || 0), 0)
      const mGP  = monthOrds.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.gross_profit) || 0), 0)
      const inProgress = ordersData.filter((o: Record<string, unknown>) => ['new','ready','with_hayyak'].includes(String(o.status)))

      const memoryCtx = memories?.length
        ? `\nذاكرة الوكيل:\n${memories.map((m: Record<string, unknown>) => `- ${m.key}: ${m.value}`).join('\n')}`
        : ''

      const systemPrompt = `أنت وكيل موج للهدايا الكريستالية في الإمارات.
المستخدم الذي يراسلك الآن: ${senderName} (${fromNumber})
اليوم: ${now.toLocaleDateString('ar-AE')}

بيانات النظام:
اليوم: ${todayOrds.length} طلب، إيرادات ${tRev.toFixed(0)} د.إ
هذا الشهر: ${monthOrds.length} طلب، إيرادات ${mRev.toFixed(0)} د.إ، ربح إجمالي ${mGP.toFixed(0)} د.إ
قيد المعالجة: ${inProgress.length} طلب
${memoryCtx}

أجب بإيجاز ووضوح. الرد سيُرسل مباشرة على واتساب، فاجعله مناسباً للقراءة على الجوال.
لا تستخدم تنسيق Markdown معقد — استخدم * للتمييز فقط.
يمكنك الإجابة على أسئلة البيانات، تقديم تقارير، ونصائح تشغيلية.`

      // ── Call AI ────────────────────────────────────────
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      let replyText = 'عذراً، لم أتمكن من المعالجة. حاول مجدداً.'

      if (geminiKey) {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: msgText }] }],
              generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
            }),
          }
        )
        const aiData = await aiRes.json()
        replyText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || replyText
      }

      // ── Send reply via WhatsApp ────────────────────────
      const waToken   = Deno.env.get('WHATSAPP_TOKEN')
      const waPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')

      if (waToken && waPhoneId) {
        await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to:   fromNumber,
            type: 'text',
            text: { body: replyText },
          }),
        })
      }

      // ── Log run ────────────────────────────────────────
      await supabase.from('agent_runs').insert({
        task:         `واتساب من ${senderName}: ${msgText.slice(0, 80)}`,
        triggered_by: 'whatsapp',
        status:       'completed',
        whatsapp_to:  fromNumber,
        model:        'gemini-2.5-flash',
        completed_at: new Date().toISOString(),
      })

      return new Response('ok', { status: 200 })

    } catch (err: unknown) {
      console.error(err)
      return new Response('ok', { status: 200 }) // Always 200 to Meta
    }
  }

  return new Response('Not Found', { status: 404, headers: CORS })
})
