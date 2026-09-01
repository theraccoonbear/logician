import { useState, useEffect, useMemo, useCallback } from 'react'
import { getForcedOperandSpec, designatedOpponentId } from '../../../../engine/majorArcana/forcedOperand'
import { applyAction } from '../../../../engine/reducer'
import { createAI } from '../../../../engine/ai'
import { getAffectedStructures } from '../../../../engine/selectors'
import type { MajorArcanaCard } from '../../../../engine/types/tarot'
import type { Operand } from '../../../../engine/types/tarot'
import type { GameState } from '../../../../engine/types/state'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { OperandPicker, operandKindLabel } from './OperandPicker'

function predictAIOpponentChoice(
  state: GameState,
  casterId: string,
  majorTarot: MajorArcanaCard,
  casterValue: unknown,
  logicCardId: string,
  effectCardId: string,
): Record<string, unknown> | null {
  const spec = getForcedOperandSpec(majorTarot.id)
  if (!spec) return null
  const opponentId = designatedOpponentId(state, casterId, spec.opponentDirection)
  const opponent = state.players.find((p) => p.id === opponentId)
  if (!opponent?.isAI) return null

  const playResult = applyAction(state, {
    type: 'PLAY_MAJOR_ARCANA',
    playerId: casterId,
    tarotId: majorTarot.instanceId,
    params: { casterValue, logicCardId, effectCardId },
  })
  if (!playResult.ok) return null

  const ai = createAI(opponent.aiDifficulty ?? 'heuristic')
  const choiceAction = ai.chooseOpponentChoice(playResult.state, opponentId)
  if (choiceAction.type !== 'SUBMIT_OPPONENT_CHOICE') return null
  return choiceAction.choice as Record<string, unknown>
}

function computePreview(
  state: GameState,
  spec: { casterCategory: string; opponentCategory: string },
  casterValue: unknown,
  opponentValue: unknown,
  logicCardId: string,
) {
  if (casterValue == null || casterValue === '' || opponentValue == null || opponentValue === '') {
    return new Set<string>()
  }
  const operandA: Operand = { kind: spec.casterCategory as Operand['kind'], value: casterValue as Operand['value'] }
  const operandB: Operand = { kind: spec.opponentCategory as Operand['kind'], value: opponentValue as Operand['value'] }
  const affected = getAffectedStructures(state, { logicCardId: logicCardId as Parameters<typeof getAffectedStructures>[1]['logicCardId'], operandA, operandB })
  return new Set(affected.map((s) => s.id))
}

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
  const { state, dispatch } = useGameEngine()
  const [casterValue, setCasterValue] = useState<string | number | ''>('')
  const [logicId, setLogicId] = useState<string | null>(null)
  const [effectId, setEffectId] = useState<string | null>(null)

  const spec = getForcedOperandSpec(tarot.id)
  const player = state?.players[state.activePlayerIndex]
  const opponentId = state && spec && player ? designatedOpponentId(state, player.id, spec.opponentDirection) : null
  const opponent = state && opponentId ? state.players.find((p) => p.id === opponentId) : null
  const opponentIsAI = Boolean(opponent?.isAI)
  const canConfirm = casterValue !== '' && logicId && effectId

  const aiChoice = useMemo(() => {
    if (!canConfirm || !opponentIsAI || !state || !player || !spec) return null
    return predictAIOpponentChoice(state, player.id, tarot, casterValue, logicId, effectId)
  }, [canConfirm, opponentIsAI, state, player, tarot, casterValue, logicId, effectId, spec])

  const previewTargets = useMemo(() => {
    if (!state || !spec || casterValue === '' || !player) return new Set<string>()

    if (opponentIsAI && aiChoice && logicId) {
      const logicCard = player.logicHand.find((c) => c.instanceId === logicId)
      if (!logicCard) return new Set<string>()
      return computePreview(state, { casterCategory: spec.casterCategory, opponentCategory: spec.opponentCategory }, casterValue, aiChoice.opponentValue, logicCard.kind)
    }

    return new Set(
      state.structures.filter((s) => {
        const hex = state.board.find((h) => h.id === s.hexId)
        if (!hex) return false
        if (spec.casterCategory === 'terrain') return hex.terrain === casterValue
        if (spec.casterCategory === 'structureType') return s.type === casterValue
        if (spec.casterCategory === 'level') return s.level === casterValue
        return false
      }).map((s) => s.id),
    )
  }, [state, spec, logicId, casterValue, opponentIsAI, aiChoice, player])

  useEffect(() => {
    onPreviewTargetsChange?.(previewTargets)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewTargets, onPreviewTargetsChange])

  const handleConfirm = useCallback(() => {
    if (!canConfirm || !player || !opponentId) return
    dispatch({
      type: 'PLAY_MAJOR_ARCANA',
      playerId: player.id,
      tarotId: tarot.instanceId,
      params: { casterValue, logicCardId: logicId, effectCardId: effectId },
    })
    if (opponentIsAI && aiChoice) {
      dispatch({
        type: 'SUBMIT_OPPONENT_CHOICE',
        playerId: opponentId,
        choice: aiChoice,
      })
    }
    onConfirm({ casterValue, logicCardId: logicId, effectCardId: effectId })
  }, [canConfirm, player, opponentId, dispatch, tarot.instanceId, casterValue, logicId, effectId, opponentIsAI, aiChoice, onConfirm])

  if (!state || !spec || !player) return null

  return (
    <div className="major-arcana-form">
      <div className="redistribute-row">
        <span>You name the {operandKindLabel(spec.casterCategory)}:</span>
        <OperandPicker kind={spec.casterCategory} value={casterValue} onChange={setCasterValue} />
      </div>
      <div className="redistribute-row major-arcana-opponent-waiting">
        <span className="opponent-waiting-label">
          {opponentIsAI && aiChoice
            ? `${opponent!.name} will choose ${operandKindLabel(spec.opponentCategory)}: ${String(aiChoice.opponentValue)}.`
            : opponentIsAI
              ? `${opponent!.name} will choose the ${operandKindLabel(spec.opponentCategory)}.`
              : `Opponent will choose the ${operandKindLabel(spec.opponentCategory)} next.`}
        </span>
      </div>
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      <EffectCardHand cards={player.effectHand} selectedId={effectId} onSelect={setEffectId} />
      <div className="action-buttons">
        <button
          className="action-button"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Cast
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
