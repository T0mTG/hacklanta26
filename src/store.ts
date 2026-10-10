import { create } from 'zustand'
import { START_SCREEN } from './lib/env'

// `screen` is the big backdrop; `overlay` is a panel drawn over whichever screen is active,
// so the upload panel works the same on the landing page and inside the live world.
export type Screen = 'landing' | 'world'
export type Overlay = null | 'upload' | 'processing'
export type CamMode = 'title' | 'globe' | 'walk'

interface S {
  screen: Screen; setScreen: (s: Screen) => void
  overlay: Overlay; setOverlay: (o: Overlay) => void
  cam: CamMode; setCam: (m: CamMode) => void
  toast: string | null; say: (msg: string) => void
}

let toastTimer = 0

export const useStore = create<S>((set) => ({
  screen: START_SCREEN === 'world' ? 'world' : 'landing', setScreen: (screen) => set({ screen }),
  overlay: null, setOverlay: (overlay) => set({ overlay }),
  cam: START_SCREEN === 'world' ? 'globe' : 'title', setCam: (cam) => set({ cam }),
  toast: null,
  say: (toast) => {
    set({ toast })
    clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => set({ toast: null }), 3400)
  },
}))
