import { useState } from 'react'
import type { AIDifficulty } from '../../engine/types/state'
import { useGameEngine } from '../hooks/useGameEngine'

interface SeatDraft {
  name: string
  isAI: boolean
  aiDifficulty: AIDifficulty
}

const MIN_PLAYERS = 2
const MAX_PLAYERS = 4

function defaultSeats(): SeatDraft[] {
  return [
    { name: 'You', isAI: false, aiDifficulty: 'heuristic' },
    { name: 'AI Opponent', isAI: true, aiDifficulty: 'heuristic' },
  ]
}

export function SetupScreen() {
  const { startGame } = useGameEngine()
  const [seats, setSeats] = useState<SeatDraft[]>(defaultSeats())

  const updateSeat = (index: number, patch: Partial<SeatDraft>) => {
    setSeats((prev) => prev.map((seat, i) => (i === index ? { ...seat, ...patch } : seat)))
  }
  const addSeat = () => {
    if (seats.length >= MAX_PLAYERS) return
    setSeats((prev) => [...prev, { name: `AI Opponent ${prev.length}`, isAI: true, aiDifficulty: 'heuristic' }])
  }
  const removeSeat = () => {
    if (seats.length <= MIN_PLAYERS) return
    setSeats((prev) => prev.slice(0, -1))
  }

  return (
    <div className="setup-screen">
      <h1>Logician</h1>
      <p className="setup-subtitle">Hotseat play — any seat can be human or AI.</p>
      <div className="setup-form">
        {seats.map((seat, i) => (
          <div key={i} className="setup-field seat-row">
            <input value={seat.name} onChange={(e) => updateSeat(i, { name: e.target.value })} />
            <label>
              <input type="checkbox" checked={seat.isAI} onChange={(e) => updateSeat(i, { isAI: e.target.checked })} /> AI
            </label>
            {seat.isAI && (
              <select value={seat.aiDifficulty} onChange={(e) => updateSeat(i, { aiDifficulty: e.target.value as AIDifficulty })}>
                <option value="heuristic">Heuristic</option>
                <option value="random">Random</option>
              </select>
            )}
          </div>
        ))}
      </div>
      <div className="action-buttons" style={{ justifyContent: 'center', marginBottom: 16 }}>
        <button className="action-button secondary" disabled={seats.length <= MIN_PLAYERS} onClick={removeSeat}>
          Remove Player
        </button>
        <button className="action-button secondary" disabled={seats.length >= MAX_PLAYERS} onClick={addSeat}>
          Add Player
        </button>
      </div>
      <button
        className="primary-button"
        onClick={() =>
          startGame(seats.map((seat) => ({ name: seat.name.trim() || 'Player', isAI: seat.isAI, aiDifficulty: seat.aiDifficulty })))
        }
      >
        Start Game
      </button>
    </div>
  )
}
