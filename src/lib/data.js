// ── Mock Trade Generator ──────────────────────────────────────────────────────
export function generateMockTrades(count = 120) {
  const symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','ADAUSDT','XRPUSDT','DOGEUSDT','AVAXUSDT','MATICUSDT','LINKUSDT','LTCUSDT','DOTUSDT']
  const trades = []
  let equity = 10000
  let time = Date.now() - count * 3 * 24 * 3600 * 1000
  for (let i = 0; i < count; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)]
    const side = Math.random() > 0.48 ? 'BUY' : 'SELL'
    const qty = +(Math.random() * 0.8 + 0.01).toFixed(4)
    const price = sym.startsWith('BTC') ? 38000 + Math.random() * 25000
      : sym.startsWith('ETH') ? 1800 + Math.random() * 1200
      : sym.startsWith('BNB') ? 250 + Math.random() * 200
      : sym.startsWith('SOL') ? 80 + Math.random() * 120
      : 5 + Math.random() * 50
    const fee = price * qty * 0.001
    const pnl = (Math.random() - 0.44) * price * qty * 0.09
    equity += pnl - fee
    time += Math.random() * 2.5 * 24 * 3600 * 1000
    const lev = [1,2,5,10,20][Math.floor(Math.random()*5)]
    trades.push({
      id: `T${1000 + i}`,
      symbol: sym, side, qty,
      price:      +price.toFixed(2),
      fee:        +fee.toFixed(4),
      pnl:        +pnl.toFixed(4),
      equity:     +equity.toFixed(2),
      time,
      duration:   Math.floor(Math.random() * 3600 * 8),
      leverage:   lev,
      entryPrice: +price.toFixed(2),
      exitPrice:  +(price * (1 + (Math.random() - 0.5) * 0.05)).toFixed(2),
      riskPercent:+(Math.random() * 3).toFixed(2),
    })
  }
  return trades
}

