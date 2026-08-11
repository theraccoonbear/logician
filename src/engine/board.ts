import type { HexId } from './types/ids'
import type { TerrainType } from './types/terrain'

export interface Hex {
  id: HexId
  terrain: TerrainType
}

// Confirmed from fig. 1: 10 hexes — Prairies x2, Mountains x3, Forests x3, Swamps x2.
// Exact axial coordinates for rendering the flower silhouette are decided at the UI milestone;
// no gameplay rule depends on hex adjacency, only per-hex and whole-board checks.
const TERRAIN_COUNTS: readonly TerrainType[] = [
  'Prairies',
  'Prairies',
  'Mountains',
  'Mountains',
  'Mountains',
  'Forests',
  'Forests',
  'Forests',
  'Swamps',
  'Swamps',
]

export function createBoard(): Hex[] {
  return TERRAIN_COUNTS.map((terrain, index) => ({
    id: `hex-${index + 1}`,
    terrain,
  }))
}
