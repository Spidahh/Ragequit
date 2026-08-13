import { describe, expect, it } from 'vitest'

import { ffaLadderRows } from './ffa-ladder.js'

const nameOf = (sid: string): string => `P-${sid}`

describe('ffaLadderRows', () => {
  it('shows the top three in descending kills', () => {
    const rows = ffaLadderRows({ a: 1, b: 7, c: 4, d: 0 }, 'b', nameOf)
    expect(rows.map((r) => r.name)).toEqual(['P-b', 'P-c', 'P-a'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('appends you when you are not in the top three, keeping your real rank', () => {
    const rows = ffaLadderRows({ a: 9, b: 8, c: 7, me: 1 }, 'me', nameOf)
    expect(rows).toHaveLength(4)
    const self = rows.at(-1)!
    expect(self.isSelf).toBe(true)
    // Not 4 by accident — 4 because that is where the player actually stands.
    expect(self.rank).toBe(4)
  })

  it('does not duplicate you when you are already on the podium', () => {
    const rows = ffaLadderRows({ a: 9, me: 8, c: 7 }, 'me', nameOf)
    expect(rows).toHaveLength(3)
    expect(rows.filter((r) => r.isSelf)).toHaveLength(1)
  })

  it('strips markup characters out of names', () => {
    const rows = ffaLadderRows({ x: 1 }, 'x', () => '<img src=x onerror=alert(1)>&')
    expect(rows[0]!.name).not.toMatch(/[<>&]/)
  })

  it('survives an empty scoreboard', () => {
    expect(ffaLadderRows({}, 'me', nameOf)).toEqual([])
  })
})
