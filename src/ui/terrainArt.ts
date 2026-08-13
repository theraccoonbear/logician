import type { TerrainType } from '../engine/types/terrain'
import { assetUrl } from './assetUrl'

const TERRAIN_ART: Record<TerrainType, string> = {
  Prairies: '/img/terrain/prairies.png',
  Forests: '/img/terrain/forests.png',
  Mountains: '/img/terrain/mountains.png',
  Swamps: '/img/terrain/swamps.png',
}

export function terrainArtUrl(terrain: TerrainType): string {
  return assetUrl(TERRAIN_ART[terrain])
}
