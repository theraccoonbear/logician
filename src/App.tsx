import { useEffect } from 'react'
import './App.css'
import { GameProvider } from './ui/GameProvider'
import { GameView } from './ui/components/GameView'
import { SetupScreen } from './ui/components/SetupScreen'
import { AssetPreloader } from './ui/components/AssetPreloader'
import { useGameEngine } from './ui/hooks/useGameEngine'

function Root() {
  const { state } = useGameEngine()
  return state ? <GameView /> : <SetupScreen />
}

function App() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    window.addEventListener('contextmenu', handleContextMenu)
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return (
    <AssetPreloader>
      <GameProvider>
        <Root />
      </GameProvider>
    </AssetPreloader>
  )
}

export default App
