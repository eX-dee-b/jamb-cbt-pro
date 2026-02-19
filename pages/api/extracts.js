export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType, subject } = req.body

  if (!imageBase64 || !subject) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `Extract ALL multiple-choice questions from this JAMB past question image. Return ONLY a raw JSON array, nothing else. Each item: {"q":"question text","opts":["A","B","C","D"],"ans":0,"subject":"${subject}","exp":"explanation"}. Strip question numbers and option labels. Use knowledge to determine correct answer if not marked. Return [] if no questions found.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.error?.message || 'API error' })
    }

    const data = await response.json()
    const raw = (data.content || []).map(c => c.type === 'text' ? c.text : '').join('').trim()
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    if (!clean || clean === '[]') return res.status(200).json({ questions: [] })

    let parsed
    try { parsed = JSON.parse(clean) }
    catch {
      const m = clean.match(/\[[\s\S]*\]/)
      if (m) parsed = JSON.parse(m[0])
      else return res.status(200).json({ questions: [] })
    }

    const valid = Array.isArray(parsed) ? parsed.filter(x =>
      x && typeof x.q === 'string' && x.q.trim() &&
      Array.isArray(x.opts) && x.opts.length === 4 &&
      typeof x.ans === 'number' && x.ans >= 0 && x.ans <= 3
    ) : []

    return res.status(200).json({ questions: valid })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
