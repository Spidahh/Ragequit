/** Probe the public HTTP health route without blocking the main menu. */
export async function probeServerAvailability(
  serverUrl: string,
  timeoutMs = 20_000,
): Promise<boolean> {
  const healthUrl = `${serverUrl.replace(/^ws/, 'http').replace(/\/$/, '')}/health`
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(healthUrl, { signal: controller.signal, cache: 'no-store' })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}
