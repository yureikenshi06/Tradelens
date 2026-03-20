import { useState } from 'react'
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtUSD } from '../lib/data'
import { Card, SectionHead, Badge, KpiCard, ChartTooltip, ProgressBar } from '../components/UI'

export default function SymbolsPage({ trades, stats }) {
  const [selected, setSelected] = useState(null)

  const symData = (stats.symbolArr || []).map(sym => {
    const symTrades = trades.filter(t => t.symbol === sym.sym)
    const winners   = symTrades.filter(t=>t.pnl>0)
    const losers    = symTrades.filter(t=>t.pnl<0)
    let cum = 0
    const curve = symTrades.map((t,i) => { cum+=t.pnl; return { i, cum, pnl: t.pnl } })
    return { ...sym, symTrades, winners, losers, curve,
      avgWin:  winners.length ? winners.reduce((s,t)=>s+t.pnl,0)/winners.length : 0,
      avgLoss: losers.length  ? Math.abs(losers.reduce((s,t)=>s+t.pnl,0)/losers.length) : 0,
      maxWin:  symTrades.length ? Math.max(...symTrades.map(t=>t.pnl)) : 0,
      maxLoss: symTrades.length ? Math.min(...symTrades.map(t=>t.pnl)) : 0,
    }
  })

  const sel = symData.find(s => s.sym === selected)
  const maxAbsPnl = Math.max(...symData.map(s => Math.abs(s.pnl)))

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Symbol Breakdown</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay }}>Symbol Analysis</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{symData.length} symbols traded · Click any to deep-dive</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Symbol grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignContent: 'start' }}>
          {symData.map(sym => (
            <div
              key={sym.sym}
              onClick={() => setSelected(sym.sym === selected ? null : sym.sym)}
              style={{
                background: selected === sym.sym ? T.accentDim : T.card,
                border: `1px solid ${selected === sym.sym ? T.accent : colorPnL(sym.pnl) + '44'}`,
                borderRadius: 12, padding: '16px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, fontFamily: T.fontDisplay }}>
                    {sym.sym.replace('USDT','')}<span style={{ color: T.muted, fontSize: 11, fontFamily: T.fontMono }}>/USDT</span>
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sym.count} trades</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: colorPnL(sym.pnl), fontFamily: T.fontDisplay }}>
                    {sym.pnl >= 0 ? '+' : ''}{fmt(sym.pnl)}
                  </div>
                  <div style={{ fontSize: 10, color: parseFloat(sym.wr) >= 50 ? T.green : T.red }}>
                    {sym.wr}% WR
                  </div>
                </div>
              </div>

              {/* Mini curve */}
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={sym.curve}>
                  <defs>
                    <linearGradient id={`sg${sym.sym}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colorPnL(sym.pnl)} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={colorPnL(sym.pnl)} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={0} stroke={T.muted} strokeDasharray="2 2" />
                  <Area type="monotone" dataKey="cum" stroke={colorPnL(sym.pnl)} fill={`url(#sg${sym.sym})`} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
                {[
                  { l: 'W', v: sym.wins,   c: T.green },
                  { l: 'L', v: sym.losses, c: T.red   },
                  { l: 'Fees', v: '-$'+fmt(sym.fees,1), c: T.muted },
                ].map(r => (
                  <div key={r.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: T.muted }}>{r.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: r.c }}>{r.v}</div>
                  </div>
                ))}
              </div>

              {/* PnL bar */}
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={Math.abs(sym.pnl)} max={maxAbsPnl} color={colorPnL(sym.pnl)} height={4} />
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {sel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: T.fontDisplay }}>{sel.sym.replace('USDT','')}<span style={{ color: T.muted, fontSize: 13 }}>/USDT</span></div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: T.fontMono, fontSize: 12 }}>✕ Close</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { l: 'Total P&L', v: fmtUSD(sel.pnl), c: colorPnL(sel.pnl) },
                  { l: 'Win Rate',  v: sel.wr + '%', c: parseFloat(sel.wr)>=50?T.green:T.red },
                  { l: 'Trades',    v: sel.count },
                  { l: 'Avg P&L',   v: (sel.avgPnl>=0?'+':'')+fmt(sel.avgPnl), c: colorPnL(sel.avgPnl) },
                  { l: 'Best Win',  v: '+$'+fmt(sel.maxWin), c: T.green },
                  { l: 'Worst Loss',v: '-$'+fmt(Math.abs(sel.maxLoss)), c: T.red },
                  { l: 'Avg Win',   v: '+$'+fmt(sel.avgWin), c: T.green },
                  { l: 'Avg Loss',  v: '-$'+fmt(sel.avgLoss), c: T.red },
                ].map(r => (
                  <div key={r.l} style={{ background: T.surface, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9, color: T.muted, marginBottom: 3, letterSpacing: 1 }}>{r.l}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: r.c || T.text, fontFamily: T.fontDisplay }}>{r.v}</div>
                  </div>
                ))}
              </div>

              <SectionHead title="Cum P&L Curve" sub="" />
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={sel.curve}>
                  <defs>
                    <linearGradient id="selGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colorPnL(sel.pnl)} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={colorPnL(sel.pnl)} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="i" hide />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
                  <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />
                  <Tooltip content={<ChartTooltip formatter={v => '$'+fmt(v)} />} />
                  <Area type="monotone" dataKey="cum" stroke={colorPnL(sel.pnl)} fill="url(#selGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Recent trades for symbol */}
            <Card>
              <SectionHead title="Recent Trades" sub={sel.sym} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {sel.symTrades.slice(-10).reverse().map(t => (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 12px', background: T.surface, borderRadius: 8,
                    border: `1px solid ${colorPnL(t.pnl)}33`,
                  }}>
                    <div>
                      <Badge text={t.side} color={t.side==='BUY'?T.green:T.red} />
                      <span style={{ marginLeft: 8, fontSize: 11, color: T.muted }}>{t.qty} @ ${fmt(t.price)}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: colorPnL(t.pnl), fontSize: 13 }}>
                      {t.pnl>=0?'+':''}{fmt(t.pnl)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
