import type { ReactNode } from 'react'
import { useStore } from '../store'
import { VARIANTS, type GlobeId } from '../world/variants'
import { Btn } from '../ui/kit'

const WORDS = [
  { text: 'Doodle', colors: ['#ee6c4d', '#f2c14e', '#a8e6c3', '#9ad4f5', '#c9b6f2', '#f6a6b8'] },
  { text: 'Planet', colors: ['#fbf5e6'] },
]

// Tiny pictures for the two globe buttons: a low-poly toy planet, and a planet with a paper cut-out tree standing on it
function ToyMini() {
  return (
    <svg viewBox="0 0 72 56" width="72" height="56" aria-hidden>
      <circle cx="36" cy="34" r="22" fill="#86cd5e" stroke="#22333b" strokeWidth="3.2" />
      <path d="M22 40l6-3 5 2 6-3 7 3" fill="none" stroke="#5fae4f" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 4l9 14h-5l7 10H27l7-10h-5z" fill="#4b9c43" stroke="#22333b" strokeWidth="2.8" strokeLinejoin="round" />
      <rect x="34" y="27" width="4" height="5" fill="#c88a54" stroke="#22333b" strokeWidth="2" />
    </svg>
  )
}

function PaperMini() {
  return (
    <svg viewBox="0 0 72 56" width="72" height="56" aria-hidden>
      <circle cx="36" cy="34" r="22" fill="#bde3a3" stroke="#22333b" strokeWidth="3.2" />
      <circle cx="36" cy="34" r="19.2" fill="none" stroke="#fffdf6" strokeWidth="3" />
      {/* two cut-outs crossed at right angles, each with a white paper edge and a black line */}
      <path d="M42 8l7 12h-4l6 9H34l6-9h-4z" fill="#8fd05a" stroke="#fffdf6" strokeWidth="5" strokeLinejoin="round" />
      <path d="M42 8l7 12h-4l6 9H34l6-9h-4z" fill="#6cc04a" stroke="#22333b" strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 12l6 10h-3l5 8H24l5-8h-3z" fill="#5aae3f" stroke="#fffdf6" strokeWidth="5" strokeLinejoin="round" />
      <path d="M30 12l6 10h-3l5 8H24l5-8h-3z" fill="#7fcb53" stroke="#22333b" strokeWidth="2" strokeLinejoin="round" />
      <rect x="29" y="30" width="14" height="4" rx="1" fill="#d9b27a" stroke="#22333b" strokeWidth="1.8" />
    </svg>
  )
}

function GlobeChoice({ id, mini }: { id: GlobeId; mini: ReactNode }) {
  const globe = useStore((s) => s.globe)
  const setGlobe = useStore((s) => s.setGlobe)
  const on = globe === id
  return (
    <button
      className={`sticker-btn globe-choice hit ${on ? 'tone-yellow on' : ''}`}
      aria-pressed={on}
      onClick={() => setGlobe(id)}
    >
      {mini}
      <span className="font-display text-xl sm:text-2xl leading-none">{VARIANTS[id].name}</span>
      <span className="text-xs sm:text-sm font-bold opacity-75 leading-tight">{VARIANTS[id].blurb}</span>
    </button>
  )
}

export default function Landing() {
  const setOverlay = useStore((s) => s.setOverlay)
  const setScreen = useStore((s) => s.setScreen)
  const setCam = useStore((s) => s.setCam)
  const globe = useStore((s) => s.globe)
  // "returning" is about the globe you picked: its own drawings, or what you added and moved on the paper planet
  const returning = useStore((s) =>
    s.globe === 'toy' ? s.artworks.some((a) => a.kind !== 'neighbor') : s.paper.added.length > 0 || Object.keys(s.paper.moved).length > 0,
  )
  let n = 0
  const enter = () => { setScreen('world'); setCam('walk') }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-4 pt-[5vh] pb-[4vh] text-center overflow-y-auto">
      <div className="flex flex-col items-center">
        <h1 className="logo" aria-label="Doodle Planet">
          {WORDS.map((w) => (
            <span key={w.text} className="block" style={{ animation: 'none' }}>
              {[...w.text].map((ch, i) => (
                <span key={i} style={{ color: w.colors[i % w.colors.length], ['--i' as string]: n++, ['--r' as string]: `${(n % 2 ? 1 : -1) * 2}deg` }}>{ch}</span>
              ))}
            </span>
          ))}
        </h1>
        <p className="pill hit mt-5 !text-base sm:!text-lg">Draw it. Upload it. Watch it come alive!</p>
      </div>
      <div className="flex flex-col items-center gap-4 mt-4">
        <div className="flex items-stretch justify-center gap-3 sm:gap-5" role="group" aria-label="Pick a globe">
          <GlobeChoice id="toy" mini={<ToyMini />} />
          <GlobeChoice id="paper" mini={<PaperMini />} />
        </div>
        {returning ? (
          <div className="flex flex-col items-center gap-3">
            <Btn big tone="yellow" icon="globe" onClick={enter}>Back to my planet</Btn>
            {globe === 'toy' && <Btn icon="plus" onClick={() => setOverlay('upload')}>Add a drawing</Btn>}
          </div>
        ) : (
          <>
            <Btn big tone="yellow" icon="pencil" onClick={() => (globe === 'toy' ? setOverlay('upload') : enter())}>Let's go!</Btn>
            <p className="pill !text-sm !border-2 !shadow-none">Your drawings stay on this device</p>
          </>
        )}
      </div>
    </div>
  )
}
