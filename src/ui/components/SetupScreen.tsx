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
import { initTelemetry, disableTelemetry, loadTelemetryOptIn, saveTelemetryOptIn } from '../telemetry'

const PLAYER_COUNT = 2

function getAIDefaultName(difficulty: AIDifficulty): string {
  switch (difficulty) {
    case 'heuristic':
      return 'Hughie'
    case 'optimus':
      return 'Poppy'
    case 'random':
      return 'Randy'
    default:
      return 'Hughie'
  }
}

function defaultSeats(): SeatDraft[] {
  const saved = loadSavedSeats()
  if (saved && saved.length === PLAYER_COUNT) {
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
  const [showTelemetryPrompt, setShowTelemetryPrompt] = useState(loadTelemetryOptIn() === null)
  const [telemetryOptedIn, setTelemetryOptedIn] = useState(loadTelemetryOptIn() === true)

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

  return (
    <div className="setup-screen">
      <img className="setup-title-card" src={assetUrl('/img/title-card.jpg')} alt="Logician" />
      <p className="setup-subtitle">Hotseat play, any seat can be human or AI.</p>
      <div className="setup-form">
        {seats.map((seat, i) => (
          <div key={i} className="seat-container">
            <div className="setup-field seat-row">
              <label>
                <input type="checkbox" checked={seat.isAI} onChange={(e) => updateSeat(i, { isAI: e.target.checked })} /> AI
              </label>
              <input value={seat.name} onChange={(e) => updateSeat(i, { name: e.target.value })} />
              {seat.isAI && (
                <div>
                  <label>
                    Difficulty:&nbsp;
                    <select value={seat.aiDifficulty} onChange={(e) => updateSeat(i, { aiDifficulty: e.target.value as AIDifficulty })}>
                      <option value="random">Randy 👶 (level 1)</option>
                      <option value="heuristic" defaultChecked>Hughie ⚖️ (level 2)</option>
                      <option value="optimus">Poppy 😭 (level 3)</option>
                    </select>
                  </label>
                  <div className="seat-assistance-description">
                    {seat.aiDifficulty === 'random' && "Randy is a rookie 👶.  You've probably got a good chance besting him."}
                    {seat.aiDifficulty === 'heuristic' && "Hugie is more experienced ⚖️.  He can still slip up on big moves when stakes are high."}
                    {seat.aiDifficulty === 'optimus' && "Poppy is very experienced and very dangerous 😭. She will punish you."}
                  </div>
                </div>
              )}
              {!seat.isAI && (
                <div>
                  <label>
                    Assistance:&nbsp;
                    <select value={seat.assistanceLevel} onChange={(e) => updateSeat(i, { assistanceLevel: e.target.value as AssistanceLevel })}>
                      <option value="full" defaultChecked>Wizard Nursery 🍼</option>
                      <option value="some">Wizard Glasses 👓</option>
                      <option value="none">Wizard Eyes 👀</option>
                    </select>
                  </label>
                  <div className="seat-assistance-description">
                    {seat.assistanceLevel === 'full' && "Full Assistance: Previews target hexes and calculates exact structure/point changes before casting.  Use this one first!"}
                    {seat.assistanceLevel === 'some' && "Some Assistance: Previews target hexes, but you do your own point calculations."}
                    {seat.assistanceLevel === 'none' && "Wizard Eyes Mode 🧙‍♂️👀: No previews, no calculations. Rely purely on your own sight and intellect!"}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
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
      {showTelemetryPrompt ? (
        <div className="telemetry-prompt">
          <p>Help improve Logician? Anonymous usage analytics help us understand how the game is played, no personal data is collected.</p>
          <div className="telemetry-prompt-buttons">
            <button
              className="action-button"
              onClick={() => {
                saveTelemetryOptIn(true)
                initTelemetry()
                setShowTelemetryPrompt(false)
                setTelemetryOptedIn(true)
              }}
            >
              Yes
            </button>
            <button
              className="action-button secondary"
              onClick={() => {
                saveTelemetryOptIn(false)
                setShowTelemetryPrompt(false)
                setTelemetryOptedIn(false)
              }}
            >
              No thanks
            </button>
          </div>
        </div>
      ) : (
        <label className="setup-field show-rules-field">
          <input
            type="checkbox"
            checked={telemetryOptedIn}
            onChange={(e) => {
              const next = e.target.checked
              setTelemetryOptedIn(next)
              saveTelemetryOptIn(next)
              if (next) initTelemetry()
              else disableTelemetry()
            }}
          />{' '}
          Send anonymous usage analytics
        </label>
      )}
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
