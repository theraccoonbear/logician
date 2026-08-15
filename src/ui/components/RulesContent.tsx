import { MAJOR_ARCANA_IDS } from '../../engine/types/tarot'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../majorArcanaDescriptions'
import { describeMajorArcana } from '../operandLabels'

// The in-app "Help" modal's content. This mirrors docs/rules.md, cleaned up for a first-time
// player, with the Major Arcana table sourced directly from MAJOR_ARCANA_DESCRIPTIONS so it
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
      <ul>
        <li>
          <strong>Pool</strong> — a 2-sided coin. Enters play at level 2, maxes out at 3.
        </li>
        <li>
          <strong>Pyramid</strong> — a 4-sided die. Enters play at level 1, maxes out at 4.
        </li>
        <li>
          <strong>Tower</strong> — a 6-sided die. Enters play at level 1, maxes out at 6.
        </li>
        <li>
          <strong>Fortress</strong> — a hexagonal wall around your other structures on that hex. Enters play at level
          1, maxes out at 2. Requires a Pool, Pyramid, and Tower already on the hex to build. While it stands, the
          structures inside are immune to downgrades — but also to your own upgrades.
        </li>
      </ul>

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
          of casting a spell. See the table below for what each one does.
        </li>
      </ul>
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
      <div className="rules-table-wrap">
        <table className="rules-table">
          <thead>
            <tr>
              <th>Card</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {MAJOR_ARCANA_IDS.map((id) => (
              <tr key={id}>
                <td>{describeMajorArcana(id)}</td>
                <td>{MAJOR_ARCANA_DESCRIPTIONS[id]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
