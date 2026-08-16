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
/**
 * Determines whether an action is non-deterministic (has random outcomes).
 */
function isActionNonDeterministic(state: GameState, action: GameAction): boolean {
  if (action.type === 'CAST_SPELL') {
    const player = state.players.find((p) => p.id === action.playerId)
    if (player) {
      const effectCard = player.effectHand.find((c) => c.instanceId === action.effectCardId)
      if (effectCard && (effectCard.kind === 'RANDOMIZE' || effectCard.kind === 'COMBO')) {
        return true
      }
    }
  }
  if (action.type === 'PLAY_MAJOR_ARCANA') {
    const tarot = state.tarotRow.find((t) => t.instanceId === action.tarotId)
    if (tarot && tarot.kind === 'major' && tarot.id === 'WHEEL') {
      return true
    }
  }
  return false
}

/**
 * Calculates the expected evaluation score of a state, accounting for randomness
 * (e.g. Combo and Randomize card effects) by running multiple simulation rolls and averaging.
 * Optimizes performance by using a single simulation run for deterministic actions.
 */
function getExpectedScore(state: GameState, playerId: PlayerId, action: GameAction): number {
  const result = applyAction(state, action)
  if (!result.ok) return -Infinity

  const nextState = result.state
  const isRandom = isActionNonDeterministic(state, action)
  const SAMPLES = isRandom ? 5 : 1

  let totalScore = 0
  for (let i = 0; i < SAMPLES; i++) {
    if (isRandom) {
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

  let finalScore = totalScore / SAMPLES

  // Hand Churn Incentive: Add a slightly higher strategic nudge (+0.25) to cast spells/actions.
  // This motivates the high-IQ Optimus AI to burn dead cards to cycle and draw fresh, high-value cards
  // rather than skipping casting, which is a major tactical advantage in card games.
  if (action.type === 'CAST_SPELL' || action.type === 'PLAY_MAJOR_ARCANA') {
    finalScore += 0.25
  }

  return finalScore
}

/**
 * Turn Lookahead: Evaluates our legal build options, simulates our best possible subsequent
 * cast-phase action (or draft/pass) for each, and chooses the build action that yields
 * the highest expected evaluation score at the end of our turn.
 */
function chooseBest2PlyBuild(state: GameState, playerId: PlayerId, candidates: GameAction[]): GameAction {
  let bestAction = candidates[0]
  let bestScore = -Infinity

  for (const myAction of candidates) {
    const myResult = applyAction(state, myAction)
    if (!myResult.ok) continue

    const simulatedState = myResult.state

    // If simulatedState is already advanced to a different active player or ended, just score it
    if (simulatedState.activePlayerIndex !== state.activePlayerIndex || simulatedState.winner) {
      const score = optimusEvaluate(simulatedState, playerId)
      if (score > bestScore) {
        bestScore = score
        bestAction = myAction
      }
      continue
    }

    // Otherwise, simulate the best subsequent cast-phase action for ourselves
    const castCandidates = getLegalCastActions(simulatedState, playerId)

    // Add Major Arcana draft/hold options if applicable
    const player = simulatedState.players.find((p) => p.id === playerId)
    if (player && player.heldMajorArcana.length < 3) {
      const holdTarots = simulatedState.tarotRow.filter(
        (t) => t.kind === 'major' && (isHoldCard(t.id) || t.id === 'HIGH_PRIESTESS')
      )
      for (const tarot of holdTarots) {
        castCandidates.push({
          type: 'TAKE_HOLD_CARD',
          playerId,
          tarotId: tarot.instanceId,
        })
      }
    }

    // Include the default ending turn option
    castCandidates.push({ type: 'END_TURN', playerId })

    let bestCastScore = -Infinity
    for (const castAction of castCandidates) {
      const score = getExpectedScore(simulatedState, playerId, castAction)
      if (score > bestCastScore) {
        bestCastScore = score
      }
    }

    if (bestCastScore > bestScore) {
      bestScore = bestCastScore
      bestAction = myAction
    }
  }

  return bestAction
}

export const OptimusAI: AIStrategy = {
  chooseBuildAction: (state, playerId) => {
    const candidates = getLegalBuildActions(state, playerId)

    // Add High Priestess boosted build options if we hold it
    const player = state.players.find((p) => p.id === playerId)
    if (player) {
      const hpCard = player.heldMajorArcana.find((c) => c.id === 'HIGH_PRIESTESS')
      if (hpCard) {
        const boostedCandidates: GameAction[] = []
        for (const action of candidates) {
          if (action.type === 'BUILD_STRUCTURE') {
            boostedCandidates.push({
              ...action,
              playHighPriestessCardId: hpCard.instanceId,
            })
          }
        }
        candidates.push(...boostedCandidates)
      }
    }

    if (candidates.length <= 1) return candidates[0] || { type: 'SKIP_BUILD', playerId }
    return chooseBest2PlyBuild(state, playerId, candidates)
  },

  chooseCastAction: (state, playerId) => {
    const candidates = getLegalCastActions(state, playerId)

    // 1. Major Arcana Hold Strategy: If a hold-card (Fool, Empress, Emperor, Hierophant, High Priestess) is in the row,
    // evaluate the utility of taking it versus casting a minor spell.
    const player = state.players.find((p) => p.id === playerId)
    const holdTarots = state.tarotRow.filter((t) => t.kind === 'major' && (isHoldCard(t.id) || t.id === 'HIGH_PRIESTESS'))

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
    // Optimus Trigger-Reaction logic: If we hold reactive Major Arcana (like The Fool or The Emperor),
    // evaluate whether playing it is net beneficial to preserve our score.
    const player = state.players.find((p) => p.id === playerId)
    if (!player || !state.pendingTrigger || !player.heldMajorArcana.length) {
      return { type: 'PASS_TRIGGER_WINDOW', playerId }
    }

    // 1. Check if we have The Fool or The Emperor (both counter any pending spell/action)
    const cancelCard = player.heldMajorArcana.find((c) => c.id === 'FOOL' || c.id === 'EMPEROR')
    if (cancelCard) {
      // Evaluate the state if we pass (which resolves the threat) vs. if we cancel it
      let scoreWithoutCancel = -Infinity
      const passAction: GameAction = { type: 'PASS_TRIGGER_WINDOW', playerId }
      const passResult = applyAction(state, passAction)
      if (passResult.ok) {
        scoreWithoutCancel = optimusEvaluate(passResult.state, playerId)
      } else {
        // Fallback if pass fails for some reason
        scoreWithoutCancel = optimusEvaluate(state, playerId)
      }

      // Simulate playing the card to cancel the resolution
      const playCancelAction: GameAction = {
        type: 'PLAY_HELD_ARCANA',
        playerId,
        cardId: cancelCard.instanceId,
      }
      const result = applyAction(state, playCancelAction)
      if (result.ok) {
        const scoreWithCancel = optimusEvaluate(result.state, playerId)
        // If playing the card protects us from significant damage, play it!
        if (scoreWithCancel > scoreWithoutCancel + 1.0) {
          return playCancelAction
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
