import { useEffect, useState } from 'react'
import { useStore } from '../store'
const lines = ['Every creative has a folder of things that almost existed.', 'Most get deleted.', 'Not here.']
export default function Intro() {
  const go = useStore((s) => s.go)
  const [n, setN] = useState(0)
  const [chars, setChars] = useState(0)
  useEffect(() => {
    if (chars < lines[n].length) { const t = setTimeout(() => setChars(chars + 1), 35); return () => clearTimeout(t) }
    const t = setTimeout(() => (n < lines.length - 1 ? (setN(n + 1), setChars(0)) : go('reject')), 1300)
    return () => clearTimeout(t)
  }, [n, chars, go])
  return (
    <div className="h-full flex items-center justify-center bg-teal cursor-pointer p-8" onClick={() => go('reject')}>
      <p className="font-stamp text-3xl md:text-5xl text-cream max-w-3xl text-center">
        {lines[n].slice(0, chars)}<span className="animate-pulse">▌</span>
      </p>
    </div>
  )
}
