import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { ROLES } from '../lib/artwork'
import type { Role } from '../data/types'

const copy = ['Dusting off…', 'Assigning a personality…', 'Finding a home…']
export default function Processing() {
  const { pending, setPending, addArtwork, go, setFocus } = useStore()
  const [i, setI] = useState(0)
  const [bump, setBump] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % copy.length), 850); return () => clearInterval(t) }, [])
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2800 + bump * 1200)
    return () => clearTimeout(t)
  }, [bump])
  useEffect(() => {
    if (!leaving || !pending) return
    const t = setTimeout(() => { addArtwork(pending); setFocus(pending.id); setPending(null); go('world') }, 700)
    return () => clearTimeout(t)
  }, [leaving, pending, addArtwork, setFocus, setPending, go])

  if (!pending) return null
  const choose = (role: Role) => { setPending({ ...pending, role }); setBump((b) => b + 1) }
  return (
    <div className="h-full flex flex-col items-center justify-center bg-teal gap-6 overflow-hidden">
      <div className="bg-cream p-3 rounded shadow-2xl transition-all duration-700 ease-in"
        style={{ transform: leaving ? 'scale(.05) rotate(540deg)' : 'rotate(-2deg)', opacity: leaving ? 0 : 1, filter: leaving ? 'blur(6px)' : 'none' }}>
        <img src={pending.url} alt={pending.name} className="max-h-64 max-w-md object-contain" />
        <p className="font-hand text-2xl text-teal text-center mt-1">{pending.name}</p>
      </div>
      <p className="font-stamp text-2xl text-peach">{copy[i]}</p>
      <div className="flex flex-col items-center gap-2" style={{ opacity: leaving ? 0 : 1 }}>
        <p className="font-ui text-sm opacity-70">Make it a…</p>
        <div className="flex gap-2 flex-wrap justify-center">
          {ROLES.map((r) => (
            <button key={r.role} onClick={() => choose(r.role)}
              className="font-stamp px-3 py-1 rounded-full border-2 border-lav transition-colors"
              style={{ background: pending.role === r.role ? '#F2B544' : 'transparent', color: pending.role === r.role ? '#1F3A4D' : '#F4E9D8' }}>{r.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
