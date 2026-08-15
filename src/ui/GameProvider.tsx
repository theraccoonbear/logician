import { createContext, useEffect, useState, type ReactNode } from 'react'
import { applyAction } from '../engine/reducer'
import { createInitialGameState, type PlayerConfig } from '../engine/setup'
import type { GameAction } from '../engine/types/actions'
import type { GameState } from '../engine/types/state'
import { clearSavedGame, loadSavedGame, saveGame } from './persistence'

export interface GameContextValue {
  state: GameState | null
  lastError: string | null
  startGame: (players: PlayerConfig[], opts?: { showRules?: boolean }) => void
  dispatch: (action: GameAction) => void
  newGame: () => void
  // One-shot signal for "a new game was just started with the rules-on-start preference
  // checked" — not part of GameState (which gets persisted/serialized), just a UI cue that
  // GameView consumes once to auto-open the help modal, then clears.
  pendingRulesOnStart: boolean
  clearPendingRulesOnStart: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(() => loadSavedGame())
  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingRulesOnStart, setPendingRulesOnStart] = useState(false)

  useEffect(() => {
    if (state) saveGame(state)
  }, [state])

  const startGame = (players: PlayerConfig[], opts?: { showRules?: boolean }) => {
    setState(createInitialGameState(players))
    setLastError(null)
    setPendingRulesOnStart(Boolean(opts?.showRules))
  }

  const dispatch = (action: GameAction) => {
    if (!state) return
    const result = applyAction(state, action)
    if (result.ok) {
      setState(result.state)
      setLastError(null)
    } else {
      setLastError(result.error)
    }
  }

  const newGame = () => {
    clearSavedGame()
    setState(null)
    setLastError(null)
    setPendingRulesOnStart(false)
  }

  return (
    <GameContext.Provider
      value={{
        state,
        lastError,
        startGame,
        dispatch,
        newGame,
        pendingRulesOnStart,
        clearPendingRulesOnStart: () => setPendingRulesOnStart(false),
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
