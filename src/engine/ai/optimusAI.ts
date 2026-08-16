import { getLegalBuildActions, getLegalCastActions } from '../legalActions'
import { applyAction } from '../reducer'
import { isHoldCard } from '../triggers'
import type { GameAction } from '../types/actions'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { AIStrategy } from './aiStrategy'
import { optimusEvaluate } from './optimusEvaluate'

/**
 * Calculates the expected evaluation score of a state, accounting for randomness
 * (e.g. Combo and Randomize card effects) by running multiple simulation rolls and averaging.
 */
function getExpectedScore(state: GameState, playerId: PlayerId, action: GameAction): number {
  const result = applyAction(state, action)
  if (!result.ok) return -Infinity

  const nextState = result.state

  // Check if the action or the current spell effect is highly non-deterministic
  // For standard static lookups, a single run is fine. For random cards, we average over 5 samples
  // to get a robust statistical expected value (Expected Utility).
  let totalScore = 0
  const SAMPLES = 5

  for (let i = 0; i < SAMPLES; i++) {
    // If it's a non-deterministic spell effect, we re-run the reducer simulation to sample different random paths
    if (action.type === 'CAST_SPELL') {
      const sampleResult = applyAction(state, action)
      if (sampleResult.ok) {
        totalScore += optimusEvaluate(sampleResult.state, playerId)
      } else {
        totalScore += optimusEvaluate(nextState, playerId)
      }
    } else {
      totalScore += optimusEvaluate(nextState, playerId)
    }
  }

  return totalScore / SAMPLES
}

/**
 * 2-Ply Lookahead: Evaluates our legal build options, anticipates the opponent's best
 * immediate counter-response, and chooses the build that maximizes our score *after* their response.
 */
function chooseBest2PlyBuild(state: GameState, playerId: PlayerId, candidates: GameAction[]): GameAction {
  let bestAction = candidates[0]
  let bestMinimaxScore = -Infinity

  const opponents = state.players.filter((p) => p.id !== playerId)
  const opponentId = opponents[0]?.id // In PvP, model the main opponent

  for (const myAction of candidates) {
    const myResult = applyAction(state, myAction)
    if (!myResult.ok) continue

    const simulatedState = myResult.state
    let worstOpponentOutcome = Infinity

    if (opponentId) {
      // Model opponent's best response: they will try to maximize their score (which minimizes ours)
      const opponentBuilds = getLegalBuildActions(simulatedState, opponentId)
      const opponentCasts = getLegalCastActions(simulatedState, opponentId)
      const opponentActions = [...opponentBuilds, ...opponentCasts]

      let bestOpponentScore = -Infinity
      for (const oppAction of opponentActions) {
        const oppResult = applyAction(simulatedState, oppAction)
        if (!oppResult.ok) continue
        const oppScore = optimusEvaluate(oppResult.state, opponentId)
        if (oppScore > bestOpponentScore) {
          bestOpponentScore = oppScore
        }
      }

      // Our resulting score is evaluated on the board state *after* their expected best counter
      const bestOpponentAction = opponentActions.find((a) => {
        const r = applyAction(simulatedState, a)
        return r.ok && optimusEvaluate(r.state, opponentId) === bestOpponentScore
      })

      if (bestOpponentAction) {
        const finalResult = applyAction(simulatedState, bestOpponentAction)
        worstOpponentOutcome = finalResult.ok ? optimusEvaluate(finalResult.state, playerId) : optimusEvaluate(simulatedState, playerId)
      } else {
        worstOpponentOutcome = optimusEvaluate(simulatedState, playerId)
      }
    } else {
      worstOpponentOutcome = optimusEvaluate(simulatedState, playerId)
    }

    if (worstOpponentOutcome > bestMinimaxScore) {
      bestMinimaxScore = worstOpponentOutcome
      bestAction = myAction
    }
  }

  return bestAction
}

export const OptimusAI: AIStrategy = {
  chooseBuildAction: (state, playerId) => {
    const candidates = getLegalBuildActions(state, playerId)
    if (candidates.length <= 1) return candidates[0] || { type: 'SKIP_BUILD', playerId }
    return chooseBest2PlyBuild(state, playerId, candidates)
  },

  chooseCastAction: (state, playerId) => {
    const candidates = getLegalCastActions(state, playerId)

    // 1. Major Arcana Hold Strategy: If a hold-card (Fool, Empress, Emperor, Hierophant) is in the row,
    // evaluate the utility of taking it versus casting a minor spell.
    const player = state.players.find((p) => p.id === playerId)
    const holdTarots = state.tarotRow.filter((t) => t.kind === 'major' && isHoldCard(t.id))

    if (player && player.heldMajorArcana.length < 3) {
      for (const tarot of holdTarots) {
        candidates.push({
          type: 'TAKE_HOLD_CARD',
          playerId,
          tarotId: tarot.instanceId,
        })
      }
    }

    let bestAction = candidates[0] || { type: 'END_TURN', playerId }
    let bestScore = -Infinity

    for (const action of candidates) {
      const score = getExpectedScore(state, playerId, action)
      if (score > bestScore) {
        bestScore = score
        bestAction = action
      }
    }

    return bestAction
  },

  respondToTriggerWindow: (state, playerId) => {
    // Optimus Trigger-Reaction logic: If we hold reactive Major Arcana (like The Fool),
    // evaluate whether playing it is net beneficial to preserve our score.
    const player = state.players.find((p) => p.id === playerId)
    if (!player || !state.pendingTrigger || !player.heldMajorArcana.length) {
      return { type: 'PASS_TRIGGER_WINDOW', playerId }
    }

    // 1. Check if we have The Fool (which counters any pending spell)
    const foolCard = player.heldMajorArcana.find((c) => c.id === 'FOOL')
    if (foolCard) {
      // Evaluate the state without playing Fool vs. with playing Fool
      const scoreWithoutFool = optimusEvaluate(state, playerId)

      // Simulate playing The Fool to cancel the resolution
      const playFoolAction: GameAction = {
        type: 'PLAY_HELD_ARCANA',
        playerId,
        cardId: foolCard.instanceId,
      }
      const result = applyAction(state, playFoolAction)
      if (result.ok) {
        const scoreWithFool = optimusEvaluate(result.state, playerId)
        // If playing the Fool protects us from significant damage, play it!
        if (scoreWithFool > scoreWithoutFool + 1.0) {
          return playFoolAction
        }
      }
    }

    // 2. Check if we have The Empress (which can reinterpret terrains for the pending spell)
    const empressCard = player.heldMajorArcana.find((c) => c.id === 'EMPRESS')
    if (empressCard) {
      // If playing Empress would be strategically useful, we can play it.
      // For now, if we have Empress, we pass unless we construct standard parameter choices.
    }

    return { type: 'PASS_TRIGGER_WINDOW', playerId }
  },
}
