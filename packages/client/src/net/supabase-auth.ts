import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] as string | undefined
const SUPABASE_ANON_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined
const SUPABASE_ANON_SIGNIN =
  (import.meta.env['VITE_SUPABASE_ANON_SIGNIN'] as string | undefined) === 'true'

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
  const {
    data: { session },
  } = await sb.auth.getSession()
  if (session) {
    _session = session
    console.info('[supabase] restored session, userId:', session.user.id)
    return session.access_token
  }

  // Anonymous auth is optional for the local vertical slice. Only request it
  // when the Supabase project has anonymous sign-ins explicitly enabled.
  if (!SUPABASE_ANON_SIGNIN) return null

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
  const {
    data: { session },
  } = await sb.auth.getSession()
  _session = session
  return session?.access_token ?? null
}

/** Current Supabase user id, or null if not authenticated. */
export function getCurrentUserId(): string | null {
  return _session?.user.id ?? null
}

/** Get the current user email, or null if not authenticated. */
export function getCurrentUserEmail(): string | null {
  return _session?.user.email ?? null
}

/** Sign in with email and password. */
export async function signIn(
  email: string,
  password: string,
): Promise<{ session: Session | null; error: string | null }> {
  const sb = getClient()
  if (!sb) return { session: null, error: 'Supabase URL o anon key mancanti' }
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return { session: null, error: error?.message || 'Login fallito' }
  }
  _session = data.session
  console.info('[supabase] email login ok, userId:', data.session.user.id)
  return { session: data.session, error: null }
}

/** Sign up with email and password. */
export async function signUp(
  email: string,
  password: string,
): Promise<{ session: Session | null; error: string | null }> {
  const sb = getClient()
  if (!sb) return { session: null, error: 'Supabase URL o anon key mancanti' }
  const { data, error } = await sb.auth.signUp({ email, password })
  if (error || !data.session) {
    return { session: null, error: error?.message || 'Registrazione fallita' }
  }
  _session = data.session
  console.info('[supabase] email sign-up ok, userId:', data.session.user.id)
  return { session: data.session, error: null }
}

/** Log out of the current session. */
export async function logOut(): Promise<{ error: string | null }> {
  const sb = getClient()
  if (!sb) return { error: 'Supabase URL o anon key mancanti' }
  const { error } = await sb.auth.signOut()
  _session = null
  console.info('[supabase] logged out')
  return { error: error?.message || null }
}

/** Sign in with Google (OAuth). */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const sb = getClient()
  if (!sb) return { error: 'Supabase URL o anon key mancanti' }
  
  // Dynamic host detection for local vs fly deploy redirects
  const redirectUrl = window.location.origin
  
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  })
  return { error: error?.message || null }
}


/** Get player stats (ELO, wins, losses) from Supabase players table. */
export async function getPlayerStats(userId: string): Promise<{ elo_rating: number; wins: number; losses: number } | null> {
  const sb = getClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('players')
    .select('elo_rating, wins, losses')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[supabase] getPlayerStats failed:', error.message)
    return null
  }
  return data as { elo_rating: number; wins: number; losses: number } | null
}

