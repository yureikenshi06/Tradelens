// api/binance.js — Vercel Serverless Function
// This securely signs Binance API requests with HMAC SHA256 on the server
// Deploy to Vercel: add BINANCE_SECRET to your environment variables

import crypto from 'crypto'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey    = req.headers['x-api-key']
  const apiSecret = process.env.BINANCE_SECRET

  if (!apiKey)    return res.status(400).json({ error: 'Missing API key header' })
  if (!apiSecret) return res.status(500).json({ error: 'Server not configured: missing BINANCE_SECRET' })

  try {
    const timestamp = Date.now()
    const queryString = `timestamp=${timestamp}&limit=1000`
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex')

    const url = `https://api.binance.com/api/v3/myTrades?${queryString}&signature=${signature}`

    const response = await fetch(url, {
      headers: { 'X-MBX-APIKEY': apiKey }
    })

    if (!response.ok) {
      const errData = await response.json()
      return res.status(response.status).json({ error: errData.msg || 'Binance API error' })
    }

    const rawTrades = await response.json()

    // Normalize Binance trade format
    const trades = rawTrades.map(t => ({
      id:       `B${t.id}`,
      symbol:   t.symbol,
      side:     t.isBuyer ? 'BUY' : 'SELL',
      qty:      parseFloat(t.qty),
      price:    parseFloat(t.price),
      fee:      parseFloat(t.commission),
      feeCcy:   t.commissionAsset,
      pnl:      parseFloat(t.isBuyer ? 0 : t.realizedPnl || 0), // Spot: PnL calc needs open/close matching
      time:     t.time,
      orderId:  t.orderId,
    }))

    return res.status(200).json({ trades, count: trades.length })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
