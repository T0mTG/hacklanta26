import { useStore } from '../store'
const scraps = Array.from({ length: 14 }, (_, i) => ({
  l: (i * 37) % 100, t: (i * 53) % 100, w: 40 + (i * 17) % 60, r: (i * 29) % 360,
  c: ['#F4E9D8', '#F7B89A', '#8E7CC3', '#F2B544'][i % 4], d: 4 + (i % 5),
}))
export default function Landing() {
  const go = useStore((s) => s.go)
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative overflow-hidden bg-teal">
      {scraps.map((s, i) => (
        <div key={i} className="absolute opacity-30" style={{
          left: `${s.l}%`, top: `${s.t}%`, width: s.w, height: s.w * 0.7, background: s.c, transform: `rotate(${s.r}deg)`,
          clipPath: 'polygon(0 10%,90% 0,100% 80%,60% 100%,5% 90%)', animation: `drift ${s.d}s ease-in-out infinite alternate`,
        }} />
      ))}
      <h1 className="font-hand text-7xl md:text-9xl text-cream relative leading-none">The Afterlife<br />of Darlings</h1>
      <p className="font-stamp text-peach mt-6 relative">a graveyard for rejected work, except the ghosts are happy</p>
      <button className="btn mt-10 relative" onClick={() => go('intro')}>Enter</button>
    </div>
  )
}
