import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../assetUrl'

export function MenuBar({ onNewGame, onHelp }: { onNewGame: () => void; onHelp: () => void }) {
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
      <button className="hamburger-button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <img src={assetUrl(open ? '/img/menu-close.png' : '/img/menu-open.png')} alt="" />
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
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false)
              onHelp()
            }}
          >
            Help
          </button>
        </div>
      )}
    </div>
  )
}
