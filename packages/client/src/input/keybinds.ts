export type KeybindAction =
  | 'moveForward'
  | 'moveBack'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'swapWeapon'
  | 'openLoadout'
  | 'sensDown'
  | 'sensUp'
  // Direct ability binds — one per hotbar slot (8 total). Slots 0-3 are also on
  // the E wheel, slots 4-7 on the Q wheel; the wheels are an alternative way to
  // fire the same ability. Every ability has its own key on the hotbar.
  | 'slot1'
  | 'slot2'
  | 'slot3'
  | 'slot4'
  | 'slot5'
  | 'slot6'
  | 'slot7'
  | 'slot8'

// The 8 direct ability-slot bind actions, in hotbar order.
export const SLOT_ACTIONS = [
  'slot1',
  'slot2',
  'slot3',
  'slot4',
  'slot5',
  'slot6',
  'slot7',
  'slot8',
] as const satisfies readonly KeybindAction[]

export interface KeybindDef {
  action: KeybindAction
  label: string
  code: string
  locked?: boolean
}

const STORAGE_KEY = 'ragequit.keybinds.v1'

export const DEFAULT_KEYBINDS: Record<KeybindAction, KeybindDef> = {
  moveForward: { action: 'moveForward', label: 'Move forward', code: 'KeyW' },
  moveBack: { action: 'moveBack', label: 'Move back', code: 'KeyS' },
  moveLeft: { action: 'moveLeft', label: 'Move left', code: 'KeyA' },
  moveRight: { action: 'moveRight', label: 'Move right', code: 'KeyD' },
  jump: { action: 'jump', label: 'Jump', code: 'Space' },
  swapWeapon: { action: 'swapWeapon', label: 'Swap weapon', code: 'Tab' },
  openLoadout: { action: 'openLoadout', label: 'Loadout', code: 'KeyL' },
  sensDown: { action: 'sensDown', label: 'Sensitivity down', code: 'BracketLeft' },
  sensUp: { action: 'sensUp', label: 'Sensitivity up', code: 'BracketRight' },
  slot1: { action: 'slot1', label: 'Ability 1', code: 'Digit1' },
  slot2: { action: 'slot2', label: 'Ability 2', code: 'Digit2' },
  slot3: { action: 'slot3', label: 'Ability 3', code: 'Digit3' },
  slot4: { action: 'slot4', label: 'Ability 4', code: 'Digit4' },
  // Slots 5-8 sit on the Q/E/R/F cluster, not Digit5-8.
  //
  // From the WASD grip the index finger reaches 1-4 with a stretch and CANNOT
  // reach 5-8 without lifting the hand off the keys — which in a game whose
  // second pillar is "movement is the skill ceiling" means half your build is
  // unusable while moving. Q/E/R/F are the ability cluster every shipped
  // shooter uses (Overwatch Q/E/Shift, Apex Q/Tactical, every MOBA's QWER)
  // and they are free now that the radial wheels are deleted.
  slot5: { action: 'slot5', label: 'Ability 5', code: 'KeyQ' },
  slot6: { action: 'slot6', label: 'Ability 6', code: 'KeyE' },
  slot7: { action: 'slot7', label: 'Ability 7', code: 'KeyR' },
  slot8: { action: 'slot8', label: 'Ability 8', code: 'KeyF' },
}

export const keybinds: Record<KeybindAction, KeybindDef> = loadKeybinds()

const listeners = new Set<() => void>()

export function onKeybindsChanged(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function actionCode(action: KeybindAction): string {
  return (keybinds[action] ?? DEFAULT_KEYBINDS[action])?.code ?? ''
}

export function actionLabel(action: KeybindAction): string {
  return codeToLabel(actionCode(action))
}

export function matchesAction(code: string, action: KeybindAction): boolean {
  return code === actionCode(action)
}

export function setKeybind(action: KeybindAction, code: string): void {
  const previousCode = keybinds[action].code
  const existingAction = (Object.keys(keybinds) as KeybindAction[]).find(
    (candidate) => candidate !== action && keybinds[candidate].code === code,
  )
  if (existingAction) {
    keybinds[existingAction] = { ...keybinds[existingAction], code: previousCode }
  }
  keybinds[action] = { ...keybinds[action], code }
  saveKeybinds()
  for (const listener of listeners) listener()
}

export function resetKeybinds(): void {
  for (const action of Object.keys(DEFAULT_KEYBINDS) as KeybindAction[]) {
    keybinds[action] = { ...DEFAULT_KEYBINDS[action] }
  }
  saveKeybinds()
  for (const listener of listeners) listener()
}

export function codeToLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  const labels: Record<string, string> = {
    Space: 'Space',
    Tab: 'Tab',
    ShiftLeft: 'L Shift',
    ShiftRight: 'R Shift',
    ControlLeft: 'L Ctrl',
    ControlRight: 'R Ctrl',
    AltLeft: 'L Alt',
    AltRight: 'R Alt',
    BracketLeft: '[',
    BracketRight: ']',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backslash: '\\',
    Escape: 'Esc',
  }
  return labels[code] ?? code.replace(/Left|Right/, '')
}

export function initKeybindSettings(root: Document | HTMLElement = document): void {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-keybind-action]'))
  const reset = root.querySelector<HTMLButtonElement>('#settings-keybind-reset')
  let listening: KeybindAction | null = null

  function refresh(): void {
    for (const btn of buttons) {
      const action = btn.dataset['keybindAction'] as KeybindAction
      btn.textContent = listening === action ? 'PRESS KEY' : actionLabel(action)
      btn.classList.toggle('listening', listening === action)
    }
  }

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      listening = btn.dataset['keybindAction'] as KeybindAction
      refresh()
    })
  }

  reset?.addEventListener('click', () => {
    listening = null
    resetKeybinds()
    refresh()
  })

  window.addEventListener(
    'keydown',
    (event) => {
      if (!listening) return
      event.preventDefault()
      event.stopPropagation()
      if (event.code === 'Escape') {
        listening = null
        refresh()
        return
      }
      if (event.code === 'Backspace') {
        setKeybind(listening, DEFAULT_KEYBINDS[listening].code)
        listening = null
        refresh()
        return
      }
      setKeybind(listening, event.code)
      listening = null
      refresh()
    },
    true,
  )

  onKeybindsChanged(refresh)
  refresh()
}

export function initKeybindLabels(root: Document | HTMLElement = document): void {
  const labels = Array.from(root.querySelectorAll<HTMLElement>('[data-keybind-label]'))
  function refresh(): void {
    for (const el of labels) {
      const action = el.dataset['keybindLabel'] as KeybindAction
      el.textContent = actionLabel(action)
    }
  }
  onKeybindsChanged(refresh)
  refresh()
}

function loadKeybinds(): Record<KeybindAction, KeybindDef> {
  const loaded: Partial<Record<KeybindAction, string>> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) Object.assign(loaded, JSON.parse(raw))
  } catch {
    // Fall through to defaults.
  }

  const out = {} as Record<KeybindAction, KeybindDef>
  for (const action of Object.keys(DEFAULT_KEYBINDS) as KeybindAction[]) {
    out[action] = {
      ...DEFAULT_KEYBINDS[action],
      code: loaded[action] ?? DEFAULT_KEYBINDS[action].code,
    }
  }
  return out
}

function saveKeybinds(): void {
  try {
    const compact: Partial<Record<KeybindAction, string>> = {}
    for (const action of Object.keys(keybinds) as KeybindAction[])
      compact[action] = keybinds[action].code
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact))
  } catch {
    // Storage is optional.
  }
}
