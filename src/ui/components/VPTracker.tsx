import { computeVP } from '../../engine/selectors'
import type { GameState } from '../../engine/types/state'
import { getPlayerColor } from '../playerColors'

const VICTORY_VP = 40

export function VPTracker({ state }: { state: GameState }) {
  return (
    <div className="vp-tracker">
      {state.players.map((player, index) => (
        <div className="vp-row" key={player.id}>
          <span className="vp-swatch" style={{ backgroundColor: getPlayerColor(index) }} />
          <span className="vp-name">{player.name}</span>
          <span className="vp-value">
            {computeVP(state, player.id)} / {VICTORY_VP}
          </span>
        </div>
      ))}
    </div>
  )
}
