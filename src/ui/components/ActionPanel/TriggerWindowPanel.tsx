import { useState } from 'react'
import { HOLD_CARD_HANDLERS, computeRandomizeTargets } from '../../../engine/triggers'
import { TERRAIN_TYPES } from '../../../engine/majorArcana/forcedOperand'
import { describeMajorArcana } from '../../operandLabels'
import { useGameEngine } from '../../hooks/useGameEngine'

export function TriggerWindowPanel() {
  const { state, dispatch, lastError } = useGameEngine()
  const [empressFrom, setEmpressFrom] = useState('')
  const [empressTo, setEmpressTo] = useState('')
  const [hierophantTarget, setHierophantTarget] = useState('')
  const [hierophantLevel, setHierophantLevel] = useState(1)

  if (!state || state.phase !== 'awaitingTrigger' || !state.pendingTrigger || !state.triggerQueue?.length) return null

  const pending = state.pendingTrigger
  const responderId = state.triggerQueue[0]
  const responder = state.players.find((p) => p.id === responderId)!
  const eligible = responder.heldMajorArcana.filter((card) => HOLD_CARD_HANDLERS[card.id]?.canRespond(pending, responderId))
  const randomizeTargets = computeRandomizeTargets(state, pending)

  const play = (cardInstanceId: string, params?: unknown) => {
    dispatch({ type: 'PLAY_HELD_ARCANA', playerId: responderId, cardId: cardInstanceId, params })
  }
  const pass = () => dispatch({ type: 'PASS_TRIGGER_WINDOW', playerId: responderId })

  return (
    <div className="action-panel trigger-window-panel">
      <p>
        <strong>{responder.name}</strong> may respond with a held card before this resolves, or pass.
      </p>
      {eligible.length === 0 && <p>No held card can react to this — pass to continue.</p>}
      {eligible.map((card) => {
        if (card.id === 'FOOL' || card.id === 'EMPEROR') {
          return (
            <div className="major-arcana-form" key={card.instanceId}>
              <button className="action-button" onClick={() => play(card.instanceId)}>
                Play {describeMajorArcana(card.id)}
              </button>
            </div>
          )
        }
        if (card.id === 'EMPRESS') {
          return (
            <div className="major-arcana-form" key={card.instanceId}>
              <p>Temporarily reinterpret one terrain as another for this resolution:</p>
              <div className="redistribute-row">
                <select value={empressFrom} onChange={(e) => setEmpressFrom(e.target.value)}>
                  <option value="">from…</option>
                  {TERRAIN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select value={empressTo} onChange={(e) => setEmpressTo(e.target.value)}>
                  <option value="">to…</option>
                  {TERRAIN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="action-button"
                disabled={!empressFrom || !empressTo}
                onClick={() => play(card.instanceId, { from: empressFrom, to: empressTo })}
              >
                Play The Empress
              </button>
            </div>
          )
        }
        if (card.id === 'HIEROPHANT') {
          return (
            <div className="major-arcana-form" key={card.instanceId}>
              <p>Remove one target from the randomization and set its level directly:</p>
              <div className="redistribute-row">
                <select value={hierophantTarget} onChange={(e) => setHierophantTarget(e.target.value)}>
                  <option value="">choose a target…</option>
                  {randomizeTargets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.type} Lv.{s.level} on {s.hexId}
                    </option>
                  ))}
                </select>
                <input type="number" value={hierophantLevel} min={1} onChange={(e) => setHierophantLevel(Number(e.target.value))} />
              </div>
              <button
                className="action-button"
                disabled={!hierophantTarget}
                onClick={() => play(card.instanceId, { structureId: hierophantTarget, newLevel: hierophantLevel })}
              >
                Play The Hierophant
              </button>
            </div>
          )
        }
        return null
      })}
      <div className="action-buttons">
        <button className="action-button secondary" onClick={pass}>
          Pass
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
