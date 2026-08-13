import { useEffect, useRef, useState } from 'react'

export function MenuBar({ onNewGame }: { onNewGame: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  return (
    <div className="menu-bar" ref={ref}>
      {/* Placeholder CSS-drawn icon — swap for the custom hamburger art when it's ready. */}
      <button className="hamburger-button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span />
        <span />
        <span />
      </button>
      {open && (
        <div className="menu-dropdown">
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false)
              onNewGame()
            }}
          >
            New Game
          </button>
        </div>
      )}
    </div>
  )
}
