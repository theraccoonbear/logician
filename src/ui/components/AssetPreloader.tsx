import { useEffect, useState, type ReactNode } from 'react'
import { preloadAssets, type PreloadProgress } from '../preloadAssets'

export function AssetPreloader({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<PreloadProgress>(() => {
    const { progress: p, subscribe } = preloadAssets()
    // The subscribe call immediately emits current state, but we're inside
    // useState's lazy initializer so we can use the returned snapshot directly.
    // The useEffect below will wire up the live subscription.
    void subscribe
    return p
  })

  useEffect(() => {
    const { subscribe } = preloadAssets()
    const unsub = subscribe(setProgress)
    return unsub
  }, [])

  if (progress.loaded < progress.total) {
    const pct = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0
    return (
      <div className="preload-overlay">
        <div className="preload-content">
          <img className="preload-logo" src={`${import.meta.env.BASE_URL}img/logician.png`} alt="Logician" />
          <div className="preload-bar-track">
            <div className="preload-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="preload-status">
            Loading assets… {progress.loaded}/{progress.total}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
