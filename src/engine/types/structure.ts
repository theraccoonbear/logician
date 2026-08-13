import type { HexId, PlayerId } from './ids'

export type StructureType = 'Pool' | 'Pyramid' | 'Tower' | 'Fortress'

export interface LevelBounds {
  /** Lowest level a built structure can be clamped to; going strictly below this destroys it. */
  floor: number
  max: number
}

// A structure always enters play at its floor level. Modeled on the physical pieces:
// Pool = 2-sided coin (2-3), Pyramid = d4 (1-4), Tower = d6 (1-6), Fortress wall (1-2).
export const LEVEL_BOUNDS: Record<StructureType, LevelBounds> = {
  Pool: { floor: 2, max: 3 },
  Pyramid: { floor: 1, max: 4 },
  Tower: { floor: 1, max: 6 },
  Fortress: { floor: 1, max: 2 },
}

export const BASIC_STRUCTURE_TYPES: readonly StructureType[] = ['Pool', 'Pyramid', 'Tower']

export interface Structure {
  id: string
  type: StructureType
  owner: PlayerId
  hexId: HexId
  level: number
  /** True iff owner also has a Fortress on this hex, making this structure immune to effects. */
  fortressed: boolean
}
