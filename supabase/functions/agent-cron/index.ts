// supabase/functions/agent-cron/index.ts
// ── True scheduled agent runner (called by pg_cron or external cron) ──
// Deploy: supabase functions deploy agent-cron
// Trigger via pg_cron every hour to check pending schedules

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Workflow {
  id: string
  name: string
  tasks: string[]
  schedule: { type: string; hour?: number; day?: number; day_of_month?: number } | null
  enabled: boolean
  last_run: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json().catch(() => ({}))
    const forceTrigger = body.trigger // e.g. 'daily_morning', 'weekly', 'monthly'

    const now = new Date()
    const hour    = now.getUTCHours() + 4  // GST = UTC+4
    const day     = now.getDay()            // 0=Sunday
    const dayOfMonth = now.getDate()

    // Load enabled workflows
    const { data: workflows } = await supabase
      .from('agent_workflows')
      .select('*')
      .eq('enabled', true)

    const toRun: Workflow[] = []

    for (const wf of (workflows || []) as Workflow[]) {
      if (!wf.schedule) continue
      const lastRun = wf.last_run ? new Date(wf.last_run) : null
      const alreadyRanToday = lastRun && lastRun.toDateString() === now.toDateString()
      if (alreadyRanToday && !forceTrigger) continue

      const sch = wf.schedule
      let shouldRun = false

      if (forceTrigger) {
        shouldRun = true
      } else if (sch.type === 'daily' && sch.hour === hour) {
        shouldRun = true
      } else if (sch.type === 'weekly' && sch.day === day && sch.hour === hour) {
        shouldRun = true
      } else if (sch.type === 'monthly' && sch.day_of_month === dayOfMonth && sch.hour === hour) {
        shouldRun = true
      }

      if (shouldRun) toRun.push(wf)
    }

    const results = []

    for (const wf of toRun) {
      // Load WhatsApp config to know who to send results to
      const { data: waCfg } = await supabase
        .from('settings').select('value').eq('key', 'whatsapp_config').single()
      const waConfig = waCfg?.value || {}
      const recipients = waConfig.recipients || []
      const numbers = recipients.filter((r: { number: string; enabled: boolean }) => r.enabled).map((r: { number: string }) => r.number)

      // Load AI config
      const { data: aiCfg } = await supabase
        .from('settings').select('value').eq('key', 'ai_settings').single()
      const aiSettings = aiCfg?.value || {}
      const geminiKey = Deno.env.get('GEMINI_API_KEY')

      // Load context for AI
      const { data: orders }  = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500)
      const { data: expenses } = await supabase.from('expenses').select('*').order('date', { ascending: false }).limit(100)
      const { data: memories } = await supabase.from('agent_memory').select('*').order('importance', { ascending: false }).limit(30)

      const ordersData = orders || []
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const todayOrds  = ordersData.filter((o: Record<string, unknown>) => new Date(String(o.order_date || o.created_at)) >= todayStart)
      const monthOrds  = ordersData.filter((o: Record<string, unknown>) => new Date(String(o.order_date || o.created_at)) >= monthStart)
      const tRev = todayOrds.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.total) || 0), 0)
      const mRev = monthOrds.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.total) || 0), 0)
      const mGP  = monthOrds.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.gross_profit) || 0), 0)
      const mExp = (expenses || []).filter((e: Record<string, unknown>) => new Date(String(e.date)) >= monthStart).reduce((s: number, e: Record<string, unknown>) => s + (Number(e.amount) || 0), 0)
      const inProgress = ordersData.filter((o: Record<string, unknown>) => ['new','ready','with_hayyak'].includes(String(o.status)))
      const pendingCOD = ordersData.filter((o: Record<string, unknown>) => o.status === 'delivered' && !o.hayyak_remittance_id)

      const memCtx = (memories || []).map((m: Record<string, unknown>) => `- ${m.key}: ${m.value}`).join('\n')

      const systemPrompt = `أنت وكيل موج التلقائي. تاريخ اليوم: ${now.toLocaleDateString('ar-AE')}
بيانات النظام:
اليوم: ${todayOrds.length} طلب | إيرادات ${tRev.toFixed(0)} د.إ
هذا الشهر: ${monthOrds.length} طلب | إيرادات ${mRev.toFixed(0)} د.إ | ربح ${mGP.toFixed(0)} د.إ | مصاريف ${mExp.toFixed(0)} د.إ | صافي ${(mGP - mExp).toFixed(0)} د.إ
قيد المعالجة: ${inProgress.length} طلب | COD معلق: ${pendingCOD.length} طلب
ذاكرة الوكيل:\n${memCtx || 'لا توجد ذاكرة بعد'}

أنجز المهمة وأنشئ رداً موجزاً مناسباً لإرساله على واتساب.
لا تستخدم markdown معقد.`

      let runResult = ''

      for (const task of wf.tasks) {
        if (!geminiKey) { runResult = 'مفتاح Gemini غير موجود'; break }

        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: task }] }],
              generationConfig: { maxOutputTokens: 1000, temperature: 0.6 },
            }),
          }
        )
        const aiData = await aiRes.json()
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        runResult += (runResult ? '\n\n---\n\n' : '') + text
      }

      // Send to WhatsApp recipients
      const waToken   = Deno.env.get('WHATSAPP_TOKEN')
      const waPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')

      if (waToken && waPhoneId && numbers.length > 0 && runResult) {
        const finalMsg = `🤖 *موج — ${wf.name}*\n${now.toLocaleDateString('ar-AE')} ${String(hour).padStart(2,'0')}:00\n\n${runResult}`
        for (const num of numbers) {
          const normalized = num.replace(/[\s\-\(\)]/g, '').replace(/^0/, '971')
          await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp', to: normalized, type: 'text',
              text: { body: finalMsg },
            }),
          })
        }
      }

      // Update last_run
      await supabase.from('agent_workflows').update({ last_run: now.toISOString(), run_count: (wf as Workflow & { run_count?: number }).run_count ?? 0 + 1 }).eq('id', wf.id)

      // Log run
      await supabase.from('agent_runs').insert({
        task: `[جدول] ${wf.name}: ${wf.tasks.join(' + ')}`,
        triggered_by: 'cron',
        status: 'completed',
        whatsapp_to: numbers.join(', '),
        model: 'gemini-2.5-flash',
        completed_at: now.toISOString(),
      })

      results.push({ workflow: wf.name, ok: true, sent_to: numbers.length })
    }

    return new Response(JSON.stringify({ ok: true, ran: results.length, results }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
