import { useState, useMemo, useEffect, useCallback } from 'react'
import { getAffectedStructures } from '../../../../engine/selectors'
import { describeMajorArcana } from '../../../operandLabels'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../../majorArcanaDescriptions'
import { terrainArtUrl } from '../../../terrainArt'
import { structureArtUrl } from '../../../structureArt'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { operandKindLabel } from './OperandPicker'
import type { Operand } from '../../../../engine/types/tarot'
import type { TerrainType } from '../../../../engine/types/terrain'

function ConditionDropdown({ operand }: { operand: Operand }) {
  return (
    <span className="redistribute-row" style={{ opacity: 0.7 }}>
      <select disabled value={operand.kind}>
        <option>{operandKindLabel(operand.kind as any)}</option>
      </select>
      <select disabled value={String(operand.value)}>
        <option>{String(operand.value)}</option>
      </select>
    </span>
  )
}

export function DevilLogicPickerForm({
  onPreviewTargetsChange,
}: {
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state, dispatch, lastError } = useGameEngine()
  const pending = state?.pendingMajorChoice
  const [logicId, setLogicId] = useState<string | null>(null)

  const caster = state?.players.find((p) => p.id === pending?.casterId)

  const cond1 = pending?.opponentParams.condition1 as Operand | undefined
  const cond2 = pending?.opponentParams.condition2 as Operand | undefined

  const logicCard = logicId && caster ? caster.logicHand.find((c) => c.instanceId === logicId) : null

  const previewTargets = useMemo(() => {
    if (!state || !logicCard || !cond1 || !cond2) return new Set<string>()
    const affected = getAffectedStructures(state, {
      logicCardId: logicCard.kind,
      operandA: cond1,
      operandB: cond2,
    })
    return new Set(affected.map((s) => s.id))
  }, [state, logicCard, cond1, cond2])

  const previewStructures = useMemo(() => {
    if (!state || !logicCard || !cond1 || !cond2) return []
    return getAffectedStructures(state, {
      logicCardId: logicCard.kind,
      operandA: cond1,
      operandB: cond2,
    })
  }, [state, logicCard, cond1, cond2])

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  const submitLogicCard = useCallback(() => {
    if (!logicId || !pending) return
    dispatch({
      type: 'SUBMIT_OPPONENT_CHOICE',
      playerId: pending.casterId,
      choice: { logicCardId: logicId },
    })
  }, [logicId, pending, dispatch])

  if (!state || !pending || !caster || !cond1 || !cond2) return null

  const label = describeMajorArcana(pending.majorId)
  const description = MAJOR_ARCANA_DESCRIPTIONS[pending.majorId]

  return (
    <div className="action-panel opponent-choice-panel">
      <div className="opponent-choice-header">
        <span className="opponent-choice-card">{label}</span>
        <span className="opponent-choice-desc">{description}</span>
      </div>
      <div className="opponent-choice-prompt">
        <strong>{caster.name}</strong>, your opponent chose:
      </div>
      <div className="opponent-choice-prompt" style={{ paddingLeft: 16 }}>
        Condition 1: <ConditionDropdown operand={cond1} />
      </div>
      <div className="opponent-choice-prompt" style={{ paddingLeft: 16 }}>
        Condition 2: <ConditionDropdown operand={cond2} />
      </div>
      <div className="opponent-choice-prompt" style={{ marginTop: 8 }}>
        Pick a Logic card. All structures matching both conditions and the logic card will be destroyed.
      </div>
      <LogicCardHand cards={caster.logicHand} selectedId={logicId} onSelect={setLogicId} />
      {logicId && previewStructures.length > 0 && (
        <div className="spell-impact-summary" style={{ marginTop: 8 }}>
          <div className="summary-title">Will destroy {previewStructures.length} structure{previewStructures.length !== 1 ? 's' : ''}</div>
          <div className="summary-rows">
            {previewStructures.map((s) => {
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
      {logicId && previewStructures.length === 0 && (
        <div className="spell-impact-summary" style={{ marginTop: 8 }}>
          <div className="summary-title">No structures match</div>
          <p className="summary-empty-text">This logic card + these conditions will not destroy any structures.</p>
        </div>
      )}
      <div className="action-buttons">
        <button
          className="action-button"
          disabled={!logicId}
          style={!logicId ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          onClick={submitLogicCard}
        >
          Cast The Devil
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
