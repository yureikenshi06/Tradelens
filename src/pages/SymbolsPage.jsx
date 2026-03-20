import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtDate, localDateKey } from '../lib/data'
import { Card, SectionHead, Badge, KpiCard, ChartTooltip, ProgressBar, Select } from '../components/UI'

export default function SymbolsPage({ trades, stats }) {
  const [selected,  setSelected]  = useState(null)
  const [sortBy,    setSortBy]    = useState('pnl')
  const [filterMin, setFilterMin] = useState(0)   // min trades

  const symData = useMemo(() => {
    return (stats.symbolArr || []).map(sym => {
      const symTrades = trades.filter(t => t.symbol === sym.sym).sort((a,b)=>a.time-b.time)
      const winners   = symTrades.filter(t => t.pnl > 0)
      const losers    = symTrades.filter(t => t.pnl < 0)

      let cum = 0, dd = 0, peak = -Infinity, maxDD = 0
      const curve = symTrades.map((t,i) => {
        cum  += t.pnl
        if (cum > peak) peak = cum
        dd    = peak > 0 ? (peak-cum)/peak*100 : 0
        if (dd > maxDD) maxDD = dd
        return { i, cum:+cum.toFixed(2), pnl:t.pnl, date:localDateKey(t.time) }
      })

      // Monthly PnL for this symbol
      const monthly = {}
      symTrades.forEach(t => {
        const key = new Date(t.time).toLocaleDateString('en-US',{month:'short',year:'2-digit'})
        if (!monthly[key]) monthly[key] = { m:key, pnl:0, count:0 }
        monthly[key].pnl += t.pnl; monthly[key].count++
      })
      const monthlyArr = Object.values(monthly).sort((a,b)=>a.m.localeCompare(b.m))

      // Side breakdown
      const longTrades  = symTrades.filter(t=>t.side==='BUY')
      const shortTrades = symTrades.filter(t=>t.side==='SELL')

      // Leverage distribution
      const leverages = symTrades.map(t=>t.leverage||1)
      const avgLev = leverages.length ? +(leverages.reduce((a,b)=>a+b,0)/leverages.length).toFixed(1) : 1

      // Best/worst trades
      const sortedByPnl = [...symTrades].sort((a,b)=>b.pnl-a.pnl)
      const best5  = sortedByPnl.slice(0,3)
      const worst5 = sortedByPnl.slice(-3).reverse()

      return {
        ...sym,
        symTrades, winners, losers, curve, monthlyArr, maxDD: +maxDD.toFixed(2),
        netPnl: +(sym.pnl - sym.fees).toFixed(2),
        avgWin:  winners.length ? +(winners.reduce((s,t)=>s+t.pnl,0)/winners.length).toFixed(2) : 0,
        avgLoss: losers.length  ? +(Math.abs(losers.reduce((s,t)=>s+t.pnl,0)/losers.length)).toFixed(2) : 0,
        maxWin:  symTrades.length ? Math.max(...symTrades.map(t=>t.pnl)) : 0,
        maxLoss: symTrades.length ? Math.min(...symTrades.map(t=>t.pnl)) : 0,
        longTrades, shortTrades,
        longPnl:  +longTrades.reduce((s,t)=>s+t.pnl,0).toFixed(2),
        shortPnl: +shortTrades.reduce((s,t)=>s+t.pnl,0).toFixed(2),
        longWR:   longTrades.length  ? +(longTrades.filter(t=>t.pnl>0).length/longTrades.length*100).toFixed(1) : 0,
        shortWR:  shortTrades.length ? +(shortTrades.filter(t=>t.pnl>0).length/shortTrades.length*100).toFixed(1) : 0,
        avgLev, best5, worst5,
        rr: losers.length&&winners.length ? +((winners.reduce((s,t)=>s+t.pnl,0)/winners.length)/Math.abs(losers.reduce((s,t)=>s+t.pnl,0)/losers.length)).toFixed(2) : '∞',
      }
    })
  }, [trades, stats.symbolArr])

  const SORT_OPTIONS = [
    {value:'pnl',    label:'Sort: Gross P&L'},
    {value:'netPnl', label:'Sort: Net P&L'},
    {value:'count',  label:'Sort: Trades'},
    {value:'wr',     label:'Sort: Win Rate'},
    {value:'fees',   label:'Sort: Fees'},
    {value:'maxDD',  label:'Sort: Drawdown'},
  ]

  const sorted = [...symData]
    .filter(s => s.count >= filterMin)
    .sort((a,b) => {
      if (sortBy==='wr') return parseFloat(b.wr)-parseFloat(a.wr)
      return b[sortBy]-a[sortBy]
    })

  const sel = symData.find(s => s.sym === selected)
  const maxAbsPnl = Math.max(1,...symData.map(s=>Math.abs(s.pnl)))

  return (
    <div style={{ padding:'24px 28px',fontFamily:T.fontSans }}>
      <div style={{ marginBottom:18,paddingBottom:14,borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:4,fontWeight:500 }}>Symbol Breakdown</div>
            <div style={{ fontSize:22,fontWeight:700,letterSpacing:-0.5 }}>Symbol Analysis</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>{symData.length} symbols traded · click any for deep-dive</div>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} style={{ fontSize:11 }}/>
            <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,color:T.muted }}>
              Min trades:
              <input type="number" value={filterMin} min={0} onChange={e=>setFilterMin(+e.target.value)}
                style={{ width:48,background:T.card,border:`1px solid ${T.border}`,borderRadius:6,padding:'4px 8px',color:T.text,fontFamily:T.fontMono,fontSize:11,outline:'none' }}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:sel?'1fr 400px':'1fr',gap:16 }}>
        {/* Symbol grid */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10,alignContent:'start' }}>
          {sorted.map(sym => (
            <div key={sym.sym} onClick={()=>setSelected(sym.sym===selected?null:sym.sym)} style={{
              background:selected===sym.sym?T.accentDim:T.card,
              border:`1px solid ${selected===sym.sym?T.accent:colorPnL(sym.pnl)+'44'}`,
              borderRadius:10,padding:'14px',cursor:'pointer',transition:'all 0.12s',
            }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:14 }}>{sym.sym.replace('USDT','')}<span style={{ color:T.muted,fontSize:10 }}>/USDT</span></div>
                  <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{sym.count} trades · {sym.wr}% WR · {sym.avgLev}x avg lev</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700,fontSize:14,color:colorPnL(sym.pnl),fontFamily:T.fontMono }}>{sym.pnl>=0?'+$':'-$'}{fmt(Math.abs(sym.pnl))}</div>
                  <div style={{ fontSize:10,color:T.red,fontFamily:T.fontMono }}>-${fmt(sym.fees)} fees</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={50}>
                <AreaChart data={sym.curve}>
                  <defs><linearGradient id={`sg${sym.sym}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorPnL(sym.pnl)} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={colorPnL(sym.pnl)} stopOpacity={0}/>
                  </linearGradient></defs>
                  <ReferenceLine y={0} stroke={T.muted} strokeDasharray="2 2"/>
                  <Area type="monotone" dataKey="cum" stroke={colorPnL(sym.pnl)} fill={`url(#sg${sym.sym})`} strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,marginTop:8 }}>
                {[
                  {l:'Net P&L', v:(sym.netPnl>=0?'+$':'-$')+fmt(Math.abs(sym.netPnl)), c:colorPnL(sym.netPnl)},
                  {l:'R:R',     v:sym.rr+'x',  c:parseFloat(sym.rr)>=1.5?T.green:T.red},
                  {l:'Max DD',  v:fmt(sym.maxDD)+'%', c:sym.maxDD>20?T.red:T.muted},
                ].map(r=>(
                  <div key={r.l} style={{ textAlign:'center',background:T.surface,borderRadius:5,padding:'4px 3px' }}>
                    <div style={{ fontSize:8,color:T.muted,textTransform:'uppercase',letterSpacing:0.5 }}>{r.l}</div>
                    <div style={{ fontSize:11,fontWeight:600,color:r.c,fontFamily:T.fontMono }}>{r.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:8 }}>
                <ProgressBar value={Math.abs(sym.pnl)} max={maxAbsPnl} color={colorPnL(sym.pnl)} height={3}/>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {sel && (
          <div style={{ display:'flex',flexDirection:'column',gap:12,position:'sticky',top:20,maxHeight:'calc(100vh - 80px)',overflowY:'auto' }}>
            {/* Header card */}
            <Card glow>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:20,fontWeight:700,letterSpacing:-0.3 }}>{sel.sym.replace('USDT','')}<span style={{ color:T.muted,fontSize:12 }}>/USDT</span></div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sel.count} total trades</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.muted,borderRadius:6,padding:'5px 12px',cursor:'pointer',fontFamily:T.fontSans,fontSize:11 }}>✕ Close</button>
              </div>

              {/* Stats grid */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                {[
                  {l:'Gross P&L',  v:(sel.pnl>=0?'+$':'-$')+fmt(Math.abs(sel.pnl)),     c:colorPnL(sel.pnl)},
                  {l:'Net P&L',    v:(sel.netPnl>=0?'+$':'-$')+fmt(Math.abs(sel.netPnl)),c:colorPnL(sel.netPnl)},
                  {l:'Total Fees', v:'-$'+fmt(sel.fees),  c:T.red},
                  {l:'Win Rate',   v:sel.wr+'%',          c:parseFloat(sel.wr)>=50?T.green:T.red},
                  {l:'Risk/Reward',v:sel.rr+'x',          c:parseFloat(sel.rr)>=1.5?T.green:T.red},
                  {l:'Max DD',     v:fmt(sel.maxDD)+'%',  c:sel.maxDD>20?T.red:T.accent},
                  {l:'Avg Win',    v:'+$'+fmt(sel.avgWin),c:T.green},
                  {l:'Avg Loss',   v:'-$'+fmt(sel.avgLoss),c:T.red},
                  {l:'Best Win',   v:'+$'+fmt(sel.maxWin),c:T.green},
                  {l:'Worst Loss', v:'-$'+fmt(Math.abs(sel.maxLoss)),c:T.red},
                  {l:'Avg Leverage',v:sel.avgLev+'x',     c:sel.avgLev>=10?T.red:T.accent},
                  {l:'Avg P&L/trade',v:(sel.avgPnl>=0?'+$':'-$')+fmt(Math.abs(sel.avgPnl)),c:colorPnL(sel.avgPnl)},
                ].map(r=>(
                  <div key={r.l} style={{ background:T.surface,borderRadius:7,padding:'8px 10px',border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:9,color:T.muted,letterSpacing:1,textTransform:'uppercase',marginBottom:2 }}>{r.l}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:r.c||T.text,fontFamily:T.fontMono }}>{r.v}</div>
                  </div>
                ))}
              </div>

              {/* Long vs Short */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                {[
                  {side:'LONG',  trades:sel.longTrades,  pnl:sel.longPnl,  wr:sel.longWR,  c:T.blue},
                  {side:'SHORT', trades:sel.shortTrades, pnl:sel.shortPnl, wr:sel.shortWR, c:T.purple},
                ].map(s=>(
                  <div key={s.side} style={{ background:T.surface,borderRadius:7,padding:'10px 12px',border:`1px solid ${s.c}33` }}>
                    <div style={{ fontSize:10,color:s.c,fontWeight:600,marginBottom:5 }}>{s.side} ({s.trades.length})</div>
                    <div style={{ fontSize:15,fontWeight:700,color:colorPnL(s.pnl),fontFamily:T.fontMono }}>{s.pnl>=0?'+$':'-$'}{fmt(Math.abs(s.pnl))}</div>
                    <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{fmt(s.wr)}% win rate</div>
                  </div>
                ))}
              </div>

              {/* Cum P&L chart */}
              <SectionHead title="Cumulative P&L" sub=""/>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={sel.curve} margin={{ left:4,right:4,top:4,bottom:4 }}>
                  <defs><linearGradient id="selGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorPnL(sel.pnl)} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={colorPnL(sel.pnl)} stopOpacity={0}/>
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="i" hide/>
                  <YAxis tick={{ fill:T.muted,fontSize:10,fontFamily:T.fontMono }} tickLine={false} axisLine={false} tickFormatter={v=>'$'+fmt(v,0)} width={60}/>
                  <ReferenceLine y={0} stroke={T.border} strokeDasharray="4 4"/>
                  <Tooltip content={<ChartTooltip formatter={v=>'$'+fmt(v)}/>}/>
                  <Area type="monotone" dataKey="cum" stroke={colorPnL(sel.pnl)} fill="url(#selGrad)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Monthly bar chart */}
            <Card>
              <SectionHead title="Monthly P&L" sub={sel.sym}/>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={sel.monthlyArr} barSize={16} margin={{ left:4,right:4,top:4,bottom:4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="m" tick={{ fill:T.muted,fontSize:9 }} tickLine={false} axisLine={{ stroke:T.border }}/>
                  <YAxis tick={{ fill:T.muted,fontSize:9,fontFamily:T.fontMono }} tickLine={false} axisLine={false} tickFormatter={v=>'$'+fmt(v,0)} width={52}/>
                  <ReferenceLine y={0} stroke={T.border}/>
                  <Tooltip content={<ChartTooltip formatter={v=>'$'+fmt(v)}/>}/>
                  <Bar dataKey="pnl" radius={[3,3,0,0]}>
                    {sel.monthlyArr.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Best & worst trades */}
            <Card>
              <SectionHead title="Notable Trades" sub="Best & Worst"/>
              <div style={{ fontSize:10,color:T.green,textTransform:'uppercase',letterSpacing:1,marginBottom:6 }}>Top 3 Winners</div>
              {sel.best5.map(t=>(
                <div key={t.id} style={{ display:'flex',justifyContent:'space-between',padding:'6px 10px',background:T.greenDim,borderRadius:6,border:`1px solid ${T.green}22`,marginBottom:4 }}>
                  <div style={{ fontSize:11,color:T.textMid }}>{t.side} {t.qty} @ ${fmt(t.price)}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:T.green,fontFamily:T.fontMono }}>+${fmt(t.pnl)}</div>
                </div>
              ))}
              <div style={{ fontSize:10,color:T.red,textTransform:'uppercase',letterSpacing:1,marginTop:10,marginBottom:6 }}>Top 3 Losers</div>
              {sel.worst5.map(t=>(
                <div key={t.id} style={{ display:'flex',justifyContent:'space-between',padding:'6px 10px',background:T.redDim,borderRadius:6,border:`1px solid ${T.red}22`,marginBottom:4 }}>
                  <div style={{ fontSize:11,color:T.textMid }}>{t.side} {t.qty} @ ${fmt(t.price)}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:T.red,fontFamily:T.fontMono }}>-${fmt(Math.abs(t.pnl))}</div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
