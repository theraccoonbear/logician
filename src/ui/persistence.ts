import type { AIDifficulty, AssistanceLevel, GameState } from '../engine/types/state'
import { safeGet, safeRemove, safeSet } from './storage'

export interface SeatDraft {
  name: string
  isAI: boolean
  aiDifficulty: AIDifficulty
  assistanceLevel: AssistanceLevel
}

const SAVE_KEY = 'logician-save-v1'

export function loadSavedGame(): GameState | null {
  const raw = safeGet(SAVE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function saveGame(state: GameState): void {
  safeSet(SAVE_KEY, JSON.stringify(state))
}

export function clearSavedGame(): void {
  safeRemove(SAVE_KEY)
}

const PLAYER_NAME_KEY = 'logician-player-name-v1'

export function loadSavedPlayerName(): string | null {
  return safeGet(PLAYER_NAME_KEY)
}

export function savePlayerName(name: string): void {
  if (name.trim()) safeSet(PLAYER_NAME_KEY, name)
}

const SHOW_RULES_KEY = 'logician-show-rules-on-start-v1'

// Defaults to true (show the rules) whenever the preference has never been set — a new
// player should see the how-to-play modal before their first game unless they opt out.
export function loadShowRulesOnStart(): boolean {
  const raw = safeGet(SHOW_RULES_KEY)
  return raw === null ? true : raw === 'true'
}

export function saveShowRulesOnStart(value: boolean): void {
  safeSet(SHOW_RULES_KEY, String(value))
}

const SEATS_DRAFT_KEY = 'logician-seats-draft-v1'

export function loadSavedSeats(): SeatDraft[] | null {
  const raw = safeGet(SEATS_DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SeatDraft[]
  } catch {
    return null
  }
}

export function saveSeats(seats: SeatDraft[]): void {
  safeSet(SEATS_DRAFT_KEY, JSON.stringify(seats))
}

const AUTO_DISMISS_KEY = 'logician-auto-dismiss-overlay-v1'

export function loadAutoDismissOverlay(): boolean {
  const raw = safeGet(AUTO_DISMISS_KEY)
  return raw === null ? true : raw === 'true'
}

export function saveAutoDismissOverlay(value: boolean): void {
  safeSet(AUTO_DISMISS_KEY, String(value))
}
