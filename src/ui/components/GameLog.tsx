import type { GameEvent } from '../../engine/types/state'

export function GameLog({ log }: { log: GameEvent[] }) {
  const recent = log.slice(-8).reverse()
  return (
    <div className="game-log">
      <div className="card-hand-label">Log</div>
      <ul>
        {recent.map((event, i) => (
          <li key={i}>{event.message}</li>
        ))}
      </ul>
    </div>
  )
}
