// Thin wrapper around localStorage that never throws — reads fail closed to null/undefined,
// writes fail silently. Storage can throw for reasons that have nothing to do with the caller
// (quota exceeded, private browsing, disabled entirely), and every persisted value in this app
// should degrade to "just don't persist" rather than crashing the UI.

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage full or unavailable — silently skip persistence.
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
