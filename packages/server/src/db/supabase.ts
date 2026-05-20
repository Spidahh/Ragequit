import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url  = process.env['SUPABASE_URL']
const key  = process.env['SUPABASE_SERVICE_ROLE_KEY']

// Lazily initialised — server boots without Supabase if env vars are absent
// (local dev without credentials still works; auth is skipped gracefully).
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client
  if (!url || !key) {
    console.warn('[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — running without DB')
    return null
  }
  _client = createClient(url, key, {
    auth: { persistSession: false },
  })
  return _client
}

/** Verify a Supabase JWT and return the user_id (uuid string), or null if invalid. */
export async function verifyToken(token: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

/** Upsert a player row (creates on first login). */
export async function upsertPlayer(userId: string, username: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('players').upsert(
    { user_id: userId, username },
    { onConflict: 'user_id', ignoreDuplicates: true },
  )
}

/** Load the saved loadout for a user (returns null if not found). */
export async function loadLoadout(userId: string): Promise<{
  loadout_data: string[]
  instant_cast_data: Record<string, boolean>
} | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('loadouts')
    .select('loadout_data, instant_cast_data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as { loadout_data: string[]; instant_cast_data: Record<string, boolean> }
}

/** Persist the current loadout for a user. */
export async function saveLoadout(
  userId: string,
  loadoutData: string[],
  instantCastData: Record<string, boolean>,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('loadouts').upsert(
    { user_id: userId, loadout_data: loadoutData, instant_cast_data: instantCastData },
    { onConflict: 'user_id' },
  )
}

/** Record a match result and update ELO (simple ±20 system for now). */
export async function recordMatchResult(
  winnerId: string,
  loserId: string,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const ELO_DELTA = 20
  await Promise.all([
    sb.rpc('increment_player_stats', {
      p_user_id: winnerId,
      p_elo_delta: ELO_DELTA,
      p_win_delta: 1,
      p_loss_delta: 0,
    }),
    sb.rpc('increment_player_stats', {
      p_user_id: loserId,
      p_elo_delta: -ELO_DELTA,
      p_win_delta: 0,
      p_loss_delta: 1,
    }),
  ])
}
