import './App.css'
import { GameProvider } from './ui/GameProvider'
import { GameView } from './ui/components/GameView'
import { SetupScreen } from './ui/components/SetupScreen'
import { useGameEngine } from './ui/hooks/useGameEngine'

function Root() {
  const { state } = useGameEngine()
  return state ? <GameView /> : <SetupScreen />
}

function App() {
  return (
    <GameProvider>
      <Root />
    </GameProvider>
  )
}

export default App
