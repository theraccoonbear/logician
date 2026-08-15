import type { Hex } from '../../../engine/board'
import type { Structure, StructureType } from '../../../engine/types/structure'
import { fortressArtUrls } from '../../fortressArt'
import { terrainArtUrl } from '../../terrainArt'
import { StructureToken } from './StructureToken'

// Fixed left-to-right spot per structure type, rather than grouping by owner —
// so a Pool is always in the same place on every hex regardless of whose it is
// or what else is built there. Each spot can stack more than one token when
// multiple players have that type on the same hex. Tower sits in the middle
// (not the end) and renders taller, pulled up behind the row — see
// .hex-type-slot-tower in App.css — so it reads as the tallest piece on the
// hex rather than just another same-size icon in a line.
const TYPE_SLOTS: readonly StructureType[] = ['Pool', 'Tower', 'Pyramid', 'Fortress']

export function HexTile({
  hex,
  structures,
  colorOf,
  highlightedIds,
  selectedStructureIds,
  selected,
  onClick,
  onStructureClick,
}: {
  hex: Hex
  structures: Structure[]
  colorOf: (ownerId: string) => string
  highlightedIds: Set<string>
  selectedStructureIds?: Set<string>
  selected: boolean
  onClick?: () => void
  onStructureClick?: (structure: Structure) => void
}) {
  const owners = Array.from(new Set(structures.map((s) => s.owner)))

  return (
    // The selection ring below has to render OUTSIDE .hex-tile, not inside it: clip-path on
    // .hex-tile clips its entire subtree's paint to the hex silhouette, so no descendant —
    // pseudo-element, filter:drop-shadow, anything — can ever visually extend past that same
    // boundary, no matter how it's positioned or sized. This wrapper is the true (unclipped)
    // sibling context the ring needs; see .hex-tile-ring in App.css.
    <div className={`hex-slot ${selected ? 'is-selected' : ''}`}>
      {selected && <div className="hex-tile-ring" />}
      <div
        className={`hex-tile ${onClick ? 'is-clickable' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
        aria-label={`${hex.id}, ${hex.terrain}, ${structures.length} structure(s)`}
      >
        <img className="hex-terrain-art" src={terrainArtUrl(hex.terrain)} alt={hex.terrain} />
      </div>
      {/* A sibling of .hex-tile, not a descendant, same reason .hex-tile-ring is: clip-path on
          .hex-tile clips its entire subtree to the hex silhouette, so structure/fortress art
          can never spill past the hex edge for a 3D pop-out look while it's nested inside.
          pointer-events: none here, re-enabled on .structure-token specifically (App.css), so
          clicks in the empty space around the art still fall through to .hex-tile's own
          onClick (hex selection) instead of this layer silently swallowing them. */}
      <div className={`hex-structures ${owners.length > 1 ? 'is-crowded' : ''}`}>
        {owners.map((owner) => {
            const ownerStructures = structures.filter((s) => s.owner === owner)
            // Fortress art is a two-layer ring wrapping the owner's other structures, not a
            // token of its own — the Fortress structure still renders its (existing, clickable)
            // token below like any other type, so it stays a valid target for anything that
            // needs to select a structure (Wheel of Fortune, major arcana forms, ...). The ring
            // is purely decorative on top of that: both layers share one source canvas per
            // level and must render at an identical box/position to overlay correctly (see
            // .fortress-back/.fortress-fore in App.css) — pointer-events: none on both so they
            // never intercept clicks meant for the structures they're wrapped around.
            const fortress = ownerStructures.find((s) => s.type === 'Fortress')
            const fortressArt = fortress ? fortressArtUrls(fortress.level) : undefined
            return (
              <div className="hex-owner-band" key={owner}>
                {fortressArt && <img className="fortress-back" src={fortressArt.back} alt="" />}
                {TYPE_SLOTS.filter((type) => ownerStructures.some((s) => s.type === type)).map((type) => (
                  <div className={`hex-type-slot hex-type-slot-${type.toLowerCase()}`} key={type}>
                    {ownerStructures
                      .filter((s) => s.type === type)
                      .map((s) => (
                        <StructureToken
                          key={s.id}
                          structure={s}
                          color={colorOf(s.owner)}
                          highlighted={highlightedIds.has(s.id) || Boolean(selectedStructureIds?.has(s.id))}
                          crowded={owners.length > 1}
                          onClick={
                            onStructureClick
                              ? (e) => {
                                  e.stopPropagation()
                                  onStructureClick(s)
                                }
                              : undefined
                          }
                        />
                      ))}
                  </div>
                ))}
                {fortressArt && <img className="fortress-fore" src={fortressArt.fore} alt="" />}
              </div>
            )
        })}
      </div>
    </div>
  )
}
