// AI proxy — keeps Anthropic API call server-side so no CORS issues
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { system, userMsg } = JSON.parse(event.body || '{}')
    if (!system || !userMsg) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing system or userMsg' }) }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        // In production set ANTHROPIC_API_KEY in Netlify env vars
        // For local dev it calls through without a key (Claude.ai handles it)
        ...(process.env.ANTHROPIC_API_KEY ? { 'x-api-key': process.env.ANTHROPIC_API_KEY } : {}),
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    const data = await res.json()
    if (data.error) return { statusCode: 400, headers, body: JSON.stringify({ error: data.error.message }) }
    return { statusCode: 200, headers, body: JSON.stringify({ text: data.content?.[0]?.text || '' }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
