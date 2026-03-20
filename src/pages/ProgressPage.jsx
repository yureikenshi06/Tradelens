import { useState, useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtDate, fmtPct } from '../lib/data'
import { Card, SectionHead, KpiCard, Badge, ProgressBar, ChartTooltip } from '../components/UI'

// Default goals — user can edit
const DEFAULT_GOALS = {
  monthlyTarget: 1000,
  winRateTarget: 55,
  maxDDTarget:   15,
  rrTarget:      1.5,
  tradesPerMonth:50,
  feesTarget:    200,
}

function GoalBar({ label, current, target, unit='$', invert=false, color }) {
  const pct   = Math.min(100, (current / target) * 100)
  const good  = invert ? current <= target : current >= target
  const c     = color || (good ? T.green : current/target > 0.7 ? T.accent : T.red)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
        <span style={{ fontSize:12,color:T.textMid,fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:12,fontFamily:T.fontMono }}>
          <span style={{ color:c,fontWeight:700 }}>{unit==='$'?'$':''}{fmt(current)}{unit!=='$'?unit:''}</span>
          <span style={{ color:T.muted }}> / {unit==='$'?'$':''}{fmt(target)}{unit!=='$'?unit:''}</span>
        </span>
      </div>
      <div style={{ height:7,background:T.surface,borderRadius:4,overflow:'hidden',border:`1px solid ${T.border}` }}>
        <div style={{ width:pct+'%',height:'100%',background:c,borderRadius:4,transition:'width 0.6s ease' }}/>
      </div>
      <div style={{ fontSize:9,color:good?T.green:T.muted,marginTop:4,textAlign:'right' }}>
        {good ? '✓ Target met' : `${fmt(pct,0)}% of target`}
      </div>
    </div>
  )
}

