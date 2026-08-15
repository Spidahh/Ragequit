// ---------------------------------------------------------------------------
// Picking a specialisation, in the Forge.
//
// The system this replaces (Mastery) had no selector because it had nothing to
// select: it was inferred from how many of your magic slots shared an element.
// That is exactly why it did not survive — the player never made the choice, so
// it read as a tax on mixed builds rather than as a third axis of the build.
//
// So this is a row of cards you click, next to the class cards, with the bonus
// and its cost both on the face. It is deliberately built from the shared
// registry rather than from markup: adding a specialisation must never mean
// remembering to edit an HTML file.
// ---------------------------------------------------------------------------
import { specializationsForClass, type ClassId } from '@ragequit/shared'

const STORAGE_KEY = 'ragequit.loadout.specializationId'

export interface SpecSelector {
  /** Rebuild the cards for a class and return the resulting valid pick. */
  setClass: (classId: ClassId) => string
  /** Currently selected id, or '' for none. */
  selected: () => string
  mount: (parent: HTMLElement) => void
}

function load(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function save(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* storage optional — a specialisation that fails to persist is still legal */
  }
}

export function createSpecSelector(onChange: () => void): SpecSelector {
  const root = document.createElement('div')
  root.id = 'ls-spec-selector'
  root.setAttribute('aria-label', 'Seleziona specializzazione')

  const title = document.createElement('div')
  title.className = 'ls-class-selector-title'
  title.innerHTML =
    // Short label on purpose: the title column is 126 px and "Scegli
    // specializzazione" wrapped out of it and under the first card.
    '<span>◆</span><b>Specializzazione</b><small>ogni bonus ha un costo</small>'
  root.appendChild(title)

  const cards = document.createElement('div')
  cards.className = 'ls-spec-cards'
  root.appendChild(cards)

  let selected = load()
  let classId: ClassId = 'drift'

  function render(): void {
    cards.replaceChildren()
    // "None" is a real, legal build and stays offered. A player who wants the
    // class as designed should not have to take a malus to get it.
    const options = [
      { id: '', name: 'Nessuna', description: 'La classe come è, senza modifiche.', miniMalus: '' },
      ...specializationsForClass(classId),
    ]
    for (const opt of options) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'spec-select-card' + (opt.id === selected ? ' active' : '')
      btn.dataset['spec'] = opt.id
      const name = document.createElement('span')
      name.className = 'spec-name'
      name.textContent = opt.name
      const desc = document.createElement('span')
      desc.className = 'spec-desc'
      desc.textContent = opt.description
      btn.append(name, desc)
      if (opt.miniMalus) {
        const malus = document.createElement('span')
        malus.className = 'spec-malus'
        malus.textContent = opt.miniMalus
        btn.appendChild(malus)
      }
      btn.addEventListener('click', () => {
        selected = opt.id
        save(selected)
        render()
        onChange()
      })
      cards.appendChild(btn)
    }
  }

  return {
    setClass(next) {
      classId = next
      // A specialisation belongs to exactly one class, so switching class drops
      // a pick that is no longer legal instead of carrying an invalid id the
      // server would reject at match start — when it is too late to choose again.
      const legal = specializationsForClass(next).some((s) => s.id === selected)
      if (!legal) {
        selected = ''
        save(selected)
      }
      render()
      return selected
    },
    selected: () => selected,
    mount(parent) {
      parent.appendChild(root)
      render()
    },
  }
}
