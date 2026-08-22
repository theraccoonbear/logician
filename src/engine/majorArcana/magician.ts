import { drawCards } from '../decks'
import type { PlayerId } from '../types/ids'
import type { GameState } from '../types/state'
import type { MajorArcanaCard } from '../types/tarot'
import type { MajorArcanaResult } from './handlers'

export interface MagicianParams {
  opponentId: PlayerId
  myLogicId: string
  myEffectId: string
  theirLogicId: string
  theirEffectId: string
}

/** The Magician: exchange one Logic and one Effect card with a chosen opponent's hand. */
export function resolveMagician(state: GameState, casterId: PlayerId, tarot: MajorArcanaCard, params: MagicianParams): MajorArcanaResult {
  if (params.opponentId === casterId) return { ok: false, error: 'Must target a different player' }
  const caster = state.players.find((p) => p.id === casterId)
  const opponent = state.players.find((p) => p.id === params.opponentId)
  if (!caster || !opponent) return { ok: false, error: 'Unknown player' }

  const myLogic = caster.logicHand.find((c) => c.instanceId === params.myLogicId)
  const myEffect = caster.effectHand.find((c) => c.instanceId === params.myEffectId)
  const theirLogic = opponent.logicHand.find((c) => c.instanceId === params.theirLogicId)
  const theirEffect = opponent.effectHand.find((c) => c.instanceId === params.theirEffectId)
  if (!myLogic || !myEffect || !theirLogic || !theirEffect) {
    return { ok: false, error: 'One or more chosen cards are not in the expected hand' }
  }

  const tarotDraw = drawCards(state.tarotDeck, state.tarotDiscard, 1, state.prng)

  const next: GameState = {
    ...state,
    tarotDeck: tarotDraw.remaining,
    tarotDiscard: [...tarotDraw.remainingDiscard, tarot],
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...tarotDraw.drawn],
    prng: tarotDraw.prng,
    players: state.players.map((p) => {
      if (p.id === caster.id) {
        return {
          ...p,
          logicHand: [...p.logicHand.filter((c) => c.instanceId !== myLogic.instanceId), theirLogic],
          effectHand: [...p.effectHand.filter((c) => c.instanceId !== myEffect.instanceId), theirEffect],
        }
      }
      if (p.id === opponent.id) {
        return {
          ...p,
          logicHand: [...p.logicHand.filter((c) => c.instanceId !== theirLogic.instanceId), myLogic],
          effectHand: [...p.effectHand.filter((c) => c.instanceId !== theirEffect.instanceId), myEffect],
        }
      }
      return p
    }),
  }

  return { ok: true, state: next }
}
