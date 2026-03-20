import { useState, useEffect, useMemo } from 'react'
import { generateMockTrades, computeStats } from '../lib/data'

// ── Binance endpoints to try in order ───────────────────────────────────────
const FAPI_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
  'https://fapi4.binance.com',
]

const FUTURES_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT',
  'LINKUSDT','LTCUSDT','DOTUSDT','MATICUSDT','UNIUSDT','ATOMUSDT','NEARUSDT','FTMUSDT',
  'SANDUSDT','MANAUSDT','AXSUSDT','GALAUSDT','APEUSDT','OPUSDT','ARBUSDT','INJUSDT',
  'SUIUSDT','SEIUSDT','TIAUSDT','WLDUSDT','FETUSDT','PEPEUSDT','WIFUSDT','BONKUSDT',
  'RUNEUSDT','STXUSDT','ORDIUSDT','ENAUSDT','RENDERUSDT','NOTUSDT','PYTHUSDT',
  'ETCUSDT','XLMUSDT','ALGOUSDT','VETUSDT','TRXUSDT','FILUSDT','AAVEUSDT','GRTUSDT',
  '1000PEPEUSDT','WUSDT','JUPUSDT','JTOUSDT','MEMEUSDT','ACEUSDT','AIUSDT',
]

// ── HMAC-SHA256 signing using browser WebCrypto API ─────────────────────────
// This runs entirely in the browser — your secret key is NEVER sent over network
// It's only used locally to compute the signature, same as any trading app
async function hmacSign(secret, message) {
  const enc  = new TextEncoder()
  const key  = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig  = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── Direct browser → Binance fetch (no server in the middle) ────────────────
// Tries each endpoint until one responds with valid JSON
async function binanceFetch(path, params, apiKey, apiSecret) {
  const timestamp   = Date.now()
  const queryString = Object.entries({ ...params, timestamp })
    .map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const signature = await hmacSign(apiSecret, queryString)
  const fullQuery = `${queryString}&signature=${signature}`

  for (const base of FAPI_ENDPOINTS) {
    try {
      const res = await fetch(`${base}${path}?${fullQuery}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { continue }
      // If Binance returned a WAF/block HTML page or error object, try next endpoint
      if (!data || (typeof data === 'object' && data.code === 403)) { continue }
      return { data, endpoint: base }
    } catch { continue }
  }
  throw new Error('All Binance endpoints unreachable. Check your internet connection.')
}

function normalizeTrade(t, symbol) {
  return {
    id:           `F${t.id}`,
    symbol,
    side:         t.side,
    qty:          +Math.abs(parseFloat(t.qty)).toFixed(6),
    price:        +parseFloat(t.price).toFixed(4),
    exitPrice:    +parseFloat(t.price).toFixed(4),
    fee:          +Math.abs(parseFloat(t.commission || 0)).toFixed(6),
    pnl:          +parseFloat(t.realizedPnl || 0).toFixed(4),
    equity:       10000,
    time:         t.time,
    leverage:     1,
    riskPercent:  0,
    source:       'futures',
    orderId:      t.orderId,
    positionSide: t.positionSide,
    maker:        t.maker,
  }
}

export function useTrades() {
  const [trades,      setTrades]      = useState([])
  const [allTrades,   setAllTrades]   = useState([])
  const [dateRange,   setDateRange]   = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [connected,   setConnected]   = useState(false)
  const [source,      setSource]      = useState('demo')
  const [error,       setError]       = useState('')
  const [progress,    setProgress]    = useState('')

  useEffect(() => {
    const mock = generateMockTrades(150)
    setTrades(mock); setAllTrades(mock)
    setConnected(true); setSource('demo')
  }, [])

  useEffect(() => {
    if (!allTrades.length) return
    if (!dateRange) { setTrades(allTrades); return }
    setTrades(allTrades.filter(t => t.time >= dateRange.start && t.time <= dateRange.end))
  }, [dateRange, allTrades])

  const stats = useMemo(() => computeStats(trades), [trades])

  const loadDemo = () => {
    setLoading(true); setError('')
    setTimeout(() => {
      const mock = generateMockTrades(150)
      setTrades(mock); setAllTrades(mock)
      setConnected(true); setSource('demo')
      setLoading(false); setProgress(''); setDateRange(null)
    }, 500)
  }

  const applyDateRange = (start, end) =>
    setDateRange(start && end ? { start, end } : null)

  const connectBinance = async (apiKey, apiSecret) => {
    if (!apiKey?.trim() || !apiSecret?.trim()) {
      setError('Enter both API Key and Secret Key')
      return { error: true }
    }
    const key = apiKey.trim()
    const sec = apiSecret.trim()
    setLoading(true); setError(''); setProgress('Connecting directly to Binance...')

    try {
      // ── Step 1: Ping futures account ──────────────────────────────────────
      setProgress('Verifying API credentials...')
      const { data: acct, endpoint } = await binanceFetch('/fapi/v2/account', {}, key, sec)

      if (acct.code) {
        const c = acct.code
        const msg =
          c === -2015 ? 'Invalid API Key — re-copy from Binance → API Management' :
          c === -1022 ? 'Invalid Secret Key — re-copy your secret (shown only once)' :
          c === -2014 ? 'API Key format wrong — make sure you copied the full key' :
          c === -4061 ? 'Enable Futures permission: Binance → API Management → Edit key → Enable Futures' :
          c === -1003 ? 'Rate limited — wait 60 seconds and try again' :
          `Binance error ${c}: ${acct.msg}`
        setError(msg); loadDemo(); return { error: true }
      }

      setProgress(`✓ Connected via ${endpoint} · Balance: $${parseFloat(acct.totalWalletBalance||0).toFixed(2)} · Fetching traded symbols...`)

      // ── Step 2: Get symbols from income history ────────────────────────────
      let tradedSymbols = []
      try {
        const { data: income } = await binanceFetch('/fapi/v1/income', {
          incomeType: 'REALIZED_PNL', limit: 1000
        }, key, sec)
        if (Array.isArray(income)) {
          tradedSymbols = [...new Set(income.map(i => i.symbol).filter(Boolean))]
        }
      } catch { /* fallback to full list */ }

      const allSymbols = [...new Set([...tradedSymbols, ...FUTURES_SYMBOLS])]
      setProgress(`Found ${tradedSymbols.length} traded symbols · Fetching trades for ${allSymbols.length} pairs...`)

      // ── Step 3: Fetch trades for all symbols in parallel batches ──────────
      const raw = []
      const BATCH = 8
      for (let i = 0; i < allSymbols.length; i += BATCH) {
        const batch = allSymbols.slice(i, i + BATCH)
        setProgress(`Fetching trades... ${Math.min(i+BATCH, allSymbols.length)}/${allSymbols.length} symbols · ${raw.length} trades found`)

        const results = await Promise.allSettled(
          batch.map(sym => binanceFetch('/fapi/v1/userTrades', { symbol: sym, limit: 1000 }, key, sec))
        )
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            const { data } = r.value
            // -1121 = invalid symbol (skip), -2011 = no trades (skip)
            if (Array.isArray(data)) {
              data.forEach(t => raw.push(normalizeTrade(t, batch[idx])))
            }
          }
        })
      }

      if (!raw.length) {
        setError(
          'Connected successfully but no trades found.\n\n' +
          'Make sure:\n' +
          '• Your API key has "Enable Futures" turned ON\n' +
          '• You have actual futures trade history\n' +
          '• If using a sub-account, generate the API key from that sub-account'
        )
        loadDemo(); return { demo: true }
      }

      // ── Step 4: Get leverage per symbol ───────────────────────────────────
      let leverageMap = {}
      try {
        const { data: acctFull } = await binanceFetch('/fapi/v2/account', {}, key, sec)
        if (acctFull.positions) {
          acctFull.positions.forEach(p => {
            if (p.leverage) leverageMap[p.symbol] = parseInt(p.leverage)
          })
        }
      } catch { /* leverage data optional */ }

      // ── Step 5: Build equity curve ─────────────────────────────────────────
      setProgress(`Building equity curve for ${raw.length} trades...`)
      raw.sort((a, b) => a.time - b.time)
      let equity = 10000
      const final = raw.map(t => {
        equity = +(equity + t.pnl - t.fee).toFixed(2)
        return { ...t, equity, leverage: leverageMap[t.symbol] || 1 }
      })

      setTrades(final); setAllTrades(final)
      setConnected(true); setSource('binance')
      setLoading(false); setProgress(''); setDateRange(null)
      return { success: true, count: final.length }

    } catch (err) {
      const msg =
        err.message.includes('All Binance endpoints')
          ? 'Cannot reach Binance from your browser. Check your internet connection or try a different network.' :
        err.message.includes('NetworkError') || err.message.includes('Failed to fetch')
          ? 'Network error. Check your internet connection.' :
        `Error: ${err.message}`
      setError(msg)
      loadDemo(); setLoading(false); setProgress('')
      return { demo: true }
    }
  }

  return {
    trades, allTrades, stats, loading, connected, source,
    error, progress, dateRange,
    loadDemo, connectBinance, applyDateRange
  }
}
