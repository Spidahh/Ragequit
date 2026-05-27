export type KeybindAction =
  | 'moveForward'
  | 'moveBack'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'swapWeapon'
  | 'wheelUtility'
  | 'wheelAbility'
  | 'openLoadout'
  | 'spell1'
  | 'spell2'
  | 'spell3'
  | 'spell4'
  | 'spell5'
  | 'sensDown'
  | 'sensUp'

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
  wheelUtility: { action: 'wheelUtility', label: 'Utility wheel', code: 'KeyQ' },
  wheelAbility: { action: 'wheelAbility', label: 'Ability wheel', code: 'KeyE' },
  openLoadout: { action: 'openLoadout', label: 'Loadout', code: 'KeyL' },
  spell1: { action: 'spell1', label: 'Spell 1', code: 'Digit1' },
  spell2: { action: 'spell2', label: 'Spell 2', code: 'Digit2' },
  spell3: { action: 'spell3', label: 'Spell 3', code: 'Digit3' },
  spell4: { action: 'spell4', label: 'Spell 4', code: 'Digit4' },
  spell5: { action: 'spell5', label: 'Spell 5', code: 'Digit5' },
  sensDown: { action: 'sensDown', label: 'Sensitivity down', code: 'BracketLeft' },
  sensUp: { action: 'sensUp', label: 'Sensitivity up', code: 'BracketRight' },
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

export function slotKeybindEntries(): ReadonlyArray<
  readonly [code: string, label: string, slotIdx: number]
> {
  return [
    ['', '', 0],
    ['', '', 1],
    [actionCode('spell1'), actionLabel('spell1'), 2],
    [actionCode('spell2'), actionLabel('spell2'), 3],
    [actionCode('spell3'), actionLabel('spell3'), 4],
    [actionCode('spell4'), actionLabel('spell4'), 5],
    [actionCode('spell5'), actionLabel('spell5'), 6],
    ['', '', 7],
    ['', '', 8],
    ['', '', 9],
    ['', '', 10],
  ]
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
