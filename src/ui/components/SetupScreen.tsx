import { useEffect, useState } from 'react'
import type { AIDifficulty, AssistanceLevel } from '../../engine/types/state'
import { assetUrl } from '../assetUrl'
import { useGameEngine } from '../hooks/useGameEngine'
import {
  loadSavedPlayerName,
  loadShowRulesOnStart,
  savePlayerName,
  saveShowRulesOnStart,
  loadSavedSeats,
  saveSeats,
  type SeatDraft,
} from '../persistence'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 4

function getAIDefaultName(difficulty: AIDifficulty): string {
  switch (difficulty) {
    case 'heuristic':
      return 'Hugh'
    case 'optimus':
      return 'Oppy'
    case 'random':
      return 'Randy'
    default:
      return 'Hugh'
  }
}

function defaultSeats(): SeatDraft[] {
  const saved = loadSavedSeats()
  if (saved && saved.length >= MIN_PLAYERS && saved.length <= MAX_PLAYERS) {
    return saved
  }
  return [
    // Seat 0 is the default human seat — remember whatever name they last set here
    // instead of always defaulting to the generic "You".
    { name: loadSavedPlayerName() ?? 'You', isAI: false, aiDifficulty: 'heuristic', assistanceLevel: 'full' },
    { name: 'Hugh', isAI: true, aiDifficulty: 'heuristic', assistanceLevel: 'full' },
  ]
}

export function SetupScreen() {
  const { startGame } = useGameEngine()
  const [seats, setSeats] = useState<SeatDraft[]>(defaultSeats())
  const [showRules, setShowRules] = useState(loadShowRulesOnStart())

  // Synchronize the complete seats configuration to localStorage whenever it is modified
  useEffect(() => {
    saveSeats(seats)
  }, [seats])

  const updateSeat = (index: number, patch: Partial<SeatDraft>) => {
    if (index === 0 && patch.name !== undefined) savePlayerName(patch.name)
    setSeats((prev) =>
      prev.map((seat, i) => {
        if (i !== index) return seat
        const nextSeat = { ...seat, ...patch }
        if (patch.isAI === true) {
          nextSeat.name = getAIDefaultName(nextSeat.aiDifficulty)
        } else if (nextSeat.isAI && patch.aiDifficulty !== undefined) {
          nextSeat.name = getAIDefaultName(patch.aiDifficulty)
        } else if (patch.isAI === false) {
          nextSeat.name = i === 0 ? (loadSavedPlayerName() ?? 'You') : `Player ${i + 1}`
        }
        return nextSeat
      })
    )
  }
  const addSeat = () => {
    if (seats.length >= MAX_PLAYERS) return
    setSeats((prev) => [...prev, { name: 'Hugh', isAI: true, aiDifficulty: 'heuristic', assistanceLevel: 'full' }])
  }
  const removeSeat = () => {
    if (seats.length <= MIN_PLAYERS) return
    setSeats((prev) => prev.slice(0, -1))
  }

  return (
    <div className="setup-screen">
      <img className="setup-title-card" src={assetUrl('/img/title-card.jpg')} alt="Logician" />
      <p className="setup-subtitle">Hotseat play — any seat can be human or AI.</p>
      <div className="setup-form">
        {seats.map((seat, i) => (
          <div key={i} className="seat-container">
            <div className="setup-field seat-row">
              <input value={seat.name} onChange={(e) => updateSeat(i, { name: e.target.value })} />
              <label>
                <input type="checkbox" checked={seat.isAI} onChange={(e) => updateSeat(i, { isAI: e.target.checked })} /> AI
              </label>
              {seat.isAI && (
                <select value={seat.aiDifficulty} onChange={(e) => updateSeat(i, { aiDifficulty: e.target.value as AIDifficulty })}>
                  <option value="heuristic">Heuristic</option>
                  <option value="optimus">Optimus</option>
                  <option value="random">Random</option>
                </select>
              )}
              {!seat.isAI && (
                <select value={seat.assistanceLevel} onChange={(e) => updateSeat(i, { assistanceLevel: e.target.value as AssistanceLevel })}>
                  <option value="none">No Assistance (Wizard Eyes 🧙‍♂️👀)</option>
                  <option value="some">Some Assistance</option>
                  <option value="full">Full Assistance</option>
                </select>
              )}
            </div>
            {!seat.isAI && (
              <div className="seat-assistance-description">
                {seat.assistanceLevel === 'full' && "Full Assistance: Previews target hexes and calculates exact structure/point changes before casting."}
                {seat.assistanceLevel === 'some' && "Some Assistance: Previews target hexes, but you do your own point calculations."}
                {seat.assistanceLevel === 'none' && "Wizard Eyes Mode 🧙‍♂️👀: No previews, no calculations. Rely purely on your own sight and intellect!"}
              </div>
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
      <label className="setup-field show-rules-field">
        <input
          type="checkbox"
          checked={showRules}
          onChange={(e) => {
            setShowRules(e.target.checked)
            saveShowRulesOnStart(e.target.checked)
          }}
        />{' '}
        Show the rules before starting
      </label>
      <button
        className="primary-button"
        onClick={() =>
          startGame(
            seats.map((seat) => ({
              name: seat.name.trim() || 'Player',
              isAI: seat.isAI,
              aiDifficulty: seat.aiDifficulty,
              assistanceLevel: seat.assistanceLevel,
            })),
            { showRules },
          )
        }
      >
        Start Game
      </button>
    </div>
  )
}
