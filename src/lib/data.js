export function generateMockTrades(count = 150) {
  const symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','ADAUSDT','XRPUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','ARBUSDT','OPUSDT','INJUSDT']
  const trades = []
  let equity = 10000
  let time = Date.now() - count * 1.5 * 24 * 3600 * 1000
  for (let i = 0; i < count; i++) {
    const sym  = symbols[Math.floor(Math.random() * symbols.length)]
    const side = Math.random() > 0.48 ? 'BUY' : 'SELL'
    const qty  = +(Math.random() * 0.5 + 0.01).toFixed(4)
    const price = sym.startsWith('BTC') ? 42000 + Math.random() * 20000
      : sym.startsWith('ETH') ? 2200 + Math.random() * 1000
      : sym.startsWith('BNB') ? 300  + Math.random() * 150
      : sym.startsWith('SOL') ? 90   + Math.random() * 100
      : 5 + Math.random() * 60
    const fee = price * qty * 0.0004
    const pnl = (Math.random() - 0.44) * price * qty * 0.06
    equity += pnl - fee
    time   += Math.random() * 1.5 * 24 * 3600 * 1000
    const lev  = [2,3,5,10,20,25][Math.floor(Math.random()*6)]
    const dur  = Math.floor(Math.random() * 3600 * 12 + 60)
    trades.push({
      id: `F${1000+i}`, symbol: sym, side, qty,
      price:       +price.toFixed(2),
      fee:         +fee.toFixed(4),
      pnl:         +pnl.toFixed(4),
      equity:      +equity.toFixed(2),
      time, duration: dur, leverage: lev,
      entryPrice:  +price.toFixed(2),
      exitPrice:   +(price*(1+(Math.random()-0.5)*0.04)).toFixed(2),
      riskPercent: +(Math.random()*4).toFixed(2),
      source:      'futures',
    })
  }
  return trades
}

