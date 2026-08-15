import type { TarotCard } from '../../engine/types/tarot'
import { MAJOR_ARCANA_IDS } from '../../engine/types/tarot'
import { LEVEL_BOUNDS, type StructureType } from '../../engine/types/structure'
import { EFFECT_FRAME, LOGIC_FRAME, effectArtStyle, effectCaptionStyle, logicArtStyle, logicCaptionStyle } from '../cardArt'
import { EFFECT_CARD_LABELS, LOGIC_CARD_LABELS } from '../cardLabels'
import { fortressArtUrls } from '../fortressArt'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../majorArcanaDescriptions'
import { describeMajorArcana } from '../operandLabels'
import { structureArtUrl } from '../structureArt'
import { tarotArtUrl } from '../tarotArt'
import { CARD_HEIGHT, CARD_WIDTH, GameCard } from './Hand/GameCard'

// Static, non-interactive examples of the actual in-game structure/card art — same source
// helpers (and the same LEVEL_BOUNDS the engine enforces) that the board and hands use, so
// these can never drift out of sync with real assets or real rules.

function levelRange(type: StructureType): number[] {
  const { floor, max } = LEVEL_BOUNDS[type]
  return Array.from({ length: max - floor + 1 }, (_, i) => floor + i)
}

// Every upgrade stage of a basic structure, floor to max, so a player can see the whole
// progression rather than a single snapshot.
function StructureLevelRow({ type }: { type: 'Pool' | 'Pyramid' | 'Tower' }) {
  return (
    <div className="rules-structure-levels">
      {levelRange(type).map((level) => {
        const url = structureArtUrl({ type, level })
        if (!url) return null
        return (
          <div className={`rules-structure-level${type === 'Tower' ? ' is-tower' : ''}`} key={level}>
            <img src={url} alt={`${type} level ${level}`} />
            <span>Lvl {level}</span>
          </div>
        )
      })}
    </div>
  )
}

function FortressLevelRow() {
  return (
    <div className="rules-structure-levels">
      {levelRange('Fortress').map((level) => {
        const art = fortressArtUrls(level)
        if (!art) return null
        return (
          <div className="rules-structure-level" key={level}>
            <div className="rules-fortress-thumb">
              <img src={art.back} alt="" />
              <img src={art.fore} alt={`Fortress level ${level}`} />
            </div>
            <span>Lvl {level}</span>
          </div>
        )
      })}
    </div>
  )
}

