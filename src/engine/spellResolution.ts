import { drawCards } from './decks'
import { applyEffect } from './levelResolution'
import { nextRandom } from './prng'
import { getAffectedStructures } from './selectors'
import type { EffectCard, LogicCard } from './types/cards'
import type { PlayerId } from './types/ids'
import type { GameState } from './types/state'
import type { Structure } from './types/structure'
import type { Operand, TarotCard } from './types/tarot'
import type { HierophantOverride } from './types/state'

export function setFortressedForHex(structures: Structure[], owner: PlayerId, hexId: string, fortressed: boolean): Structure[] {
  return structures.map((s) => (s.owner === owner && s.hexId === hexId && s.type !== 'Fortress' ? { ...s, fortressed } : s))
}

function findInHand<T extends { instanceId: string }>(hand: T[], instanceId: string): T | undefined {
  return hand.find((c) => c.instanceId === instanceId)
}

export type SpellResolutionResult =
  | { ok: true; state: GameState; affectedCount: number; destroyedCount: number }
  | { ok: false; error: string }

export interface SpellResolutionInput {
  casterId: PlayerId
  logicCardId: string
  effectCardId: string
  operandA: Operand
  operandB: Operand
  /** The single tarot card (minor or major) consumed by this cast — discarded, with 1 replacement drawn. */
  tarot: TarotCard
  /** Set only when a held Hierophant intercepted this spell's Randomize effect. */
  hierophantOverride?: HierophantOverride
}

/**
 * The shared core behind casting a normal Logic+Effect spell against an operand pair.
 * Used both by CAST_SPELL (operands come from a face-up Minor Arcana card) and by the
 * "forced operand" Major Arcana (Lovers, Justice, The Hanged Man, The Moon, The Sun) whose
 * operands are instead named by the caster and a designated opponent.
 */
export function resolveSpell(state: GameState, input: SpellResolutionInput): SpellResolutionResult {
  const player = state.players.find((p) => p.id === input.casterId)
  if (!player) return { ok: false, error: 'Unknown caster' }

  const logicCard = findInHand<LogicCard>(player.logicHand, input.logicCardId)
  if (!logicCard) return { ok: false, error: 'Logic card not in hand' }
  const effectCard = findInHand<EffectCard>(player.effectHand, input.effectCardId)
  if (!effectCard) return { ok: false, error: 'Effect card not in hand' }

  const affected = getAffectedStructures(state, {
    logicCardId: logicCard.kind,
    operandA: input.operandA,
    operandB: input.operandB,
  })

  const { value: comboRandom, prng: prng1 } = nextRandom(state.prng)
  const comboOutcome: 'upgrade' | 'downgrade' = comboRandom < 0.5 ? 'upgrade' : 'downgrade'
  const affectedIds = new Set(affected.map((s) => s.id))
  const destroyedIds = new Set<string>()
  const levelUpdates = new Map<string, number>()

  const override = input.hierophantOverride
  for (const structure of affected) {
    if (effectCard.kind === 'RANDOMIZE' && override && structure.id === override.structureId) {
      levelUpdates.set(structure.id, override.newLevel)
      continue
    }
    const result = applyEffect(structure, effectCard.kind, { comboOutcome })
    if (result.destroyed) {
      destroyedIds.add(structure.id)
    } else {
      levelUpdates.set(structure.id, result.newLevel)
    }
  }

  let structures = state.structures
    .filter((s) => !destroyedIds.has(s.id))
    .map((s) => (affectedIds.has(s.id) && levelUpdates.has(s.id) ? { ...s, level: levelUpdates.get(s.id)! } : s))

  for (const structure of affected) {
    if (destroyedIds.has(structure.id) && structure.type === 'Fortress') {
      structures = setFortressedForHex(structures, structure.owner, structure.hexId, false)
    }
  }

  const logicDraw = drawCards(state.logicDeck, state.logicDiscard, 1, prng1)
  const effectDraw = drawCards(state.effectDeck, state.effectDiscard, 1, logicDraw.prng)
  const tarotDraw = drawCards(state.tarotDeck, state.tarotDiscard, 1, effectDraw.prng)

  let next: GameState = {
    ...state,
    structures,
    logicDeck: logicDraw.remaining,
    logicDiscard: [...logicDraw.remainingDiscard, logicCard],
    effectDeck: effectDraw.remaining,
    effectDiscard: [...effectDraw.remainingDiscard, effectCard],
    tarotDeck: tarotDraw.remaining,
    tarotDiscard: [...tarotDraw.remainingDiscard, input.tarot],
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== input.tarot.instanceId), ...tarotDraw.drawn],
    prng: tarotDraw.prng,
  }

  next = {
    ...next,
    players: next.players.map((p) =>
      p.id === player.id
        ? {
            ...p,
            logicHand: [...p.logicHand.filter((c) => c.instanceId !== logicCard.instanceId), ...logicDraw.drawn],
            effectHand: [...p.effectHand.filter((c) => c.instanceId !== effectCard.instanceId), ...effectDraw.drawn],
          }
        : p,
    ),
  }

  return { ok: true, state: next, affectedCount: affected.length, destroyedCount: destroyedIds.size }
}
