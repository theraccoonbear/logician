import { createContext, useEffect, useState, type ReactNode } from 'react'
import { applyAction } from '../engine/reducer'
import { createInitialGameState, type PlayerConfig } from '../engine/setup'
import type { GameAction } from '../engine/types/actions'
import type { GameState } from '../engine/types/state'
import { clearSavedGame, loadSavedGame, saveGame } from './persistence'

export interface GameContextValue {
  state: GameState | null
  lastError: string | null
  startGame: (players: PlayerConfig[]) => void
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(() => loadSavedGame())
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (state) saveGame(state)
  }, [state])

  const startGame = (players: PlayerConfig[]) => {
    setState(createInitialGameState(players))
    setLastError(null)
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
  }

  return <GameContext.Provider value={{ state, lastError, startGame, dispatch, newGame }}>{children}</GameContext.Provider>
}
