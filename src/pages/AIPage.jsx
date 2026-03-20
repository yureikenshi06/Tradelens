import { useState } from 'react'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt } from '../lib/data'
import { Card, SectionHead, KpiCard, Btn, Spinner } from '../components/UI'

const QUICK_PROMPTS = [
  'What are my biggest trading weaknesses?',
  'Which trading hours are most profitable for me?',
  'Am I taking too much risk per trade?',
  'What patterns lead to my biggest losses?',
  'Which symbols should I focus on vs avoid?',
  'How is my emotional discipline affecting results?',
  'Give me a 30-day improvement plan',
  'Compare my long vs short performance in detail',
]

async function callAI(trades, stats, prompt) {
  const summary = {
    totalTrades: stats.total,
    winRate: +fmt(stats.winRate),
    totalPnL: +fmt(stats.totalPnL),
    netPnL: +(stats.totalPnL - stats.totalFees).toFixed(2),
    avgWin: +fmt(stats.avgWin),
    avgLoss: +fmt(stats.avgLoss),
    riskReward: stats.rr,
    profitFactor: isFinite(stats.profitFactor) ? +fmt(stats.profitFactor) : 99,
    maxDrawdown: +fmt(stats.maxDD),
    sharpe: stats.sharpe,
    maxWinStreak: stats.maxWinStreak,
    maxLossStreak: stats.maxLossStreak,
    totalFees: +fmt(stats.totalFees),
    largestWin: +fmt(stats.largestWin),
    largestLoss: +fmt(stats.largestLoss),
    longWinRate: +fmt(stats.longWR),
    shortWinRate: +fmt(stats.shortWR),
    longPnL: +fmt(stats.longPnL),
    shortPnL: +fmt(stats.shortPnL),
    topSymbols: (stats.symbolArr || []).slice(0, 5).map(s => ({ symbol: s.sym, pnl: +fmt(s.pnl), winRate: s.wr, trades: s.count })),
    worstSymbols: (stats.symbolArr || []).slice(-3).map(s => ({ symbol: s.sym, pnl: +fmt(s.pnl), winRate: s.wr })),
    bestDay: stats.byDay ? stats.byDay.reduce((a, b) => a.pnl > b.pnl ? a : b)?.day : null,
    worstDay: stats.byDay ? stats.byDay.reduce((a, b) => a.pnl < b.pnl ? a : b)?.day : null,
    bestHour: stats.byHour ? stats.byHour.reduce((a, b) => a.pnl > b.pnl ? a : b)?.hour : null,
    monthlyTrend: (stats.monthlyArr || []).map(m => ({ month: m.m, pnl: m.pnl, winRate: m.wr })),
    recentLast10: trades.slice(-10).map(t => ({ symbol: t.symbol, side: t.side, pnl: +t.pnl.toFixed(2), leverage: t.leverage })),
  }

  const system = `You are an elite prop trading coach and quantitative analyst with 20 years of experience. 
You analyze trading performance data with brutal honesty and surgical precision.
Format your response using these exact section headers (use ## for headers):
## 🎯 Overall Verdict
## 💪 Strengths  
## ⚠️ Critical Weaknesses
## 📊 Statistical Insights
## 🕐 Timing & Patterns
## ⚖️ Risk Management Score
## 🎯 Top 5 Action Items
## 📈 30-Day Target

Be specific, data-driven, and brutally honest. Reference actual numbers from the data. 
Give a score out of 10 for overall trading performance in the verdict.`

  const userMsg = prompt
    ? `${prompt}\n\nMy complete trading statistics:\n${JSON.stringify(summary, null, 2)}`
    : `Perform a comprehensive analysis of my trading performance. Be detailed and specific.\n\nMy trading data:\n${JSON.stringify(summary, null, 2)}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content?.[0]?.text || 'No response received.'
}

function renderAnalysis(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <div key={i} style={{ fontWeight: 800, fontSize: 15, color: T.accent, fontFamily: T.fontDisplay, marginTop: 22, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
          {line.replace('## ', '')}
        </div>
      )
    }
    if (line.match(/^\d+\./)) {
      return (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', alignItems: 'flex-start' }}>
          <span style={{ color: T.accent, fontWeight: 700, flexShrink: 0 }}>{line.match(/^\d+/)[0]}.</span>
          <span style={{ color: T.textMid, lineHeight: 1.6 }}>{line.replace(/^\d+\.\s*/, '')}</span>
        </div>
      )
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', paddingLeft: 8 }}>
          <span style={{ color: T.accent, flexShrink: 0 }}>›</span>
          <span style={{ color: T.textMid, lineHeight: 1.6 }}>{line.slice(2)}</span>
        </div>
      )
    }
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />
    return <div key={i} style={{ color: T.textMid, lineHeight: 1.7 }}>{line}</div>
  })
}

export default function AIPage({ trades, stats }) {
  const [analysis, setAnalysis] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [prompt,   setPrompt]   = useState('')
  const [error,    setError]    = useState('')
  const [history,  setHistory]  = useState([])

  const run = async (customPrompt) => {
    const p = customPrompt !== undefined ? customPrompt : prompt
    setLoading(true); setError(''); setAnalysis('')
    try {
      const result = await callAI(trades, stats, p)
      setAnalysis(result)
      setHistory(h => [{ prompt: p || 'Full Analysis', result, ts: Date.now() }, ...h.slice(0, 4)])
    } catch (e) {
      setError('AI analysis failed: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>AI Coach</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay }}>AI Trading Verdict</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>Powered by Claude · Deep analysis of your {trades.length} trades</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total P&L"   value={(stats.totalPnL>=0?'+$':'-$')+fmt(Math.abs(stats.totalPnL))} color={colorPnL(stats.totalPnL)} />
        <KpiCard label="Win Rate"    value={fmt(stats.winRate)+'%'}   color={stats.winRate>=50?T.green:T.red} />
        <KpiCard label="R:R Ratio"   value={stats.rr+'x'}             color={parseFloat(stats.rr)>=1.5?T.green:T.red} />
        <KpiCard label="Sharpe"      value={fmt(stats.sharpe)}         color={stats.sharpe>=1?T.green:T.red} />
        <KpiCard label="Max Drawdown" value={fmt(stats.maxDD)+'%'}     color={stats.maxDD<15?T.green:T.red} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <div>
          <Card style={{ marginBottom: 16 }} glow>
            <SectionHead title="Ask the AI" sub="Custom Analysis" />
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask anything... e.g. 'Why am I losing on SOLUSDT?' — or leave blank for full analysis"
              rows={4}
              style={{
                width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: '14px', color: T.text,
                fontFamily: T.fontMono, fontSize: 12, resize: 'vertical',
                outline: 'none', lineHeight: 1.7, marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="accent" onClick={() => run()} disabled={loading}
                style={{ flex: 1, padding: '11px', fontSize: 13 }}>
                {loading ? '⏳ Analyzing...' : '🤖 Run AI Analysis'}
              </Btn>
              {analysis && <Btn onClick={() => { setAnalysis(''); setPrompt('') }}>Clear</Btn>}
            </div>
            {error && (
              <div style={{ marginTop: 12, background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 8, padding: '10px 14px', color: T.red, fontSize: 12 }}>
                {error}
              </div>
            )}
          </Card>

          {loading && (
            <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Spinner size={40} /></div>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: T.fontDisplay, marginBottom: 8 }}>Analyzing your trades...</div>
              <div style={{ color: T.muted, fontSize: 12 }}>Reviewing {trades.length} trades for patterns, risks, and opportunities</div>
            </Card>
          )}

          {analysis && !loading && (
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <SectionHead title="AI Verdict" sub="Claude Analysis" />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: T.muted }}>claude-sonnet-4</div>
                  <Btn onClick={() => navigator.clipboard?.writeText(analysis)} style={{ fontSize: 11, padding: '4px 12px' }}>📋 Copy</Btn>
                </div>
              </div>
              <div style={{ background: T.surface, borderRadius: 12, padding: '20px 24px', border: `1px solid ${T.border}`, lineHeight: 1.8, fontSize: 13 }}>
                {renderAnalysis(analysis)}
              </div>
            </Card>
          )}

          {!analysis && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: T.card, border: `2px dashed ${T.border}`, borderRadius: 16 }}>
              <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>🤖</div>
              <div style={{ fontWeight: 800, fontSize: 20, fontFamily: T.fontDisplay, marginBottom: 10 }}>Ready to Analyze</div>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 28 }}>
                Get a comprehensive AI review including strengths, weaknesses, timing patterns, risk management scoring, and a personalized improvement plan.
              </div>
              <Btn variant="accent" onClick={() => run('')} style={{ padding: '12px 36px', fontSize: 14 }}>▶ Run Full Analysis</Btn>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHead title="Quick Questions" sub="One-click" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => run(p)} disabled={loading}
                  style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '9px 12px', color: T.textMid,
                    fontFamily: T.fontMono, fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left', opacity: loading ? 0.5 : 1,
                  }}>
                  › {p}
                </button>
              ))}
            </div>
          </Card>

          {history.length > 0 && (
            <Card>
              <SectionHead title="History" sub="Recent Analyses" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((h, i) => (
                  <button key={i} onClick={() => setAnalysis(h.result)}
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: T.fontMono }}>
                    <div style={{ fontSize: 11, color: T.textMid, marginBottom: 3 }}>{h.prompt.slice(0, 40)}...</div>
                    <div style={{ fontSize: 9, color: T.muted }}>{new Date(h.ts).toLocaleTimeString()}</div>
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
