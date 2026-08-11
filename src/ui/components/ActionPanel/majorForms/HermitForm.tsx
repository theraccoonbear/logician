import { useState } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { describeMajorArcana } from '../../../operandLabels'

export function HermitForm({ onConfirm, onCancel }: { onConfirm: (params: unknown) => void; onCancel: () => void }) {
  const { state } = useGameEngine()
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  if (!state) return null

  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else if (next.size < 3) next.add(id)
    setChosen(next)
  }

  return (
    <div className="major-arcana-form">
      <p>Search the deck and choose exactly 3 cards to become the new active row. Selected: {chosen.size}/3</p>
      <div className="deck-search-list">
        {state.tarotDeck.map((t) => (
          <label key={t.instanceId}>
            <input type="checkbox" checked={chosen.has(t.instanceId)} onChange={() => toggle(t.instanceId)} />
            {t.kind === 'major' ? describeMajorArcana(t.id) : `${t.rank} of ${t.suit}`}
          </label>
        ))}
      </div>
      <div className="action-buttons">
        <button className="action-button" disabled={chosen.size !== 3} onClick={() => onConfirm({ chosenTarotIds: [...chosen] })}>
          Confirm The Hermit
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
