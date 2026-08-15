import { useEffect } from 'react'
import { RulesContent } from './RulesContent'

export function RulesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="rules-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rules-modal" role="dialog" aria-modal="true" aria-label="How to play Logician">
        <div className="rules-modal-header">
          <h2>How to Play</h2>
          <button className="rules-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="rules-modal-body">
          <RulesContent />
        </div>
      </div>
    </div>
  )
}
