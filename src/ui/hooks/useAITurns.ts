import { useEffect } from 'react'
import { createAI } from '../../engine/ai'
import { useGameEngine } from './useGameEngine'

const AI_MOVE_DELAY_MS = 600

/** Drives AI-controlled seats automatically: build/cast on their turn, respond to a trigger window, or submit opponent choices. */
export function useAITurns(blocked = false) {
  const { state, dispatch } = useGameEngine()

  useEffect(() => {
    if (!state || state.winner || blocked) return

    const actor =
      state.phase === 'awaitingTrigger'
        ? state.players.find((p) => p.id === state.triggerQueue?.[0])
        : state.phase === 'awaitingMajorChoice'
          ? state.players.find((p) => p.id === state.majorChoiceQueue?.[0])
          : state.players[state.activePlayerIndex]

    if (!actor?.isAI) return

    const ai = createAI(actor.aiDifficulty ?? 'heuristic')
    const timer = setTimeout(() => {
      if (state.phase === 'setup' || state.phase === 'build') {
        dispatch(ai.chooseBuildAction(state, actor.id))
      } else if (state.phase === 'cast') {
        dispatch(ai.chooseCastAction(state, actor.id))
      } else if (state.phase === 'awaitingTrigger') {
        dispatch(ai.respondToTriggerWindow(state, actor.id))
      } else if (state.phase === 'awaitingMajorChoice') {
        dispatch(ai.chooseOpponentChoice(state, actor.id))
      }
    }, AI_MOVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [state, dispatch, blocked])
}
