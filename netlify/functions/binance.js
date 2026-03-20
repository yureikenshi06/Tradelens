// netlify/functions/binance.js
// Deploy this as a Netlify serverless function to securely proxy Binance API
// It signs requests with HMAC-SHA256 server-side so your secret never reaches the browser

const crypto = require('crypto')

const BASE = 'https://api.binance.com'

function sign(query, secret) {
  return crypto.createHmac('sha256', secret).update(query).digest('hex')
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-api-secret',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const apiKey    = event.headers['x-api-key']    || process.env.BINANCE_API_KEY
  const apiSecret = event.headers['x-api-secret'] || process.env.BINANCE_API_SECRET

  if (!apiKey || !apiSecret) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing API credentials' }) }
  }

  try {
    const timestamp = Date.now()
    const path      = event.queryStringParameters?.path || '/api/v3/myTrades'
    const symbol    = event.queryStringParameters?.symbol || 'BTCUSDT'
    const limit     = event.queryStringParameters?.limit  || 1000

    const queryString = `symbol=${symbol}&limit=${limit}&timestamp=${timestamp}`
    const signature   = sign(queryString, apiSecret)
    const url         = `${BASE}${path}?${queryString}&signature=${signature}`

    const res  = await fetch(url, { headers: { 'X-MBX-APIKEY': apiKey } })
    const data = await res.json()

    if (data.code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.msg }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ trades: data }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
