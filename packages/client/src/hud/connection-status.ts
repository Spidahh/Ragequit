// Connection status indicator — the debug HUD dot plus the menu footer dot,
// both driven off the same status keyword (extracted out of main.ts;
// file-budget: AGENTS.md).

export type SetStatus = (text: string, color: string) => void

export function createStatusSetter(dbgStatus: HTMLElement): SetStatus {
  return function setStatus(text: string): void {
    const statusClass = `status-${text.replace(/\s+/g, '-').toLowerCase()}`
    dbgStatus.textContent = text
    dbgStatus.className = statusClass
    const footerEl = document.getElementById('menu-server-status')
    if (footerEl) {
      footerEl.replaceChildren()
      footerEl.className = statusClass
      const dot = document.createElement('span')
      dot.className = 'server-status-dot'
      dot.textContent = '●'
      footerEl.append(dot, text)
    }
  }
}
