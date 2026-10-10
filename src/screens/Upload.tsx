import { motion } from 'framer-motion'
import { useStore } from '../store'
import { SAMPLES, sampleUrl } from '../data/samples'
import { Btn } from '../ui/kit'

// Phase 0 stub: only the sample shelf, so the screen flow can be clicked through. Phase 2 adds the real intake.
export default function Upload() {
  const setOverlay = useStore((s) => s.setOverlay)
  return (
    <motion.div
      className="absolute inset-0 grid place-items-center p-4 hit"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="sticker w-full max-w-3xl p-5 sm:p-7"
        initial={{ y: 40, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold">Show us your drawing!</h2>
        <p className="mt-1 mb-4 text-lg">Pick one to try:</p>
        <div className="grid grid-cols-5 gap-3">
          {SAMPLES.map((s) => (
            <button key={s.id} className="sticker-btn !p-1 !min-h-0 aspect-square overflow-hidden hit" title={s.title} onClick={() => setOverlay('processing')}>
              <img src={sampleUrl(s)} alt={s.title} className="w-full h-full object-cover rounded-lg" draggable={false} />
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-start">
          <Btn icon="back" onClick={() => setOverlay(null)}>Back</Btn>
        </div>
      </motion.div>
    </motion.div>
  )
}
