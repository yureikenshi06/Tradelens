import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtTime, localDateKey, monthKeyFromTs, monthLabelFromKey } from '../lib/data'
import { Card, SectionHead, Badge, Btn, ChartTooltip } from '../components/UI'

const MOODS = ['Sharp', 'Okay', 'Anxious', 'FOMO', 'Disciplined', 'Tired', 'Revenge']
const LESSONS = ['Followed plan', 'Overtraded', 'Chased entries', 'Cut winners too early', 'Let losers run', 'Good risk management', 'Poor position sizing', 'Emotional trading']

const DEFAULT_DAY_GOALS = {
  targetPnL: 200,
  maxLoss: 100,
  maxTrades: 10,
  minWinRate: 50,
}

const DAY_GOALS_KEY = 'tlx_day_goals'
const DAY_GOALS_HISTORY_KEY = 'tlx_day_goals_history'

function loadDayGoalHistory() {
  try { return JSON.parse(localStorage.getItem(DAY_GOALS_HISTORY_KEY) || '{}') } catch { return {} }
}

function DayGoalsTracker({ date, dayTrades, dayPnL }) {
  const [goals, setGoals] = useState(() => {
    try { return { ...DEFAULT_DAY_GOALS, ...JSON.parse(localStorage.getItem(DAY_GOALS_KEY) || '{}') } } catch { return DEFAULT_DAY_GOALS }
  })
  const [history, setHistory] = useState(loadDayGoalHistory)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...DEFAULT_DAY_GOALS, ...goals })

  const monthKey = monthKeyFromTs(new Date(`${date}T12:00:00`).getTime())
  const activeGoals = history[date] || history[monthKey] || goals

  useEffect(() => {
    try {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data }) => {
          const meta = data?.user?.user_metadata
          if (meta?.tlx_day_goals) {
            const remoteGoals = { ...DEFAULT_DAY_GOALS, ...meta.tlx_day_goals }
            setGoals(remoteGoals)
            setForm(remoteGoals)
            localStorage.setItem(DAY_GOALS_KEY, JSON.stringify(remoteGoals))
          }
          if (meta?.tlx_day_goals_history) {
            setHistory(meta.tlx_day_goals_history)
            localStorage.setItem(DAY_GOALS_HISTORY_KEY, JSON.stringify(meta.tlx_day_goals_history))
          }
        })
      }).catch(() => {})
    } catch {}
  }, [])

  useEffect(() => {
    setForm({ ...DEFAULT_DAY_GOALS, ...activeGoals })
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const saved = { ...DEFAULT_DAY_GOALS, ...form }
    const nextHistory = { ...history, [monthKey]: saved, [date]: saved }
    localStorage.setItem(DAY_GOALS_KEY, JSON.stringify(saved))
    localStorage.setItem(DAY_GOALS_HISTORY_KEY, JSON.stringify(nextHistory))
    setGoals(saved)
    setHistory(nextHistory)
    setEditing(false)
    try {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.auth.updateUser({ data: { tlx_day_goals: saved, tlx_day_goals_history: nextHistory } }).catch(() => {})
      }).catch(() => {})
    } catch {}
  }

  const dayWins = dayTrades.filter((t) => t.pnl > 0).length
  const winRate = dayTrades.length ? dayWins / dayTrades.length * 100 : 0
  const items = [
    { label: 'Daily P&L Target', current: dayPnL, target: activeGoals.targetPnL, good: dayPnL >= activeGoals.targetPnL, fmt: (v) => `${v >= 0 ? '+$' : '-$'}${fmt(Math.abs(v))}` },
    { label: 'Max Loss Limit', current: Math.abs(Math.min(0, dayPnL)), target: activeGoals.maxLoss, good: dayPnL >= -activeGoals.maxLoss, invert: true, fmt: (v) => `$${fmt(v)}` },
    { label: 'Max Trades', current: dayTrades.length, target: activeGoals.maxTrades, good: dayTrades.length <= activeGoals.maxTrades, invert: true, fmt: (v) => `${v} trades` },
    { label: 'Win Rate Goal', current: winRate, target: activeGoals.minWinRate, good: winRate >= activeGoals.minWinRate, fmt: (v) => `${fmt(v)}%` },
  ]

  return (
    <Card glow>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionHead title="Daily Goals Tracker" sub={`Goals saved for ${monthLabelFromKey(monthKey)}`} />
        <button onClick={() => setEditing((e) => !e)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
          {editing ? 'Cancel' : 'Edit Goals'}
        </button>
      </div>

      {editing ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { key: 'targetPnL', label: 'Daily P&L Target ($)' },
              { key: 'maxLoss', label: 'Max Loss Allowed ($)' },
              { key: 'maxTrades', label: 'Max Trades per Day' },
              { key: 'minWinRate', label: 'Min Win Rate (%)' },
            ].map((field) => (
              <div key={field.key}>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{field.label}</div>
                <input type="number" value={form[field.key]} onChange={(e) => setForm((x) => ({ ...x, [field.key]: +e.target.value }))}
                  style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 10px', color: T.text, fontFamily: T.fontMono, fontSize: 13, outline: 'none' }} />
              </div>
            ))}
          </div>
          <button onClick={save} style={{ background: T.accent, color: '#000', border: 'none', borderRadius: 7, padding: '8px 20px', cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 600, fontSize: 12 }}>Save Goals</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => {
            const pct = item.invert
              ? Math.max(0, Math.min(100, (1 - item.current / Math.max(1, item.target)) * 100))
              : Math.max(0, Math.min(100, item.current / Math.max(1, item.target) * 100))
            const color = item.good ? T.green : pct > 60 ? T.accent : T.red
            return (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: T.textMid, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontFamily: T.fontMono }}>
                    <span style={{ color, fontWeight: 700 }}>{item.fmt(item.current)}</span>
                    <span style={{ color: T.muted }}> / {item.fmt(item.target)}</span>
                  </span>
                </div>
                <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function useEOD() {
  const [entries, setEntries] = useState(() => { try { return JSON.parse(localStorage.getItem('tl_eod') || '[]') } catch { return [] } })
  const save = (entry) => {
    const updated = [entry, ...entries.filter((e) => e.date !== entry.date)]
    localStorage.setItem('tl_eod', JSON.stringify(updated))
    setEntries(updated)
  }
  return { entries, save }
}

export default function EODPage({ trades }) {
  const today = localDateKey(Date.now())
  const { entries, save } = useEOD()
  const [date, setDate] = useState(today)
  const [form, setForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tl_eod') || '[]').find((e) => e.date === today) || { mood: '', lessons: [], notes: '', rating: 0, followedPlan: null } }
    catch { return { mood: '', lessons: [], notes: '', rating: 0, followedPlan: null } }
  })
  const [saved, setSaved] = useState(false)

  const dayTrades = useMemo(() => trades.filter((t) => localDateKey(t.time) === date), [trades, date])
  const dayPnL = dayTrades.reduce((s, t) => s + t.pnl, 0)
  const dayFees = dayTrades.reduce((s, t) => s + t.fee, 0)
  const dayWins = dayTrades.filter((t) => t.pnl > 0).length

  const toggleLesson = (lesson) => setForm((f) => ({ ...f, lessons: f.lessons.includes(lesson) ? f.lessons.filter((x) => x !== lesson) : [...f.lessons, lesson] }))
  const handleSave = () => {
    save({ ...form, date, savedAt: Date.now() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hourly = useMemo(() => {
    const map = {}
    dayTrades.forEach((t) => {
      const hour = new Date(t.time).getHours()
      if (!map[hour]) map[hour] = { hour, pnl: 0, trades: 0 }
      map[hour].pnl += t.pnl
      map[hour].trades++
    })
    return Object.values(map).sort((a, b) => a.hour - b.hour)
  }, [dayTrades])

  return (
    <div style={{ padding: '24px 28px', fontFamily: T.fontSans }}>
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, fontWeight: 500 }}>End of Day</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>Daily Summary</div>
          </div>
          <input type="date" value={date} onChange={(e) => {
            setDate(e.target.value)
            const found = entries.find((entry) => entry.date === e.target.value)
            setForm(found || { mood: '', lessons: [], notes: '', rating: 0, followedPlan: null })
          }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 12px', color: T.text, fontFamily: T.fontSans, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { l: 'Day P&L', v: `${dayPnL >= 0 ? '+$' : '-$'}${fmt(Math.abs(dayPnL))}`, c: colorPnL(dayPnL) },
              { l: 'Trades', v: dayTrades.length, c: T.text },
              { l: 'Win Rate', v: dayTrades.length ? `${fmt(dayWins / dayTrades.length * 100)}%` : '—', c: dayTrades.length && dayWins / dayTrades.length >= 0.5 ? T.green : T.red },
              { l: 'Fees Paid', v: `-$${fmt(dayFees)}`, c: T.red },
            ].map((r) => (
              <div key={r.l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 5 }}>{r.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: r.c, fontFamily: T.fontMono }}>{r.v}</div>
              </div>
            ))}
          </div>

          {hourly.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <SectionHead title="P&L by Hour" sub="Intraday Breakdown" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={hourly} barSize={22} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={(h) => `${h}:00`} tickLine={false} axisLine={{ stroke: T.border }} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: T.fontMono }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v, 0)}`} width={55} />
                  <ReferenceLine y={0} stroke={T.border} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `$${fmt(v)}`} />} />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {hourly.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.green : T.red} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card>
            <SectionHead title="Today's Trades" sub={`${dayTrades.length} executions`} />
            {dayTrades.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
                {dayTrades.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: T.surface, borderRadius: 7, border: `1px solid ${colorPnL(t.pnl)}25` }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{t.symbol.replace('USDT', '')}/USDT</span>
                        <Badge text={t.side} color={t.side === 'BUY' ? T.green : T.red} />
                        <span style={{ fontSize: 10, color: T.muted }}>{t.leverage}x</span>
                      </div>
                      <div style={{ fontSize: 10, color: T.muted }}>{fmtTime(t.time)} · {t.qty} @ ${fmt(t.price)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colorPnL(t.pnl), fontFamily: T.fontMono }}>{t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)}</div>
                      <div style={{ fontSize: 10, color: T.red }}>-${fmt(t.fee, 4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontSize: 12 }}>No trades on {date}</div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DayGoalsTracker date={date} dayTrades={dayTrades} dayPnL={dayPnL} />

          <Card glow>
            <SectionHead title="End of Day Review" sub="Daily Journal" />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Rate Today (1-10)</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))} style={{
                    width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontFamily: T.fontMono, fontSize: 11, fontWeight: 700,
                    background: form.rating === n ? (n >= 7 ? T.green : n >= 5 ? T.accent : T.red) + '33' : T.surface,
                    border: `1px solid ${form.rating === n ? (n >= 7 ? T.green : n >= 5 ? T.accent : T.red) : T.border}`,
                    color: form.rating === n ? (n >= 7 ? T.green : n >= 5 ? T.accent : T.red) : T.muted,
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Trading Mindset</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {MOODS.map((m) => (
                  <button key={m} onClick={() => setForm((f) => ({ ...f, mood: f.mood === m ? '' : m }))} style={{
                    background: form.mood === m ? T.accentDim : T.surface,
                    border: `1px solid ${form.mood === m ? T.accent : T.border}`,
                    color: form.mood === m ? T.accent : T.muted,
                    borderRadius: 5, padding: '4px 9px', fontSize: 10, cursor: 'pointer', fontFamily: T.fontSans,
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Followed Your Plan?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }, { v: 'partial', l: 'Partially' }].map((option) => (
                  <button key={option.l} onClick={() => setForm((f) => ({ ...f, followedPlan: option.v }))} style={{
                    flex: 1, padding: '7px', borderRadius: 6, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                    background: form.followedPlan === option.v ? (option.v === true ? T.greenDim : option.v === false ? T.redDim : T.accentDim) : T.surface,
                    border: `1px solid ${form.followedPlan === option.v ? (option.v === true ? T.green : option.v === false ? T.red : T.accent) : T.border}`,
                    color: form.followedPlan === option.v ? (option.v === true ? T.green : option.v === false ? T.red : T.accent) : T.muted,
                  }}>{option.l}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>What Happened?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {LESSONS.map((lesson) => (
                  <button key={lesson} onClick={() => toggleLesson(lesson)} style={{
                    background: form.lessons.includes(lesson) ? T.purpleDim : T.surface,
                    border: `1px solid ${form.lessons.includes(lesson) ? T.purple : T.border}`,
                    color: form.lessons.includes(lesson) ? T.purple : T.muted,
                    borderRadius: 5, padding: '4px 9px', fontSize: 10, cursor: 'pointer', fontFamily: T.fontSans,
                  }}>{lesson}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Notes & Reflections</div>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="What did you learn today? What would you do differently? Key market observations..."
                rows={5} style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: '10px', color: T.text, fontFamily: T.fontSans, fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
            </div>

            <Btn variant="accent" onClick={handleSave} style={{ width: '100%', padding: '10px', fontSize: 13 }}>
              {saved ? 'Saved!' : 'Save Daily Review'}
            </Btn>
          </Card>

          {entries.length > 0 && (
            <Card>
              <SectionHead title="Past Reviews" sub="History" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 300, overflowY: 'auto' }}>
                {entries.slice(0, 10).map((entry) => (
                  <button key={entry.date} onClick={() => { setDate(entry.date); setForm(entry) }} style={{
                    background: date === entry.date ? T.accentDim : T.surface,
                    border: `1px solid ${date === entry.date ? T.accent : T.border}`,
                    borderRadius: 7, padding: '9px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: T.fontSans,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{entry.date}</span>
                      <span style={{ fontSize: 11, color: T.muted }}>{entry.mood}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {entry.rating > 0 && <span style={{ fontSize: 10, color: entry.rating >= 7 ? T.green : entry.rating >= 5 ? T.accent : T.red }}>{entry.rating}/10</span>}
                      {entry.followedPlan === true && <span style={{ fontSize: 10, color: T.green }}>Followed plan</span>}
                      {entry.followedPlan === false && <span style={{ fontSize: 10, color: T.red }}>Off plan</span>}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
