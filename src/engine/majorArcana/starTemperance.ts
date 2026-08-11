import { drawCards } from '../decks'
import { computeVP, canBuildBasic } from '../selectors'
import type { PlayerId } from '../types/ids'
import { LEVEL_BOUNDS } from '../types/structure'
import type { Structure, StructureType } from '../types/structure'
import type { GameState } from '../types/state'
import type { MajorArcanaCard } from '../types/tarot'
import type { MajorArcanaResult } from './handlers'

function discardAndRefill(state: GameState, tarot: MajorArcanaCard) {
  const draw = drawCards(state.tarotDeck, state.tarotDiscard, 1)
  return {
    tarotRow: [...state.tarotRow.filter((t) => t.instanceId !== tarot.instanceId), ...draw.drawn],
    tarotDeck: draw.remaining,
    tarotDiscard: [...draw.remainingDiscard, tarot],
  }
}

const BASIC_TYPES: readonly StructureType[] = ['Pool', 'Pyramid', 'Tower']

export interface StarParams {
  playerAdjustments: Record<PlayerId, { upgrades: Array<{ structureId: string; newLevel: number }>; builds: Array<{ hexId: string; structureType: StructureType }> }>
}

/** The Star: every player below the current max VP may upgrade or build until they equal it exactly. */
export function resolveStar(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard, params: StarParams): MajorArcanaResult {
  const maxVP = Math.max(...state.players.map((p) => computeVP(state, p.id)))
  let structures = [...state.structures]

  for (const player of state.players) {
    const original = computeVP(state, player.id)
    const required = maxVP - original
    const adj = params.playerAdjustments[player.id] ?? { upgrades: [], builds: [] }
    let gained = 0

    for (const u of adj.upgrades) {
      const s = structures.find((x) => x.id === u.structureId)
      if (!s) return { ok: false, error: 'Upgrade target does not exist' }
      if (s.owner !== player.id) return { ok: false, error: 'Can only upgrade your own structures' }
      if (s.fortressed) return { ok: false, error: 'Cannot upgrade a fortressed structure' }
      const bounds = LEVEL_BOUNDS[s.type]
      if (u.newLevel <= s.level || u.newLevel > bounds.max) return { ok: false, error: `Invalid upgrade level for ${s.type}` }
      gained += u.newLevel - s.level
      structures = structures.map((x) => (x.id === s.id ? { ...x, level: u.newLevel } : x))
    }

    for (const b of adj.builds) {
      if (!BASIC_TYPES.includes(b.structureType)) return { ok: false, error: 'The Star can only place basic structures, not Fortresses' }
      if (!state.board.some((h) => h.id === b.hexId)) return { ok: false, error: 'Unknown hex' }
      if (!canBuildBasic({ ...state, structures }, player.id, b.hexId, b.structureType)) {
        return { ok: false, error: `${player.name} already has a ${b.structureType} on ${b.hexId}` }
      }
      const floor = LEVEL_BOUNDS[b.structureType].floor
      gained += floor
      const newStructure: Structure = {
        id: crypto.randomUUID(),
        type: b.structureType,
        owner: player.id,
        hexId: b.hexId,
        level: floor,
        fortressed: false,
      }
      structures = [...structures, newStructure]
    }

    if (gained !== required) {
      return { ok: false, error: `${player.name} must gain exactly ${required} VP via The Star, got ${gained}` }
    }
  }

  return { ok: true, state: { ...state, structures, ...discardAndRefill(state, tarot) } }
}

export interface TemperanceParams {
  playerAdjustments: Record<PlayerId, Array<{ structureId: string; newLevel: number }>>
}

/** Temperance: every player above the current min VP must downgrade/destroy their own structures until they equal it exactly. */
export function resolveTemperance(state: GameState, _casterId: PlayerId, tarot: MajorArcanaCard, params: TemperanceParams): MajorArcanaResult {
  const minVP = Math.min(...state.players.map((p) => computeVP(state, p.id)))
  let structures = [...state.structures]

  for (const player of state.players) {
    const original = computeVP(state, player.id)
    const required = original - minVP
    const adjustments = params.playerAdjustments[player.id] ?? []
    let lost = 0

    for (const adj of adjustments) {
      const s = structures.find((x) => x.id === adj.structureId)
      if (!s) return { ok: false, error: 'Downgrade target does not exist' }
      if (s.owner !== player.id) return { ok: false, error: 'Can only downgrade your own structures' }
      if (s.fortressed) return { ok: false, error: 'Cannot downgrade a fortressed structure' }
      if (adj.newLevel !== 0 && (adj.newLevel >= s.level || adj.newLevel < LEVEL_BOUNDS[s.type].floor)) {
        return { ok: false, error: `Invalid downgrade level for ${s.type}` }
      }
      lost += adj.newLevel === 0 ? s.level : s.level - adj.newLevel
      structures =
        adj.newLevel === 0
          ? structures.filter((x) => x.id !== s.id)
          : structures.map((x) => (x.id === s.id ? { ...x, level: adj.newLevel } : x))
    }

    if (lost !== required) {
      return { ok: false, error: `${player.name} must lose exactly ${required} VP via Temperance, got ${lost}` }
    }
  }

  return { ok: true, state: { ...state, structures, ...discardAndRefill(state, tarot) } }
}
