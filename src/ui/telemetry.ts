import posthog from 'posthog-js'
import { safeGet, safeSet } from './storage'

const OPTIN_KEY = 'logician-telemetry-optin-v1'

export function isTelemetryOptedIn(): boolean {
  return safeGet(OPTIN_KEY) === 'true'
}

export function loadTelemetryOptIn(): boolean | null {
  const raw = safeGet(OPTIN_KEY)
  if (raw === null) return null
  return raw === 'true'
}

export function saveTelemetryOptIn(value: boolean): void {
  safeSet(OPTIN_KEY, String(value))
}

let initialized = false
let beforeunloadAdded = false

export function initTelemetry(): void {
  if (initialized) return
  if (!isTelemetryOptedIn()) return
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'
  if (!key) return

  posthog.init(key, {
    api_host: host,
    persistence: 'localStorage',
    autocapture: false,
    capture_pageview: false,
    loaded: () => { initialized = true },
  })

  if (!beforeunloadAdded) {
    beforeunloadAdded = true
    window.addEventListener('beforeunload', () => {
      posthog.capture('$pageleave')
      posthog._disconnect()
    })
  }
}

export function capture(event: string, props?: Record<string, unknown>): void {
  if (!isTelemetryOptedIn() || !initialized) return
  posthog.capture(event, props)
}

export function disableTelemetry(): void {
  if (!initialized) return
  posthog._disconnect()
  initialized = false
}