export function localDateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function computeStats(trades) {
  if (!trades?.length) return {}
  const winners     = trades.filter(t => t.pnl > 0)
  const losers      = trades.filter(t => t.pnl < 0)
  const totalPnL    = trades.reduce((s,t) => s+t.pnl, 0)
  const totalFees   = trades.reduce((s,t) => s+t.fee, 0)
  const avgWin      = winners.length ? winners.reduce((s,t)=>s+t.pnl,0)/winners.length : 0
  const avgLoss     = losers.length  ? Math.abs(losers.reduce((s,t)=>s+t.pnl,0)/losers.length) : 0
  const winRate     = winners.length/trades.length*100
  const grossProfit = winners.reduce((s,t)=>s+t.pnl,0)
  const grossLoss   = Math.abs(losers.reduce((s,t)=>s+t.pnl,0))
  const profitFactor= grossLoss ? grossProfit/grossLoss : Infinity

  // Drawdown — peak to trough on equity
  let peak = -Infinity, maxDD = 0
  trades.forEach(t => {
    if (t.equity > peak) peak = t.equity
    const dd = (peak - t.equity) / peak * 100
    if (dd > maxDD) maxDD = dd
  })

  // Equity curve with cum PnL
  let cum = 0
  const equityCurve = trades.map((t,i) => {
    cum += t.pnl
    return { i, equity: t.equity, time: t.time, pnl: t.pnl, cumPnL: +cum.toFixed(2), date: localDateKey(t.time) }
  })

  // By symbol
  const bySymbol = {}
  trades.forEach(t => {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { pnl:0,count:0,wins:0,losses:0,fees:0,totalDuration:0 }
    bySymbol[t.symbol].pnl          += t.pnl
    bySymbol[t.symbol].fees         += t.fee
    bySymbol[t.symbol].count++
    bySymbol[t.symbol].totalDuration += (t.duration||0)
    t.pnl > 0 ? bySymbol[t.symbol].wins++ : bySymbol[t.symbol].losses++
  })
  const symbolArr = Object.entries(bySymbol).map(([sym,d]) => ({
    sym, ...d, wr:+(d.wins/d.count*100).toFixed(1), avgPnl:+(d.pnl/d.count).toFixed(2),
    avgDuration: d.count ? d.totalDuration/d.count : 0,
  })).sort((a,b)=>b.pnl-a.pnl)

  // Monthly
  const monthly = {}
  trades.forEach(t => {
    const key = new Date(t.time).toLocaleDateString('en-US',{month:'short',year:'2-digit'})
    if (!monthly[key]) monthly[key] = { pnl:0,trades:0,wins:0,fees:0,ts: t.time }
    monthly[key].pnl    += t.pnl
    monthly[key].trades++
    monthly[key].fees   += t.fee
    if (t.pnl>0) monthly[key].wins++
  })
  const monthlyArr = Object.entries(monthly)
    .map(([m,d]) => ({ m, pnl:+d.pnl.toFixed(2), trades:d.trades, wr:+(d.wins/d.trades*100).toFixed(1), fees:+d.fees.toFixed(2), ts:d.ts }))
    .sort((a,b)=>a.ts-b.ts)

  // Weekly
  const weekly = {}
  trades.forEach(t => {
    const d   = new Date(t.time)
    const jan = new Date(d.getFullYear(),0,1)
    const wk  = Math.ceil(((d-jan)/86400000+jan.getDay()+1)/7)
    const key = `W${wk} ${d.getFullYear()}`
    if (!weekly[key]) weekly[key] = { pnl:0,trades:0,wins:0,fees:0,ts:t.time }
    weekly[key].pnl    += t.pnl
    weekly[key].trades++
    weekly[key].fees   += t.fee
    if (t.pnl>0) weekly[key].wins++
  })
  const weeklyArr = Object.entries(weekly)
    .map(([w,d]) => ({ w, pnl:+d.pnl.toFixed(2), trades:d.trades, wr:+(d.wins/d.trades*100).toFixed(1), fees:+d.fees.toFixed(2), ts:d.ts }))
    .sort((a,b)=>a.ts-b.ts)

  // Quarterly
  const quarterly = {}
  trades.forEach(t => {
    const d   = new Date(t.time)
    const q   = Math.floor(d.getMonth()/3)+1
    const key = `Q${q} ${d.getFullYear()}`
    if (!quarterly[key]) quarterly[key] = { pnl:0,trades:0,wins:0,fees:0,ts:t.time }
    quarterly[key].pnl    += t.pnl
    quarterly[key].trades++
    quarterly[key].fees   += t.fee
    if (t.pnl>0) quarterly[key].wins++
  })
  const quarterlyArr = Object.entries(quarterly)
    .map(([q,d]) => ({ q, pnl:+d.pnl.toFixed(2), trades:d.trades, wr:+(d.wins/d.trades*100).toFixed(1), fees:+d.fees.toFixed(2), ts:d.ts }))
    .sort((a,b)=>a.ts-b.ts)

  // Yearly
  const yearly = {}
  trades.forEach(t => {
    const key = String(new Date(t.time).getFullYear())
    if (!yearly[key]) yearly[key] = { pnl:0,trades:0,wins:0,fees:0,ts:t.time }
    yearly[key].pnl    += t.pnl
    yearly[key].trades++
    yearly[key].fees   += t.fee
    if (t.pnl>0) yearly[key].wins++
  })
  const yearlyArr = Object.entries(yearly)
    .map(([y,d]) => ({ y, pnl:+d.pnl.toFixed(2), trades:d.trades, wr:+(d.wins/d.trades*100).toFixed(1), fees:+d.fees.toFixed(2), ts:d.ts }))
    .sort((a,b)=>a.ts-b.ts)

  // Daily PnL (calendar)
  const dailyPnL = {}
  trades.forEach(t => {
    const key = localDateKey(t.time)
    if (!dailyPnL[key]) dailyPnL[key] = { pnl:0,trades:0,wins:0,fees:0 }
    dailyPnL[key].pnl    += t.pnl
    dailyPnL[key].trades++
    dailyPnL[key].fees   += t.fee
    if (t.pnl>0) dailyPnL[key].wins++
  })

  // Streaks
  let maxWinStreak=0, maxLossStreak=0, curW=0, curL=0
  trades.forEach(t => {
    if (t.pnl>0) { curW++; curL=0; maxWinStreak=Math.max(maxWinStreak,curW) }
    else          { curL++; curW=0; maxLossStreak=Math.max(maxLossStreak,curL) }
  })

  // Long/Short
  const longs  = trades.filter(t => t.side==='BUY')
  const shorts = trades.filter(t => t.side==='SELL')

  // Duration stats
  const durations = trades.map(t=>t.duration||0).filter(d=>d>0)
  const avgDuration = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0
  const minDuration = durations.length ? Math.min(...durations) : 0
  const maxDuration = durations.length ? Math.max(...durations) : 0

  // Fees by symbol
  const feesBySymbol = symbolArr.map(s=>({ sym:s.sym, fees:s.fees, pct: totalFees ? s.fees/totalFees*100 : 0 }))

  // Hour heatmap
  const byHour = Array.from({length:24},(_,h)=>({ hour:h, pnl:0, count:0 }))
  trades.forEach(t => {
    const h = new Date(t.time).getHours()
    byHour[h].pnl   += t.pnl
    byHour[h].count++
  })

  // Day of week
  const byDay = Array.from({length:7},(_,d)=>({ day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d], pnl:0, count:0, wins:0 }))
  trades.forEach(t => {
    const d = new Date(t.time).getDay()
    byDay[d].pnl   += t.pnl
    byDay[d].count++
    if (t.pnl>0) byDay[d].wins++
  })

  // PnL distribution
  const pnlVals = trades.map(t=>t.pnl)
  const minPnl  = Math.min(...pnlVals), maxPnl = Math.max(...pnlVals)
  const step    = (maxPnl-minPnl)/24||1
  const distribution = Array.from({length:24},(_,i) => {
    const from = minPnl+i*step, to = from+step
    return { label:`$${from.toFixed(0)}`, from, count: trades.filter(t=>t.pnl>=from&&t.pnl<to).length, isPositive: from>=0 }
  })

  const pnlVals2   = trades.map(t=>t.pnl)
  const mean       = pnlVals2.reduce((a,b)=>a+b,0)/pnlVals2.length
  const std        = Math.sqrt(pnlVals2.map(r=>(r-mean)**2).reduce((a,b)=>a+b,0)/pnlVals2.length)
  const sharpe     = std ? +(mean/std*Math.sqrt(252)).toFixed(2) : 0

  return {
    total: trades.length, winners: winners.length, losers: losers.length,
    totalPnL, totalFees, grossProfit, grossLoss,
    avgWin, avgLoss, winRate, profitFactor,
    rr: avgLoss ? +(avgWin/avgLoss).toFixed(2) : '∞',
    maxDD, symbolArr, equityCurve, dailyPnL,
    monthlyArr, weeklyArr, quarterlyArr, yearlyArr,
    longs: longs.length, shorts: shorts.length,
    longPnL:  longs.reduce((s,t)=>s+t.pnl,0),
    shortPnL: shorts.reduce((s,t)=>s+t.pnl,0),
    longWR:   longs.length  ? longs.filter(t=>t.pnl>0).length/longs.length*100  : 0,
    shortWR:  shorts.length ? shorts.filter(t=>t.pnl>0).length/shorts.length*100: 0,
    maxWinStreak, maxLossStreak,
    largestWin:  Math.max(...pnlVals),
    largestLoss: Math.min(...pnlVals),
    avgDuration, minDuration, maxDuration,
    byHour, byDay, distribution, sharpe, feesBySymbol,
    avgRiskPct: trades.reduce((s,t)=>s+(t.riskPercent||0),0)/trades.length,
    netPnL: totalPnL - totalFees,
  }
}

export const fmt     = (n,d=2) => n==null||isNaN(n)?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})
export const fmtUSD  = (n) => (n>=0?'+$':'-$')+fmt(Math.abs(n))
export const fmtPct  = (n) => (n>=0?'+':'')+fmt(n)+'%'
export const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
export const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
export const fmtDur  = (s) => {
  if (!s||s<60) return s ? `${s}s` : '—'
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60)
  if (h>0) return `${h}h ${m}m`
  return `${m}m`
}
