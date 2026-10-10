import { AnimatePresence } from 'framer-motion'
import { useStore } from './store'
import Sky from './ui/Sky'
import { Toast } from './ui/kit'
import ArtworkModal from './ui/ArtworkModal'
import EaselLabels from './ui/EaselLabels'
import Hud from './ui/Hud'
import { Drawer, Help } from './ui/Panels'
import Scene from './world/Scene'
import Landing from './screens/Landing'
import Upload from './screens/Upload'
import Processing from './screens/Processing'

export default function App() {
  const screen = useStore((s) => s.screen)
  const overlay = useStore((s) => s.overlay)
  return (
    <>
      <Sky />
      <Scene />
      <div className="ui-layer">
        {screen === 'world' && <EaselLabels />}
        {screen === 'landing' && overlay === null && <Landing />}
        {screen === 'world' && overlay === null && <Hud />}
        {screen === 'world' && (
          <>
            <ArtworkModal />
            <Drawer />
            <Help />
          </>
        )}
        <AnimatePresence mode="wait">
          {overlay === 'upload' && <Upload key="upload" />}
          {overlay === 'processing' && <Processing key="processing" />}
        </AnimatePresence>
        <Toast />
      </div>
      <div className="vignette" />
      <div className="grain" />
    </>
  )
}
