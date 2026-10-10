import { useEffect, useState } from 'react'
import { useStore } from '../store'

const HINTS = [
  'Drag to spin the world.',
  'Pick a creature up and carry it somewhere new.',
  'Scroll to lean in closer.',
  'Six continents. Have you found the volcano?',
  'Tap a creature to read its story.',
  'Drop a picture anywhere to add it.',
]

function Sprout() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path d="M16 29V15" stroke="#6FA06B" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 17C16 10 11 6 4 6c0 7 5 11 12 11Z" fill="#A9C98A" stroke="#6FA06B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 14c0-6 4-9 11-9 0 6-4 9-11 9Z" fill="#B8D699" stroke="#6FA06B" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export function Hud() {
  const count = useStore((s) => s.creatures.length)
  const muted = useStore((s) => s.muted)
  const toggleMuted = useStore((s) => s.toggleMuted)
  const openSheet = useStore((s) => s.openSheet)
  const selectedId = useStore((s) => s.selectedId)
  const [hint, setHint] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 6500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="hud">
      <header className="topbar">
        <div className="wordmark">
          <Sprout />
          <span>
            The Reject Farm
            <small className="hand">Hacklanta pasture</small>
          </span>
        </div>
        <div className="topbar-right">
          <span className="chip glass">
            {count ? (
              <>
                <b>{count}</b> living here
              </>
            ) : (
              'Nobody lives here yet'
            )}
          </span>
          <button className="icon-btn glass" onClick={toggleMuted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} title={muted ? 'Sound is off' : 'Sound is on'}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
              {muted ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M16 9a4.5 4.5 0 0 1 0 6m2.5-9a8.5 8.5 0 0 1 0 12" />}
            </svg>
          </button>
        </div>
      </header>

      <footer className={`bottombar${selectedId ? ' tucked' : ''}`}>
        <div className="hint" key={hint}>
          {HINTS[hint]}
        </div>
        <button className="btn primary big" onClick={() => openSheet()}>
          <span className="plus" aria-hidden="true">+</span> Add a creature
        </button>
      </footer>
    </div>
  )
}
