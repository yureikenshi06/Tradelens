// Professional dark terminal aesthetic — Bloomberg/institutional grade
export const THEME = {
  bg:         '#07090d',
  bgDeep:     '#040507',
  surface:    '#0c0f14',
  card:       '#0f1318',
  cardHover:  '#131720',
  border:     '#1c2333',
  borderMid:  '#243040',
  text:       '#e2e8f0',
  textMid:    '#94a3b8',
  muted:      '#475569',
  accent:     '#e2b84a',      // muted gold — less childish than #f0b90b
  accentDim:  'rgba(226,184,74,0.10)',
  accentGlow: 'rgba(226,184,74,0.20)',
  green:      '#22c55e',
  greenDim:   'rgba(34,197,94,0.10)',
  red:        '#ef4444',
  redDim:     'rgba(239,68,68,0.10)',
  blue:       '#3b82f6',
  blueDim:    'rgba(59,130,246,0.10)',
  purple:     '#8b5cf6',
  purpleDim:  'rgba(139,92,246,0.10)',
  cyan:       '#06b6d4',
  cyanDim:    'rgba(6,182,212,0.10)',
  orange:     '#f97316',
  orangeDim:  'rgba(249,115,22,0.10)',
  // Typography — institutional, readable
  fontDisplay: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono:    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontSans:    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
}

export const colorPnL = (n) => n >= 0 ? THEME.green : THEME.red
export const bgPnL    = (n) => n >= 0 ? THEME.greenDim : THEME.redDim
