import type { TarotCard } from '../engine/types/tarot'
import { assetUrl } from './assetUrl'

export function tarotArtUrl(card: TarotCard): string {
  if (card.kind === 'major') {
    return assetUrl(`/img/tarot/${card.id.toLowerCase()}.jpeg`)
  }
  return assetUrl(`/img/tarot/${card.suit.toLowerCase()}-${card.rank.toLowerCase()}.jpeg`)
}
