import { useState, useEffect, useMemo } from 'react'
import { getForcedOperandSpec } from '../../../engine/majorArcana/forcedOperand'
import { getAffectedStructures } from '../../../engine/selectors'
import { describeMajorArcana } from '../../operandLabels'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { LOGIC_CARD_LABELS } from '../../cardLabels'
import { terrainArtUrl } from '../../terrainArt'
import { structureArtUrl } from '../../structureArt'
import { useGameEngine } from '../../hooks/useGameEngine'
import { OperandPicker, operandKindLabel } from './majorForms/OperandPicker'
import { ConditionPicker } from './majorForms/ConditionPicker'
import { StarAdjustmentForm, TemperanceAdjustmentForm } from './majorForms/AdjustmentForms'
import type { Operand } from '../../../engine/types/tarot'
import type { LogicCardId } from '../../../engine/types/cards'
import type { TerrainType } from '../../../engine/types/terrain'

export function OpponentChoicePanel({ onPreviewTargetsChange }: { onPreviewTargetsChange?: (ids: Set<string>) => void }) {
  const { state, dispatch, lastError } = useGameEngine()
  const [opponentValue, setOpponentValue] = useState<string | number | ''>('')
  const [condition, setCondition] = useState<Operand | null>(null)

  const pending = state?.pendingMajorChoice
  const responderId = state?.majorChoiceQueue?.[0]
  const responder = state?.players.find((p) => p.id === responderId)
  const caster = state?.players.find((p) => p.id === pending?.casterId)
  const spec = pending ? getForcedOperandSpec(pending.majorId) : undefined
  const isDevil = pending?.majorId === 'DEVIL'
  const condIndex = isDevil ? (pending.devilConditionIndex ?? 0) : 0

  const casterValue = pending?.casterParams.casterValue
  const logicCardId = pending?.casterParams.logicCardId

  // Forced-operand preview (Hanged Man, Justice, Moon, Sun, Lovers)
  const forcedPreviewTargets = useMemo(() => {
    if (isDevil || !state || !spec || !logicCardId || casterValue == null || opponentValue === '') return new Set<string>()
    const operandA: Operand = { kind: spec.casterCategory, value: casterValue as Operand['value'] }
    const operandB: Operand = { kind: spec.opponentCategory, value: opponentValue as Operand['value'] }
    const affected = getAffectedStructures(state, { logicCardId: logicCardId as Parameters<typeof getAffectedStructures>[1]['logicCardId'], operandA, operandB })
    return new Set(affected.map((s) => s.id))
  }, [state, spec, logicCardId, casterValue, opponentValue, isDevil])

  // Devil preview: when picking condition 2, show structures matching cond1 + current pick
  const cond1 = isDevil ? (pending!.opponentParams.condition1 as Operand | undefined) : undefined
  const logicCard = isDevil && caster && logicCardId ? caster.logicHand.find((c) => c.instanceId === logicCardId) : null

  const devilPreviewTargets = useMemo(() => {
    if (!isDevil || !state || !logicCard || !cond1 || !condition || condIndex < 1) return new Set<string>()
    const affected = getAffectedStructures(state, {
      logicCardId: logicCard.kind as LogicCardId,
      operandA: cond1,
      operandB: condition,
    })
    return new Set(affected.map((s) => s.id))
  }, [isDevil, state, logicCard, cond1, condition, condIndex])

  const previewTargets = isDevil ? devilPreviewTargets : forcedPreviewTargets

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  const submitChoice = (choice: Record<string, unknown>) => {
    if (!responderId) return
    dispatch({ type: 'SUBMIT_OPPONENT_CHOICE', playerId: responderId, choice })
    setOpponentValue('')
    setCondition(null)
  }

  if (!state || state.phase !== 'awaitingMajorChoice' || !pending || !state.majorChoiceQueue?.length) {
    return null
  }
  if (!responder || !caster) return null

  const label = describeMajorArcana(pending.majorId)
  const description = MAJOR_ARCANA_DESCRIPTIONS[pending.majorId]

  if (isDevil) {
    const usedKinds = new Set<string>()
    if (condIndex >= 1 && cond1) {
      usedKinds.add(cond1.kind)
    }

    const devilStructures = condIndex >= 1 && cond1 && condition
      ? getAffectedStructures(state, { logicCardId: logicCard!.kind as LogicCardId, operandA: cond1, operandB: condition })
      : []

    return (
      <div className="action-panel opponent-choice-panel">
        <div className="opponent-choice-header">
          <span className="opponent-choice-card">{label}</span>
          <span className="opponent-choice-desc">{description}</span>
        </div>
        {condIndex >= 1 && cond1 && (
          <div className="opponent-choice-prompt" style={{ opacity: 0.7, fontSize: '13px' }}>
            Condition 1: {operandKindLabel(cond1.kind as any)} {String(cond1.value)}
          </div>
        )}
        <div className="opponent-choice-prompt">
          <strong>{responder.name}</strong>, name condition {condIndex + 1} of 2:
        </div>
        <ConditionPicker
          operand={condition}
          onChange={setCondition}
          excludedKinds={usedKinds}
        />
        {devilStructures.length > 0 && (
          <div className="spell-impact-summary" style={{ marginTop: 8 }}>
            <div className="summary-title">Will destroy {devilStructures.length} structure{devilStructures.length !== 1 ? 's' : ''}</div>
            <div className="summary-rows">
              {devilStructures.map((s) => {
                const hex = state.board.find((h) => h.id === s.hexId)
                const terrain = (hex?.terrain ?? 'Prairies') as TerrainType
                const terrainImg = terrainArtUrl(terrain)
                const structImg = structureArtUrl({ type: s.type, level: s.level })
                return (
                  <div key={s.id} className="summary-change-row">
                    <div className="summary-assets">
                      <img className="summary-asset-terrain" src={terrainImg} alt={terrain} title={terrain} />
                      {structImg ? (
                        <img className="summary-asset-structure" src={structImg} alt={s.type} title={`${s.type} (Level ${s.level})`} />
                      ) : (
                        <span className="summary-asset-fallback">{s.type[0]}</span>
                      )}
                    </div>
                    <span className="summary-delta delta-negative">destroyed (-{s.level})</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
          responderId={responderId!}
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
          responderId={responderId!}
          onConfirm={(playerAdjustments) => submitChoice({ playerAdjustments })}
        />
        {lastError && <p className="action-error">{lastError}</p>}
      </div>
    )
  }

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

  // Show conditions chosen so far for Devil
  const isDevil = pending.majorId === 'DEVIL'
  const cond1 = isDevil ? (pending.opponentParams.condition1 as Operand | undefined) : undefined
  const cond2 = isDevil ? (pending.opponentParams.condition2 as Operand | undefined) : undefined

  // For forced-operand cards, show the caster's choice and opponent's choice so far
  const forcedSpec = getForcedOperandSpec(pending.majorId)
  const casterValue = pending.casterParams.casterValue
  const opponentValue = (pending.opponentParams as { opponentValue?: unknown }).opponentValue

  // For Devil, show the caster's chosen logic card
  const devilLogicCardId = isDevil ? (pending.casterParams.logicCardId as string | undefined) : undefined
  const devilLogicCard = isDevil && caster && devilLogicCardId ? caster.logicHand.find((c) => c.instanceId === devilLogicCardId) : null

  const cancel = () => dispatch({ type: 'CANCEL_MAJOR_CHOICE', playerId: pending.casterId })

  return (
    <div className="action-panel major-choice-waiting">
      <div className="opponent-choice-header">
        <span className="opponent-choice-card">{label}</span>
      </div>
      {isDevil && cond1 && (
        <div className="opponent-choice-prompt">
          Condition 1: <strong>{operandKindLabel(cond1.kind as any)} {String(cond1.value)}</strong>
        </div>
      )}
      {isDevil && cond1 && !cond2 && (
        <div className="waiting-message">
          Opponent is choosing condition 2...
        </div>
      )}
      {isDevil && !cond1 && (
        <div className="waiting-message">
          Opponent is choosing condition 1...
        </div>
      )}
      {isDevil && cond2 && (
        <div className="opponent-choice-prompt">
          Condition 2: <strong>{operandKindLabel(cond2.kind as any)} {String(cond2.value)}</strong>
        </div>
      )}
      {isDevil && devilLogicCard && (
        <div className="opponent-choice-prompt" style={{ opacity: 0.7, fontSize: '13px' }}>
          Your logic card: <strong>{LOGIC_CARD_LABELS[devilLogicCard.kind]}</strong>
        </div>
      )}
      {forcedSpec && casterValue != null && (
        <div className="opponent-choice-prompt">
          Your choice: <strong>{operandKindLabel(forcedSpec.casterCategory)} {String(casterValue)}</strong>
        </div>
      )}
      {forcedSpec && opponentValue != null && (
        <div className="opponent-choice-prompt">
          Opponent chose: <strong>{operandKindLabel(forcedSpec.opponentCategory)} {String(opponentValue)}</strong>
        </div>
      )}
      {forcedSpec && opponentValue == null && (
        <div className="waiting-message">
          Opponent is choosing the {operandKindLabel(forcedSpec.opponentCategory)}...
        </div>
      )}
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
