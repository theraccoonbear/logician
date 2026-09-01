import { canBuildBasic, canBuildFortress, computeVP } from './selectors'
import { LEVEL_BOUNDS } from './types/structure'
import { isHoldCard } from './triggers'
import { getForcedOperandSpec, TERRAIN_TYPES, STRUCTURE_TYPES } from './majorArcana/forcedOperand'
import type { GameAction } from './types/actions'
import type { PlayerId } from './types/ids'
import type { GameState } from './types/state'
import type { StructureType } from './types/structure'
import type { OperandKind } from './types/tarot'

const BASIC_TYPES: readonly StructureType[] = ['Pool', 'Pyramid', 'Tower']

/**
 * Legal Phase-1 actions for a player. AI v1 scope: basic/Fortress builds and skipping —
 * it never plays a Major Arcana build enhancement (High Priestess), only humans do that.
 */
export function getLegalBuildActions(state: GameState, playerId: PlayerId): GameAction[] {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return []

  if (state.phase === 'setup') {
    const actions: GameAction[] = []
    for (const type of BASIC_TYPES) {
      if (state.structures.some((s) => s.owner === playerId && s.type === type)) continue
      for (const hex of state.board) {
        actions.push({ type: 'BUILD_STRUCTURE', playerId, hexId: hex.id, structureType: type })
      }
    }
    return actions
  }

  if (state.phase !== 'build') return []

  const actions: GameAction[] = [{ type: 'SKIP_BUILD', playerId }]
  for (const type of BASIC_TYPES) {
    for (const hex of state.board) {
      if (canBuildBasic(state, playerId, hex.id, type)) {
        actions.push({ type: 'BUILD_STRUCTURE', playerId, hexId: hex.id, structureType: type })
      }
    }
  }
  for (const hex of state.board) {
    if (canBuildFortress(state, playerId, hex.id)) {
      actions.push({ type: 'BUILD_STRUCTURE', playerId, hexId: hex.id, structureType: 'Fortress' })
    }
  }
  return actions
}

