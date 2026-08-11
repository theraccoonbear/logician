export type TerrainType = 'Prairies' | 'Forests' | 'Mountains' | 'Swamps'

export type Suit = 'Swords' | 'Wands' | 'Cups' | 'Pentacles'

export const SUIT_TERRAIN: Record<Suit, TerrainType> = {
  Swords: 'Prairies',
  Wands: 'Forests',
  Cups: 'Mountains',
  Pentacles: 'Swamps',
}

export const TERRAIN_SUIT: Record<TerrainType, Suit> = {
  Prairies: 'Swords',
  Forests: 'Wands',
  Mountains: 'Cups',
  Swamps: 'Pentacles',
}
