import { Suspense, lazy, useState } from 'react'
import { readArtFile } from './lib/image'
import { useStore } from './store'
import { AddSheet } from './ui/AddSheet'
import { Confetti, HoverLabel, Toast } from './ui/Feedback'
import { Hud } from './ui/Hud'
import { NameTag } from './ui/NameTag'
import { Welcome } from './ui/Welcome'

// three.js is the heavy part; let the sky and the words paint first
const FarmCanvas = lazy(() => import('./scene/FarmCanvas'))

export default function App() {
  const phase = useStore((s) => s.phase)
  const sheetOpen = useStore((s) => s.sheetOpen)
  const openSheet = useStore((s) => s.openSheet)
  const say = useStore((s) => s.say)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className="app"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={async (e) => {
        e.preventDefault()
        setDragging(false)
        const art = await readArtFile(e.dataTransfer.files[0])
        if (art) openSheet(art)
        else say('That file is shy. Try a PNG or a JPG.')
      }}
    >
      <div className="sky" aria-hidden="true">
        <div className="ember" />
        <i className="shooting s1" />
        <i className="shooting s2" />
      </div>

      <div className="stage">
        <Suspense fallback={null}>
          <FarmCanvas />
        </Suspense>
      </div>

      {phase === 'welcome' ? <Welcome /> : <Hud />}
      <NameTag />
      {sheetOpen && <AddSheet />}
      <HoverLabel />
      <Confetti />
      <Toast />

      {dragging && (
        <div className="drag-veil">
          <div className="drag-card">
            <span className="hand">let go!</span>
            Drop it anywhere. We&rsquo;ll find it a body.
          </div>
        </div>
      )}
      <div className="grain" aria-hidden="true" />
    </div>
  )
}