function generateMajorArcanaActions(state: GameState, playerId: PlayerId): GameAction[] {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return []

  const actions: GameAction[] = []
  const majorTarots = state.tarotRow.filter((t) => t.kind === 'major')

  for (const tarot of majorTarots) {
    // 1. Hold cards can be taken/held
    if (isHoldCard(tarot.id) || tarot.id === 'HIGH_PRIESTESS') {
      if (player.heldMajorArcana.length < 3) {
        actions.push({
          type: 'TAKE_HOLD_CARD',
          playerId,
          tarotId: tarot.instanceId,
        })
      }
      continue
    }

    // 2. Immediate-resolve Major Arcana plays
    const majorId = tarot.id
    switch (majorId) {
      case 'DEATH':
      case 'JUDGEMENT': {
        actions.push({
          type: 'PLAY_MAJOR_ARCANA',
          playerId,
          tarotId: tarot.instanceId,
        })
        break
      }
      case 'STRENGTH': {
        const ownUnfortified = state.structures.filter((s) => s.owner === playerId && !s.fortressed)
        for (const s of ownUnfortified) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: { ownStructureId: s.id }
          })
        }
        break
      }
      case 'WHEEL': {
        const unfortified = state.structures.filter((s) => !s.fortressed)
        if (unfortified.length >= 3) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: { structureIds: unfortified.slice(0, 3).map((s) => s.id) }
          })
        }
        break
      }
      case 'HERMIT': {
        if (state.tarotDeck.length >= 3) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: { chosenTarotIds: state.tarotDeck.slice(0, 3).map((t) => t.instanceId) }
          })
        }
        break
      }
      case 'CHARIOT': {
        for (const hex of state.board) {
          const onHex = state.structures.filter((s) => s.hexId === hex.id && !s.fortressed)
          if (onHex.length > 0) {
            const newLevels: Record<string, number> = {}
            for (const s of onHex) {
              newLevels[s.id] = s.level
            }
            actions.push({
              type: 'PLAY_MAJOR_ARCANA',
              playerId,
              tarotId: tarot.instanceId,
              params: { hexId: hex.id, newLevels }
            })
          }
        }
        break
      }
      case 'TOWER': {
        const ownUnfortified = state.structures.filter((s) => s.owner === playerId && !s.fortressed)
        const oppUnfortified = state.structures.filter((s) => s.owner !== playerId && !s.fortressed)
        for (const own of ownUnfortified) {
          const match = oppUnfortified.find((opp) => opp.level === own.level)
          if (match) {
            actions.push({
              type: 'PLAY_MAJOR_ARCANA',
              playerId,
              tarotId: tarot.instanceId,
              params: { ownStructureId: own.id, opponentStructureIds: [match.id] }
            })
          }
        }
        break
      }
      case 'MAGICIAN': {
        const opponents = state.players.filter((p) => p.id !== playerId)
        for (const opponent of opponents) {
          if (
            player.logicHand.length > 0 &&
            player.effectHand.length > 0 &&
            opponent.logicHand.length > 0 &&
            opponent.effectHand.length > 0
          ) {
            actions.push({
              type: 'PLAY_MAJOR_ARCANA',
              playerId,
              tarotId: tarot.instanceId,
              params: {
                opponentId: opponent.id,
                myLogicId: player.logicHand[0].instanceId,
                myEffectId: player.effectHand[0].instanceId,
                theirLogicId: opponent.logicHand[0].instanceId,
                theirEffectId: opponent.effectHand[0].instanceId,
              }
            })
          }
        }
        break
      }
      case 'WORLD': {
        actions.push({
          type: 'PLAY_MAJOR_ARCANA',
          playerId,
          tarotId: tarot.instanceId,
          params: {
            condition1: { kind: 'terrain', value: 'Forests' },
            condition2: { kind: 'structureType', value: 'Pool' },
            logicKind: 'A'
          }
        })
        break
      }
      case 'DEVIL': {
        if (player.logicHand.length > 0) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: {
              logicCardId: player.logicHand[0].instanceId
            }
          })
        }
        break
      }
      case 'LOVERS': {
        if (player.logicHand.length > 0 && player.effectHand.length > 0) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: {
              logicCardId: player.logicHand[0].instanceId,
              effectCardId: player.effectHand[0].instanceId,
              casterValue: 3
            }
          })
        }
        break
      }
      case 'JUSTICE': {
        if (player.logicHand.length > 0 && player.effectHand.length > 0) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: {
              logicCardId: player.logicHand[0].instanceId,
              effectCardId: player.effectHand[0].instanceId,
              casterValue: 'Forests'
            }
          })
        }
        break
      }
      case 'HANGED_MAN': {
        if (player.logicHand.length > 0 && player.effectHand.length > 0) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: {
              logicCardId: player.logicHand[0].instanceId,
              effectCardId: player.effectHand[0].instanceId,
              casterValue: 'Forests'
            }
          })
        }
        break
      }
      case 'MOON': {
        if (player.logicHand.length > 0 && player.effectHand.length > 0) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: {
              logicCardId: player.logicHand[0].instanceId,
              effectCardId: player.effectHand[0].instanceId,
              casterValue: 'Pool'
            }
          })
        }
        break
      }
      case 'SUN': {
        if (player.logicHand.length > 0 && player.effectHand.length > 0) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: {
              logicCardId: player.logicHand[0].instanceId,
              effectCardId: player.effectHand[0].instanceId,
              casterValue: 3
            }
          })
        }
        break
      }
      case 'STAR': {
        const maxVP = Math.max(...state.players.map((p) => computeVP(state, p.id)))
        const playerAdjustments: Record<string, any> = {}
        let valid = true

        for (const p of state.players) {
          const current = computeVP(state, p.id)
          const required = maxVP - current
          if (required === 0) {
            playerAdjustments[p.id] = { upgrades: [], builds: [] }
          } else {
            const upgradable = state.structures.find((s) => s.owner === p.id && !s.fortressed && s.level < LEVEL_BOUNDS[s.type].max)
            if (upgradable) {
              const bounds = LEVEL_BOUNDS[upgradable.type]
              const possibleGained = bounds.max - upgradable.level
              if (possibleGained >= required) {
                playerAdjustments[p.id] = {
                  upgrades: [{ structureId: upgradable.id, newLevel: upgradable.level + required }],
                  builds: []
                }
              } else {
                valid = false
              }
            } else {
              valid = false
            }
          }
        }

        if (valid) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: { playerAdjustments }
          })
        }
        break
      }
      case 'TEMPERANCE': {
        const minVP = Math.min(...state.players.map((p) => computeVP(state, p.id)))
        const playerAdjustments: Record<string, any> = {}
        let valid = true

        for (const p of state.players) {
          const current = computeVP(state, p.id)
          const required = current - minVP
          if (required === 0) {
            playerAdjustments[p.id] = []
          } else {
            const downgradable = state.structures.find((s) => {
              if (s.owner !== p.id || s.fortressed) return false
              const bounds = LEVEL_BOUNDS[s.type]
              const newLevel = s.level - required
              return newLevel === 0 || (newLevel >= bounds.floor && newLevel < s.level)
            })
            if (downgradable) {
              const newLevel = downgradable.level - required
              playerAdjustments[p.id] = [{ structureId: downgradable.id, newLevel }]
            } else {
              valid = false
            }
          }
        }

        if (valid) {
          actions.push({
            type: 'PLAY_MAJOR_ARCANA',
            playerId,
            tarotId: tarot.instanceId,
            params: { playerAdjustments }
          })
        }
        break
      }
      default:
        break
    }
  }

  return actions
}

