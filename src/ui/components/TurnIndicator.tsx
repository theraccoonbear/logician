import type { GameState } from '../../engine/types/state'
import { describeMajorArcana } from '../operandLabels'
import { getPlayerColor } from '../playerColors'

const PHASE_LABELS: Record<GameState['phase'], string> = {
  setup: 'Setup: place your Pool, Pyramid, and Tower',
  build: 'Phase 1: Build',
  cast: 'Phase 2: Cast a Spell',
  awaitingTrigger: 'Waiting on a trigger response',
  awaitingMajorChoice: 'Waiting for opponent choice',
}

export function TurnIndicator({ state }: { state: GameState }) {
  const player = state.players[state.activePlayerIndex]
  return (
    <div className="turn-indicator" style={{ borderColor: getPlayerColor(state.activePlayerIndex) }}>
      <strong>{player.name}'s turn</strong>
      <span>{PHASE_LABELS[state.phase]}</span>
      {state.players.some((p) => p.heldMajorArcana.length > 0) && (
        <span className="held-cards-summary">
          {state.players
            .filter((p) => p.heldMajorArcana.length > 0)
            .map((p) => `${p.name} holds: ${p.heldMajorArcana.map((c) => describeMajorArcana(c.id)).join(', ')}`)
            .join(' · ')}
        </span>
      )}
    </div>
  )
}
