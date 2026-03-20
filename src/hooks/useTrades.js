import { useState, useEffect, useMemo } from 'react'
import { generateMockTrades, computeStats } from '../lib/data'

const ALL_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','ADAUSDT','XRPUSDT',
  'DOGEUSDT','AVAXUSDT','MATICUSDT','LINKUSDT','LTCUSDT','DOTUSDT',
  'UNIUSDT','ATOMUSDT','ETCUSDT','XLMUSDT','ALGOUSDT','VETUSDT',
  'FILUSDT','TRXUSDT','NEARUSDT','FTMUSDT','SANDUSDT','MANAUSDT',
  'AXSUSDT','GALAUSDT','APEUSDT','OPUSDT','ARBUSDT','INJUSDT',
  'SUIUSDT','SEIUSDT','TIAUSDT','WLDUSDT','FETUSDT','AGIXUSDT',
]

function normalizeBinanceTrade(t, symbol) {
  const price = parseFloat(t.price)
  const qty   = parseFloat(t.qty)
  const fee   = parseFloat(t.commission)
  return {
    id:              String(t.id),
    symbol,
    side:            t.isBuyer ? 'BUY' : 'SELL',
    qty:             +qty.toFixed(6),
    price:           +price.toFixed(2),
    exitPrice:       +price.toFixed(2),
    fee:             +fee.toFixed(6),
    pnl:             0,           // rebuilt when we pair orders
    equity:          10000,       // rebuilt after sort
    time:            t.time,
    duration:        0,
    leverage:        1,
    riskPercent:     1,
    orderId:         t.orderId,
    commissionAsset: t.commissionAsset,
    rawQty:          qty,
    rawPrice:        price,
  }
}

// Pair BUY/SELL trades per symbol to compute realized PnL (FIFO)
function computePnL(trades) {
  const bySymbol = {}
  trades.forEach(t => {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = []
    bySymbol[t.symbol].push(t)
  })

  const result = []
  Object.values(bySymbol).forEach(symTrades => {
    const buys = []   // queue of { qty, price }
    symTrades.sort((a, b) => a.time - b.time).forEach(t => {
      if (t.side === 'BUY') {
        buys.push({ qty: t.rawQty, price: t.rawPrice })
        result.push({ ...t, pnl: -(t.rawPrice * t.rawQty * 0.001) }) // fee only
      } else {
        let remaining = t.rawQty
        let costBasis = 0
        while (remaining > 0 && buys.length > 0) {
          const buy = buys[0]
          const matched = Math.min(remaining, buy.qty)
          costBasis += matched * buy.price
          buy.qty   -= matched
          remaining -= matched
          if (buy.qty < 0.000001) buys.shift()
        }
        const proceeds = t.rawQty * t.rawPrice
        const pnl      = proceeds - costBasis - t.fee
        result.push({ ...t, pnl: +pnl.toFixed(4) })
      }
    })
    // Mark remaining open buys
    buys.forEach(b => {
      // already pushed above
    })
  })
  return result
}

export function useTrades() {
  const [trades,    setTrades]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [connected, setConnected] = useState(false)
  const [source,    setSource]    = useState('demo')
  const [error,     setError]     = useState('')
  const [progress,  setProgress]  = useState('')

  useEffect(() => {
    const mock = generateMockTrades(120)
    setTrades(mock)
    setConnected(true)
    setSource('demo')
  }, [])

  const stats = useMemo(() => computeStats(trades), [trades])

  const loadDemo = () => {
    setLoading(true)
    setError('')
    setTimeout(() => {
      setTrades(generateMockTrades(120))
      setConnected(true)
      setSource('demo')
      setLoading(false)
      setProgress('')
    }, 600)
  }

  const connectBinance = async (apiKey, apiSecret) => {
    if (!apiKey?.trim() || !apiSecret?.trim()) {
      setError('Please enter both API Key and Secret Key')
      return { error: true }
    }
    setLoading(true)
    setError('')
    setProgress('Connecting to Binance...')

    try {
      const allRaw = []
      const batches = []
      for (let i = 0; i < ALL_SYMBOLS.length; i += 6)
        batches.push(ALL_SYMBOLS.slice(i, i + 6))

      let done = 0
      for (const batch of batches) {
        setProgress(`Fetching trades... (${done}/${ALL_SYMBOLS.length} symbols)`)
        const results = await Promise.allSettled(
          batch.map(symbol =>
            fetch(`/.netlify/functions/binance?symbol=${symbol}&limit=1000`, {
              headers: { 'x-api-key': apiKey.trim(), 'x-api-secret': apiSecret.trim() },
            }).then(r => r.json()).then(d => ({ symbol, data: d }))
          )
        )
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value?.data?.trades?.length) {
            r.value.data.trades.forEach(t => {
              allRaw.push(normalizeBinanceTrade(t, r.value.symbol))
            })
          }
        })
        done += batch.length
      }

      if (allRaw.length === 0) {
        setError('No trades found. Check your API key has "Enable Reading" permission on Binance, and that you have trade history.')
        loadDemo()
        return { demo: true }
      }

      setProgress('Computing P&L...')
      allRaw.sort((a, b) => a.time - b.time)
      const withPnL = computePnL(allRaw)

      // Rebuild equity curve
      let equity = 10000
      const final = withPnL.map(t => {
        equity += t.pnl - t.fee
        return { ...t, equity: +equity.toFixed(2) }
      })

      setTrades(final)
      setConnected(true)
      setSource('binance')
      setLoading(false)
      setProgress('')
      return { success: true, count: final.length }

    } catch (err) {
      const msg = err.message.includes('Failed to fetch')
        ? 'Cannot reach /.netlify/functions/binance — run "netlify dev" instead of "npm run dev" for Binance live data.'
        : `Error: ${err.message}`
      setError(msg)
      loadDemo()
      setLoading(false)
      setProgress('')
      return { demo: true }
    }
  }

  return { trades, stats, loading, connected, source, error, progress, loadDemo, connectBinance }
}
