import { EffectCardHand } from '../Hand/EffectCardHand'
import { LogicCardHand } from '../Hand/LogicCardHand'
import { useGameEngine } from '../../hooks/useGameEngine'
import { applyAction } from '../../../engine/reducer'
import { terrainArtUrl } from '../../terrainArt'
import { structureArtUrl } from '../../structureArt'
import type { TerrainType } from '../../../engine/types/terrain'
import type { Structure } from '../../../engine/types/structure'

export interface SpellSelection {
  logicId: string | null
  effectId: string | null
  tarotId: string | null
}

export function SpellBuilder({
  selection,
  onChange,
}: {
  selection: SpellSelection
  onChange: (next: SpellSelection) => void
}) {
  const { state, dispatch, lastError } = useGameEngine()
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const canCast = Boolean(selection.logicId && selection.effectId && selection.tarotId)

  const cast = () => {
    if (!canCast) return
    dispatch({
      type: 'CAST_SPELL',
      playerId: player.id,
      logicCardId: selection.logicId!,
      effectCardId: selection.effectId!,
      tarotId: selection.tarotId!,
    })
    onChange({ logicId: null, effectId: null, tarotId: null })
  }

  // Simulate spell outcome for Point Impact Summary in 'full' assistance mode
  const showSummary = player.assistanceLevel === 'full' && canCast
  let summaryNode = null

  if (showSummary) {
    const simulationResult = applyAction(state, {
      type: 'CAST_SPELL',
      playerId: player.id,
      logicCardId: selection.logicId!,
      effectCardId: selection.effectId!,
      tarotId: selection.tarotId!,
    })

    if (simulationResult.ok) {
      const nextState = simulationResult.state
      const currentStructuresMap = new Map(state.structures.map((s) => [s.id, s]))
      const nextStructuresMap = new Map(nextState.structures.map((s) => [s.id, s]))

      // Identify modified/destroyed structures
      interface StructureChange {
        structure: Structure
        terrain: TerrainType
        isDestroyed: boolean
        oldLevel: number
        newLevel: number
        delta: number
      }

      const playerChanges: StructureChange[] = []
      const opponentChanges: StructureChange[] = []

      // 1. Check current structures for changes or destruction
      for (const [id, current] of currentStructuresMap.entries()) {
        const next = nextStructuresMap.get(id)
        const hex = state.board.find((h) => h.id === current.hexId)
        const terrain = hex ? hex.terrain : 'Prairies'

        if (!next) {
          // Destroyed
          const change: StructureChange = {
            structure: current,
            terrain,
            isDestroyed: true,
            oldLevel: current.level,
            newLevel: 0,
            delta: -current.level,
          }
          if (current.owner === player.id) {
            playerChanges.push(change)
          } else {
            opponentChanges.push(change)
          }
        } else if (next.level !== current.level) {
          // Level changed
          const change: StructureChange = {
            structure: current,
            terrain,
            isDestroyed: false,
            oldLevel: current.level,
            newLevel: next.level,
            delta: next.level - current.level,
          }
          if (current.owner === player.id) {
            playerChanges.push(change)
          } else {
            opponentChanges.push(change)
          }
        }
      }

      // Group changes by owner categories
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

      const casterNet = playerChanges.reduce((sum, c) => sum + c.delta, 0)
      // Map other players
      const opponentNet = opponentChanges.reduce((sum, c) => sum + c.delta, 0)

      const hasChanges = playerChanges.length > 0 || opponentChanges.length > 0

      summaryNode = (
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
    }
  }

  return (
    <div className="cast-pane">
      <div className="card-hands-row">
        <LogicCardHand
          cards={player.logicHand}
          selectedId={selection.logicId}
          onSelect={(id) => onChange({ ...selection, logicId: id })}
        />
        <EffectCardHand
          cards={player.effectHand}
          selectedId={selection.effectId}
          onSelect={(id) => onChange({ ...selection, effectId: id })}
        />
      </div>
      {summaryNode}
      <div className="cast-divider" />
      <div className="action-buttons">
        <button className="action-button" disabled={!canCast} onClick={cast} data-cast-target="true">
          Cast Spell
        </button>
        <button className="action-button secondary" onClick={() => dispatch({ type: 'END_TURN', playerId: player.id })}>
          End Turn Without Casting
        </button>
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
