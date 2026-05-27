export function initMenuBackground(): {
  start: () => void
  stop: () => void
  updateClass: (classId: string) => void
} {
  return {
    start: () => {
      console.info('[MenuBG] Live background deactivated. Using static e-sports cover background.')
    },
    stop: () => {
      console.info('[MenuBG] Live background stopped.')
    },
    updateClass: (_classId: string) => {
      // Ignored to keep static background clean
    },
  }
}
