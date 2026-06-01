// ---------------------------------------------------------------------------
// Account / profile menu UI.
//
// Owns the auth panel (login/register/Google/logout), the player profile card
// (ELO/wins/losses + class/spells), and the display-name field. Pure menu code:
// no gameplay coupling. Extracted from main.ts behind createAccountUi(deps).
// ---------------------------------------------------------------------------
import type { ClassId } from '@ragequit/shared'
import {
  getCurrentUserEmail,
  getCurrentUserId,
  isSupabaseConfigured,
  signInWithGoogle,
  signIn,
  signUp,
  logOut,
  getPlayerStats,
} from '../net/supabase-auth.js'
import { updateRankBadge } from '../rank-system.js'

export interface PlayerProfile {
  currentClass: ClassId | null
  equippedSpells: string[]
}

export interface AccountUiDeps {
  loadoutStation: { getClassId(): ClassId | null; getLoadout(): Iterable<string> }
  menu: { updateProfile(p: PlayerProfile): void }
  setPlayerProfile(p: PlayerProfile): void
}

export interface AccountUi {
  /** (Re)build the profile card + auth panel + display-name field. */
  initPlayerProfile(): void
}

export function createAccountUi(deps: AccountUiDeps): AccountUi {
  function updateAuthUI(): void {
    const container = document.getElementById('profile-auth-section')
    if (!container) return

    const email = getCurrentUserEmail()
    if (email) {
      container.innerHTML = `
        <div class="auth-logged-in-status">
          <span>Acceduto come: <b>${email}</b></span>
          <button class="auth-logout-btn" id="btn-auth-logout">LOGOUT</button>
        </div>
      `
      const btnLogout = document.getElementById('btn-auth-logout') as HTMLButtonElement | null
      if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
          btnLogout.disabled = true
          await logOut()
          updateAuthUI()
          initPlayerProfile()
        })
      }
    } else if (!isSupabaseConfigured()) {
      container.innerHTML = `
        <div class="auth-logged-in-status">
          <span>GUEST (OFFLINE)</span>
        </div>
      `
    } else {
      container.innerHTML = `
        <div class="auth-logged-out-form">
          <input type="email" id="auth-email-input" aria-label="Email" class="auth-input" autocomplete="username" placeholder="Email">
          <input type="password" id="auth-pass-input" aria-label="Password" class="auth-input" autocomplete="current-password" placeholder="Password">
          <div class="auth-buttons-row">
            <button class="auth-btn btn-accedi" id="btn-auth-signin">ACCEDI</button>
            <button class="auth-btn btn-registrati" id="btn-auth-signup">REGISTRATI</button>
          </div>
          <div class="auth-oauth-divider"><span>oppure</span></div>
          <button class="auth-btn btn-google-oauth" id="btn-auth-google">
            <svg class="google-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.32 1.258 15.535 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.58-4.887 11.58-11.76 0-.792-.084-1.396-.188-1.935H12.24z"/>
            </svg>
            ACCEDI CON GOOGLE
          </button>
          <div id="auth-status" class="auth-status-message"></div>
        </div>
      `
      const btnSignin = document.getElementById('btn-auth-signin') as HTMLButtonElement | null
      const btnSignup = document.getElementById('btn-auth-signup') as HTMLButtonElement | null
      const btnGoogle = document.getElementById('btn-auth-google') as HTMLButtonElement | null
      const emailInput = document.getElementById('auth-email-input') as HTMLInputElement
      const passInput = document.getElementById('auth-pass-input') as HTMLInputElement
      const statusEl = document.getElementById('auth-status')

      if (btnGoogle && statusEl) {
        btnGoogle.addEventListener('click', async () => {
          statusEl.textContent = 'Reindirizzamento a Google...'
          statusEl.className = 'auth-status-message'
          if (btnSignin) btnSignin.disabled = true
          if (btnSignup) btnSignup.disabled = true
          btnGoogle.disabled = true

          try {
            const { error } = await signInWithGoogle()
            if (error) {
              statusEl.textContent = error
              statusEl.className = 'auth-status-message error'
              if (btnSignin) btnSignin.disabled = false
              if (btnSignup) btnSignup.disabled = false
              btnGoogle.disabled = false
            }
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e)
            statusEl.textContent = errMsg || 'Errore OAuth'
            statusEl.className = 'auth-status-message error'
            if (btnSignin) btnSignin.disabled = false
            if (btnSignup) btnSignup.disabled = false
            btnGoogle.disabled = false
          }
        })
      }

      if (btnSignin && emailInput && passInput && statusEl) {
        btnSignin.addEventListener('click', async () => {
          const mail = emailInput.value.trim()
          const pass = passInput.value
          if (!mail || !pass) {
            statusEl.textContent = 'Inserisci email e password'
            statusEl.className = 'auth-status-message error'
            return
          }
          statusEl.textContent = 'Accesso in corso...'
          statusEl.className = 'auth-status-message'
          btnSignin.disabled = true
          if (btnSignup) btnSignup.disabled = true
          if (btnGoogle) btnGoogle.disabled = true

          try {
            const { error } = await signIn(mail, pass)
            if (error) {
              statusEl.textContent = error
              statusEl.className = 'auth-status-message error'
              btnSignin.disabled = false
              if (btnSignup) btnSignup.disabled = false
              if (btnGoogle) btnGoogle.disabled = false
            } else {
              statusEl.textContent = 'Accesso eseguito!'
              statusEl.className = 'auth-status-message success'
              setTimeout(() => {
                updateAuthUI()
                initPlayerProfile()
              }, 800)
            }
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e)
            statusEl.textContent = errMsg || 'Errore imprevisto'
            statusEl.className = 'auth-status-message error'
            btnSignin.disabled = false
            if (btnSignup) btnSignup.disabled = false
            if (btnGoogle) btnGoogle.disabled = false
          }
        })
      }

      if (btnSignup && emailInput && passInput && statusEl) {
        btnSignup.addEventListener('click', async () => {
          const mail = emailInput.value.trim()
          const pass = passInput.value
          if (!mail || !pass) {
            statusEl.textContent = 'Inserisci email e password'
            statusEl.className = 'auth-status-message error'
            return
          }
          if (pass.length < 6) {
            statusEl.textContent = 'Password deve essere almeno 6 caratteri'
            statusEl.className = 'auth-status-message error'
            return
          }
          statusEl.textContent = 'Registrazione in corso...'
          statusEl.className = 'auth-status-message'
          btnSignin!.disabled = true
          btnSignup.disabled = true
          if (btnGoogle) btnGoogle.disabled = true

          try {
            const { error } = await signUp(mail, pass)
            if (error) {
              statusEl.textContent = error
              statusEl.className = 'auth-status-message error'
              btnSignin!.disabled = false
              btnSignup.disabled = false
              if (btnGoogle) btnGoogle.disabled = false
            } else {
              const prefix = mail.split('@')[0] || 'PLAYER'
              localStorage.setItem('ragequit.profile.displayName', prefix)
              statusEl.textContent = 'Registrazione completata! Controlla la tua email.'
              statusEl.className = 'auth-status-message success'
              setTimeout(() => {
                updateAuthUI()
                initPlayerProfile()
              }, 1500)
            }
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e)
            statusEl.textContent = errMsg || 'Errore imprevisto'
            statusEl.className = 'auth-status-message error'
            btnSignin!.disabled = false
            btnSignup.disabled = false
            if (btnGoogle) btnGoogle.disabled = false
          }
        })
      }
    }
  }

  function initDisplayName(): void {
    const nameInput = document.getElementById('pc-display-name') as HTMLInputElement | null
    const savedTick = document.getElementById('pc-name-saved')
    const avatarEl = document.getElementById('pc-avatar')

    const email = getCurrentUserEmail()

    let initialName: string
    if (email) {
      initialName = email.split('@')[0]?.toUpperCase() ?? 'USER'
    } else {
      const stored = localStorage.getItem('ragequit.profile.displayName')
      initialName = stored ? stored.trim().toUpperCase() : ''
    }

    if (nameInput) {
      nameInput.value = initialName
      nameInput.readOnly = Boolean(email)
    }

    if (avatarEl) avatarEl.textContent = initialName[0] ?? '?'

    if (nameInput && !email) {
      let saveTimer: ReturnType<typeof setTimeout> | null = null
      const saveImmediately = () => {
        const val = nameInput.value.trim().toUpperCase()
        if (val) {
          nameInput.value = val
          localStorage.setItem('ragequit.profile.displayName', val)
          if (avatarEl) avatarEl.textContent = val[0] ?? '?'
          if (savedTick) {
            savedTick.classList.add('visible')
            setTimeout(() => savedTick.classList.remove('visible'), 1500)
          }
        }
      }

      nameInput.addEventListener('input', () => {
        const val = nameInput.value.trim().toUpperCase()
        if (val) nameInput.value = val
        if (avatarEl) avatarEl.textContent = val[0] ?? '?'
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(saveImmediately, 600)
      })

      nameInput.addEventListener('change', () => {
        if (saveTimer) clearTimeout(saveTimer)
        saveImmediately()
      })

      nameInput.addEventListener('blur', () => {
        if (saveTimer) clearTimeout(saveTimer)
        saveImmediately()
      })
    }
  }

  function initPlayerProfile(): void {
    let isConfigured = localStorage.getItem('ragequit.profile.configured') === 'true'
    if (!isConfigured) {
      const savedClass = localStorage.getItem('ragequit.loadout.classId')
      const savedSlotsRaw = localStorage.getItem('ragequit.loadout.v6')
      if (savedClass && savedSlotsRaw) {
        try {
          const parsed = JSON.parse(savedSlotsRaw) as { slots?: string[] }
          if (parsed.slots && parsed.slots.length === 8 && parsed.slots.some(Boolean)) {
            localStorage.setItem('ragequit.profile.configured', 'true')
            isConfigured = true
          }
        } catch {
          // ignore
        }
      }
    }

    const profile: PlayerProfile = isConfigured
      ? {
          currentClass: deps.loadoutStation.getClassId(),
          equippedSpells: Array.from(deps.loadoutStation.getLoadout()),
        }
      : { currentClass: null, equippedSpells: [] }
    deps.setPlayerProfile(profile)
    deps.menu.updateProfile(profile)

    const eloEl = document.getElementById('profile-stat-elo')
    const winsEl = document.getElementById('profile-stat-wins')
    const lossesEl = document.getElementById('profile-stat-losses')
    const userId = getCurrentUserId()

    if (userId) {
      getPlayerStats(userId)
        .then((stats) => {
          if (stats) {
            if (eloEl) eloEl.textContent = String(stats.elo_rating ?? 1000)
            const wins = stats.wins ?? 0
            const losses = stats.losses ?? 0
            if (winsEl) winsEl.textContent = String(wins)
            if (lossesEl) lossesEl.textContent = String(losses)
            updateRankBadge(wins)
          }
        })
        .catch((err: unknown) => console.warn('[supabase] failed to fetch player stats:', err))
    } else {
      if (eloEl) eloEl.textContent = '1000'
      if (winsEl) winsEl.textContent = '0'
      if (lossesEl) lossesEl.textContent = '0'
      updateRankBadge(0)
    }

    updateAuthUI()
    initDisplayName()
  }

  return { initPlayerProfile }
}
