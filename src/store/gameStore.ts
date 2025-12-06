/**
 * GAME STORE
 * 
 * Central state management using Zustand.
 * Manages: HP, Mana, Stamina, Loadout, Active Slot
 */

import { create } from 'zustand'

export interface GameStore {
  // Health & Resources
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  stamina: number
  maxStamina: number

  // Loadout (10 slots, each contains a skill ID)
  loadout: string[] // Array of 10 skill IDs
  activeSlot: number // 0-9

  // Actions
  setHp: (hp: number) => void
  setMana: (mana: number) => void
  setStamina: (stamina: number) => void
  setActiveSlot: (slot: number) => void
  setLoadout: (loadout: string[]) => void
  setSkillInSlot: (slot: number, skillId: string) => void
}

/**
 * Default loadout: all 3 test skills in slots 1-3, rest empty
 */
const DEFAULT_LOADOUT: string[] = [
  'iron_greatsword', // Slot 0 (key 1)
  'railgun_prototype', // Slot 1 (key 2)
  'magma_ball', // Slot 2 (key 3)
  '', // Slots 3-9 empty for future expansion
  '',
  '',
  '',
  '',
  '',
  '',
]

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  hp: 100,
  maxHp: 100,
  mana: 100,
  maxMana: 100,
  stamina: 100,
  maxStamina: 100,
  loadout: DEFAULT_LOADOUT,
  activeSlot: 0,

  // Actions
  setHp: (hp: number) => set({ hp }),
  setMana: (mana: number) => set({ mana }),
  setStamina: (stamina: number) => set({ stamina }),

  setActiveSlot: (slot: number) => {
    if (slot >= 0 && slot < 10) {
      set({ activeSlot: slot })
    }
  },

  setLoadout: (loadout: string[]) => {
    if (loadout.length === 10) {
      set({ loadout })
    }
  },

  setSkillInSlot: (slot: number, skillId: string) => {
    set((state) => {
      const newLoadout = [...state.loadout]
      newLoadout[slot] = skillId
      return { loadout: newLoadout }
    })
  },
}))