/**
 * Legal Phase-2 actions for a player. AI v1 scope: normal Logic+Effect spells and ending
 * the turn — it never plays a Major Arcana action (those need bespoke per-card targeting
 * that a first-pass heuristic doesn't attempt yet).
 */
export function getLegalCastActions(state: GameState, playerId: PlayerId): GameAction[] {
  const player = state.players.find((p) => p.id === playerId)
  if (!player || state.phase !== 'cast') return []

  const actions: GameAction[] = [{ type: 'END_TURN', playerId }]
  const minorTarots = state.tarotRow.filter((t) => t.kind === 'minor')
  for (const logic of player.logicHand) {
    for (const effect of player.effectHand) {
      for (const tarot of minorTarots) {
        actions.push({
          type: 'CAST_SPELL',
          playerId,
          logicCardId: logic.instanceId,
          effectCardId: effect.instanceId,
          tarotId: tarot.instanceId,
        })
      }
    }
  }

  actions.push(...generateMajorArcanaActions(state, playerId))

  return actions
}

function valuesForCategory(kind: OperandKind): (string | number)[] {
  if (kind === 'terrain') return [...TERRAIN_TYPES]
  if (kind === 'structureType') return [...STRUCTURE_TYPES]
  return [1, 2, 3, 4, 5, 6]
}

/** Legal actions for a player who is next in the majorChoiceQueue (opponent response phase). */
export function getLegalMajorChoiceActions(state: GameState, playerId: PlayerId): GameAction[] {
  if (state.phase !== 'awaitingMajorChoice' || !state.pendingMajorChoice || !state.majorChoiceQueue?.length) return []
  if (state.majorChoiceQueue[0] !== playerId) return []

  const pending = state.pendingMajorChoice
  if (pending.majorId === 'DEVIL') {
    const condIndex = pending.devilConditionIndex ?? 0
    const usedKinds = new Set<string>()
    if (condIndex >= 1) {
      const first = pending.opponentParams.condition1 as { kind: string } | undefined
      if (first) usedKinds.add(first.kind)
    }
    const categories: OperandKind[] = ['terrain', 'structureType', 'level'].filter((k) => !usedKinds.has(k)) as OperandKind[]
    const actions: GameAction[] = []
    for (const cat of categories) {
      for (const val of valuesForCategory(cat)) {
        actions.push({
          type: 'SUBMIT_OPPONENT_CHOICE',
          playerId,
          choice: { condition: { kind: cat, value: val } },
        })
      }
    }
    return actions
  }

  const spec = getForcedOperandSpec(pending.majorId)
  if (!spec) return []
  return valuesForCategory(spec.opponentCategory).map((val) => ({
    type: 'SUBMIT_OPPONENT_CHOICE' as const,
    playerId,
    choice: { opponentValue: val },
  }))
}
