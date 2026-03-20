import {
  ScatterChart, Scatter, AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Cell, ResponsiveContainer
} from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt } from '../lib/data'
import { Card, SectionHead, ChartTooltip } from '../components/UI'

export default function AnalyticsPage({ trades, stats }) {
  if (!trades?.length) return null

  // Rolling win rate (10-trade window)
  const rolling = trades.map((_, i) => {
    if (i < 9) return null
    const window = trades.slice(i-9, i+1)
    const wr = window.filter(t=>t.pnl>0).length / 10 * 100
    const avgPnl = window.reduce((s,t)=>s+t.pnl,0)/10
    return { i, wr, avgPnl }
  }).filter(Boolean)

  // PnL by leverage
  const byLev = {}
  trades.forEach(t => {
    const k = t.leverage + 'x'
    if (!byLev[k]) byLev[k] = { lev: k, pnl: 0, count: 0, wins: 0 }
    byLev[k].pnl += t.pnl; byLev[k].count++; if (t.pnl > 0) byLev[k].wins++
  })
  const levArr = Object.values(byLev).sort((a,b)=>parseInt(a.lev)-parseInt(b.lev))

  // Trade size vs pnl
  const sizeVsPnl = trades.map(t => ({ size: t.price * t.qty, pnl: t.pnl, sym: t.symbol }))

  // Duration vs pnl
  const durVsPnl = trades.filter(t => t.duration > 0).map(t => ({ dur: t.duration/60, pnl: t.pnl }))

  // Consecutive pnl chart (waterfall-style)
  const waterfallData = trades.slice(0, 60).map((t, i) => ({ i: i+1, pnl: t.pnl, sym: t.symbol }))

  // Fee impact
  let cumPnl = 0, cumPnlNoFee = 0
  const feeImpact = trades.map(t => {
    cumPnl += t.pnl
    cumPnlNoFee += t.pnl + t.fee
    return { i: 0, withFee: +cumPnl.toFixed(2), noFee: +cumPnlNoFee.toFixed(2) }
  }).map((d, i) => ({ ...d, i }))

  // Risk % distribution
  const riskBuckets = [0.5, 1, 1.5, 2, 2.5, 3].map(r => ({
    range: r + '%',
    count: trades.filter(t => t.riskPercent <= r && t.riskPercent > r - 0.5).length,
    pnl: trades.filter(t => t.riskPercent <= r && t.riskPercent > r - 0.5).reduce((s,t)=>s+t.pnl,0),
  }))

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Deep Dive</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay }}>Advanced Analytics</div>
      </div>

      {/* Row 1: Rolling WR + Waterfall */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionHead title="Rolling Win Rate (10-trade)" sub="Consistency Trend" />
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rolling}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="i" tick={{ fill: T.muted, fontSize: 10 }} />
              <YAxis yAxisId="l" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => v+'%'} domain={[0,100]} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
              <ReferenceLine yAxisId="l" y={50} stroke={T.muted} strokeDasharray="4 4" />
              <Tooltip content={<ChartTooltip formatter={(v, n) => n === 'wr' ? fmt(v)+'%' : '$'+fmt(v)} />} />
              <Area yAxisId="l" type="monotone" dataKey="wr" stroke={T.blue} fill={T.blueDim} strokeWidth={2} dot={false} name="Win Rate" />
              <Line yAxisId="r" type="monotone" dataKey="avgPnl" stroke={T.accent} strokeWidth={1.5} dot={false} name="Avg PnL" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Trade-by-Trade P&L" sub="First 60 Trades" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waterfallData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="i" tick={{ fill: T.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
              <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip formatter={v => '$'+fmt(v)} />} />
              <Bar dataKey="pnl" name="P&L" radius={[2,2,0,0]}>
                {waterfallData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.green : T.red} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: Fee Impact + Risk Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionHead title="Fee Impact on P&L" sub="True Cost of Trading" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={feeImpact}>
              <defs>
                <linearGradient id="noFeeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.green} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="i" hide />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
              <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip formatter={v => '$'+fmt(v)} />} />
              <Area type="monotone" dataKey="noFee" stroke={T.green} fill="url(#noFeeGrad)" strokeWidth={2} dot={false} name="Gross P&L" />
              <Area type="monotone" dataKey="withFee" stroke={T.accent} fill="url(#feeGrad)" strokeWidth={2} dot={false} name="Net P&L" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: T.fontMono, color: T.muted }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="P&L by Leverage" sub="Risk vs Reward" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={levArr} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="lev" tick={{ fill: T.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
              <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip formatter={(v,n) => n==='pnl'?'$'+fmt(v):v+' trades'} />} />
              <Bar dataKey="pnl" name="pnl" radius={[4,4,0,0]}>
                {levArr.map((d,i) => <Cell key={i} fill={d.pnl >= 0 ? T.green : T.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 3: Scatter charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionHead title="Position Size vs P&L" sub="Sizing Analysis" />
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="size" name="Position Size" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
              <YAxis dataKey="pnl" name="P&L" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
              <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip formatter={(v,n) => '$'+fmt(v)} />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={sizeVsPnl} fill={T.accent} opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

</div>

      {/* Row 4: Hour heatmap grid */}
      <Card style={{ marginBottom: 16 }}>
        <SectionHead title="24-Hour P&L Heatmap" sub="Best & Worst Trading Hours" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 5, alignItems: 'end' }}>
          {stats.byHour.map((h, i) => {
            const maxAbs = Math.max(...stats.byHour.map(x => Math.abs(x.pnl)))
            const intensity = maxAbs ? Math.abs(h.pnl) / maxAbs : 0
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: colorPnL(h.pnl), fontWeight: 700 }}>
                  {h.pnl !== 0 ? (h.pnl >= 0 ? '+' : '') + (Math.abs(h.pnl) >= 100 ? fmt(h.pnl/1000,1)+'k' : fmt(h.pnl,0)) : ''}
                </div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: Math.max(8, intensity * 120),
                  background: h.count === 0 ? T.surface : h.pnl >= 0
                    ? `rgba(0,214,143,${0.2 + intensity * 0.8})`
                    : `rgba(255,77,106,${0.2 + intensity * 0.8})`,
                  border: `1px solid ${T.border}`,
                  transition: 'height 0.4s',
                }} />
                <div style={{ fontSize: 9, color: T.muted, transform: 'rotate(-45deg)', transformOrigin: 'top', marginTop: 4 }}>{i}</div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 20, textAlign: 'center' }}>Hour of day (UTC)</div>
      </Card>

      {/* Risk breakdown table */}
      <Card>
        <SectionHead title="Risk % Breakdown" sub="Risk per Trade Analysis" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['Risk Range','Trades','Total P&L','Avg P&L','Outcome'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {riskBuckets.filter(r=>r.count>0).map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.range}</td>
                <td style={{ padding: '10px 14px', color: T.textMid }}>{r.count}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: colorPnL(r.pnl) }}>{r.pnl >= 0 ? '+' : ''}{fmt(r.pnl)}</td>
                <td style={{ padding: '10px 14px', color: colorPnL(r.pnl/r.count) }}>{r.pnl >= 0 ? '+' : ''}{fmt(r.pnl/r.count)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{
                    width: Math.min(120, Math.abs(r.pnl)/100), height: 6, borderRadius: 3,
                    background: colorPnL(r.pnl), opacity: 0.8,
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
