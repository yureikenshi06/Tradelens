import { useState } from 'react'
import { THEME as T } from '../lib/theme'
import { signOut } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⬛', label: 'Dashboard' },
  { id: 'trades',    icon: '📋', label: 'Trade Log' },
  { id: 'charts',    icon: '📈', label: 'Analytics' },
  { id: 'calendar',  icon: '📅', label: 'Calendar' },
  { id: 'symbols',   icon: '🔍', label: 'Symbols' },
  { id: 'notes',     icon: '📝', label: 'Journal' },
  { id: 'ai',        icon: '🤖', label: 'AI Verdict' },
  { id: 'settings',  icon: '⚙', label: 'Settings' },
]

export default function Layout({ children, activePage, onPageChange, connected, source, trades }) {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bgDeep }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 64 : 220,
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(.22,1,.36,1)',
        flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 16px' : '20px 20px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: 22, color: T.accent, flexShrink: 0, lineHeight: 1 }}>◈</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.fontDisplay, color: T.accent, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                TRADE<span style={{ color: T.muted }}>LENS</span>
              </div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>TRADING JOURNAL</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                title={collapsed ? item.label : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '9px' : '9px 12px',
                  borderRadius: 9, cursor: 'pointer',
                  fontFamily: T.fontMono, fontSize: 12, fontWeight: active ? 600 : 400,
                  background: active ? T.accentDim : 'transparent',
                  color: active ? T.accent : T.textMid,
                  border: active ? `1px solid ${T.accent}33` : '1px solid transparent',
                  transition: 'all 0.15s',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && active && (
                  <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: T.accent }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* Status + User */}
        <div style={{ padding: '12px 8px', borderTop: `1px solid ${T.border}` }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: connected ? T.greenDim : T.redDim,
              border: `1px solid ${connected ? T.green : T.red}44`,
              borderRadius: 8, padding: '7px 10px', marginBottom: 8,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: connected ? T.green : T.red,
                boxShadow: `0 0 8px ${connected ? T.green : T.red}`,
              }} />
              <div style={{ fontSize: 10, color: connected ? T.green : T.red, fontWeight: 600 }}>
                {connected ? (source === 'demo' ? 'DEMO DATA' : 'BINANCE LIVE') : 'DISCONNECTED'}
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              width: '100%', padding: '7px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.muted, fontFamily: T.fontMono, fontSize: 11,
              cursor: 'pointer', marginBottom: 6,
            }}
          >
            {collapsed ? '→' : '← Collapse'}
          </button>
          {!collapsed && user && (
            <div style={{ padding: '8px 10px', borderRadius: 8, background: T.card }}>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1, marginBottom: 3 }}>LOGGED IN AS</div>
              <div style={{ fontSize: 11, color: T.textMid, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
              <button onClick={signOut} style={{
                fontSize: 10, color: T.red, background: T.redDim, border: `1px solid ${T.red}33`,
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: T.fontMono,
              }}>Sign Out</button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', background: T.bgDeep }}>
        {children}
      </main>
    </div>
  )
}