export default function ProgressPage({ trades, stats }) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tl_goals')||'{}') } catch { return {} }
  })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...DEFAULT_GOALS, ...goals })
  const g = { ...DEFAULT_GOALS, ...goals }

  const saveGoals = () => {
    localStorage.setItem('tl_goals', JSON.stringify(form))
    setGoals(form)
    setEditing(false)
  }

  // Current month stats
  const now = new Date()
  const curMonthKey = now.toLocaleDateString('en-US',{month:'short',year:'2-digit'})
  const curMonth = stats.monthlyArr?.find(m=>m.m===curMonthKey) || { pnl:0,trades:0,wr:0,fees:0 }

  // Recent months for trend
  const last6 = stats.monthlyArr?.slice(-6) || []

  // Monthly cumulative progress
  const monthProgress = last6.map((m,i) => ({
    m: m.m, pnl: m.pnl, target: g.monthlyTarget,
    cumPnL: last6.slice(0,i+1).reduce((s,x)=>s+x.pnl,0),
    met: m.pnl >= g.monthlyTarget,
  }))

  // Streak toward goals
  const winStreak = stats.maxWinStreak || 0
  const curStreak = stats.currentStreak || 0

  // Score out of 100
  const score = Math.round(
    (Math.min(1, stats.winRate/g.winRateTarget) * 25) +
    (Math.min(1, parseFloat(stats.rr)/g.rrTarget) * 25) +
    (Math.min(1, curMonth.pnl/g.monthlyTarget) * 25) +
    (Math.max(0, 1 - stats.maxDD/g.maxDDTarget) * 25)
  )

  const scoreColor = score >= 75 ? T.green : score >= 50 ? T.accent : T.red

  if (!trades?.length) return <div style={{ padding:32,color:T.muted }}>No trade data.</div>

  return (
    <div style={{ padding:'24px 28px', fontFamily:T.fontSans }}>
      <div style={{ marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:4,fontWeight:500 }}>Progress Tracker</div>
            <div style={{ fontSize:22,fontWeight:700,color:T.text,letterSpacing:-0.5 }}>Goals & Progress</div>
          </div>
          <button onClick={()=>setEditing(e=>!e)} style={{ background:editing?T.accentDim:T.surface,border:`1px solid ${editing?T.accent:T.border}`,color:editing?T.accent:T.textMid,borderRadius:7,padding:'7px 16px',cursor:'pointer',fontFamily:T.fontSans,fontSize:12,fontWeight:500 }}>
            {editing ? 'Cancel' : '⚙ Edit Goals'}
          </button>
        </div>
      </div>

      {/* Edit Goals */}
      {editing && (
        <Card style={{ marginBottom:16 }} glow>
          <SectionHead title="Set Your Goals" sub="Customise Targets"/>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16 }}>
            {[
              { key:'monthlyTarget',  label:'Monthly P&L Target ($)',  min:100 },
              { key:'winRateTarget',  label:'Win Rate Target (%)',      min:40,  max:90 },
              { key:'maxDDTarget',    label:'Max Drawdown Limit (%)',   min:5,   max:50 },
              { key:'rrTarget',       label:'Min Risk/Reward',          min:0.5, max:10, step:0.1 },
              { key:'tradesPerMonth', label:'Trades per Month',         min:1 },
              { key:'feesTarget',     label:'Max Monthly Fees ($)',     min:10 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key}>
                <div style={{ fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:5 }}>{label}</div>
                <input type="number" value={form[key]} min={min} max={max} step={step||1}
                  onChange={e => setForm(f=>({...f,[key]:+e.target.value}))}
                  style={{ width:'100%',background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,padding:'8px 12px',color:T.text,fontFamily:T.fontMono,fontSize:13,outline:'none' }}/>
              </div>
            ))}
          </div>
          <button onClick={saveGoals} style={{ background:T.accent,color:'#000',border:'none',borderRadius:7,padding:'9px 24px',cursor:'pointer',fontFamily:T.fontSans,fontWeight:600,fontSize:13 }}>
            Save Goals
          </button>
        </Card>
      )}

      {/* Overall Score */}
      <div style={{ display:'grid',gridTemplateColumns:'200px 1fr',gap:16,marginBottom:16 }}>
        <Card style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center' }}>
          <div style={{ fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:10 }}>Overall Score</div>
          <div style={{ fontSize:56,fontWeight:700,color:scoreColor,fontFamily:T.fontMono,lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>out of 100</div>
          <div style={{ marginTop:12,width:'100%' }}>
            <div style={{ height:6,background:T.surface,borderRadius:4,overflow:'hidden' }}>
              <div style={{ width:score+'%',height:'100%',background:`linear-gradient(90deg,${T.red},${T.accent},${T.green})`,borderRadius:4 }}/>
            </div>
          </div>
          <div style={{ marginTop:10,fontSize:11,color:scoreColor,fontWeight:600 }}>
            {score>=75?'Excellent':score>=60?'Good':score>=45?'Developing':'Needs Work'}
          </div>
        </Card>

        <Card>
          <SectionHead title="This Month's Progress" sub={curMonthKey}/>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8 }}>
            <div style={{ background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:4 }}>Month P&L</div>
              <div style={{ fontSize:20,fontWeight:700,color:colorPnL(curMonth.pnl),fontFamily:T.fontMono }}>{curMonth.pnl>=0?'+$':'-$'}{fmt(Math.abs(curMonth.pnl))}</div>
              <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Target: ${fmt(g.monthlyTarget)}</div>
            </div>
            <div style={{ background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:4 }}>Trades</div>
              <div style={{ fontSize:20,fontWeight:700,fontFamily:T.fontMono }}>{curMonth.trades}</div>
              <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Target: {g.tradesPerMonth}</div>
            </div>
          </div>
          <GoalBar label="Monthly P&L" current={curMonth.pnl} target={g.monthlyTarget} />
          <GoalBar label="Win Rate" current={stats.winRate} target={g.winRateTarget} unit="%" />
          <GoalBar label="Risk/Reward" current={parseFloat(stats.rr)||0} target={g.rrTarget} unit="x" />
          <GoalBar label="Max Drawdown" current={stats.maxDD} target={g.maxDDTarget} unit="%" invert />
        </Card>
      </div>

      {/* Monthly trend */}
      <Card style={{ marginBottom:12 }}>
        <SectionHead title="Monthly P&L vs Target" sub="Last 6 Months"/>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthProgress} barSize={24} margin={{ left:8,right:8,top:4,bottom:4 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
            <XAxis dataKey="m" tick={{ fill:T.muted,fontSize:10 }} tickLine={false} axisLine={{ stroke:T.border }}/>
            <YAxis tick={{ fill:T.muted,fontSize:10,fontFamily:T.fontMono }} tickLine={false} axisLine={false} tickFormatter={v=>'$'+fmt(v,0)} width={65}/>
            <ReferenceLine y={g.monthlyTarget} stroke={T.accent} strokeDasharray="5 3" label={{ value:'Target',fill:T.accent,fontSize:9,position:'right' }}/>
            <ReferenceLine y={0} stroke={T.border}/>
            <Tooltip content={<ChartTooltip formatter={v=>'$'+fmt(v)} />}/>
            <Bar dataKey="pnl" name="P&L" radius={[3,3,0,0]}>
              {monthProgress.map((d,i) => <Cell key={i} fill={d.met?T.green:d.pnl>=0?T.accent:T.red} opacity={0.85}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display:'flex',gap:12,marginTop:8 }}>
          {[
            { c:T.green,  l:`Met target (${monthProgress.filter(m=>m.met).length} months)` },
            { c:T.accent, l:'Profitable, below target' },
            { c:T.red,    l:'Loss month' },
          ].map(l=>(
            <div key={l.l} style={{ display:'flex',alignItems:'center',gap:5 }}>
              <div style={{ width:10,height:10,borderRadius:2,background:l.c,opacity:0.85 }}/>
              <span style={{ fontSize:10,color:T.muted }}>{l.l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Stats overview */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
        <KpiCard label="Total Return"    value={fmtPct(stats.totalReturn||0)} color={colorPnL(stats.totalReturn||0)} sub="Since first trade"/>
        <KpiCard label="Best Month"      value={'+$'+fmt(Math.max(...(stats.monthlyArr||[{pnl:0}]).map(m=>m.pnl)))} color={T.green} sub={stats.monthlyArr?.sort((a,b)=>b.pnl-a.pnl)[0]?.m}/>
        <KpiCard label="Worst Month"     value={(()=>{const w=Math.min(...(stats.monthlyArr||[{pnl:0}]).map(m=>m.pnl));return (w>=0?'+$':'-$')+fmt(Math.abs(w))})()}  color={T.red} sub={stats.monthlyArr?.sort((a,b)=>a.pnl-b.pnl)[0]?.m}/>
        <KpiCard label="Months Profitable" value={`${stats.monthlyArr?.filter(m=>m.pnl>0).length||0} / ${stats.monthlyArr?.length||0}`} color={T.blue} sub="Green months"/>
      </div>
    </div>
  )
}
