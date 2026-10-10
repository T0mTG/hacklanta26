import { useMemo } from 'react'

// The sky is plain CSS behind a transparent canvas: a gradient the camera rig tints, a smiling sun, a few sparkles.
export default function Sky() {
  const sparks = useMemo(() => {
    let a = 7
    const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 26 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: 2 + rnd() * 3, d: rnd() * 4 }))
  }, [])
  return (
    <div className="sky" aria-hidden>
      {sparks.map((s, i) => (
        <i key={i} className="spark" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
      <svg className="sky-sun" viewBox="0 0 120 120">
        <g className="rays" stroke="#22333b" strokeWidth="5" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="60" y1="8" x2="60" y2="19" transform={`rotate(${i * 30} 60 60)`} />
          ))}
        </g>
        <circle cx="60" cy="60" r="32" fill="#f9d65c" stroke="#22333b" strokeWidth="4.5" />
        <circle cx="49" cy="56" r="3.4" fill="#22333b" />
        <circle cx="71" cy="56" r="3.4" fill="#22333b" />
        <circle cx="42" cy="67" r="5.5" fill="#f6a6b8" opacity=".85" />
        <circle cx="78" cy="67" r="5.5" fill="#f6a6b8" opacity=".85" />
        <path d="M50 67q10 9 20 0" fill="none" stroke="#22333b" strokeWidth="3.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}
