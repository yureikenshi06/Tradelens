const crypto = require('crypto')

// Binance has multiple regional endpoints — try them in order
// fapi.binance.com is often blocked from US datacenters (Netlify runs in US-East)
// fapi1/2/3/4 are CDN mirrors that bypass the block
const FUTURES_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
  'https://fapi4.binance.com',
]
const SPOT_BASE = 'https://api.binance.com'

function sign(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const text = await res.text()
    try { return { ok: true, data: JSON.parse(text), status: res.status } }
    catch { return { ok: false, error: `Invalid JSON: ${text.slice(0, 200)}`, status: res.status } }
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Timeout' : err.message }
  } finally {
    clearTimeout(timer)
  }
}

// Try each futures endpoint until one works
async function futuresFetch(path, params, apiKey, apiSecret) {
  const timestamp   = Date.now()
  const queryString = Object.entries({ ...params, timestamp })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const signature = sign(queryString, apiSecret)
  const reqHeaders = { 'X-MBX-APIKEY': apiKey }

  const errors = []
  for (const base of FUTURES_ENDPOINTS) {
    const url = `${base}${path}?${queryString}&signature=${signature}`
    const result = await fetchWithTimeout(url, { headers: reqHeaders }, 7000)
    if (result.ok) {
      // Check if Binance returned a WAF/block page (HTML instead of JSON)
      if (result.data && typeof result.data === 'object') {
        return { data: result.data, endpoint: base }
      }
    }
    errors.push(`${base}: ${result.error || result.status}`)
  }
  return { data: { code: -1, msg: `All endpoints failed: ${errors.join(' | ')}` }, endpoint: null }
}

async function spotFetch(path, params, apiKey, apiSecret) {
  const timestamp   = Date.now()
  const queryString = Object.entries({ ...params, timestamp })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const signature = sign(queryString, apiSecret)
  const url = `${SPOT_BASE}${path}?${queryString}&signature=${signature}`
  const result = await fetchWithTimeout(url, { headers: { 'X-MBX-APIKEY': apiKey } }, 7000)
  return result.ok ? result.data : { code: -1, msg: result.error }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-api-secret',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const apiKey    = event.headers['x-api-key']    || process.env.BINANCE_API_KEY
  const apiSecret = event.headers['x-api-secret'] || process.env.BINANCE_API_SECRET

  if (!apiKey || !apiSecret) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing API credentials — set BINANCE_API_KEY and BINANCE_API_SECRET in Netlify environment variables' }) }
  }

  const mode      = event.queryStringParameters?.mode || 'futures_trades'
  const symbol    = event.queryStringParameters?.symbol
  const limit     = parseInt(event.queryStringParameters?.limit || '1000')
  const startTime = event.queryStringParameters?.startTime

  try {

    // ── MODE: ping ──────────────────────────────────────────────────────────
    if (mode === 'ping') {
      const { data: fut, endpoint } = await futuresFetch('/fapi/v2/account', {}, apiKey, apiSecret)

      if (fut && !fut.code && fut.totalWalletBalance !== undefined) {
        return { statusCode: 200, headers, body: JSON.stringify({
          ok: true,
          accountType: 'FUTURES',
          endpoint,
          totalWalletBalance:     fut.totalWalletBalance,
          totalUnrealizedProfit:  fut.totalUnrealizedProfit,
          totalMarginBalance:     fut.totalMarginBalance,
          availableBalance:       fut.availableBalance,
          positions: (fut.positions || [])
            .filter(p => parseFloat(p.positionAmt) !== 0)
            .map(p => ({ symbol: p.symbol, size: p.positionAmt, pnl: p.unrealizedProfit })),
        })}
      }

      // Futures failed — return the real error, don't silently fall back
      return { statusCode: 400, headers, body: JSON.stringify({
        error: 'Futures account unreachable from Netlify servers',
        details: fut?.msg || fut?.code || 'Unknown error',
        hint: 'Binance may be blocking requests from Netlify US datacenters. See the workaround below.',
        triedEndpoints: FUTURES_ENDPOINTS,
      })}
    }

    // ── MODE: futures_symbols ───────────────────────────────────────────────
    if (mode === 'futures_symbols') {
      const { data } = await futuresFetch('/fapi/v1/income', {
        incomeType: 'REALIZED_PNL', limit: 1000,
      }, apiKey, apiSecret)
      if (data.code) return { statusCode: 400, headers, body: JSON.stringify({ error: data.msg, code: data.code }) }
      const symbols = [...new Set((data || []).map(i => i.symbol).filter(Boolean))]
      return { statusCode: 200, headers, body: JSON.stringify({ symbols }) }
    }

    // ── MODE: futures_trades ────────────────────────────────────────────────
    if (mode === 'futures_trades') {
      if (!symbol) return { statusCode: 400, headers, body: JSON.stringify({ error: 'symbol required' }) }
      const params = { symbol, limit }
      if (startTime) params.startTime = startTime
      const { data } = await futuresFetch('/fapi/v1/userTrades', params, apiKey, apiSecret)
      if (data.code) {
        if (data.code === -2011 || data.code === -1121) {
          return { statusCode: 200, headers, body: JSON.stringify({ trades: [] }) }
        }
        return { statusCode: 400, headers, body: JSON.stringify({ error: data.msg, code: data.code }) }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ trades: Array.isArray(data) ? data : [], source: 'futures' }) }
    }

    // ── MODE: futures_income ────────────────────────────────────────────────
    if (mode === 'futures_income') {
      const params = { incomeType: 'REALIZED_PNL', limit: 1000 }
      if (startTime) params.startTime = startTime
      if (symbol)    params.symbol    = symbol
      const { data } = await futuresFetch('/fapi/v1/income', params, apiKey, apiSecret)
      if (data.code) return { statusCode: 400, headers, body: JSON.stringify({ error: data.msg, code: data.code }) }
      return { statusCode: 200, headers, body: JSON.stringify({ income: Array.isArray(data) ? data : [] }) }
    }

    // ── MODE: futures_leverage ──────────────────────────────────────────────
    if (mode === 'futures_leverage') {
      const { data } = await futuresFetch('/fapi/v2/account', {}, apiKey, apiSecret)
      if (data.code) return { statusCode: 400, headers, body: JSON.stringify({ error: data.msg }) }
      const leverageMap = {}
      ;(data.positions || []).forEach(p => { if (p.leverage) leverageMap[p.symbol] = parseInt(p.leverage) })
      return { statusCode: 200, headers, body: JSON.stringify({ leverageMap }) }
    }

    // ── MODE: futures_orders ────────────────────────────────────────────────
    if (mode === 'futures_orders') {
      if (!symbol) return { statusCode: 400, headers, body: JSON.stringify({ error: 'symbol required' }) }
      const { data } = await futuresFetch('/fapi/v1/allOrders', { symbol, limit }, apiKey, apiSecret)
      if (data.code) return { statusCode: 400, headers, body: JSON.stringify({ error: data.msg, code: data.code }) }
      return { statusCode: 200, headers, body: JSON.stringify({ orders: (Array.isArray(data) ? data : []).filter(o => o.status === 'FILLED') }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown mode: ${mode}` }) }

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
