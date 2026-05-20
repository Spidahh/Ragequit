import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env['VITE_SUPABASE_URL'] as string | undefined
const SUPABASE_ANON_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined

let _client: SupabaseClient | null = null
let _session: Session | null = null

function getClient(): SupabaseClient | null {
  if (_client) return _client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[supabase] env vars missing — auth disabled')
    return null
  }
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _client
}

/**
 * Initialise Supabase auth. Signs in anonymously if no session exists.
 * Call once at startup before connecting to Colyseus.
 * Returns the access token (to send to the server on join) or null if unavailable.
 */
export async function initSupabaseAuth(): Promise<string | null> {
  const sb = getClient()
  if (!sb) return null

  // Restore existing session from localStorage (Supabase handles this automatically).
  const { data: { session } } = await sb.auth.getSession()
  if (session) {
    _session = session
    console.info('[supabase] restored session, userId:', session.user.id)
    return session.access_token
  }

  // No session — sign in anonymously (creates a persistent guest account).
  const { data, error } = await sb.auth.signInAnonymously()
  if (error || !data.session) {
    console.warn('[supabase] anonymous sign-in failed:', error?.message)
    return null
  }
  _session = data.session
  console.info('[supabase] anonymous sign-in ok, userId:', data.session.user.id)
  return data.session.access_token
}

/** Get the current access token (refreshes if close to expiry). */
export async function getAccessToken(): Promise<string | null> {
  const sb = getClient()
  if (!sb) return null
  const { data: { session } } = await sb.auth.getSession()
  _session = session
  return session?.access_token ?? null
}

/** Current Supabase user id, or null if not authenticated. */
export function getCurrentUserId(): string | null {
  return _session?.user.id ?? null
}
