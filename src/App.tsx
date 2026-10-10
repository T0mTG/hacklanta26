import { AnimatePresence } from 'framer-motion'
import { useStore } from './store'
import Sky from './ui/Sky'
import { Btn, Toast } from './ui/kit'
import EaselLabels from './ui/EaselLabels'
import Scene from './world/Scene'
import Landing from './screens/Landing'
import Upload from './screens/Upload'
import Processing from './screens/Processing'

export default function App() {
  const screen = useStore((s) => s.screen)
  const overlay = useStore((s) => s.overlay)
  const count = useStore((s) => s.artworks.length)
  const setScreen = useStore((s) => s.setScreen)
  const setCam = useStore((s) => s.setCam)
  const setOverlay = useStore((s) => s.setOverlay)
  return (
    <>
      <Sky />
      <Scene />
      <div className="ui-layer">
        {screen === 'world' && <EaselLabels />}
        {screen === 'landing' && overlay === null && <Landing />}
        <AnimatePresence mode="wait">
          {overlay === 'upload' && <Upload key="upload" />}
          {overlay === 'processing' && <Processing key="processing" />}
        </AnimatePresence>
        {screen === 'world' && overlay === null && (
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-3">
            <Btn icon="back" onClick={() => { setScreen('landing'); setCam('title') }}>Home</Btn>
            <Btn tone="yellow" icon="plus" onClick={() => setOverlay('upload')}>Add a drawing</Btn>
            <span className="pill">{count} {count === 1 ? 'drawing' : 'drawings'}</span>
          </div>
        )}
        <Toast />
      </div>
      <div className="vignette" />
      <div className="grain" />
    </>
  )
}
