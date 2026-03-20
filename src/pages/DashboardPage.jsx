import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer, ReferenceArea, ReferenceDot
} from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtUSD, fmtDate, fmtPct, fmtDur } from '../lib/data'
import { KpiCard, Card, SectionHead, Badge, ProgressBar, ChartTooltip, Select } from '../components/UI'

const PERIOD_OPTIONS = [
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
]

export default function DashboardPage({ trades, stats }) {
  const [period, setPeriod] = useState('monthly')

  if (!trades?.length) return <div style={{ padding:32,color:T.muted }}>No trade data loaded.</div>

  const startEquity = trades[0]?.equity - trades[0]?.pnl + trades[0]?.fee || 10000
  const endEquity   = trades[trades.length-1]?.equity || 10000
  const returnPct   = ((endEquity - startEquity) / startEquity * 100).toFixed(2)

  // Period bar chart data
  const periodData = period === 'weekly'    ? stats.weeklyArr?.map(d=>({ label:d.w,   pnl:d.pnl, trades:d.trades, wr:d.wr, fees:d.fees }))
    : period === 'monthly'   ? stats.monthlyArr?.map(d=>({ label:d.m,   pnl:d.pnl, trades:d.trades, wr:d.wr, fees:d.fees }))
    : period === 'quarterly' ? stats.quarterlyArr?.map(d=>({ label:d.q, pnl:d.pnl, trades:d.trades, wr:d.wr, fees:d.fees }))
    : stats.yearlyArr?.map(d=>({ label:d.y, pnl:d.pnl, trades:d.trades, wr:d.wr, fees:d.fees }))

  // Equity curve — use cumPnL from stats
  const equityData = stats.equityCurve || []

  // Cumulative PnL separate
  const cumPnLData = equityData.map(d => ({ i:d.i, cumPnL:d.cumPnL, date:d.date }))

  // Radar
  const radarData = [
    { metric:'Win Rate',    val: Math.min(100,stats.winRate) },
    { metric:'R:R',         val: Math.min(100,parseFloat(stats.rr)*20) },
    { metric:'Consistency', val: Math.min(100,(stats.profitFactor||0)*20) },
    { metric:'Risk Ctrl',   val: Math.max(0,100-stats.maxDD*2) },
    { metric:'Volume',      val: Math.min(100,stats.total/2) },
    { metric:'Diversity',   val: Math.min(100,(stats.symbolArr?.length||0)*8) },
  ]

  // Fees breakdown
  const totalFeesPaid = stats.totalFees || 0
  const feeVsPnL      = [(stats.grossProfit||0), totalFeesPaid, Math.abs(stats.grossLoss||0)]

  return (
    <div style={{ padding:'24px 28px',fontFamily:T.fontSans }}>
      {/* Page header */}
      <div style={{ marginBottom:24,paddingBottom:16,borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:4,fontWeight:500 }}>Performance Overview</div>
            <div style={{ fontSize:24,fontWeight:700,color:T.text,letterSpacing:-0.5 }}>Dashboard</div>
          </div>
          <div style={{ fontSize:11,color:T.muted }}>
            {trades.length} trades · {fmtDate(trades[0]?.time)} – {fmtDate(trades[trades.length-1]?.time)}
          </div>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:10 }}>
        <KpiCard label="Net P&L"      value={(stats.netPnL>=0?'+$':'-$')+fmt(Math.abs(stats.netPnL||0))} color={colorPnL(stats.netPnL||0)} sub={`${returnPct}% return`} />
        <KpiCard label="Gross P&L"    value={(stats.totalPnL>=0?'+$':'-$')+fmt(Math.abs(stats.totalPnL||0))} color={colorPnL(stats.totalPnL||0)} sub="Before fees" />
        <KpiCard label="Win Rate"     value={fmt(stats.winRate)+'%'} color={stats.winRate>=50?T.green:T.red} sub={`${stats.winners}W / ${stats.losers}L`} />
        <KpiCard label="Profit Factor" value={isFinite(stats.profitFactor)?fmt(stats.profitFactor):'∞'} color={stats.profitFactor>=1.5?T.green:T.red} sub="Gross profit ÷ loss" />
        <KpiCard label="Max Drawdown" value={fmt(stats.maxDD)+'%'} color={stats.maxDD<10?T.green:stats.maxDD<25?T.accent:T.red} sub="Peak-to-trough" />
      </div>

      {/* KPI Row 2 */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:20 }}>
        <KpiCard label="Total Fees"   value={'-$'+fmt(totalFeesPaid)} color={T.red}    sub="All commissions" />
        <KpiCard label="Risk/Reward"  value={stats.rr+'x'}           color={parseFloat(stats.rr)>=1.5?T.green:T.red} sub={`Avg win $${fmt(stats.avgWin)}`} />
        <KpiCard label="Sharpe Ratio" value={fmt(stats.sharpe)}       color={stats.sharpe>=1?T.green:T.red} sub="Risk-adj return" />
        <KpiCard label="Best Streak"  value={stats.maxWinStreak+'W'} color={T.green}  sub="Consecutive wins" />
        <KpiCard label="Avg Duration" value={fmtDur(stats.avgDuration)} color={T.blue} sub={`Max ${fmtDur(stats.maxDuration)}`} />
        <KpiCard label="Avg Risk"     value={fmt(stats.avgRiskPct)+'%'} color={stats.avgRiskPct>3?T.red:T.green} sub="Per trade" />
      </div>

      {/* Equity Curve + Cumulative PnL */}
      <Card style={{ marginBottom:12 }} glow>
        <SectionHead title="Equity Curve" sub="Account Growth" action={
          <div style={{ fontSize:11,color:T.muted }}>Starting balance: ${fmt(startEquity)} → ${fmt(endEquity)}</div>
        }/>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={equityData} margin={{ left:8,right:8,top:4,bottom:4 }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={T.accent} stopOpacity={0.25}/>
                <stop offset="100%" stopColor={T.accent} stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
            <XAxis dataKey="i" tick={{ fill:T.muted,fontSize:10 }} tickLine={false} axisLine={{ stroke:T.border }}/>
            <YAxis tick={{ fill:T.muted,fontSize:10,fontFamily:T.fontMono }} tickLine={false} axisLine={false}
              tickFormatter={v=>'$'+fmt(v,0)} width={70}/>
            <Tooltip content={<ChartTooltip formatter={v=>'$'+fmt(v)} />}/>
            <ReferenceLine y={startEquity} stroke={T.muted} strokeDasharray="4 4" strokeOpacity={0.5}/>
            <Area type="monotone" dataKey="equity" stroke={T.accent} fill="url(#eqGrad)" strokeWidth={2} dot={false} name="Equity"/>
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Cumulative PnL */}
      <Card style={{ marginBottom:12 }}>
        <SectionHead title="Cumulative P&L" sub="Running Total"/>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={cumPnLData} margin={{ left:8,right:8,top:4,bottom:4 }}>
            <defs>
              <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={T.green} stopOpacity={0.25}/>
                <stop offset="100%" stopColor={T.green} stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
            <XAxis dataKey="i" hide/>
            <YAxis tick={{ fill:T.muted,fontSize:10,fontFamily:T.fontMono }} tickLine={false} axisLine={false}
              tickFormatter={v=>(v>=0?'+$':'-$')+fmt(Math.abs(v),0)} width={70}/>
            <ReferenceLine y={0} stroke={T.border} strokeDasharray="4 4"/>
            <Tooltip content={<ChartTooltip formatter={v=>(v>=0?'+$':'-$')+fmt(Math.abs(v))} />}/>
            <Area type="monotone" dataKey="cumPnL" stroke={T.green} fill="url(#cpGrad)" strokeWidth={2} dot={false} name="Cum P&L"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Period Performance — dropdown selector */}
      <Card style={{ marginBottom:12 }}>
        <SectionHead title={`${PERIOD_OPTIONS.find(p=>p.value===period)?.label} Performance`} sub="P&L by Period"
          action={
            <Select value={period} onChange={setPeriod} options={PERIOD_OPTIONS} style={{ fontSize:11,padding:'4px 10px' }}/>
          }/>
        {periodData?.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={periodData} barSize={Math.max(8, Math.min(28, 200/periodData.length))} margin={{ left:8,right:8,top:4,bottom:4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
              <XAxis dataKey="label" tick={{ fill:T.muted,fontSize:10 }} tickLine={false} axisLine={{ stroke:T.border }}/>
              <YAxis tick={{ fill:T.muted,fontSize:10,fontFamily:T.fontMono }} tickLine={false} axisLine={false}
                tickFormatter={v=>(v>=0?'+$':'-$')+fmt(Math.abs(v),0)} width={70}/>
              <ReferenceLine y={0} stroke={T.border}/>
              <Tooltip content={({ active,payload,label }) => {
                if (!active||!payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div style={{ background:T.card,border:`1px solid ${T.borderMid}`,borderRadius:8,padding:'10px 14px',fontFamily:T.fontMono,fontSize:11 }}>
                    <div style={{ color:T.muted,marginBottom:6 }}>{label}</div>
                    <div style={{ color:colorPnL(d?.pnl),marginBottom:3 }}>P&L: {d?.pnl>=0?'+$':'-$'}{fmt(Math.abs(d?.pnl))}</div>
                    <div style={{ color:T.muted }}>Trades: {d?.trades} · WR: {d?.wr}%</div>
                    <div style={{ color:T.red }}>Fees: -${fmt(d?.fees)}</div>
                  </div>
                )
              }}/>
              <Bar dataKey="pnl" name="P&L" radius={[3,3,0,0]}>
                {periodData.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red} opacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div style={{ color:T.muted,fontSize:12,padding:'32px 0',textAlign:'center' }}>No data for this period</div>}
      </Card>

      {/* Row: Fees + Duration + Long/Short */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12 }}>

        {/* Fees breakdown */}
        <Card>
          <SectionHead title="Fee Analysis" sub="Cost of Trading"/>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[
              { l:'Total Fees Paid',    v:'-$'+fmt(totalFeesPaid),           c:T.red },
              { l:'Fees as % of Gross', v:stats.grossProfit ? fmt(totalFeesPaid/stats.grossProfit*100)+'%':'—', c:T.accent },
              { l:'Avg Fee per Trade',  v:'-$'+fmt(totalFeesPaid/trades.length), c:T.red },
              { l:'Gross P&L',          v:(stats.grossProfit>=0?'+$':'-$')+fmt(Math.abs(stats.grossProfit)), c:T.green },
              { l:'Net P&L (after fees)',v:(stats.netPnL>=0?'+$':'-$')+fmt(Math.abs(stats.netPnL||0)), c:colorPnL(stats.netPnL||0) },
            ].map(r => (
              <div key={r.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:11,color:T.muted }}>{r.l}</span>
                <span style={{ fontSize:12,fontWeight:600,color:r.c,fontFamily:T.fontMono }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Duration analysis */}
        <Card>
          <SectionHead title="Hold Duration" sub="Trade Duration"/>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[
              { l:'Average Duration',   v:fmtDur(stats.avgDuration),  c:T.blue },
              { l:'Shortest Trade',     v:fmtDur(stats.minDuration),  c:T.green },
              { l:'Longest Trade',      v:fmtDur(stats.maxDuration),  c:T.accent },
            ].map(r => (
              <div key={r.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:11,color:T.muted }}>{r.l}</span>
                <span style={{ fontSize:12,fontWeight:600,color:r.c,fontFamily:T.fontMono }}>{r.v}</span>
              </div>
            ))}
            <div style={{ marginTop:4 }}>
              <div style={{ fontSize:10,color:T.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:1 }}>Duration by Symbol (avg)</div>
              {(stats.symbolArr||[]).slice(0,4).map(s => (
                <div key={s.sym} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0' }}>
                  <span style={{ fontSize:11,color:T.textMid }}>{s.sym.replace('USDT','')}</span>
                  <span style={{ fontSize:11,color:T.muted,fontFamily:T.fontMono }}>{fmtDur(s.avgDuration)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Long vs Short */}
        <Card>
          <SectionHead title="Long vs Short" sub="Side Performance"/>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[
              { l:'Long Trades', v:stats.longs, extra:`${fmt(stats.longWR)}% WR`, pnl:stats.longPnL, c:T.blue },
              { l:'Short Trades',v:stats.shorts,extra:`${fmt(stats.shortWR)}% WR`, pnl:stats.shortPnL, c:T.purple },
            ].map(r=>(
              <div key={r.l} style={{ background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                  <span style={{ fontSize:11,color:r.c,fontWeight:600 }}>{r.l}</span>
                  <span style={{ fontSize:11,color:T.muted }}>{r.v} trades · {r.extra}</span>
                </div>
                <div style={{ fontSize:18,fontWeight:700,color:colorPnL(r.pnl),fontFamily:T.fontMono }}>{r.pnl>=0?'+$':'-$'}{fmt(Math.abs(r.pnl))}</div>
                <div style={{ marginTop:8 }}>
                  <ProgressBar value={r.v} max={trades.length} color={r.c} height={3}/>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Symbol performance table */}
      <Card style={{ marginBottom:12 }}>
        <SectionHead title="Symbol Performance" sub="Ranked by P&L"/>
        <div style={{ display:'grid',gridTemplateColumns:'24px 100px 1fr 90px 55px 55px 70px 70px',gap:10,alignItems:'center',padding:'0 0 8px',borderBottom:`1px solid ${T.border}`,marginBottom:4 }}>
          {['#','Symbol','','P&L','Trades','Win%','Fees','Avg Dur'].map(h=>(
            <div key={h} style={{ fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:1,fontWeight:500 }}>{h}</div>
          ))}
        </div>
        {(stats.symbolArr||[]).map((s,i) => {
          const maxAbs = Math.max(...(stats.symbolArr||[]).map(x=>Math.abs(x.pnl)))
          return (
            <div key={s.sym} style={{ display:'grid',gridTemplateColumns:'24px 100px 1fr 90px 55px 55px 70px 70px',gap:10,alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10,color:T.muted,fontFamily:T.fontMono }}>{i+1}</div>
              <div style={{ fontSize:13,fontWeight:600 }}>{s.sym.replace('USDT','')}<span style={{ color:T.muted,fontSize:10 }}>/USDT</span></div>
              <ProgressBar value={Math.abs(s.pnl)} max={maxAbs} color={colorPnL(s.pnl)} height={3}/>
              <div style={{ fontSize:13,fontWeight:600,color:colorPnL(s.pnl),fontFamily:T.fontMono,textAlign:'right' }}>{s.pnl>=0?'+$':'-$'}{fmt(Math.abs(s.pnl))}</div>
              <div style={{ fontSize:11,color:T.muted,textAlign:'right' }}>{s.count}</div>
              <div style={{ fontSize:11,color:parseFloat(s.wr)>=50?T.green:T.red,textAlign:'right' }}>{s.wr}%</div>
              <div style={{ fontSize:11,color:T.red,textAlign:'right',fontFamily:T.fontMono }}>-${fmt(s.fees)}</div>
              <div style={{ fontSize:11,color:T.muted,textAlign:'right' }}>{fmtDur(s.avgDuration)}</div>
            </div>
          )
        })}
      </Card>

      {/* Win/Loss + Radar */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <Card>
          <SectionHead title="Win / Loss Distribution" sub="Trade Outcomes"/>
          <div style={{ display:'flex',alignItems:'center',gap:20 }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={[{v:stats.winners},{v:stats.losers}]} dataKey="v" innerRadius={42} outerRadius={64} paddingAngle={2} startAngle={90} endAngle={-270}>
                  <Cell fill={T.green}/><Cell fill={T.red}/>
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1,display:'flex',flexDirection:'column',gap:10 }}>
              {[
                { l:'Winners', v:stats.winners, pct:fmt(stats.winRate)+'%', c:T.green, sub:'Avg: +$'+fmt(stats.avgWin) },
                { l:'Losers',  v:stats.losers,  pct:fmt(100-stats.winRate)+'%', c:T.red, sub:'Avg: -$'+fmt(stats.avgLoss) },
              ].map(r=>(
                <div key={r.l} style={{ background:T.surface,borderRadius:7,padding:'10px 12px',border:`1px solid ${T.border}` }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                    <span style={{ fontSize:11,color:r.c,fontWeight:600 }}>{r.l}</span>
                    <span style={{ fontSize:12,fontWeight:700,fontFamily:T.fontMono }}>{r.v} <span style={{ color:r.c }}>{r.pct}</span></span>
                  </div>
                  <div style={{ fontSize:10,color:T.muted }}>{r.sub}</div>
                </div>
              ))}
              <div style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:`1px solid ${T.border}` }}>
                <span style={{ fontSize:10,color:T.muted }}>Largest Win</span>
                <span style={{ fontSize:11,color:T.green,fontFamily:T.fontMono }}>+${fmt(stats.largestWin)}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between' }}>
                <span style={{ fontSize:10,color:T.muted }}>Largest Loss</span>
                <span style={{ fontSize:11,color:T.red,fontFamily:T.fontMono }}>-${fmt(Math.abs(stats.largestLoss))}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead title="Performance Radar" sub="Score Overview"/>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke={T.border}/>
              <PolarAngleAxis dataKey="metric" tick={{ fill:T.muted,fontSize:9,fontFamily:T.fontSans }}/>
              <Radar dataKey="val" stroke={T.accent} fill={T.accent} fillOpacity={0.12} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
