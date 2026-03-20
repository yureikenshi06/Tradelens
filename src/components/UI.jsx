import { THEME, colorPnL, bgPnL } from '../lib/theme'
import { fmt } from '../lib/data'

const T = THEME

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, className, onClick, glow }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${glow ? T.accentGlow : T.border}`,
        borderRadius: 14,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.15s',
        cursor: onClick ? 'pointer' : 'default',
        ...(onClick && { ':hover': { borderColor: T.borderMid } }),
        ...style,
      }}
    >
      {glow && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${T.accent}66, transparent)`,
        }} />
      )}
      {children}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color, icon, trend, delta }) {
  const c = color || T.text
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at 100% 0%, ${c}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: T.fontMono }}>{label}</div>
        {icon && <div style={{ fontSize: 16, opacity: 0.7 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: c, fontFamily: T.fontDisplay, letterSpacing: -0.5, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
        {delta !== undefined && (
          <div style={{ fontSize: 10, color: delta >= 0 ? T.green : T.red, background: delta >= 0 ? T.greenDim : T.redDim, borderRadius: 4, padding: '1px 6px' }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHead({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
      <div>
        {sub && <div style={{ fontSize: 9, color: T.accent, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 5, fontFamily: T.fontMono }}>{sub}</div>}
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>{title}</div>
      </div>
      {action}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ text, color, size = 'sm' }) {
  const c = color || T.textMid
  return (
    <span style={{
      background: c + '20', color: c,
      border: `1px solid ${c}40`,
      borderRadius: 5, padding: size === 'sm' ? '2px 8px' : '4px 12px',
      fontSize: size === 'sm' ? 10 : 12,
      fontWeight: 600, letterSpacing: 0.5, fontFamily: T.fontMono,
      whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color, height = 6 }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ background: T.surface, borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{
        width: pct + '%', height: '100%', borderRadius: height,
        background: color || T.accent,
        transition: 'width 0.5s cubic-bezier(.22,1,.36,1)',
      }} />
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.borderMid}`,
      borderRadius: 10, padding: '10px 14px', fontFamily: T.fontMono, fontSize: 11,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {label && <div style={{ color: T.muted, marginBottom: 6, fontSize: 10 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text, marginBottom: 2 }}>
          <span style={{ color: T.muted }}>{p.name}: </span>
          {formatter ? formatter(p.value, p.name) : p.value}
        </div>
      ))}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'default', disabled, style }) {
  const variants = {
    default: { background: T.surface, color: T.textMid, border: `1px solid ${T.border}` },
    accent:  { background: T.accent,  color: '#000',     border: 'none', fontWeight: 700 },
    ghost:   { background: 'transparent', color: T.muted, border: `1px solid ${T.border}` },
    danger:  { background: T.redDim,  color: T.red,      border: `1px solid ${T.red}44` },
    success: { background: T.greenDim, color: T.green,   border: `1px solid ${T.green}44` },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        borderRadius: 8, padding: '7px 16px',
        fontFamily: T.fontMono, fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '8px 12px',
        color: T.text, fontFamily: T.fontMono, fontSize: 12,
        outline: 'none', width: '100%',
        ...style,
      }}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, style }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '7px 12px',
        color: T.text, fontFamily: T.fontMono, fontSize: 12,
        cursor: 'pointer', outline: 'none',
        ...style,
      }}
    >
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {tabs.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              fontFamily: T.fontMono, fontSize: 12, fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              background: isActive ? T.accentDim : 'transparent',
              color: isActive ? T.accent : T.muted,
              border: isActive ? `1px solid ${T.accent}44` : '1px solid transparent',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 24, color }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${T.border}`,
      borderTopColor: color || T.accent,
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function Empty({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.4 }}>{icon || '📊'}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>{sub}</div>
      {action}
    </div>
  )
}
