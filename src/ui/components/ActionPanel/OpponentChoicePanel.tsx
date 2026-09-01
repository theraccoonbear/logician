import { useState } from 'react'
import { getForcedOperandSpec } from '../../../engine/majorArcana/forcedOperand'
import { describeMajorArcana } from '../../operandLabels'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { useGameEngine } from '../../hooks/useGameEngine'
import { OperandPicker, operandKindLabel } from './majorForms/OperandPicker'
import { ConditionPicker } from './majorForms/ConditionPicker'
import { StarAdjustmentForm, TemperanceAdjustmentForm } from './majorForms/AdjustmentForms'
import type { Operand } from '../../../engine/types/tarot'

export function OpponentChoicePanel() {
  const { state, dispatch, lastError } = useGameEngine()
  const [opponentValue, setOpponentValue] = useState<string | number | ''>('')
  const [condition, setCondition] = useState<Operand | null>(null)

  if (!state || state.phase !== 'awaitingMajorChoice' || !state.pendingMajorChoice || !state.majorChoiceQueue?.length) {
    return null
  }

  const pending = state.pendingMajorChoice
  const responderId = state.majorChoiceQueue[0]
  const responder = state.players.find((p) => p.id === responderId)
  const caster = state.players.find((p) => p.id === pending.casterId)

  if (!responder || !caster) return null

  const label = describeMajorArcana(pending.majorId)
  const description = MAJOR_ARCANA_DESCRIPTIONS[pending.majorId]

  const submitChoice = (choice: Record<string, unknown>) => {
    dispatch({ type: 'SUBMIT_OPPONENT_CHOICE', playerId: responderId, choice })
    setOpponentValue('')
    setCondition(null)
  }

  if (pending.majorId === 'DEVIL') {
    const condIndex = pending.devilConditionIndex ?? 0
    const usedKinds = new Set<string>()
    if (condIndex >= 1) {
      const first = pending.opponentParams.condition1 as { kind: string } | undefined
      if (first) usedKinds.add(first.kind)
    }

    return (
      <div className="action-panel opponent-choice-panel">
        <div className="opponent-choice-header">
          <span className="opponent-choice-card">{label}</span>
          <span className="opponent-choice-desc">{description}</span>
        </div>
        <div className="opponent-choice-prompt">
          <strong>{responder.name}</strong>, name condition {condIndex + 1} of 2:
        </div>
        <ConditionPicker
          operand={condition}
          onChange={setCondition}
          excludedKinds={usedKinds}
        />
        <div className="action-buttons">
          <button
            className="action-button"
            disabled={!condition}
            onClick={() => submitChoice({ condition })}
          >
            Submit Condition
          </button>
        </div>
        {lastError && <p className="action-error">{lastError}</p>}
      </div>
    )
  }

  if (pending.majorId === 'STAR') {
    return (
      <div className="action-panel opponent-choice-panel">
        <div className="opponent-choice-header">
          <span className="opponent-choice-card">{label}</span>
          <span className="opponent-choice-desc">{description}</span>
        </div>
        <StarAdjustmentForm
          responderId={responderId}
          onConfirm={(playerAdjustments) => submitChoice({ playerAdjustments })}
        />
        {lastError && <p className="action-error">{lastError}</p>}
      </div>
    )
  }

  if (pending.majorId === 'TEMPERANCE') {
    return (
      <div className="action-panel opponent-choice-panel">
        <div className="opponent-choice-header">
          <span className="opponent-choice-card">{label}</span>
          <span className="opponent-choice-desc">{description}</span>
        </div>
        <TemperanceAdjustmentForm
          responderId={responderId}
          onConfirm={(playerAdjustments) => submitChoice({ playerAdjustments })}
        />
        {lastError && <p className="action-error">{lastError}</p>}
      </div>
    )
  }

  const spec = getForcedOperandSpec(pending.majorId)
  if (!spec) return null

  return (
    <div className="action-panel opponent-choice-panel">
      <div className="opponent-choice-header">
        <span className="opponent-choice-card">{label}</span>
        <span className="opponent-choice-desc">{description}</span>
      </div>
      <div className="opponent-choice-prompt">
        <strong>{responder.name}</strong>, choose the {operandKindLabel(spec.opponentCategory)}:
      </div>
      <OperandPicker
        kind={spec.opponentCategory}
        value={opponentValue}
        onChange={setOpponentValue}
      />
      <div className="action-buttons">
        <button
          className="action-button"
          disabled={opponentValue === ''}
          onClick={() => submitChoice({ opponentValue })}
        >
          Submit Choice
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}

/** Shown to the caster while waiting for the opponent to respond. */
export function MajorChoiceWaitingPanel() {
  const { state, dispatch } = useGameEngine()

  if (!state || state.phase !== 'awaitingMajorChoice' || !state.pendingMajorChoice || !state.majorChoiceQueue?.length) {
    return null
  }

  const pending = state.pendingMajorChoice
  const caster = state.players.find((p) => p.id === pending.casterId)
  const nextResponderId = state.majorChoiceQueue[0]
  const nextResponder = state.players.find((p) => p.id === nextResponderId)

  if (!caster || !nextResponder) return null

  const label = describeMajorArcana(pending.majorId)

  const cancel = () => dispatch({ type: 'CANCEL_MAJOR_CHOICE', playerId: pending.casterId })

  return (
    <div className="action-panel major-choice-waiting">
      <div className="opponent-choice-header">
        <span className="opponent-choice-card">{label}</span>
      </div>
      <div className="waiting-message">
        Waiting for <strong>{nextResponder.name}</strong> to choose...
      </div>
      <div className="action-buttons">
        <button className="action-button secondary" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
