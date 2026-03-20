import { useState, useMemo } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { THEME as T, colorPnL, bgPnL } from '../lib/theme'
import { fmt, fmtDate } from '../lib/data'
import { Card, SectionHead, Badge, ChartTooltip, Btn } from '../components/UI'

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage({ trades, stats }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(null) // selected date string

  // Build calendar grid
  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMo  = new Date(year, month + 1, 0).getDate()
  const cells     = Array.from({ length: firstDay + daysInMo }, (_, i) => {
    if (i < firstDay) return null
    const d   = i - firstDay + 1
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return { d, key, ...(stats.dailyPnL?.[key] || { pnl: null, trades: 0 }) }
  })

  // Monthly summary
  const monthKey   = new Date(year, month, 1).toLocaleDateString('en-US',{month:'short',year:'2-digit'})
  const monthStats = stats.monthlyArr?.find(m => m.m === monthKey)

  // Selected day trades
  const dayTrades = useMemo(() => {
    if (!selected) return []
    return trades.filter(t => {
      const d = new Date(t.time).toISOString().split('T')[0]
      return d === selected
    })
  }, [selected, trades])

  // Heatmap max
  const maxAbs = useMemo(() => {
    if (!stats.dailyPnL) return 1
    return Math.max(1, ...Object.values(stats.dailyPnL).map(d => Math.abs(d.pnl)))
  }, [stats.dailyPnL])

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0) } else setMonth(m=>m+1) }

  // Streak list for month
  const monthDays = Object.entries(stats.dailyPnL || {})
    .filter(([k]) => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
    .sort(([a],[b]) => a.localeCompare(b))

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>P&L Calendar</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay }}>Trading Calendar</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>Daily performance heatmap — click any day to inspect trades</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* ── Calendar Card ─────────────────────────────────────────────── */}
        <div>
          <Card style={{ marginBottom: 16 }} glow>
            {/* Month Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={prevMonth} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: T.fontMono, fontSize: 13 }}>←</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: T.fontDisplay, color: T.text }}>{MONTHS[month]}</div>
                <div style={{ fontSize: 13, color: T.muted }}>{year}</div>
              </div>
              <button onClick={nextMonth} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: T.fontMono, fontSize: 13 }}>→</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.muted, fontWeight: 600, padding: '4px 0', letterSpacing: 1 }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((cell, i) => {
                if (!cell) return <div key={i} />
                const hasTrades = cell.pnl !== null
                const isPos     = cell.pnl > 0
                const isNeg     = cell.pnl < 0
                const intensity = hasTrades ? Math.min(0.9, Math.abs(cell.pnl) / maxAbs) : 0
                const bg        = !hasTrades ? T.surface
                  : isPos ? `rgba(0,214,143,${0.1 + intensity * 0.5})`
                  : `rgba(255,77,106,${0.1 + intensity * 0.5})`
                const border    = selected === cell.key ? `2px solid ${T.accent}`
                  : hasTrades ? `1px solid ${isPos ? T.green + '44' : T.red + '44'}`
                  : `1px solid ${T.border}`
                const today = new Date().toISOString().split('T')[0] === cell.key

                return (
                  <div
                    key={cell.key}
                    onClick={() => setSelected(selected === cell.key ? null : cell.key)}
                    style={{
                      borderRadius: 8, padding: '8px 4px',
                      background: bg, border,
                      cursor: hasTrades ? 'pointer' : 'default',
                      minHeight: 70,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 3,
                      transition: 'transform 0.1s, border-color 0.1s',
                      position: 'relative',
                      outline: today ? `2px solid ${T.accent}88` : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: today ? 800 : 500, color: today ? T.accent : T.textMid }}>{cell.d}</div>
                    {hasTrades && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isPos ? T.green : T.red, fontFamily: T.fontMono, lineHeight: 1.1, textAlign: 'center' }}>
                          {isPos ? '+' : ''}{cell.pnl >= 100 || cell.pnl <= -100 ? '$' + fmt(Math.abs(cell.pnl), 0) : '$' + fmt(Math.abs(cell.pnl), 1)}
                        </div>
                        <div style={{ fontSize: 9, color: isPos ? T.green + 'aa' : T.red + 'aa' }}>
                          {cell.trades}tr
                        </div>
                        {/* Small bar */}
                        <div style={{
                          position: 'absolute', bottom: 4, left: '20%', right: '20%',
                          height: 2, borderRadius: 1, overflow: 'hidden',
                          background: T.border,
                        }}>
                          <div style={{
                            height: '100%', background: isPos ? T.green : T.red,
                            width: (intensity * 100) + '%',
                          }} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
              {[
                { color: 'rgba(0,214,143,0.6)', label: 'Profitable day' },
                { color: 'rgba(255,77,106,0.6)', label: 'Loss day' },
                { color: T.surface, label: 'No trades' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: `1px solid ${T.border}` }} />
                  <span style={{ fontSize: 10, color: T.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly bar chart */}
          <Card>
            <SectionHead title="Daily P&L — This Month" sub="Day-by-day" />
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthDays.map(([k, v]) => ({ day: parseInt(k.split('-')[2]), ...v }))} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="day" tick={{ fill: T.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$' + fmt(v, 0)} />
                <ReferenceLine y={0} stroke={T.muted} strokeDasharray="4 4" />
                <Tooltip content={<ChartTooltip formatter={v => '$' + fmt(v)} />} />
                <Bar dataKey="pnl" radius={[3,3,0,0]} name="PnL">
                  {monthDays.map(([k, v], i) => <Cell key={i} fill={v.pnl >= 0 ? T.green : T.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Month summary */}
          <Card>
            <SectionHead title={`${MONTHS[month].slice(0,3)} Summary`} sub="Month Stats" />
            {monthStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { l: 'Total P&L',   v: (monthStats.pnl >= 0?'+$':'-$')+fmt(Math.abs(monthStats.pnl)), c: colorPnL(monthStats.pnl) },
                  { l: 'Trades',      v: monthStats.trades,  c: T.text },
                  { l: 'Win Rate',    v: monthStats.wr + '%', c: monthStats.wr >= 50 ? T.green : T.red },
                  { l: 'Trading Days', v: monthDays.length + ' days', c: T.text },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{r.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No trades this month</div>
            )}
          </Card>

          {/* Selected day */}
          {selected && (
            <Card glow>
              <SectionHead title={fmtDate(new Date(selected + 'T12:00:00').getTime())} sub="Day Detail" />
              {dayTrades.length ? (
                <>
                  {/* Day stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { l: 'Day P&L', v: (stats.dailyPnL[selected]?.pnl >= 0?'+$':'-$')+fmt(Math.abs(stats.dailyPnL[selected]?.pnl)), c: colorPnL(stats.dailyPnL[selected]?.pnl) },
                      { l: 'Trades',  v: dayTrades.length, c: T.text },
                      { l: 'Winners', v: dayTrades.filter(t=>t.pnl>0).length, c: T.green },
                      { l: 'Losers',  v: dayTrades.filter(t=>t.pnl<0).length, c: T.red },
                    ].map(r => (
                      <div key={r.l} style={{ background: T.surface, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, letterSpacing: 1 }}>{r.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: r.c, fontFamily: T.fontDisplay }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Trade list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayTrades.map(t => (
                      <div key={t.id} style={{
                        background: T.surface, borderRadius: 8, padding: '10px 12px',
                        border: `1px solid ${colorPnL(t.pnl)}33`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{t.symbol.replace('USDT','')}/USDT</div>
                          <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                            {t.side} · {t.qty} @ ${fmt(t.price)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: colorPnL(t.pnl), fontSize: 13 }}>
                            {t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)}
                          </div>
                          <Badge text={t.side} color={t.side === 'BUY' ? T.green : T.red} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No trades on this day</div>
              )}
            </Card>
          )}

          {/* Month heatmap streak */}
          <Card>
            <SectionHead title="Daily Streak" sub="This Month" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {monthDays.map(([k, v]) => (
                <div key={k} title={`${k}: $${fmt(v.pnl)}`} style={{
                  width: 28, height: 28, borderRadius: 5,
                  background: v.pnl >= 0 ? `rgba(0,214,143,${Math.min(0.9, 0.2 + Math.abs(v.pnl)/maxAbs*0.7)})` : `rgba(255,77,106,${Math.min(0.9, 0.2 + Math.abs(v.pnl)/maxAbs*0.7)})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${v.pnl >= 0 ? T.green : T.red}44`,
                }} onClick={() => setSelected(k)}>
                  {parseInt(k.split('-')[2])}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
