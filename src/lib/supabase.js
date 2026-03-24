import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const onAuthChange = (cb) => supabase.auth.onAuthStateChange(cb)

export const fetchNotes = async (userId) => {
  const { data, error } = await supabase
    .from('trade_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const upsertNote = async (note) => {
  const { data, error } = await supabase
    .from('trade_notes')
    .upsert(note, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteNote = async (id) => {
  const { error } = await supabase.from('trade_notes').delete().eq('id', id)
  if (error) throw error
}

export const saveBinanceKeys = async (userId, apiKey, label) => {
  const { data, error } = await supabase
    .from('api_keys')
    .upsert({ user_id: userId, api_key: apiKey, label }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export const fetchBinanceKeys = async (userId) => {
  const { data, error } = await supabase
    .from('api_keys')
    .select('api_key, label')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data
}

export const fetchCachedTrades = async (userId) => {
  const { data, error } = await supabase
    .from('trade_cache')
    .select('*')
    .eq('user_id', userId)
    .order('time', { ascending: true })
  if (error) return []
  return data
}

export const fetchLatestTradeTime = async (userId) => {
  const { data, error } = await supabase
    .from('trade_cache')
    .select('time')
    .eq('user_id', userId)
    .order('time', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data?.time ?? null
}

export const fetchEarliestTradeTime = async (userId) => {
  const { data, error } = await supabase
    .from('trade_cache')
    .select('time')
    .eq('user_id', userId)
    .order('time', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data?.time ?? null
}

export const upsertCachedTrades = async (userId, trades) => {
  if (!Array.isArray(trades) || !trades.length) return []
  const payload = trades.map((trade) => ({
    id: trade.id,
    user_id: userId,
    symbol: trade.symbol,
    side: trade.side,
    qty: trade.qty,
    price: trade.price,
    exit_price: trade.exitPrice,
    fee: trade.fee,
    pnl: trade.pnl,
    equity: trade.equity,
    time: trade.time,
    leverage: trade.leverage,
    risk_percent: trade.riskPercent,
    source: trade.source,
    order_id: trade.orderId,
    position_side: trade.positionSide,
    maker: trade.maker,
  }))
  const { data, error } = await supabase
    .from('trade_cache')
    .upsert(payload, { onConflict: 'user_id,id' })
    .select()
  if (error) throw error
  return data || []
}

export const fetchCapitalFlow = async (userId) => {
  const { data, error } = await supabase
    .from('capital_flow')
    .select('*')
    .eq('user_id', userId)
    .order('time', { ascending: true })
  if (error) return []
  return data
}

export const upsertCapitalFlow = async (entry, userId) => {
  const { error } = await supabase
    .from('capital_flow')
    .upsert({ ...entry, user_id: userId }, { onConflict: 'id' })
  if (error) throw error
}

export const deleteCapitalFlow = async (id) => {
  const { error } = await supabase.from('capital_flow').delete().eq('id', id)
  if (error) throw error
}

/*
  SUPABASE SETUP INSTRUCTIONS
  Run these SQL commands in your Supabase SQL Editor:

  -- Trade notes table
  create table trade_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    trade_id text,
    date date,
    symbol text,
    title text,
    body text,
    mood text,
    tags text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table trade_notes enable row level security;
  create policy "Users own their notes" on trade_notes
    for all using (auth.uid() = user_id);

  -- API keys table
  create table api_keys (
    user_id uuid primary key references auth.users,
    api_key text,
    label text,
    created_at timestamptz default now()
  );
  alter table api_keys enable row level security;
  create policy "Users own their keys" on api_keys
    for all using (auth.uid() = user_id);

  -- Capital flow table
  create table capital_flow (
    id text primary key,
    user_id uuid references auth.users not null,
    type text not null,
    amount numeric not null,
    time bigint not null,
    date text,
    note text,
    created_at timestamptz default now()
  );
  alter table capital_flow enable row level security;
  create policy "Users own their flow" on capital_flow
    for all using (auth.uid() = user_id);

  -- Trade cache table
  create table trade_cache (
    id text not null,
    user_id uuid references auth.users not null,
    symbol text not null,
    side text,
    qty numeric,
    price numeric,
    exit_price numeric,
    fee numeric,
    pnl numeric,
    equity numeric,
    time bigint not null,
    leverage integer,
    risk_percent numeric,
    source text,
    order_id text,
    position_side text,
    maker boolean,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    primary key (user_id, id)
  );
  create index trade_cache_user_time_idx on trade_cache(user_id, time desc);
  alter table trade_cache enable row level security;
  create policy "Users own their trade cache" on trade_cache
    for all using (auth.uid() = user_id);

  Then go to Authentication > Settings > Site URL and set your deployed URL.
  Enable Email auth under Authentication > Providers.
*/
