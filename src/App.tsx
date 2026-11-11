import { useState } from 'react'
import { HelpDialog } from './components/HelpDialog'
import { HowToPage } from './components/HowToPage'
import { LandingScreen } from './components/LandingScreen'
import { MatchScreen } from './components/MatchScreen'
import { SetupScreen } from './components/SetupScreen'
import type { SessionConfig } from './game'
import './App.css'

type View = { name: 'landing' | 'setup' } | { name: 'howto'; from: 'landing' | 'setup' }

function App() {
  const [view, setView] = useState<View>({ name: 'landing' })
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  let screen
  if (config) {
    // A new session always mounts a fresh MatchScreen, so no state carries over
    screen = (
      <MatchScreen
        config={config}
        onEndSession={() => {
          setConfig(null)
          setView({ name: 'setup' })
        }}
        onHelp={() => setHelpOpen(true)}
      />
    )
  } else if (view.name === 'howto') {
    screen = (
      <HowToPage
        onBack={() => setView({ name: view.from })}
        onSetUp={() => setView({ name: 'setup' })}
      />
    )
  } else if (view.name === 'setup') {
    screen = <SetupScreen onStart={setConfig} onBack={() => setView({ name: 'landing' })} />
  } else {
    screen = (
      <LandingScreen
        onStart={() => setView({ name: 'setup' })}
        onHowToPlay={() => setView({ name: 'howto', from: 'landing' })}
      />
    )
  }

  return (
    <div className="app">
      {screen}
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

export default App
