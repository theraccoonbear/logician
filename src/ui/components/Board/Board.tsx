import type { GameState } from '../../../engine/types/state'
import type { Structure } from '../../../engine/types/structure'
import { getPlayerColor } from '../../playerColors'
import { HexTile } from './HexTile'

// UI-only layout: maps each hex id to a column (0=left, 1=right) and row, approximating
// fig. 1's flower silhouette — Mountains solid down the left, Forests solid down the right,
// Prairies capping the top, Swamps capping the bottom. Purely cosmetic; no rule depends on it.
const HEX_POSITIONS: Record<string, { row: number; col: 0 | 1 }> = {
  'hex-1': { row: 0, col: 0 },
  'hex-2': { row: 0, col: 1 },
  'hex-3': { row: 1, col: 0 },
  'hex-4': { row: 2, col: 0 },
  'hex-5': { row: 3, col: 0 },
  'hex-6': { row: 1, col: 1 },
  'hex-7': { row: 2, col: 1 },
  'hex-8': { row: 3, col: 1 },
  'hex-9': { row: 4, col: 0 },
  'hex-10': { row: 4, col: 1 },
}

export function Board({
  state,
  highlightedIds,
  selectedHexId,
  onHexClick,
  selectedStructureIds,
  onStructureClick,
}: {
  state: GameState
  highlightedIds: Set<string>
  selectedHexId: string | null
  onHexClick?: (hexId: string) => void
  selectedStructureIds?: Set<string>
  onStructureClick?: (structure: Structure) => void
}) {
  const colorOf = (ownerId: string) => {
    const index = state.players.findIndex((p) => p.id === ownerId)
    return getPlayerColor(index)
  }

  const columns: Array<typeof state.board> = [[], []]
  for (const hex of state.board) {
    const pos = HEX_POSITIONS[hex.id]
    columns[pos.col].push(hex)
  }
  for (const col of columns) {
    col.sort((a, b) => HEX_POSITIONS[a.id].row - HEX_POSITIONS[b.id].row)
  }

  return (
    <div className="board">
      {columns.map((col, colIndex) => (
        <div className={`board-column ${colIndex === 1 ? 'board-column-offset' : ''}`} key={colIndex}>
          {col.map((hex) => (
            <HexTile
              key={hex.id}
              hex={hex}
              structures={state.structures.filter((s) => s.hexId === hex.id)}
              colorOf={colorOf}
              highlightedIds={highlightedIds}
              selectedStructureIds={selectedStructureIds}
              selected={selectedHexId === hex.id}
              onClick={() => onHexClick?.(hex.id)}
              onStructureClick={onStructureClick}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
