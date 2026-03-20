import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { THEME as T, colorPnL } from '../lib/theme'
import { fmt, fmtDate, localDateKey } from '../lib/data'
import { Card, SectionHead, Badge, ChartTooltip, Btn, Input } from '../components/UI'
import { useAuth } from '../hooks/useAuth'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MOODS  = ['🔥 Focused','😐 Neutral','😰 Anxious','😤 FOMO','🧘 Disciplined','😴 Tired','😤 Revenge']

// Local note storage (also works with Supabase when connected)
function useNotes() {
  const [notes, setNotes] = useState({})
  useEffect(() => {
    try { const saved = localStorage.getItem('tl_cal_notes'); if (saved) setNotes(JSON.parse(saved)) } catch {}
  }, [])
  const save = (dateKey, note) => {
    setNotes(n => {
      const updated = { ...n, [dateKey]: note }
      try { localStorage.setItem('tl_cal_notes', JSON.stringify(updated)) } catch {}
      return updated
    })
  }
  const del = (dateKey) => {
    setNotes(n => {
      const updated = { ...n }
      delete updated[dateKey]
      try { localStorage.setItem('tl_cal_notes', JSON.stringify(updated)) } catch {}
      return updated
    })
  }
  return { notes, save, del }
}

export default function CalendarPage({ trades, stats }) {
  const now     = new Date()
  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth())
  const [selected, setSelected] = useState(null)
  const [editing,  setEditing]  = useState(false)
  const [noteForm, setNoteForm] = useState({ text:'', mood:'' })
  const { notes, save, del }    = useNotes()

  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMo  = new Date(year, month+1, 0).getDate()
  const cells     = Array.from({ length: firstDay+daysInMo }, (_,i) => {
    if (i < firstDay) return null
    const d   = i - firstDay + 1
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return { d, key, ...(stats.dailyPnL?.[key]||{ pnl:null,trades:0,wins:0,fees:0 }) }
  })

  const monthKey   = new Date(year,month,1).toLocaleDateString('en-US',{month:'short',year:'2-digit'})
  const monthStats = stats.monthlyArr?.find(m=>m.m===monthKey)
  const todayKey   = localDateKey(Date.now())

  const dayTrades = useMemo(() => {
    if (!selected) return []
    return trades.filter(t=>localDateKey(t.time)===selected)
  }, [selected, trades])

  const maxAbs = useMemo(() => {
    if (!stats.dailyPnL) return 1
    return Math.max(1,...Object.values(stats.dailyPnL).map(d=>Math.abs(d.pnl)))
  }, [stats.dailyPnL])

  const monthDays = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,'0')}`
    return Object.entries(stats.dailyPnL||{})
      .filter(([k])=>k.startsWith(prefix))
      .sort(([a],[b])=>a.localeCompare(b))
  }, [stats.dailyPnL, year, month])

  const prevMonth = () => { if(month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1) }
  const nextMonth = () => { if(month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1) }

  const openNote = (key) => {
    setSelected(key)
    const existing = notes[key]
    setNoteForm({ text: existing?.text||'', mood: existing?.mood||'' })
    setEditing(false)
  }

  const saveNote = () => {
    if (selected) {
      if (noteForm.text.trim() || noteForm.mood) save(selected, { ...noteForm, updatedAt: Date.now() })
      else del(selected)
    }
    setEditing(false)
  }

  const dayPnL = selected ? stats.dailyPnL?.[selected] : null
  const dayNote = selected ? notes[selected] : null

  return (
    <div style={{ padding:'24px 28px',fontFamily:T.fontSans }}>
      <div style={{ marginBottom:24,paddingBottom:16,borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:4,fontWeight:500 }}>P&L Calendar</div>
        <div style={{ fontSize:24,fontWeight:700,color:T.text,letterSpacing:-0.5 }}>Trading Calendar</div>
        <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>{Object.keys(stats.dailyPnL||{}).length} trading days · click any day to view trades and add notes</div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:20,alignItems:'start' }}>
        <div>
          <Card style={{ marginBottom:12 }} glow>
            {/* Month nav */}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <button onClick={prevMonth} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.textMid,borderRadius:7,padding:'6px 16px',cursor:'pointer',fontFamily:T.fontSans,fontSize:14 }}>←</button>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:20,fontWeight:700,color:T.text,letterSpacing:-0.3 }}>{MONTHS[month]}</div>
                <div style={{ fontSize:12,color:T.muted }}>{year}</div>
              </div>
              <button onClick={nextMonth} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.textMid,borderRadius:7,padding:'6px 16px',cursor:'pointer',fontFamily:T.fontSans,fontSize:14 }}>→</button>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:4 }}>
              {DAYS.map(d=><div key={d} style={{ textAlign:'center',fontSize:9,color:T.muted,fontWeight:600,padding:'4px 0',textTransform:'uppercase',letterSpacing:0.8 }}>{d}</div>)}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3 }}>
              {cells.map((cell,i) => {
                if (!cell) return <div key={`e${i}`} style={{ minHeight:72 }}/>
                const hasTrades  = cell.pnl !== null
                const isPos      = hasTrades && cell.pnl > 0
                const intensity  = hasTrades ? Math.min(0.9,Math.abs(cell.pnl)/maxAbs) : 0
                const isToday    = cell.key === todayKey
                const isSel      = cell.key === selected
                const hasNote    = !!notes[cell.key]
                const greenShades = ['#071a0e','#0a2614','#0d331a','#104021','#144f29','#186032','#1d743c','#228b47']
                const redShades   = ['#1a0707','#26090a','#330b0b','#410e0e','#501111','#601414','#741818','#8b1c1c']
                const shadeIdx    = Math.min(7, Math.floor(intensity * 8))
                const bg = !hasTrades ? T.surface
                  : isPos ? greenShades[shadeIdx]
                  : redShades[shadeIdx]
                const bdr = isSel ? `2px solid ${T.accent}`
                  : isToday ? `1px solid ${T.accent}66`
                  : hasTrades ? `1px solid ${(isPos?T.green:T.red)}44`
                  : `1px solid ${T.border}`

                return (
                  <div key={cell.key} onClick={()=>openNote(cell.key)} style={{
                    borderRadius:7,padding:'7px 4px 8px',background:bg,border:bdr,
                    cursor:'pointer',minHeight:72,display:'flex',flexDirection:'column',
                    alignItems:'center',gap:2,position:'relative',transition:'opacity 0.1s',
                  }}>
                    <div style={{ fontSize:11,fontWeight:isToday?700:500,color:isToday?T.accent:isSel?T.accent:T.textMid }}>{cell.d}</div>
                    {hasTrades && (
                      <>
                        <div style={{ fontSize:Math.abs(cell.pnl)>=1000?9:10,fontWeight:600,color:isPos?T.green:T.red,fontFamily:T.fontMono,lineHeight:1.2,textAlign:'center' }}>
                          {isPos?'+':'-'}{Math.abs(cell.pnl)>=10000?'$'+fmt(Math.abs(cell.pnl)/1000,1)+'k':'$'+fmt(Math.abs(cell.pnl),0)}
                        </div>
                        <div style={{ fontSize:9,color:(isPos?T.green:T.red)+'aa' }}>{cell.trades}tr</div>
                        <div style={{ position:'absolute',bottom:3,left:'18%',right:'18%',height:2,borderRadius:1,background:T.border,overflow:'hidden' }}>
                          <div style={{ height:'100%',background:isPos?T.green:T.red,width:Math.round(intensity*100)+'%' }}/>
                        </div>
                      </>
                    )}
                    {hasNote && <div style={{ position:'absolute',top:4,right:5,width:5,height:5,borderRadius:'50%',background:T.accent }}/>}
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex',gap:16,justifyContent:'center',marginTop:14,flexWrap:'wrap' }}>
              {[{bg:'rgba(34,197,94,0.5)',label:'Profit'},{bg:'rgba(239,68,68,0.5)',label:'Loss'},{bg:T.surface,label:'No trades'},{bg:T.accentDim,border:`1px solid ${T.accent}44`,label:'Note added'}].map(l=>(
                <div key={l.label} style={{ display:'flex',alignItems:'center',gap:5 }}>
                  <div style={{ width:10,height:10,borderRadius:2,background:l.bg,border:l.border||`1px solid ${T.border}` }}/>
                  <span style={{ fontSize:10,color:T.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHead title={`Daily P&L — ${MONTHS[month].slice(0,3)} ${year}`} sub="Bar Chart"/>
            {monthDays.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={monthDays.map(([k,v])=>({ day:parseInt(k.split('-')[2]),...v,pnl:+v.pnl.toFixed(2) }))} barSize={16} margin={{ left:4,right:4,top:4,bottom:4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="day" tick={{ fill:T.muted,fontSize:10 }} tickLine={false} axisLine={{ stroke:T.border }}/>
                  <YAxis tick={{ fill:T.muted,fontSize:10,fontFamily:T.fontMono }} tickLine={false} axisLine={false} tickFormatter={v=>'$'+fmt(v,0)} width={60}/>
                  <ReferenceLine y={0} stroke={T.border}/>
                  <Tooltip content={<ChartTooltip formatter={v=>'$'+fmt(v)} />}/>
                  <Bar dataKey="pnl" radius={[3,3,0,0]} name="P&L">
                    {monthDays.map(([,v],i)=><Cell key={i} fill={v.pnl>=0?T.green:T.red}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ color:T.muted,fontSize:12,padding:'24px 0',textAlign:'center' }}>No trades this month</div>}
          </Card>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {/* Month summary */}
          <Card>
            <SectionHead title={`${MONTHS[month].slice(0,3)} ${year}`} sub="Summary"/>
            {monthStats ? (
              <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
                {[
                  { l:'P&L',         v:(monthStats.pnl>=0?'+$':'-$')+fmt(Math.abs(monthStats.pnl)), c:colorPnL(monthStats.pnl) },
                  { l:'Trades',      v:monthStats.trades, c:T.text },
                  { l:'Win Rate',    v:monthStats.wr+'%', c:monthStats.wr>=50?T.green:T.red },
                  { l:'Fees',        v:'-$'+fmt(monthStats.fees||0), c:T.red },
                  { l:'Trading Days',v:monthDays.length+' days', c:T.text },
                ].map(r=>(
                  <div key={r.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:11,color:T.muted }}>{r.l}</span>
                    <span style={{ fontSize:12,fontWeight:600,color:r.c,fontFamily:T.fontMono }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color:T.muted,fontSize:12,textAlign:'center',padding:'20px 0' }}>No trades in {MONTHS[month]}</div>}
          </Card>

          {/* Selected day */}
          {selected && (
            <Card glow>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:9,color:T.accent,textTransform:'uppercase',letterSpacing:1.5,marginBottom:3,fontWeight:500 }}>Selected Day</div>
                  <div style={{ fontSize:15,fontWeight:600,letterSpacing:-0.2 }}>{fmtDate(new Date(selected+'T12:00:00').getTime())}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.muted,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:T.fontSans,fontSize:11 }}>✕</button>
              </div>

              {/* Day stats */}
              {dayPnL && (
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                  {[
                    { l:'Day P&L',  v:(dayPnL.pnl>=0?'+$':'-$')+fmt(Math.abs(dayPnL.pnl)), c:colorPnL(dayPnL.pnl) },
                    { l:'Trades',   v:dayTrades.length, c:T.text },
                    { l:'Winners',  v:dayTrades.filter(t=>t.pnl>0).length, c:T.green },
                    { l:'Fees',     v:'-$'+fmt(dayPnL.fees||0), c:T.red },
                  ].map(r=>(
                    <div key={r.l} style={{ background:T.surface,borderRadius:7,padding:'9px 12px',border:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:9,color:T.muted,marginBottom:3,textTransform:'uppercase',letterSpacing:1 }}>{r.l}</div>
                      <div style={{ fontSize:16,fontWeight:700,color:r.c,fontFamily:T.fontMono }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Note section */}
              <div style={{ background:T.surface,borderRadius:8,padding:'12px',border:`1px solid ${T.border}`,marginBottom:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                  <div style={{ fontSize:11,fontWeight:600,color:T.text }}>Journal Note</div>
                  <button onClick={()=>setEditing(e=>!e)} style={{ background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:11,fontFamily:T.fontSans }}>
                    {editing ? 'Cancel' : dayNote ? 'Edit' : '+ Add'}
                  </button>
                </div>

                {editing ? (
                  <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                      {MOODS.map(m=>(
                        <button key={m} onClick={()=>setNoteForm(f=>({...f,mood:f.mood===m?'':m}))} style={{
                          background: noteForm.mood===m?T.accentDim:T.card,
                          border:`1px solid ${noteForm.mood===m?T.accent:T.border}`,
                          color: noteForm.mood===m?T.accent:T.muted,
                          borderRadius:5,padding:'3px 8px',fontSize:10,cursor:'pointer',fontFamily:T.fontSans,
                        }}>{m}</button>
                      ))}
                    </div>
                    <textarea value={noteForm.text} onChange={e=>setNoteForm(f=>({...f,text:e.target.value}))}
                      placeholder="What happened today? What did you do well or badly? Market conditions, emotions, lessons learned..."
                      rows={4} style={{
                        width:'100%',background:T.card,border:`1px solid ${T.border}`,borderRadius:7,
                        padding:'10px',color:T.text,fontFamily:T.fontSans,fontSize:12,resize:'vertical',
                        outline:'none',lineHeight:1.7,
                      }}/>
                    <div style={{ display:'flex',gap:8 }}>
                      <Btn variant="accent" onClick={saveNote} style={{ flex:1,padding:'8px' }}>Save Note</Btn>
                      {dayNote && <Btn variant="danger" onClick={()=>{del(selected);setEditing(false)}} style={{ padding:'8px 12px' }}>Delete</Btn>}
                    </div>
                  </div>
                ) : dayNote ? (
                  <div>
                    {dayNote.mood && <div style={{ fontSize:12,marginBottom:6 }}>{dayNote.mood}</div>}
                    <div style={{ fontSize:12,color:T.textMid,lineHeight:1.7,whiteSpace:'pre-wrap' }}>{dayNote.text||'No text added.'}</div>
                  </div>
                ) : (
                  <div style={{ fontSize:11,color:T.muted,textAlign:'center',padding:'10px 0' }}>No note for this day. Click "+ Add" to journal your thoughts.</div>
                )}
              </div>

              {/* Individual trades */}
              {dayTrades.length > 0 && (
                <div style={{ display:'flex',flexDirection:'column',gap:5,maxHeight:240,overflowY:'auto' }}>
                  {dayTrades.map(t=>(
                    <div key={t.id} style={{ background:T.surface,borderRadius:7,padding:'9px 11px',border:`1px solid ${colorPnL(t.pnl)}30`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:600,fontSize:12,marginBottom:2 }}>{t.symbol.replace('USDT','')}<span style={{ color:T.muted,fontSize:10 }}>/USDT</span></div>
                        <div style={{ fontSize:10,color:T.muted }}>{t.qty} @ ${fmt(t.price)} · {t.leverage}x</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:700,color:colorPnL(t.pnl),fontSize:13,fontFamily:T.fontMono }}>{t.pnl>=0?'+':''}{fmt(t.pnl)}</div>
                        <Badge text={t.side} color={t.side==='BUY'?T.green:T.red}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Heatmap dots */}
          <Card>
            <SectionHead title="Month Heatmap" sub="Intensity"/>
            {monthDays.length > 0 ? (
              <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                {monthDays.map(([k,v])=>{
                  const int = Math.min(0.95,0.2+Math.abs(v.pnl)/maxAbs*0.75)
                  const pos = v.pnl>=0
                  return (
                    <div key={k} title={`${k}: ${pos?'+':'-'}$${fmt(Math.abs(v.pnl))}`}
                      onClick={()=>openNote(k)} style={{
                        width:28,height:28,borderRadius:4,cursor:'pointer',
                        background:pos?`rgba(34,197,94,${int})`:`rgba(239,68,68,${int})`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:9,color:'#fff',fontWeight:700,
                        border:k===selected?`2px solid ${T.accent}`:`1px solid ${pos?T.green:T.red}30`,
                        position:'relative',
                      }}>
                      {parseInt(k.split('-')[2])}
                      {notes[k] && <div style={{ position:'absolute',top:2,right:2,width:4,height:4,borderRadius:'50%',background:T.accent }}/>}
                    </div>
                  )
                })}
              </div>
            ) : <div style={{ color:T.muted,fontSize:12,textAlign:'center',padding:'16px 0' }}>No data</div>}
          </Card>
        </div>
      </div>
    </div>
  )
}
