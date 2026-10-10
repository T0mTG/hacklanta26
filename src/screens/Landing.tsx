import { useStore } from '../store'
import { Btn } from '../ui/kit'

const WORDS = [
  { text: 'Doodle', colors: ['#ee6c4d', '#f2c14e', '#a8e6c3', '#9ad4f5', '#c9b6f2', '#f6a6b8'] },
  { text: 'Planet', colors: ['#fbf5e6'] },
]

export default function Landing() {
  const setOverlay = useStore((s) => s.setOverlay)
  const setScreen = useStore((s) => s.setScreen)
  const setCam = useStore((s) => s.setCam)
  const returning = useStore((s) => s.artworks.some((a) => a.kind !== 'neighbor'))
  let n = 0
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-4 pt-[6vh] pb-[5vh] text-center">
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
      <div className="flex flex-col items-center gap-3">
        {returning ? (
          <>
            <Btn big tone="yellow" icon="globe" onClick={() => { setScreen('world'); setCam('walk') }}>Back to my planet</Btn>
            <Btn icon="plus" onClick={() => setOverlay('upload')}>Add a drawing</Btn>
          </>
        ) : (
          <>
            <Btn big tone="yellow" icon="pencil" onClick={() => setOverlay('upload')}>Let's go!</Btn>
            <p className="pill !text-sm !border-2 !shadow-none">Your drawings stay on this device</p>
          </>
        )}
      </div>
    </div>
  )
}
