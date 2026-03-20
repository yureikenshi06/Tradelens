import { useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer
} from 'recharts'
import { THEME as T, colorPnL, bgPnL } from '../lib/theme'
import { fmt, fmtUSD, fmtDate, fmtPct } from '../lib/data'
import { KpiCard, Card, SectionHead, Badge, ProgressBar, ChartTooltip } from '../components/UI'

function MiniStat({ label, val, color }) {
  return (
    <div style={{ padding: '10px 14px', background: T.surface, borderRadius: 8, flex: 1 }}>
      <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || T.text, fontFamily: T.fontDisplay }}>{val}</div>
    </div>
  )
}

export default function DashboardPage({ trades, stats }) {
  if (!trades?.length) return <div style={{ padding: 32, color: T.muted }}>No trade data loaded.</div>

  const initEquity = 10000
  const returnPct  = ((stats.totalPnL / initEquity) * 100).toFixed(2)

  // Radar data
  const radarData = [
    { metric: 'Win Rate',    val: Math.min(100, stats.winRate) },
    { metric: 'R:R Ratio',  val: Math.min(100, parseFloat(stats.rr) * 20) },
    { metric: 'Consistency',val: Math.min(100, stats.profitFactor * 25) },
    { metric: 'Risk Ctrl',  val: Math.max(0, 100 - stats.maxDD * 2) },
    { metric: 'Frequency',  val: Math.min(100, stats.total / 2) },
    { metric: 'Diversify',  val: Math.min(100, stats.symbolArr?.length * 8) },
  ]

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Overview</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay, color: T.text, lineHeight: 1 }}>
          Performance Dashboard
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
          {trades.length} trades · {fmtDate(trades[0]?.time)} – {fmtDate(trades[trades.length-1]?.time)}
        </div>
      </div>

      {/* ── KPI Grid Row 1 ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
        <KpiCard label="Total P&L" value={(stats.totalPnL >= 0 ? '+$' : '-$') + fmt(Math.abs(stats.totalPnL))}
          color={colorPnL(stats.totalPnL)} sub={`${returnPct}% return`} icon="💰" />
        <KpiCard label="Win Rate"  value={fmt(stats.winRate) + '%'}
          color={stats.winRate >= 50 ? T.green : T.red}
          sub={`${stats.winners}W / ${stats.losers}L`} icon="🎯" />
        <KpiCard label="Risk/Reward" value={stats.rr + 'x'}
          color={parseFloat(stats.rr) >= 1.5 ? T.green : T.red}
          sub={`Avg win $${fmt(stats.avgWin)}`} icon="⚖️" />
        <KpiCard label="Max Drawdown" value={fmt(stats.maxDD) + '%'}
          color={stats.maxDD < 10 ? T.green : stats.maxDD < 25 ? T.accent : T.red}
          sub="Peak-to-trough" icon="📉" />
        <KpiCard label="Profit Factor" value={isFinite(stats.profitFactor) ? fmt(stats.profitFactor) : '∞'}
          color={stats.profitFactor >= 1.5 ? T.green : T.red}
          sub="Gross profit ÷ loss" icon="📊" />
      </div>

      {/* ── KPI Grid Row 2 ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Sharpe Ratio" value={fmt(stats.sharpe)} icon="📐"
          color={stats.sharpe >= 1 ? T.green : T.red} sub="Risk-adj return" />
        <KpiCard label="Best Streak"  value={stats.maxWinStreak + 'W'} color={T.green} icon="🔥" sub="Consecutive wins" />
        <KpiCard label="Worst Streak" value={stats.maxLossStreak + 'L'} color={T.red}  icon="❄️" sub="Consecutive losses" />
        <KpiCard label="Total Fees"   value={'-$' + fmt(stats.totalFees)} color={T.red} icon="💸" sub="Total paid" />
        <KpiCard label="Largest Win"  value={'+$' + fmt(stats.largestWin)}  color={T.green} icon="🚀" sub="Single trade" />
        <KpiCard label="Largest Loss" value={'-$' + fmt(Math.abs(stats.largestLoss))} color={T.red} icon="💣" sub="Single trade" />
      </div>

      {/* ── Equity Curve ─────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 16 }} glow>
        <SectionHead title="Equity Curve" sub="Account Growth" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={stats.equityCurve}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={T.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={T.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="i" tick={{ fill: T.muted, fontSize: 10, fontFamily: T.fontMono }} />
              <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: T.fontMono }} tickFormatter={v => '$' + fmt(v, 0)} />
              <Tooltip content={<ChartTooltip formatter={(v) => '$' + fmt(v)} />} />
              <ReferenceLine y={initEquity} stroke={T.muted} strokeDasharray="4 4" label={{ value: 'Start', fill: T.muted, fontSize: 10 }} />
              <Area type="monotone" dataKey="equity" stroke={T.accent} fill="url(#eqGrad)" strokeWidth={2.5} dot={false} name="Equity" />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'Starting Capital', v: '$' + fmt(initEquity), c: T.textMid },
              { l: 'Current Equity',   v: '$' + fmt(trades[trades.length-1]?.equity), c: T.accent },
              { l: 'Net Return',       v: fmtPct(returnPct), c: colorPnL(stats.totalPnL) },
              { l: 'Total Fees',       v: '-$' + fmt(stats.totalFees), c: T.red },
              { l: 'Net of Fees',      v: (stats.totalPnL - stats.totalFees >= 0 ? '+$' : '-$') + fmt(Math.abs(stats.totalPnL - stats.totalFees)), c: colorPnL(stats.totalPnL - stats.totalFees) },
            ].map(row => (
              <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.surface, borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: T.muted }}>{row.l}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: row.c }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Row: Cum PnL + Monthly ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionHead title="Cumulative P&L" sub="Running Total" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.cumPnL}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={T.green} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis hide />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$' + fmt(v, 0)} />
              <ReferenceLine y={0} stroke={T.muted} strokeDasharray="4 4" />
              <Tooltip content={<ChartTooltip formatter={v => '$' + fmt(v)} />} />
              <Area type="monotone" dataKey="cum" stroke={T.green} fill="url(#cumGrad)" strokeWidth={2} dot={false} name="Cum PnL" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Monthly P&L" sub="By Month" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyArr} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$' + fmt(v, 0)} />
              <Tooltip content={<ChartTooltip formatter={v => '$' + fmt(v)} />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]} name="PnL">
                {stats.monthlyArr.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? T.green : T.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row: Drawdown + Distribution ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionHead title="Drawdown Chart" sub="Risk Exposure" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={(() => {
              let peak = trades[0]?.equity || 10000
              return trades.map((tr, i) => {
                if (tr.equity > peak) peak = tr.equity
                return { i, dd: -((peak - tr.equity) / peak * 100) }
              })
            })()}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={T.red} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={T.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="i" tick={{ fill: T.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => v + '%'} />
              <Tooltip content={<ChartTooltip formatter={v => fmt(v) + '%'} />} />
              <Area type="monotone" dataKey="dd" stroke={T.red} fill="url(#ddGrad)" strokeWidth={2} dot={false} name="Drawdown" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="P&L Distribution" sub="All Trades Histogram" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.distribution} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 9 }} interval={5} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} />
              <ReferenceLine x={0} stroke={T.muted} strokeDasharray="4 4" />
              <Tooltip content={<ChartTooltip formatter={(v, n) => [v + ' trades', '']} />} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} name="Trades">
                {stats.distribution.map((d, i) => (
                  <Cell key={i} fill={d.isPositive ? T.green : T.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row: Long/Short + Win/Loss Donuts + Radar ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Win/Loss */}
        <Card>
          <SectionHead title="Win / Loss" sub="Trade Outcomes" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={[{ v: stats.winners }, { v: stats.losers }]} dataKey="v" innerRadius={40} outerRadius={62} paddingAngle={3}>
                  <Cell fill={T.green} />
                  <Cell fill={T.red} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {[
                { l: 'Winners', v: stats.winners, pct: fmt(stats.winRate) + '%', c: T.green },
                { l: 'Losers',  v: stats.losers,  pct: fmt(100-stats.winRate)+'%', c: T.red },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.c }} />
                    <span style={{ color: T.muted, fontSize: 11 }}>{r.l}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{r.v}</span>
                    <span style={{ color: r.c, fontSize: 11, minWidth: 36, textAlign: 'right' }}>{r.pct}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: T.muted }}>Avg Win</span>
                  <span style={{ color: T.green, fontSize: 11, fontWeight: 600 }}>+${fmt(stats.avgWin)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: T.muted }}>Avg Loss</span>
                  <span style={{ color: T.red, fontSize: 11, fontWeight: 600 }}>-${fmt(stats.avgLoss)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Long/Short */}
        <Card>
          <SectionHead title="Long vs Short" sub="Side Breakdown" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={[{ v: stats.longs }, { v: stats.shorts }]} dataKey="v" innerRadius={40} outerRadius={62} paddingAngle={3}>
                  <Cell fill={T.blue} />
                  <Cell fill={T.purple} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {[
                { l: 'Longs',  v: stats.longs,  pnl: stats.longPnL,  wr: stats.longWR,  c: T.blue },
                { l: 'Shorts', v: stats.shorts, pnl: stats.shortPnL, wr: stats.shortWR, c: T.purple },
              ].map(r => (
                <div key={r.l} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.c }} />
                      <span style={{ color: T.muted, fontSize: 11 }}>{r.l}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{r.v} trades</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colorPnL(r.pnl) }}>{fmtUSD(r.pnl)}</span>
                    <span style={{ fontSize: 10, color: r.wr >= 50 ? T.green : T.red }}>{fmt(r.wr)}% WR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Radar */}
        <Card>
          <SectionHead title="Performance Radar" sub="Score Overview" />
          <ResponsiveContainer width="100%" height={190}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={T.border} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: T.muted, fontSize: 9, fontFamily: T.fontMono }} />
              <Radar dataKey="val" stroke={T.accent} fill={T.accent} fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Hour & Day Heatmap ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionHead title="Profit by Hour of Day" sub="Best Trading Hours" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.byHour} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="hour" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={h => `${h}:00`} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$' + fmt(v, 0)} />
              <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip formatter={v => '$' + fmt(v)} />} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} name="PnL">
                {stats.byHour.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.green : T.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Profit by Weekday" sub="Best Days" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.byDay} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis type="number" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$' + fmt(v, 0)} />
              <YAxis dataKey="day" type="category" tick={{ fill: T.muted, fontSize: 10 }} width={32} />
              <ReferenceLine x={0} stroke={T.muted} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip formatter={v => '$' + fmt(v)} />} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]} name="PnL">
                {stats.byDay.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.green : T.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Top Symbols Table ──────────────────────────────────────────── */}
      <Card>
        <SectionHead title="Symbol Performance" sub="Ranked by P&L" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(stats.symbolArr || []).map((sym, i) => {
            const maxPnl = Math.max(...stats.symbolArr.map(s => Math.abs(s.pnl)))
            return (
              <div key={sym.sym} style={{
                display: 'grid', gridTemplateColumns: '28px 110px 1fr 80px 60px 60px 60px 60px',
                alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: i % 2 === 0 ? T.surface : 'transparent',
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>#{i+1}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{sym.sym.replace('USDT', '')}<span style={{ color: T.muted, fontSize: 10 }}>/USDT</span></div>
                <ProgressBar value={Math.abs(sym.pnl)} max={maxPnl} color={sym.pnl >= 0 ? T.green : T.red} height={5} />
                <div style={{ textAlign: 'right', fontWeight: 700, color: colorPnL(sym.pnl), fontSize: 13 }}>{fmtUSD(sym.pnl)}</div>
                <div style={{ textAlign: 'right', color: T.muted, fontSize: 11 }}>{sym.count} tr</div>
                <div style={{ textAlign: 'right', color: parseFloat(sym.wr) >= 50 ? T.green : T.red, fontSize: 11 }}>{sym.wr}%</div>
                <div style={{ textAlign: 'right', color: T.muted, fontSize: 11 }}>-${fmt(sym.fees)}</div>
                <div style={{ textAlign: 'right' }}>
                  <Badge text={sym.pnl >= 0 ? '▲ PROFIT' : '▼ LOSS'} color={sym.pnl >= 0 ? T.green : T.red} />
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 110px 1fr 80px 60px 60px 60px 60px', gap: 12, padding: '8px 14px', marginTop: 4 }}>
          <div />
          <div style={{ fontSize: 9, color: T.muted }}>SYMBOL</div>
          <div />
          <div style={{ fontSize: 9, color: T.muted, textAlign: 'right' }}>P&L</div>
          <div style={{ fontSize: 9, color: T.muted, textAlign: 'right' }}>TRADES</div>
          <div style={{ fontSize: 9, color: T.muted, textAlign: 'right' }}>WIN%</div>
          <div style={{ fontSize: 9, color: T.muted, textAlign: 'right' }}>FEES</div>
          <div />
        </div>
      </Card>
    </div>
  )
}