// The in-app "Help" modal's content. This mirrors docs/rules.md, cleaned up for a first-time
// player, with the Major Arcana gallery sourced directly from MAJOR_ARCANA_DESCRIPTIONS so it
// can't drift from what the engine actually does.
export function RulesContent() {
  return (
    <div className="rules-content">
      <p>
        Logician blends logic — in a pure, mathematical, set-theory sense — with the tarot and a bit of random chance.
        You and your opponent(s) build structures on a 10-hex board and cast spells to upgrade your own structures and
        downgrade theirs. First to <strong>40 victory points</strong> — the sum of all your structures&apos; levels —
        wins.
      </p>

      <h3>The Board</h3>
      <p>
        Each hex is one of four terrain types — Prairies, Forests, Mountains, or Swamps — which correspond to the four
        tarot suits: Swords, Wands, Cups, and Pentacles, respectively. Each hex can hold at most one of each structure
        type per player: a Pool, a Pyramid, a Tower, and (once you have all three) a Fortress.
      </p>
      <div className="rules-structure-list">
        <div className="rules-structure-item">
          <p>
            <strong>Pool</strong> — a 2-sided coin. Enters play at level {LEVEL_BOUNDS.Pool.floor}, maxes out at{' '}
            {LEVEL_BOUNDS.Pool.max}.
          </p>
          <StructureLevelRow type="Pool" />
        </div>
        <div className="rules-structure-item">
          <p>
            <strong>Pyramid</strong> — a 4-sided die. Enters play at level {LEVEL_BOUNDS.Pyramid.floor}, maxes out at{' '}
            {LEVEL_BOUNDS.Pyramid.max}.
          </p>
          <StructureLevelRow type="Pyramid" />
        </div>
        <div className="rules-structure-item">
          <p>
            <strong>Tower</strong> — a 6-sided die. Enters play at level {LEVEL_BOUNDS.Tower.floor}, maxes out at{' '}
            {LEVEL_BOUNDS.Tower.max}.
          </p>
          <StructureLevelRow type="Tower" />
        </div>
        <div className="rules-structure-item">
          <p>
            <strong>Fortress</strong> — a hexagonal wall around your other structures on that hex. Enters play at
            level {LEVEL_BOUNDS.Fortress.floor}, maxes out at {LEVEL_BOUNDS.Fortress.max}. Requires a Pool, Pyramid,
            and Tower already on the hex to build. While it stands, the structures inside are immune to downgrades —
            but also to your own upgrades.
          </p>
          <FortressLevelRow />
        </div>
      </div>

      <h3>Setup</h3>
      <p>
        Each player starts by building one Pool, one Pyramid, and one Tower on hexes that don&apos;t already have one
        of that type. Each player then draws 3 Logic cards and 3 Effect cards, and three tarot cards are turned face
        up to form the shared tarot row.
      </p>

      <h3>Your Turn</h3>
      <p>
        <strong>Phase 1 — Build.</strong> Optionally build one new structure (Pool, Pyramid, or Tower) on a hex where
        you don&apos;t already have one of that type, or build a Fortress if you have all three there already.
        Building a Fortress ends your turn immediately — you skip Phase 2.
      </p>
      <p>
        <strong>Phase 2 — Cast.</strong> Do one of the following:
      </p>
      <ul>
        <li>
          <strong>Cast a Logic spell</strong> — play one Logic card and one Effect card against one of the three
          tarot cards in the row. The tarot card supplies the two operands (terrain/level, or terrain/structure-type)
          that get substituted into your Logic card&apos;s expression; every structure that satisfies the resulting
          logical condition has the Effect card&apos;s effect applied to it.
        </li>
        <li>
          <strong>Play a Major Arcana action</strong> — if one is face up in the tarot row, you may play it instead
          of casting a spell. See the gallery below for what each one does.
        </li>
      </ul>
      <div className="rules-card-examples">
        <GameCard
          frame={LOGIC_FRAME}
          label={LOGIC_CARD_LABELS.A_AND_B}
          artStyle={logicArtStyle('A_AND_B', CARD_WIDTH, CARD_HEIGHT)}
          captionStyle={logicCaptionStyle('A_AND_B', CARD_WIDTH, CARD_HEIGHT)}
          selected={false}
          onClick={() => {}}
        />
        <GameCard
          frame={EFFECT_FRAME}
          label={EFFECT_CARD_LABELS.UPGRADE_2}
          artStyle={effectArtStyle('UPGRADE_2', CARD_WIDTH, CARD_HEIGHT)}
          captionStyle={effectCaptionStyle('UPGRADE_2', CARD_WIDTH, CARD_HEIGHT)}
          selected={false}
          onClick={() => {}}
        />
        <p className="rules-caption">
          Example: paired against a tarot card naming <em>Prairies, level 3</em>, this matches every Prairies
          structure at exactly level 3 and upgrades each of them by 2.
        </p>
      </div>
      <p>
        Once a spell resolves, the Logic, Effect, and Tarot cards played are discarded. If a structure&apos;s level
        would drop below its floor, it&apos;s destroyed and returns to its owner&apos;s supply — a Pool specifically
        can only be destroyed by a Downgrade 2 or stronger effect, since its floor is level 2, not 0.
      </p>

      <h3>Minor Arcana Operands</h3>
      <p>Every Minor Arcana card names a terrain plus either a level or a structure type:</p>
      <div className="rules-table-wrap">
        <table className="rules-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Wands (Forests)</th>
              <th>Cups (Mountains)</th>
              <th>Swords (Prairies)</th>
              <th>Pentacles (Swamps)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ace–6</td>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                that suit&apos;s terrain, at level 1–6
              </td>
            </tr>
            <tr>
              <td>7</td>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                that suit&apos;s terrain, Pool
              </td>
            </tr>
            <tr>
              <td>8</td>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                that suit&apos;s terrain, Pyramid
              </td>
            </tr>
            <tr>
              <td>9</td>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                that suit&apos;s terrain, Tower
              </td>
            </tr>
            <tr>
              <td>10</td>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                that suit&apos;s terrain, Fortress
              </td>
            </tr>
            <tr>
              <td>Page</td>
              <td>Pyramid, Lvl. 1</td>
              <td>Pool, Lvl. 1</td>
              <td>Fortress, Lvl. 1</td>
              <td>Tower, Lvl. 1</td>
            </tr>
            <tr>
              <td>Knight</td>
              <td>Pyramid, Lvl. 2</td>
              <td>Pool, Lvl. 2</td>
              <td>Fortress, Lvl. 2</td>
              <td>Tower, Lvl. 2</td>
            </tr>
            <tr>
              <td>Queen</td>
              <td>Pyramid, Lvl. 3</td>
              <td>Pool, Lvl. 3</td>
              <td>Tower, Lvl. 3</td>
              <td>Tower, Lvl. 3</td>
            </tr>
            <tr>
              <td>King</td>
              <td>Pyramid, Lvl. 4</td>
              <td>Pool, Lvl. 4</td>
              <td>Tower, Lvl. 4</td>
              <td>Tower, Lvl. 4</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="rules-note">
        Note the Swords court cards: Page and Knight name a Fortress, but Queen and King name a Tower instead — the
        one place the pattern isn&apos;t uniform across all four ranks.
      </p>

      <h3>Major Arcana Actions</h3>
      <p>Each one has its own effect and its own tie-in to the card&apos;s character:</p>
      <div className="rules-major-gallery">
        {MAJOR_ARCANA_IDS.map((id) => {
          const card: TarotCard = { kind: 'major', instanceId: id, id }
          const name = describeMajorArcana(id)
          return (
            <div className="rules-major-card" key={id}>
              <img className="rules-major-art" src={tarotArtUrl(card)} alt={name} loading="lazy" />
              <div className="rules-major-name">{name}</div>
              <div className="rules-major-desc">{MAJOR_ARCANA_DESCRIPTIONS[id]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
