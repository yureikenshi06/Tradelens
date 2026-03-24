import { useState } from 'react'
import { THEME as T } from '../lib/theme'
import { fmt, fmtDate } from '../lib/data'
import { Card, SectionHead, Btn, Input } from '../components/UI'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/supabase'

export default function SettingsPage({ trades, stats, onConnectBinance, onLoadDemo, onDisconnect, source, error: hookError, progress, savedKeys }) {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const handleConnect = async () => {
    setMsg('')
    setSaving(true)
    const res = await onConnectBinance(apiKey, apiSecret)
    if (res?.success) setMsg(`Saved ${res.count} trades. ${res.newCount || 0} new trades were synced.`)
    else if (res?.demo) setMsg('Showing demo data. See the error above.')
    else if (res?.error) setMsg('')
    setSaving(false)
  }

  const exportCSV = () => {
    const rows = [
      'id,symbol,side,qty,price,exitPrice,pnl,fee,leverage,duration,equity,time',
      ...trades.map((t) => [
        t.id, t.symbol, t.side, t.qty, t.price,
        t.exitPrice || '', t.pnl, t.fee, t.leverage,
        t.duration, t.equity,
        new Date(t.time).toISOString(),
      ].join(',')),
    ].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(rows)
    a.download = `tradelenx_export_${Date.now()}.csv`
    a.click()
  }

  const statusLabel =
    source === 'binance'
      ? `Binance Live (${trades.length} trades)`
      : source === 'database'
        ? `Saved Cache (${trades.length} trades)`
        : 'Demo Mode'

  const statusColor = source === 'binance' ? T.green : T.accent
  const statusBg = source === 'binance' ? T.greenDim : T.accentDim

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
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>UID: {user.id?.slice(0, 16)}...</div>
            </div>
            <Btn variant="danger" onClick={signOut}>Sign Out</Btn>
          </div>
        ) : (
          <div style={{ color: T.muted, fontSize: 12 }}>
            Not signed in. Running in demo mode.
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Binance Live Data" sub="API Connection" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: statusBg,
            border: `1px solid ${statusColor}44`,
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 11,
            color: statusColor,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            {statusLabel}
          </div>
          {source === 'binance' && (
            <Btn onClick={onLoadDemo} style={{ fontSize: 11, padding: '5px 12px' }}>Switch to Demo</Btn>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>API Key</div>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Binance API Key (read-only)"
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>
              Secret Key
              <button
                onClick={() => setShowSecret((s) => !s)}
                style={{ marginLeft: 8, background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 10, fontFamily: T.fontMono }}
              >
                {showSecret ? 'hide' : 'show'}
              </button>
            </div>
            <Input
              type={showSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Binance API Secret"
            />
          </div>
          <Btn
            variant="accent"
            onClick={handleConnect}
            disabled={saving || !apiKey || !apiSecret}
            style={{ padding: '10px', fontSize: 13 }}
          >
            {saving ? (progress || 'Connecting...') : 'Sync Binance Trades'}
          </Btn>
        </div>

        {progress && saving && (
          <div style={{ fontSize: 12, color: T.accent, padding: '8px 12px', background: T.accentDim, borderRadius: 7, marginBottom: 8 }}>
            {progress}
          </div>
        )}

        {hookError && (
          <div style={{ fontSize: 12, color: T.red, padding: '10px 14px', background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 8, marginBottom: 8, lineHeight: 1.6 }}>
            {hookError}
          </div>
        )}

        {msg && !hookError && (
          <div style={{ fontSize: 12, color: T.green, padding: '8px 12px', background: T.greenDim, border: `1px solid ${T.green}33`, borderRadius: 7, marginBottom: 8 }}>
            {msg}
          </div>
        )}

        {savedKeys && (
          <div style={{ padding: '10px 14px', background: T.greenDim, border: `1px solid ${T.green}33`, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, color: T.green }}>
              API keys saved for this session. Login loads cached trades first, then syncs only new trades.
            </div>
            <button onClick={() => { if (onDisconnect) onDisconnect() }} style={{ background: 'none', border: `1px solid ${T.red}44`, color: T.red, borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 11 }}>
              Forget Keys
            </button>
          </div>
        )}

        <div style={{ padding: '12px 14px', background: T.surface, borderRadius: 10, fontSize: 11, color: T.muted, lineHeight: 1.8, borderLeft: `3px solid ${T.green}` }}>
          <div style={{ fontWeight: 700, color: T.green, marginBottom: 6 }}>Direct connection with cached database sync</div>
          <div>Your browser signs requests directly. Secret key never leaves your device.</div>
          <div style={{ marginTop: 4 }}>
            Keys are saved in <strong style={{ color: T.textMid }}>sessionStorage</strong>. Trades are saved in Supabase so the next login can reuse cached data and fetch only newer trades.
          </div>
          <div style={{ marginTop: 4, color: T.accent }}>
            Make sure your Binance API key has <strong>Enable Futures</strong> turned on and IP restriction set to <strong>Unrestricted</strong>.
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Data Summary" sub="Current Session" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { l: 'Trades', v: trades.length },
            { l: 'Symbols', v: [...new Set(trades.map((t) => t.symbol))].length },
            { l: 'From', v: trades.length ? fmtDate(Math.min(...trades.map((t) => t.time))) : '-' },
            { l: 'Net P&L', v: `${stats.totalPnL >= 0 ? '+$' : '-$'}${fmt(Math.abs(stats.totalPnL || 0))}` },
          ].map((r) => (
            <div key={r.l} style={{ background: T.surface, borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{r.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: T.fontDisplay }}>{r.v}</div>
            </div>
          ))}
        </div>
        <Btn variant="success" onClick={exportCSV} style={{ padding: '10px 20px' }}>Export CSV ({trades.length} trades)</Btn>
      </Card>
    </div>
  )
}
