import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { DEMOS, makeArtwork, validate } from '../lib/artwork'

export default function Upload() {
  const { go, setPending, toast, setToast } = useStore()
  const [over, setOver] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  const take = useCallback(async (url: string, name: string) => {
    setPending(await makeArtwork(url, name)); go('processing')
  }, [go, setPending])
  const fromFile = useCallback((f?: File) => {
    if (!f) return
    const err = validate(f)
    if (err) { setToast(err); return }
    take(URL.createObjectURL(f), f.name)
  }, [take, setToast])
  const demo = useCallback((i: number) => take(DEMOS[i].url, DEMOS[i].name), [take])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'd') demo(Math.floor(Math.random() * DEMOS.length)) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [demo])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast, setToast])

  return (
    <div className="h-full flex flex-col items-center justify-center bg-teal gap-8 p-6">
      <h2 className="font-hand text-6xl text-cream">Where should it rest?</h2>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); fromFile(e.dataTransfer.files[0]) }}
        onClick={() => inp.current?.click()}
        className="cursor-pointer w-full max-w-2xl h-64 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center transition-all"
        style={{ borderColor: over ? '#F2B544' : '#8E7CC3', background: over ? 'rgba(242,181,68,.15)' : 'rgba(142,124,195,.1)', boxShadow: over ? '0 0 40px #F2B54488' : 'none' }}>
        <div className="text-6xl mb-2">⚰️</div>
        <p className="font-stamp text-2xl">Drop your darling here</p>
        <p className="font-ui text-sm opacity-60 mt-1">or click to choose · png jpg webp svg gif</p>
        <input ref={inp} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={(e) => fromFile(e.target.files?.[0])} />
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="font-stamp opacity-70">no file? borrow a rejected darling:</p>
        <div className="flex gap-3 flex-wrap justify-center">
          {DEMOS.map((d, i) => (
            <button key={d.name} className="btn !px-4 !py-2 !text-base" onClick={() => demo(i)}>{d.title}</button>
          ))}
        </div>
      </div>
      {toast && <div className="fixed bottom-8 bg-stamp text-cream font-stamp px-5 py-3 rounded shadow-xl" style={{ animation: 'pop .3s' }}>{toast}</div>}
    </div>
  )
}
