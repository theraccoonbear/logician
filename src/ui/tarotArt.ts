import type { TarotCard } from '../engine/types/tarot'

// public/img/tarot/*.jpeg — the 1909 Rider-Waite-Smith deck (public domain), named to
// match this codebase's own card-id conventions: lowercased MajorArcanaId for majors
// (fool.jpeg, high_priestess.jpeg, hanged_man.jpeg, ...), {suit}-{rank}.jpeg for minors
// (wands-ace.jpeg, cups-10.jpeg, swords-queen.jpeg, ...).
export function tarotArtUrl(card: TarotCard): string {
  if (card.kind === 'major') {
    return `/img/tarot/${card.id.toLowerCase()}.jpeg`
  }
  return `/img/tarot/${card.suit.toLowerCase()}-${card.rank.toLowerCase()}.jpeg`
}
