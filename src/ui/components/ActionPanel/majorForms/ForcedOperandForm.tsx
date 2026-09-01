import { useState, useEffect, useMemo } from 'react'
import { getForcedOperandSpec } from '../../../../engine/majorArcana/forcedOperand'
import type { MajorArcanaCard } from '../../../../engine/types/tarot'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { OperandPicker, operandKindLabel } from './OperandPicker'

export function ForcedOperandForm({
  tarot,
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  tarot: MajorArcanaCard
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const [casterValue, setCasterValue] = useState<string | number | ''>('')
  const [logicId, setLogicId] = useState<string | null>(null)
  const [effectId, setEffectId] = useState<string | null>(null)

  const spec = getForcedOperandSpec(tarot.id)
  if (!state || !spec) return null

  const player = state.players[state.activePlayerIndex]

  const canConfirm = casterValue !== '' && logicId && effectId

  const previewTargets = useMemo(() => {
    if (!state || !spec || !logicId || casterValue === '') return new Set<string>()
    const structuresMatchingA = state.structures.filter((s) => {
      const hex = state.board.find((h) => h.id === s.hexId)
      if (!hex) return false
      if (spec.casterCategory === 'terrain') return hex.terrain === casterValue
      if (spec.casterCategory === 'structureType') return s.type === casterValue
      if (spec.casterCategory === 'level') return s.level === casterValue
      return false
    })
    return new Set(structuresMatchingA.map((s) => s.id))
  }, [state, spec, logicId, casterValue])

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  return (
    <div className="major-arcana-form">
      <div className="redistribute-row">
        <span>You name the {operandKindLabel(spec.casterCategory)}:</span>
        <OperandPicker kind={spec.casterCategory} value={casterValue} onChange={setCasterValue} />
      </div>
      <div className="redistribute-row major-arcana-opponent-waiting">
        <span className="opponent-waiting-label">
          Opponent will choose the {operandKindLabel(spec.opponentCategory)} next.
        </span>
      </div>
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      <EffectCardHand cards={player.effectHand} selectedId={effectId} onSelect={setEffectId} />
      <div className="action-buttons">
        <button
          className="action-button"
          disabled={!canConfirm}
          onClick={() => onConfirm({ casterValue, logicCardId: logicId, effectCardId: effectId })}
        >
          Confirm
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
