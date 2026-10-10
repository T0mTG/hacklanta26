import { useEffect, useState } from 'react'
import { useStore } from '../store'
export default function Reject() {
  const go = useStore((s) => s.go)
  const [stamped, setStamped] = useState(false)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => { const t = setTimeout(() => setStamped(true), 1200); return () => clearTimeout(t) }, [])
  return (
    <div className="h-full flex items-center justify-center bg-teal p-6" style={stamped ? { animation: 'shake .4s' } : undefined}>
      <div className="bg-cream text-teal rounded-md p-8 max-w-xl w-full relative shadow-2xl transition-all duration-700"
        style={leaving ? { transform: 'translateY(-120vh) rotate(8deg)' } : undefined}>
        <p className="font-ui text-xs opacity-60">From: Totally Real Studio &lt;no-reply@direction.co&gt;</p>
        <p className="font-ui font-semibold mb-3">Re: Your submission</p>
        <p className="font-stamp text-lg">Thanks for your submission. We've decided to go in a different direction.</p>
        <div className="mt-5 h-28 rounded flex items-center justify-center font-hand text-4xl" style={{ background: 'linear-gradient(135deg,#F7B89A,#8E7CC3)' }}>FINAL_v7.png</div>
        {stamped && (
          <div className="absolute font-stamp text-6xl text-stamp border-8 border-stamp px-4 rounded"
            style={{ top: '38%', left: '18%', animation: 'slam .35s forwards', mixBlendMode: 'multiply', opacity: 0.9 }}>REJECTED</div>
        )}
        {stamped && (
          <div className="text-center mt-6" style={{ animation: 'pop .5s' }}>
            <button className="btn" onClick={() => { setLeaving(true); setTimeout(() => go('upload'), 600) }}>Send it somewhere better</button>
          </div>
        )}
      </div>
    </div>
  )
}
