import { useState, useEffect, useMemo, useCallback } from 'react'
import { getForcedOperandSpec, designatedOpponentId } from '../../../../engine/majorArcana/forcedOperand'
import { applyAction } from '../../../../engine/reducer'
import { createAI } from '../../../../engine/ai'
import { terrainArtUrl } from '../../../terrainArt'
import { structureArtUrl } from '../../../structureArt'
import type { MajorArcanaCard } from '../../../../engine/types/tarot'
import type { OperandKind } from '../../../../engine/types/tarot'
import type { GameState } from '../../../../engine/types/state'
import type { Structure } from '../../../../engine/types/structure'
import type { TerrainType } from '../../../../engine/types/terrain'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { EffectCardHand } from '../../Hand/EffectCardHand'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { OperandPicker, operandKindLabel } from './OperandPicker'

function predictAIOpponentChoice(
  state: GameState,
  casterId: string,
  majorTarot: MajorArcanaCard,
  casterValue: unknown,
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
    params: { casterValue },
  })
  if (!playResult.ok) return null

  const ai = createAI(opponent.aiDifficulty ?? 'heuristic')
  const choiceAction = ai.chooseOpponentChoice(playResult.state, opponentId)
  if (choiceAction.type !== 'SUBMIT_OPPONENT_CHOICE') return null
  return choiceAction.choice as Record<string, unknown>
}

function simulateFullSpell(
  state: GameState,
  casterId: string,
  majorTarot: MajorArcanaCard,
  casterValue: unknown,
  logicCardId: string,
  effectCardId: string,
  opponentChoice: Record<string, unknown>,
) {
  const playResult = applyAction(state, {
    type: 'PLAY_MAJOR_ARCANA',
    playerId: casterId,
    tarotId: majorTarot.instanceId,
    params: { casterValue, logicCardId, effectCardId },
  })
  if (!playResult.ok) return null

  const submitResult = applyAction(playResult.state, {
    type: 'SUBMIT_OPPONENT_CHOICE',
    playerId: playResult.state.players[playResult.state.activePlayerIndex].id,
    choice: opponentChoice,
  })
  if (!submitResult.ok) return null

  return submitResult.state
}

interface StructureChange {
  structure: Structure
  terrain: TerrainType
  isDestroyed: boolean
  oldLevel: number
  newLevel: number
  delta: number
}

