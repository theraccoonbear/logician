import type { Structure, StructureType } from '../engine/types/structure'

// Per-type, per-level art. Only types/levels with a file in public/img/structures/
// are listed — StructureToken falls back to the flat shape token for anything
// missing (currently Fortress, which has no art yet).
const STRUCTURE_ART: Partial<Record<StructureType, Record<number, string>>> = {
  Pool: {
    2: '/img/structures/pool-2.png',
    3: '/img/structures/pool-3.png',
  },
  Pyramid: {
    1: '/img/structures/pyramid-1.png',
    2: '/img/structures/pyramid-2.png',
    3: '/img/structures/pyramid-3.png',
    4: '/img/structures/pyramid-4.png',
  },
  Tower: {
    1: '/img/structures/tower-1.png',
    2: '/img/structures/tower-2.png',
    3: '/img/structures/tower-3.png',
    4: '/img/structures/tower-4.png',
    5: '/img/structures/tower-5.png',
    6: '/img/structures/tower-6.png',
  },
}

export function structureArtUrl(structure: Pick<Structure, 'type' | 'level'>): string | undefined {
  return STRUCTURE_ART[structure.type]?.[structure.level]
}
