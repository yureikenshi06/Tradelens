import { useState, useEffect, useMemo } from 'react'
import { generateMockTrades, computeStats } from '../lib/data'

const FUTURES_ENDPOINTS = [
  'https://fapi.binance.com','https://fapi1.binance.com',
  'https://fapi2.binance.com','https://fapi3.binance.com','https://fapi4.binance.com',
]

const FUTURES_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT',
  'LINKUSDT','LTCUSDT','DOTUSDT','MATICUSDT','UNIUSDT','ATOMUSDT','NEARUSDT','FTMUSDT',
  'SANDUSDT','MANAUSDT','AXSUSDT','GALAUSDT','APEUSDT','OPUSDT','ARBUSDT','INJUSDT',
  'SUIUSDT','SEIUSDT','TIAUSDT','WLDUSDT','FETUSDT','PEPEUSDT','WIFUSDT','BONKUSDT',
  'RUNEUSDT','STXUSDT','ORDIUSDT','ENAUSDT','RENDERUSDT','NOTUSDT','PYTHUSDT',
  'ETCUSDT','XLMUSDT','ALGOUSDT','VETUSDT','TRXUSDT','FILUSDT','AAVEUSDT','GRTUSDT',
]

async function apiFetch(mode, params={}, apiKey, apiSecret) {
  const qs  = new URLSearchParams({ mode, ...params }).toString()
  const res = await fetch(`/.netlify/functions/binance?${qs}`, {
    headers: { 'x-api-key': apiKey, 'x-api-secret': apiSecret },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function normalizeFuturesTrade(t, symbol) {
  return {
    id:           `F${t.id}`,
    symbol,
    side:         t.side,
    qty:          +Math.abs(parseFloat(t.qty)).toFixed(6),
    price:        +parseFloat(t.price).toFixed(4),
    exitPrice:    +parseFloat(t.price).toFixed(4),
    fee:          +Math.abs(parseFloat(t.commission||0)).toFixed(6),
    pnl:          +parseFloat(t.realizedPnl||0).toFixed(4),
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
  const [trades,    setTrades]    = useState([])
  const [allTrades, setAllTrades] = useState([])  // full unfiltered set
  const [dateRange, setDateRange] = useState(null) // { start, end } timestamps
  const [loading,   setLoading]   = useState(false)
  const [connected, setConnected] = useState(false)
  const [source,    setSource]    = useState('demo')
  const [error,     setError]     = useState('')
  const [progress,  setProgress]  = useState('')

  useEffect(() => {
    const mock = generateMockTrades(150)
    setTrades(mock); setAllTrades(mock)
    setConnected(true); setSource('demo')
  }, [])

  // Apply date range filter
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

  const applyDateRange = (start, end) => setDateRange(start && end ? { start, end } : null)

  const connectBinance = async (apiKey, apiSecret) => {
    if (!apiKey?.trim() || !apiSecret?.trim()) { setError('Enter both API Key and Secret Key'); return { error:true } }
    const key = apiKey.trim(), sec = apiSecret.trim()
    setLoading(true); setError(''); setProgress('Verifying credentials...')
    try {
      const ping = await apiFetch('ping', {}, key, sec)
      if (!ping.ok) {
        if (ping.triedEndpoints) {
          setError('Binance Futures unreachable from this server. On Binance → API Management → set IP restriction to "Unrestricted".')
        } else {
          const c = ping.code
          setError(c===-2015?'Invalid API Key':c===-1022?'Invalid Secret Key':c===-4061?'Enable Futures permission on your API key':ping.error||'Connection failed')
        }
        loadDemo(); return { error:true }
      }
      setProgress(`Connected · Balance $${parseFloat(ping.totalWalletBalance||0).toFixed(2)} · Fetching symbols...`)
      let tradedSymbols = []
      try { const s = await apiFetch('futures_symbols',{},key,sec); tradedSymbols = s.symbols||[] } catch{}
      const all = [...new Set([...tradedSymbols,...FUTURES_SYMBOLS])]
      const raw = []
      const BATCH = 10
      for (let i=0; i<all.length; i+=BATCH) {
        const batch = all.slice(i,i+BATCH)
        setProgress(`Fetching trades ${Math.min(i+BATCH,all.length)}/${all.length} · ${raw.length} found`)
        const results = await Promise.allSettled(batch.map(sym=>apiFetch('futures_trades',{symbol:sym,limit:1000},key,sec)))
        results.forEach((r,idx) => {
          if (r.status==='fulfilled' && Array.isArray(r.value?.trades))
            r.value.trades.forEach(t=>raw.push(normalizeFuturesTrade(t,batch[idx])))
        })
      }
      if (!raw.length) { setError('No futures trades found. Check API key has Enable Futures permission.'); loadDemo(); return {demo:true} }
      let levMap = {}
      try { const l = await apiFetch('futures_leverage',{},key,sec); levMap = l.leverageMap||{} } catch{}
      setProgress(`Building equity curve for ${raw.length} trades...`)
      raw.sort((a,b)=>a.time-b.time)
      let equity = 10000
      const final = raw.map(t => {
        equity = +(equity + t.pnl - t.fee).toFixed(2)
        return { ...t, equity, leverage: levMap[t.symbol]||1 }
      })
      setTrades(final); setAllTrades(final)
      setConnected(true); setSource('binance')
      setLoading(false); setProgress(''); setDateRange(null)
      return { success:true, count:final.length }
    } catch(err) {
      setError(err.message.includes('Failed to fetch')||err.message.includes('NetworkError')
        ? 'Cannot reach server. Make sure you run "netlify dev" not "npm run dev".'
        : `Error: ${err.message}`)
      loadDemo(); setLoading(false); setProgress('')
      return { demo:true }
    }
  }

  return { trades, allTrades, stats, loading, connected, source, error, progress, dateRange, loadDemo, connectBinance, applyDateRange }
}