// ── Local date key (respects browser timezone — fixes calendar for India/IST) ─
// toISOString() is always UTC which shifts dates for IST (+5:30) users
export function localDateKey(timestamp) {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Statistics Engine ─────────────────────────────────────────────────────────
export function computeStats(trades) {
  if (!trades?.length) return {}
  const winners = trades.filter(t => t.pnl > 0)
  const losers  = trades.filter(t => t.pnl < 0)
  const totalPnL   = trades.reduce((s, t) => s + t.pnl, 0)
  const totalFees  = trades.reduce((s, t) => s + t.fee, 0)
  const avgWin     = winners.length ? winners.reduce((s, t) => s + t.pnl, 0) / winners.length : 0
  const avgLoss    = losers.length  ? Math.abs(losers.reduce((s, t) => s + t.pnl, 0) / losers.length) : 0
  const winRate    = (winners.length / trades.length) * 100
  const grossProfit = winners.reduce((s, t) => s + t.pnl, 0)
  const grossLoss   = Math.abs(losers.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss ? grossProfit / grossLoss : Infinity

  // Drawdown
  let peak = trades[0].equity, maxDD = 0
  trades.forEach(t => {
    if (t.equity > peak) peak = t.equity
    const dd = (peak - t.equity) / peak * 100
    if (dd > maxDD) maxDD = dd
  })

  // By symbol
  const bySymbol = {}
  trades.forEach(t => {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { pnl: 0, count: 0, wins: 0, losses: 0, fees: 0 }
    bySymbol[t.symbol].pnl    += t.pnl
    bySymbol[t.symbol].fees   += t.fee
    bySymbol[t.symbol].count++
    t.pnl > 0 ? bySymbol[t.symbol].wins++ : bySymbol[t.symbol].losses++
  })
  const symbolArr = Object.entries(bySymbol).map(([sym, d]) => ({
    sym, ...d,
    wr:     +(d.wins / d.count * 100).toFixed(1),
    avgPnl: +(d.pnl / d.count).toFixed(2),
  })).sort((a, b) => b.pnl - a.pnl)

  // Equity curve & cum PnL
  const equityCurve = trades.map((t, i) => ({ i, equity: t.equity, time: t.time, pnl: t.pnl }))
  let cum = 0
  const cumPnL = trades.map(t => { cum += t.pnl; return { time: t.time, cum, pnl: t.pnl } })

  // Monthly breakdown — use local date so IST users see correct month
  const monthly = {}
  trades.forEach(t => {
    const d = new Date(t.time)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (!monthly[key]) monthly[key] = { pnl: 0, trades: 0, wins: 0 }
    monthly[key].pnl    += t.pnl
    monthly[key].trades++
    if (t.pnl > 0) monthly[key].wins++
  })
  const monthlyArr = Object.entries(monthly).map(([m, d]) => ({
    m, pnl: +d.pnl.toFixed(2), trades: d.trades,
    wr: +(d.wins / d.trades * 100).toFixed(1),
  }))

  // Daily PnL map — use localDateKey (NOT toISOString) for correct timezone
  const dailyPnL = {}
  trades.forEach(t => {
    const key = localDateKey(t.time)
    if (!dailyPnL[key]) dailyPnL[key] = { pnl: 0, trades: 0, wins: 0 }
    dailyPnL[key].pnl    += t.pnl
    dailyPnL[key].trades++
    if (t.pnl > 0) dailyPnL[key].wins++
  })

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, curW = 0, curL = 0, currentStreak = 0
  trades.forEach(t => {
    if (t.pnl > 0) { curW++; curL = 0; maxWinStreak = Math.max(maxWinStreak, curW); currentStreak = curW }
    else            { curL++; curW = 0; maxLossStreak = Math.max(maxLossStreak, curL); currentStreak = -curL }
  })

  // Long/Short
  const longs  = trades.filter(t => t.side === 'BUY')
  const shorts = trades.filter(t => t.side === 'SELL')

  // Hour-of-day heatmap — local time
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, pnl: 0, count: 0 }))
  trades.forEach(t => {
    byHour[new Date(t.time).getHours()].pnl   += t.pnl
    byHour[new Date(t.time).getHours()].count++
  })

  // Day-of-week — local time
  const byDay = Array.from({ length: 7 }, (_, d) => ({
    day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d], pnl: 0, count: 0, wins: 0,
  }))
  trades.forEach(t => {
    const d = new Date(t.time).getDay()
    byDay[d].pnl   += t.pnl
    byDay[d].count++
    if (t.pnl > 0) byDay[d].wins++
  })

  // PnL distribution
  const pnlValues = trades.map(t => t.pnl)
  const minPnl = Math.min(...pnlValues)
  const maxPnl = Math.max(...pnlValues)
  const step = (maxPnl - minPnl) / 24 || 1
  const distribution = Array.from({ length: 24 }, (_, i) => {
    const from = minPnl + i * step, to = from + step
    const count = trades.filter(t => t.pnl >= from && t.pnl < to).length
    return { label: `$${from.toFixed(0)}`, from, count, isPositive: from >= 0 }
  })

  return {
    total: trades.length, winners: winners.length, losers: losers.length,
    totalPnL, totalFees, grossProfit, grossLoss,
    avgWin, avgLoss, winRate, profitFactor,
    rr: avgLoss ? +(avgWin / avgLoss).toFixed(2) : '∞',
    maxDD, symbolArr, equityCurve, cumPnL, monthlyArr, dailyPnL,
    longs: longs.length, shorts: shorts.length,
    longPnL:  longs.reduce((s,t)=>s+t.pnl, 0),
    shortPnL: shorts.reduce((s,t)=>s+t.pnl, 0),
    longWR:   longs.length  ? longs.filter(t=>t.pnl>0).length/longs.length*100 : 0,
    shortWR:  shorts.length ? shorts.filter(t=>t.pnl>0).length/shorts.length*100 : 0,
    maxWinStreak, maxLossStreak, currentStreak,
    largestWin:  Math.max(...pnlValues),
    largestLoss: Math.min(...pnlValues),
    avgDuration: trades.reduce((s,t)=>s+(t.duration||0),0)/trades.length,
    byHour, byDay, distribution,
    avgRiskPct: trades.reduce((s,t)=>s+(t.riskPercent||0),0)/trades.length,
    sharpe: (() => {
      const returns = trades.map(t => t.pnl)
      const mean = returns.reduce((a,b)=>a+b,0)/returns.length
      const std  = Math.sqrt(returns.map(r=>(r-mean)**2).reduce((a,b)=>a+b,0)/returns.length)
      return std ? +(mean/std*Math.sqrt(252)).toFixed(2) : 0
    })(),
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt     = (n, d=2) => n==null||isNaN(n) ? '—' : Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})
export const fmtUSD  = (n) => (n >= 0 ? '+$' : '-$') + fmt(Math.abs(n))
export const fmtPct  = (n) => (n >= 0 ? '+' : '') + fmt(n) + '%'
export const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
export const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
export const fmtDur  = (s) => {
  if (!s) return '—'
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
