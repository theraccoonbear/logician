import type { GameState } from '../../../engine/types/state'
import type { Structure } from '../../../engine/types/structure'
import type { StructureDelta } from '../../GameProvider'
import { useOrientation } from '../../hooks/useOrientation'
import { getPlayerColor } from '../../playerColors'
import { HexTile } from './HexTile'

// UI-only layout: maps each hex id to a column (0=left, 1=right) and row, approximating
// fig. 1's flower silhouette — Mountains solid down the left, Forests solid down the right,
// Prairies capping the top, Swamps capping the bottom. Purely cosmetic; no rule depends on it.
// Flat-top hexes, tessellating in columns (see .board-column in App.css).
const PORTRAIT_POSITIONS: Record<string, { row: number; col: 0 | 1 }> = {
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

// The same board, rotated 90°: every hex keeps the same same-terrain neighbors (the 3
// Mountains stay a contiguous run, etc.), just read as a 2-row x 5-col strip instead of a
// 2-col x 5-row tower. Pointy-top hexes, tessellating in rows (see .board-row in App.css) —
// rotating the layout also rotates which hex orientation actually tessellates without gaps.
const LANDSCAPE_POSITIONS: Record<string, { row: 0 | 1; col: number }> = {
  'hex-9': { row: 0, col: 0 },
  'hex-5': { row: 0, col: 1 },
  'hex-4': { row: 0, col: 2 },
  'hex-3': { row: 0, col: 3 },
  'hex-1': { row: 0, col: 4 },
  'hex-10': { row: 1, col: 0 },
  'hex-8': { row: 1, col: 1 },
  'hex-7': { row: 1, col: 2 },
  'hex-6': { row: 1, col: 3 },
  'hex-2': { row: 1, col: 4 },
}

export function Board({
  state,
  highlightedIds,
  selectedHexId,
  onHexClick,
  selectedStructureIds,
  onStructureClick,
  structureDeltas,
}: {
  state: GameState
  highlightedIds: Set<string>
  selectedHexId: string | null
  onHexClick?: (hexId: string) => void
  selectedStructureIds?: Set<string>
  onStructureClick?: (structure: Structure) => void
  structureDeltas?: StructureDelta[]
}) {
  const orientation = useOrientation()

  const colorOf = (ownerId: string) => {
    const index = state.players.findIndex((p) => p.id === ownerId)
    return getPlayerColor(index)
  }

  const renderHex = (hex: (typeof state.board)[number]) => (
    <HexTile
      key={hex.id}
      hex={hex}
      structures={state.structures.filter((s) => s.hexId === hex.id)}
      colorOf={colorOf}
      highlightedIds={highlightedIds}
      selectedStructureIds={selectedStructureIds}
      structureDeltas={structureDeltas?.filter((d) => d.hexId === hex.id)}
      selected={selectedHexId === hex.id}
      onClick={() => onHexClick?.(hex.id)}
      onStructureClick={onStructureClick}
    />
  )

  if (orientation === 'landscape') {
    const rows: Array<typeof state.board> = [[], []]
    for (const hex of state.board) rows[LANDSCAPE_POSITIONS[hex.id].row].push(hex)
    for (const row of rows) row.sort((a, b) => LANDSCAPE_POSITIONS[a.id].col - LANDSCAPE_POSITIONS[b.id].col)

    return (
      <div className="board board-landscape">
        {rows.map((row, rowIndex) => (
          <div className={`board-row ${rowIndex === 1 ? 'board-row-offset' : ''}`} key={rowIndex}>
            {row.map(renderHex)}
          </div>
        ))}
      </div>
    )
  }

  const columns: Array<typeof state.board> = [[], []]
  for (const hex of state.board) columns[PORTRAIT_POSITIONS[hex.id].col].push(hex)
  for (const col of columns) col.sort((a, b) => PORTRAIT_POSITIONS[a.id].row - PORTRAIT_POSITIONS[b.id].row)

  return (
    <div className="board board-portrait">
      {columns.map((col, colIndex) => (
        <div className={`board-column ${colIndex === 1 ? 'board-column-offset' : ''}`} key={colIndex}>
          {col.map(renderHex)}
        </div>
      ))}
    </div>
  )
}