function diffStructures(before: GameState, after: GameState, playerId: string): { playerChanges: StructureChange[]; opponentChanges: StructureChange[] } {
  const currentMap = new Map(before.structures.map((s) => [s.id, s]))
  const nextMap = new Map(after.structures.map((s) => [s.id, s]))

  const playerChanges: StructureChange[] = []
  const opponentChanges: StructureChange[] = []

  for (const [id, current] of currentMap.entries()) {
    const next = nextMap.get(id)
    const hex = before.board.find((h) => h.id === current.hexId)
    const terrain = (hex?.terrain ?? 'Prairies') as TerrainType

    if (!next) {
      const change: StructureChange = {
        structure: current, terrain, isDestroyed: true,
        oldLevel: current.level, newLevel: 0, delta: -current.level,
      }
      if (current.owner === playerId) playerChanges.push(change)
      else opponentChanges.push(change)
    } else if (next.level !== current.level) {
      const change: StructureChange = {
        structure: current, terrain, isDestroyed: false,
        oldLevel: current.level, newLevel: next.level, delta: next.level - current.level,
      }
      if (current.owner === playerId) playerChanges.push(change)
      else opponentChanges.push(change)
    }
  }

  return { playerChanges, opponentChanges }
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

  const logicCard = logicId ? player?.logicHand.find((c) => c.instanceId === logicId) : null
  const effectCard = effectId ? player?.effectHand.find((c) => c.instanceId === effectId) : null

  const aiChoice = useMemo(() => {
    if (!opponentIsAI || !state || !player || !spec || casterValue === '') return null
    return predictAIOpponentChoice(state, player.id, tarot, casterValue)
  }, [opponentIsAI, state, player, spec, tarot, casterValue])

  const previewHighlights = useMemo(() => {
    if (!state || !player || !logicCard || !effectCard || !aiChoice || casterValue === '' || !spec) return new Set<string>()
    const nextState = simulateFullSpell(state, player.id, tarot, casterValue, logicCard.instanceId, effectCard.instanceId, aiChoice)
    if (!nextState) return new Set<string>()
    const { playerChanges, opponentChanges } = diffStructures(state, nextState, player.id)
    const changed = new Set<string>()
    for (const c of [...playerChanges, ...opponentChanges]) changed.add(c.structure.id)
    return changed
  }, [state, player, logicCard, effectCard, aiChoice, casterValue, spec, tarot])

  const previewNode = useMemo(() => {
    if (!state || !player || !logicCard || !effectCard || !aiChoice || casterValue === '' || !spec) return null
    const nextState = simulateFullSpell(state, player.id, tarot, casterValue, logicCard.instanceId, effectCard.instanceId, aiChoice)
    if (!nextState) return null

    const { playerChanges, opponentChanges } = diffStructures(state, nextState, player.id)
    const casterNet = playerChanges.reduce((sum, c) => sum + c.delta, 0)
    const opponentNet = opponentChanges.reduce((sum, c) => sum + c.delta, 0)
    const hasChanges = playerChanges.length > 0 || opponentChanges.length > 0

    const renderChangeRow = (c: StructureChange) => {
      const terrainImg = terrainArtUrl(c.terrain)
      const structImg = structureArtUrl({ type: c.structure.type, level: c.oldLevel })
      const deltaText = c.isDestroyed ? `destroyed (-${c.oldLevel})` : `${c.delta > 0 ? '+' : ''}${c.delta}`
      const deltaClass = c.delta > 0 ? 'delta-positive' : 'delta-negative'

      return (
        <div key={c.structure.id} className="summary-change-row">
          <div className="summary-assets">
            <img className="summary-asset-terrain" src={terrainImg} alt={c.terrain} title={c.terrain} />
            {structImg ? (
              <img className="summary-asset-structure" src={structImg} alt={c.structure.type} title={`${c.structure.type} (Level ${c.oldLevel})`} />
            ) : (
              <span className="summary-asset-fallback">{c.structure.type[0]}</span>
            )}
          </div>
          <span className={`summary-delta ${deltaClass}`}>{deltaText}</span>
        </div>
      )
    }

    return (
      <div className="spell-impact-summary">
        <div className="summary-title">Point Impact Summary</div>
        {hasChanges ? (
          <>
            <div className="summary-comparison-table">
              <div className="summary-column">
                <div className="summary-column-header">You</div>
                <div className="summary-rows">
                  {playerChanges.length > 0 ? (
                    playerChanges.map(renderChangeRow)
                  ) : (
                    <p className="summary-no-changes">No changes</p>
                  )}
                </div>
                <div className="summary-column-footer">
                  Net: <span className={casterNet >= 0 ? 'delta-positive' : 'delta-negative'}>{casterNet >= 0 ? '+' : ''}{casterNet}</span>
                </div>
              </div>
              <div className="summary-divider" />
              <div className="summary-column">
                <div className="summary-column-header">Other Players</div>
                <div className="summary-rows">
                  {opponentChanges.length > 0 ? (
                    opponentChanges.map(renderChangeRow)
                  ) : (
                    <p className="summary-no-changes">No changes</p>
                  )}
                </div>
                <div className="summary-column-footer">
                  Net: <span className={opponentNet >= 0 ? 'delta-positive' : 'delta-negative'}>{opponentNet >= 0 ? '+' : ''}{opponentNet}</span>
                </div>
              </div>
            </div>
            <div className="summary-comparison-outcome">
              Net Result Comparison: <span className={casterNet - opponentNet >= 0 ? 'delta-positive' : 'delta-negative'}>{casterNet - opponentNet >= 0 ? '+' : ''}{casterNet - opponentNet}</span> relative to others
            </div>
          </>
        ) : (
          <p className="summary-empty-text">This spell will not alter any structures on the board.</p>
        )}
      </div>
    )
  }, [state, player, logicCard, effectCard, aiChoice, casterValue, spec, tarot])

  useEffect(() => {
    onPreviewTargetsChange?.(previewHighlights)
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [previewHighlights, onPreviewTargetsChange])

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

      {opponentIsAI && aiChoice?.opponentValue != null && (
        <div className="redistribute-row major-arcana-opponent-waiting">
          <span className="opponent-waiting-label">
            {opponent!.name} names {operandKindLabel(spec.opponentCategory as OperandKind)} {String(aiChoice.opponentValue)}.
          </span>
        </div>
      )}

      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      <EffectCardHand cards={player.effectHand} selectedId={effectId} onSelect={setEffectId} />

      {previewNode}

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
