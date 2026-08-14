// The FFA ladder in the top-right corner: the top three, plus you if you are
// not in it. Extracted out of main.ts (file-budget: AGENTS.md).
//
// Row selection is kept separate from the DOM write so the "who is shown, and
// at what rank" rule can be tested without a document.

export interface LadderRow {
  rank: number
  name: string
  kills: number
  isSelf: boolean
}

/**
 * Top three by kills, plus the local player appended when they rank below third.
 * `rank` is the player's real standing, so an appended self row keeps its true
 * position rather than reading as fourth.
 */
export function ffaLadderRows(
  solo: Record<string, number>,
  selfId: string,
  nameOf: (sid: string) => string,
): LadderRow[] {
  const sorted = Object.entries(solo).sort((a, b) => b[1] - a[1])
  const selfIdx = sorted.findIndex(([sid]) => sid === selfId)
  const shown = sorted.slice(0, 3)
  if (selfIdx >= 3) shown.push(sorted[selfIdx]!)
  return shown.map(([sid, kills]) => ({
    rank: sorted.findIndex(([s]) => s === sid) + 1,
    // Angle brackets and ampersands are stripped, not escaped: these names are
    // interpolated into innerHTML below.
    name: nameOf(sid).replace(/[<>&]/g, ''),
    kills,
    isSelf: sid === selfId,
  }))
}

export function renderFfaLadder(el: HTMLElement, rows: LadderRow[]): void {
  el.innerHTML = rows
    .map(
      (r) =>
        `<div class="fl-row${r.isSelf ? ' self' : ''}"><span class="fl-rank">#${r.rank}</span><span class="fl-name">${r.name}</span><span class="fl-kills">${r.kills}</span></div>`,
    )
    .join('')
  el.classList.remove('hidden')
}
