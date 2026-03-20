// Groq AI proxy — free tier, llama-3.3-70b
// SETUP: Add GROQ_API_KEY=gsk_xxx to your .env file, then restart netlify dev

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const groqKey = process.env.GROQ_API_KEY

  // GET = debug check (open in browser to verify key is loaded)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok:           true,
        groqKeySet:   !!groqKey,
        keyPreview:   groqKey ? groqKey.slice(0,12)+'...' : 'NOT FOUND',
        instructions: groqKey ? 'Key loaded OK. AI should work.' : 'Add GROQ_API_KEY=gsk_xxx to your .env file and restart netlify dev',
      })
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Use POST' }) }

  if (!groqKey) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({
        error: 'GROQ_API_KEY not found in environment.\n\nFix:\n1. Open your .env file\n2. Add this line:  GROQ_API_KEY=gsk_your_key_here\n3. Press Ctrl+C to stop netlify dev\n4. Run netlify dev again\n5. Get a free key at console.groq.com'
      })
    }
  }

  let system, userMsg
  try {
    const body = JSON.parse(event.body || '{}')
    system  = body.system
    userMsg = body.userMsg
    if (!system || !userMsg) throw new Error('Missing system or userMsg')
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request: ' + e.message }) }
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  2000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: system  },
          { role: 'user',   content: userMsg },
        ],
      }),
    })

    const data = await res.json()

    if (data.error) {
      const msg = data.error.message || JSON.stringify(data.error)
      const hint =
        res.status === 401                 ? 'Invalid API key — go to console.groq.com and create a new key' :
        msg.includes('rate_limit')         ? 'Rate limit hit — wait 60 seconds and try again' :
        msg.includes('model_not_found')    ? 'Model not available — the key may not have access to llama-3.3-70b' :
        'Check console.groq.com for details'
      return { statusCode: res.status, headers, body: JSON.stringify({ error: msg, hint }) }
    }

    const text = data.choices?.[0]?.message?.content
    if (!text) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Groq returned empty response', raw: data }) }

    return { statusCode: 200, headers, body: JSON.stringify({ text }) }

  } catch (err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({
        error: err.message,
        hint:  err.message.includes('fetch') ? 'Cannot reach api.groq.com — check internet connection' : 'Unexpected error'
      })
    }
  }
}
