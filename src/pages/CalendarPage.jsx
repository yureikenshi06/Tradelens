import { useState, useMemo } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtDate, localDateKey } from '../lib/data'
import { Card, SectionHead, Badge, ChartTooltip } from '../components/UI'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage({ trades, stats }) {
  const now = new Date()
  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth())
  const [selected, setSelected] = useState(null)

  // Calendar grid — fills empty cells before the 1st
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMo = new Date(year, month + 1, 0).getDate()
  const cells    = Array.from({ length: firstDay + daysInMo }, (_, i) => {
    if (i < firstDay) return null
    const d   = i - firstDay + 1
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return { d, key, ...(stats.dailyPnL?.[key] || { pnl: null, trades: 0, wins: 0 }) }
  })

  // Month summary card
  const monthKey   = new Date(year, month, 1).toLocaleDateString('en-US',{month:'short',year:'2-digit'})
  const monthStats = stats.monthlyArr?.find(m => m.m === monthKey)

  // Selected day trades — use localDateKey to match what the calendar uses
  const dayTrades = useMemo(() => {
    if (!selected) return []
    return trades.filter(t => localDateKey(t.time) === selected)
  }, [selected, trades])

  // Max abs PnL for intensity scaling
  const maxAbs = useMemo(() => {
    if (!stats.dailyPnL) return 1
    const vals = Object.values(stats.dailyPnL).map(d => Math.abs(d.pnl))
    return Math.max(1, ...vals)
  }, [stats.dailyPnL])

  // All days in current month that have trades
  const monthDays = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,'0')}`
    return Object.entries(stats.dailyPnL || {})
      .filter(([k]) => k.startsWith(prefix))
      .sort(([a],[b]) => a.localeCompare(b))
  }, [stats.dailyPnL, year, month])

  // Today's date key
  const todayKey = localDateKey(Date.now())

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month===11)  { setYear(y=>y+1); setMonth(0)  } else setMonth(m=>m+1) }

  const dayPnL = selected ? stats.dailyPnL?.[selected] : null

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>P&L Calendar</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay }}>Trading Calendar</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
          Daily performance heatmap · {Object.keys(stats.dailyPnL||{}).length} trading days recorded · click any day to inspect
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── Left: calendar + bar chart ───────────────────────────────────── */}
        <div>
          <Card style={{ marginBottom: 16 }} glow>
            {/* Month navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={prevMonth} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: T.fontMono, fontSize: 16 }}>←</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: T.fontDisplay, color: T.text }}>{MONTHS[month]}</div>
                <div style={{ fontSize: 13, color: T.muted }}>{year}</div>
              </div>
              <button onClick={nextMonth} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: T.fontMono, fontSize: 16 }}>→</button>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.muted, fontWeight: 600, padding: '4px 0', letterSpacing: 1 }}>{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((cell, i) => {
                if (!cell) return <div key={`empty-${i}`} style={{ minHeight: 72 }} />

                const hasTrades = cell.pnl !== null && cell.pnl !== undefined
                const isPos     = hasTrades && cell.pnl > 0
                const intensity = hasTrades ? Math.min(0.92, Math.abs(cell.pnl) / maxAbs) : 0
                const isToday   = cell.key === todayKey
                const isSelected = cell.key === selected

                const bg = !hasTrades
                  ? T.surface
                  : isPos
                    ? `rgba(0,214,143,${0.12 + intensity * 0.55})`
                    : `rgba(255,77,106,${0.12 + intensity * 0.55})`

                const borderStyle = isSelected
                  ? `2px solid ${T.accent}`
                  : isToday
                    ? `2px solid ${T.accent}88`
                    : hasTrades
                      ? `1px solid ${(isPos ? T.green : T.red)}55`
                      : `1px solid ${T.border}`

                return (
                  <div
                    key={cell.key}
                    onClick={() => setSelected(isSelected ? null : cell.key)}
                    style={{
                      borderRadius: 8, padding: '7px 4px 10px',
                      background: bg, border: borderStyle,
                      cursor: hasTrades ? 'pointer' : 'default',
                      minHeight: 72,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 2,
                      position: 'relative',
                      transition: 'transform 0.1s',
                    }}
                  >
                    {/* Day number */}
                    <div style={{
                      fontSize: 11, fontWeight: isToday ? 800 : 500,
                      color: isToday ? T.accent : isSelected ? T.accent : T.textMid,
                    }}>
                      {cell.d}
                    </div>

                    {hasTrades && (
                      <>
                        {/* PnL value */}
                        <div style={{
                          fontSize: Math.abs(cell.pnl) >= 1000 ? 9 : 10,
                          fontWeight: 700,
                          color: isPos ? T.green : T.red,
                          fontFamily: T.fontMono,
                          lineHeight: 1.2,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}>
                          {isPos ? '+' : '-'}
                          {Math.abs(cell.pnl) >= 10000
                            ? '$' + fmt(Math.abs(cell.pnl)/1000, 1) + 'k'
                            : '$' + fmt(Math.abs(cell.pnl), 0)}
                        </div>

                        {/* Trade count */}
                        <div style={{ fontSize: 9, color: (isPos ? T.green : T.red) + 'bb' }}>
                          {cell.trades} tr
                        </div>

                        {/* Win/loss mini dots */}
                        <div style={{ display: 'flex', gap: 1, marginTop: 1, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 40 }}>
                          {Array.from({ length: Math.min(cell.trades, 8) }, (_, idx) => (
                            <div key={idx} style={{
                              width: 4, height: 4, borderRadius: '50%',
                              background: idx < cell.wins ? T.green : T.red,
                              opacity: 0.8,
                            }} />
                          ))}
                        </div>

                        {/* Intensity bar at bottom */}
                        <div style={{
                          position: 'absolute', bottom: 3, left: '15%', right: '15%',
                          height: 2, borderRadius: 1, background: T.border, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', background: isPos ? T.green : T.red,
                            width: Math.round(intensity * 100) + '%',
                          }} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { bg: 'rgba(0,214,143,0.55)',  label: 'Profitable day' },
                { bg: 'rgba(255,77,106,0.55)', label: 'Loss day' },
                { bg: T.surface,               label: 'No trades' },
                { bg: T.accentDim, border: `1px solid ${T.accent}`, label: 'Today / Selected' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: l.border || `1px solid ${T.border}` }} />
                  <span style={{ fontSize: 10, color: T.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Daily bar chart for the month */}
          <Card>
            <SectionHead title={`Daily P&L — ${MONTHS[month].slice(0,3)} ${year}`} sub="Day-by-day breakdown" />
            {monthDays.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthDays.map(([k,v]) => ({ day: parseInt(k.split('-')[2]), ...v, pnl: +v.pnl.toFixed(2) }))} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="day" tick={{ fill: T.muted, fontSize: 10 }} label={{ value: 'Day of month', position: 'insideBottom', fill: T.muted, fontSize: 9, dy: 10 }} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => '$'+fmt(v,0)} />
                  <ReferenceLine y={0} stroke={T.muted} strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip formatter={v => '$'+fmt(v)} />} />
                  <Bar dataKey="pnl" radius={[3,3,0,0]} name="P&L">
                    {monthDays.map(([,v], i) => <Cell key={i} fill={v.pnl >= 0 ? T.green : T.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontSize: 12 }}>
                No trades in {MONTHS[month]} {year}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right panel ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Month summary */}
          <Card>
            <SectionHead title={`${MONTHS[month].slice(0,3)} ${year}`} sub="Month Summary" />
            {monthStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { l: 'Total P&L',    v: (monthStats.pnl>=0?'+$':'-$')+fmt(Math.abs(monthStats.pnl)), c: colorPnL(monthStats.pnl) },
                  { l: 'Total Trades', v: monthStats.trades, c: T.text },
                  { l: 'Win Rate',     v: monthStats.wr+'%', c: monthStats.wr>=50 ? T.green : T.red },
                  { l: 'Trading Days', v: monthDays.length + ' days', c: T.text },
                  { l: 'Best Day',     v: monthDays.length ? (() => { const best = monthDays.reduce((a,b)=>b[1].pnl>a[1].pnl?b:a); return '+$'+fmt(best[1].pnl,0)+' (day '+parseInt(best[0].split('-')[2])+')' })() : '—', c: T.green },
                  { l: 'Worst Day',    v: monthDays.length ? (() => { const worst = monthDays.reduce((a,b)=>b[1].pnl<a[1].pnl?b:a); return '-$'+fmt(Math.abs(worst[1].pnl),0)+' (day '+parseInt(worst[0].split('-')[2])+')' })() : '—', c: T.red },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{r.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                No trades recorded in {MONTHS[month]} {year}
              </div>
            )}
          </Card>

          {/* Selected day detail */}
          {selected && (
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9, color: T.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>Day Detail</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: T.fontDisplay }}>{fmtDate(new Date(selected + 'T12:00:00').getTime())}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: T.fontMono, fontSize: 11 }}>✕</button>
              </div>

              {dayTrades.length > 0 ? (
                <>
                  {/* Day stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { l: 'Day P&L',  v: (dayPnL?.pnl>=0?'+$':'-$')+fmt(Math.abs(dayPnL?.pnl||0)), c: colorPnL(dayPnL?.pnl||0) },
                      { l: 'Trades',   v: dayTrades.length, c: T.text },
                      { l: 'Winners',  v: dayTrades.filter(t=>t.pnl>0).length, c: T.green },
                      { l: 'Losers',   v: dayTrades.filter(t=>t.pnl<0).length, c: T.red },
                    ].map(r => (
                      <div key={r.l} style={{ background: T.surface, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{r.l}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: r.c, fontFamily: T.fontDisplay }}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Individual trades */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                    {dayTrades.map(t => (
                      <div key={t.id} style={{
                        background: T.surface, borderRadius: 8, padding: '10px 12px',
                        border: `1px solid ${colorPnL(t.pnl)}33`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
                            {t.symbol.replace('USDT','')}<span style={{ color: T.muted, fontSize: 10 }}>/USDT</span>
                          </div>
                          <div style={{ fontSize: 10, color: T.muted }}>
                            {t.qty} @ ${fmt(t.price)} · {t.leverage}x
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: colorPnL(t.pnl), fontSize: 14, marginBottom: 3 }}>
                            {t.pnl>=0?'+':''}{fmt(t.pnl)}
                          </div>
                          <Badge text={t.side} color={t.side==='BUY' ? T.green : T.red} />
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

          {/* Month heatmap dots */}
          <Card>
            <SectionHead title="Month Heatmap" sub="Intensity View" />
            {monthDays.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {monthDays.map(([k,v]) => {
                  const intensity = Math.min(0.95, 0.2 + Math.abs(v.pnl)/maxAbs*0.75)
                  const isPos = v.pnl >= 0
                  return (
                    <div
                      key={k}
                      title={`${k}: ${isPos?'+':'-'}$${fmt(Math.abs(v.pnl))} (${v.trades} trades)`}
                      onClick={() => setSelected(k === selected ? null : k)}
                      style={{
                        width: 30, height: 30, borderRadius: 5,
                        background: isPos
                          ? `rgba(0,214,143,${intensity})`
                          : `rgba(255,77,106,${intensity})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: '#fff', fontWeight: 700, cursor: 'pointer',
                        border: k === selected ? `2px solid ${T.accent}` : `1px solid ${isPos?T.green:T.red}44`,
                        transition: 'transform 0.1s',
                      }}
                    >
                      {parseInt(k.split('-')[2])}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No data for this month</div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}
