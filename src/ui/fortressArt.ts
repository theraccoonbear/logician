import { assetUrl } from './assetUrl'

// Two-layer wraparound ring per Fortress level: back (behind the owner's other structures)
// and fore (in front of them). Both layers share an identical source canvas per level, so
// they overlay pixel-for-pixel as long as they're rendered at the same box/position in
// CSS — see .fortress-back/.fortress-fore in App.css. Only levels 1-2 exist (Fortress's own
// LEVEL_BOUNDS).
const FORTRESS_ART: Record<number, { back: string; fore: string }> = {
  1: { back: '/img/structures/fortress--back-1.png', fore: '/img/structures/fortress--fore-1.png' },
  2: { back: '/img/structures/fortress--back-2.png', fore: '/img/structures/fortress--fore-2.png' },
}

export function fortressArtUrls(level: number): { back: string; fore: string } | undefined {
  const paths = FORTRESS_ART[level]
  return paths && { back: assetUrl(paths.back), fore: assetUrl(paths.fore) }
}
