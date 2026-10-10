import { AnimatePresence } from 'framer-motion'
import { useStore } from './store'
import Sky from './ui/Sky'
import { Btn, Toast } from './ui/kit'
import Scene from './world/Scene'
import Landing from './screens/Landing'
import Upload from './screens/Upload'
import Processing from './screens/Processing'

export default function App() {
  const screen = useStore((s) => s.screen)
  const overlay = useStore((s) => s.overlay)
  const setScreen = useStore((s) => s.setScreen)
  const setCam = useStore((s) => s.setCam)
  return (
    <>
      <Sky />
      <Scene />
      <div className="ui-layer">
        {screen === 'landing' && overlay === null && <Landing />}
        <AnimatePresence mode="wait">
          {overlay === 'upload' && <Upload key="upload" />}
          {overlay === 'processing' && <Processing key="processing" />}
        </AnimatePresence>
        {screen === 'world' && overlay === null && (
          <div className="absolute left-4 top-4">
            <Btn icon="back" onClick={() => { setScreen('landing'); setCam('title') }}>Home</Btn>
          </div>
        )}
        <Toast />
      </div>
      <div className="vignette" />
      <div className="grain" />
    </>
  )
}
