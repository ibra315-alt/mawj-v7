import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured')

    // Convert Anthropic-style messages to Gemini format
    const systemPrompt = body.system || ''
    const messages = body.messages || []

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents,
          generationConfig: {
            maxOutputTokens: body.max_tokens || 1000,
            temperature: 0.7,
          },
        }),
      }
    )

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      throw new Error(data.error?.message || `Gemini error ${geminiRes.status}`)
    }

    // Convert Gemini response to Anthropic-style format (so AIAssistant.jsx needs no changes)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتمكن من الإجابة.'
    const anthropicStyleResponse = {
      content: [{ type: 'text', text }]
    }

    return new Response(JSON.stringify(anthropicStyleResponse), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
