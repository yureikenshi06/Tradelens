import { useState, useEffect, useMemo } from 'react'
import { generateMockTrades, computeStats } from '../lib/data'

export function useTrades() {
  const [trades, setTrades]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [connected, setConnected] = useState(false)
  const [source, setSource]     = useState('demo') // 'demo' | 'binance'

  // Load demo data on mount
  useEffect(() => {
    const mock = generateMockTrades(120)
    setTrades(mock)
    setConnected(true)
    setSource('demo')
  }, [])

  const stats = useMemo(() => computeStats(trades), [trades])

  const loadDemo = () => {
    setLoading(true)
    setTimeout(() => {
      setTrades(generateMockTrades(120))
      setConnected(true)
      setSource('demo')
      setLoading(false)
    }, 600)
  }

  // Binance API: requires backend proxy for HMAC signing in production
  // Structure shown here — wire up to your /api/binance endpoint
  const connectBinance = async (apiKey) => {
    setLoading(true)
    try {
      // const res = await fetch('/api/binance/trades', { headers: { 'x-api-key': apiKey } })
      // const data = await res.json()
      // setTrades(data.trades)
      // setSource('binance')
      // setConnected(true)
      throw new Error('DEMO')
    } catch {
      loadDemo()
      return { demo: true }
    } finally {
      setLoading(false)
    }
  }

  return { trades, stats, loading, connected, source, loadDemo, connectBinance }
}
