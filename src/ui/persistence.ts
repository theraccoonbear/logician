import type { GameState } from '../engine/types/state'

const SAVE_KEY = 'logician-save-v1'

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch {
    return null
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable (e.g. private browsing) — silently skip persistence.
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}

const PLAYER_NAME_KEY = 'logician-player-name-v1'

export function loadSavedPlayerName(): string | null {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY)
  } catch {
    return null
  }
}

export function savePlayerName(name: string): void {
  try {
    if (name.trim()) localStorage.setItem(PLAYER_NAME_KEY, name)
  } catch {
    // Storage full or unavailable (e.g. private browsing) — silently skip persistence.
  }
}

const SHOW_RULES_KEY = 'logician-show-rules-on-start-v1'

// Defaults to true (show the rules) whenever the preference has never been set — a new
// player should see the how-to-play modal before their first game unless they opt out.
export function loadShowRulesOnStart(): boolean {
  try {
    const raw = localStorage.getItem(SHOW_RULES_KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

export function saveShowRulesOnStart(value: boolean): void {
  try {
    localStorage.setItem(SHOW_RULES_KEY, String(value))
  } catch {
    // ignore
  }
}
