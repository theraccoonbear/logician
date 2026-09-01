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
  if (!isTelemetryOptedIn()) {
    console.log('[telemetry] not opted in, skipping init')
    return
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'
  if (!key) {
    console.warn('[telemetry] VITE_POSTHOG_KEY not set, skipping init')
    return
  }

  console.log('[telemetry] initializing PostHog', { key: key.slice(0, 8) + '...', host })
  posthog.init(key, {
    api_host: host,
    persistence: 'localStorage',
    autocapture: false,
    capture_pageview: false,
    loaded: () => {
      initialized = true
      console.log('[telemetry] PostHog loaded and ready')
    },
  })

  if (!beforeunloadAdded) {
    beforeunloadAdded = true
    window.addEventListener('beforeunload', () => {
      posthog.capture('$pageleave')
      posthog.shutdown()
    })
  }
}

export function capture(event: string, props?: Record<string, unknown>): void {
  if (!isTelemetryOptedIn() || !initialized) {
    console.log('[telemetry] capture blocked', { event, optedIn: isTelemetryOptedIn(), initialized })
    return
  }
  console.log('[telemetry] capture', event, props)
  posthog.capture(event, props)
}

export function disableTelemetry(): void {
  if (!initialized) return
  posthog.shutdown()
  initialized = false
}
