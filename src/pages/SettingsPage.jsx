import { useState } from 'react'
import { THEME as T } from '../lib/theme'
import { fmt, fmtDate } from '../lib/data'
import { Card, SectionHead, Btn, Input } from '../components/UI'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/supabase'

export default function SettingsPage({ trades, stats, onConnectBinance, onLoadDemo, source }) {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  const handleConnect = async () => {
    setSaving(true)
    const res = await onConnectBinance(apiKey)
    setMsg(res?.demo ? '⚠ Demo mode active — Binance requires backend proxy for HMAC signing in production' : '✓ Connected to Binance')
    setSaving(false)
  }

  const exportCSV = () => {
    const rows = ['id,symbol,side,qty,price,exitPrice,pnl,fee,leverage,duration,equity,time',
      ...trades.map(t => [t.id,t.symbol,t.side,t.qty,t.price,t.exitPrice||'',t.pnl,t.fee,t.leverage,t.duration,t.equity,new Date(t.time).toISOString()].join(','))
    ].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(rows)
    a.download = `tradelens_export_${Date.now()}.csv`
    a.click()
  }

  const STEPS = [
    {
      n: '01', title: 'Supabase Setup (Free)',
      items: ['Go to supabase.com → New Project','Run SQL from src/lib/supabase.js in SQL Editor','Authentication → Settings → enable Email','Authentication → Users → Add User (only you!)','Copy Project URL and anon key']
    },
    {
      n: '02', title: 'Environment Variables',
      items: ['Create .env file in project root','VITE_SUPABASE_URL=https://xxxx.supabase.co','VITE_SUPABASE_ANON_KEY=your_anon_key']
    },
    {
      n: '03', title: 'Deploy to Netlify (Free)',
      items: ['Push code to GitHub','Connect repo on netlify.com → New Site','Build command: npm run build','Publish dir: dist','Add env vars in Netlify dashboard → Deploy']
    },
    {
      n: '04', title: 'Lock Down Access',
      items: ['Only your Supabase email can log in','Enable 2FA on your Supabase account','Optional: add Netlify site password for extra layer','Use read-only Binance API keys']
    },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Configuration</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: T.fontDisplay }}>Settings</div>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Account" sub="Authentication" />
        {user ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>Signed in as</div>
              <div style={{ fontWeight: 700 }}>{user.email}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>UID: {user.id?.slice(0,16)}...</div>
            </div>
            <Btn variant="danger" onClick={signOut}>Sign Out</Btn>
          </div>
        ) : (
          <div style={{ color: T.muted, fontSize: 12 }}>Not signed in. Running in demo mode — notes saved locally only.</div>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Binance API" sub="Live Data Connection" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: source === 'demo' ? T.accentDim : T.greenDim,
            border: `1px solid ${source === 'demo' ? T.accent : T.green}44`,
            borderRadius: 8, padding: '7px 14px', fontSize: 11,
            color: source === 'demo' ? T.accent : T.green,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: source === 'demo' ? T.accent : T.green }} />
            {source === 'demo' ? 'Demo Mode' : 'Binance Live'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
          <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" placeholder="Binance read-only API Key" />
          <Btn variant="accent" onClick={handleConnect} disabled={saving || !apiKey}>{saving ? 'Connecting...' : 'Connect'}</Btn>
        </div>
        {msg && <div style={{ fontSize: 12, color: T.accent, padding: '8px 12px', background: T.accentDim, borderRadius: 7, marginBottom: 10 }}>{msg}</div>}
        <div style={{ padding: '12px', background: T.surface, borderRadius: 8, fontSize: 11, color: T.muted, lineHeight: 1.7 }}>
          For production: deploy the included Netlify function at <code style={{ color: T.accent }}>netlify/functions/binance.js</code> — it signs requests server-side with HMAC-SHA256 so your secret key stays safe.
          <div style={{ marginTop: 8 }}><Btn onClick={onLoadDemo}>🔄 Reload Demo Data</Btn></div>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Data" sub="Export & Summary" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { l: 'Trades', v: trades.length },
            { l: 'Symbols', v: [...new Set(trades.map(t=>t.symbol))].length },
            { l: 'From', v: trades.length ? fmtDate(Math.min(...trades.map(t=>t.time))) : '—' },
            { l: 'Net P&L', v: (stats.totalPnL>=0?'+$':'-$')+fmt(Math.abs(stats.totalPnL)) },
          ].map(r => (
            <div key={r.l} style={{ background: T.surface, borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{r.l}</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: T.fontDisplay }}>{r.v}</div>
            </div>
          ))}
        </div>
        <Btn variant="success" onClick={exportCSV} style={{ padding: '10px 20px' }}>↓ Export CSV ({trades.length} trades)</Btn>
      </Card>

      <Card>
        <SectionHead title="Free Hosting Guide" sub="Deploy in 10 minutes" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: T.accentDim, border: `1px solid ${T.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: T.accent, fontSize: 12, flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 7 }}>{s.title}</div>
                {s.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: T.accent, fontSize: 10 }}>›</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
