import { create } from 'zustand'
import type { Artwork } from './data/types'
export type Screen = 'landing' | 'intro' | 'reject' | 'upload' | 'processing' | 'world'
interface S {
  screen: Screen; go: (s: Screen) => void
  artworks: Artwork[]; addArtwork: (a: Artwork) => void
  pending: Artwork | null; setPending: (a: Artwork | null) => void
  interactions: number; bump: () => void
  finale: boolean; setFinale: (b: boolean) => void
  focusId: string | null; setFocus: (id: string | null) => void
  hoverId: string | null; setHover: (id: string | null) => void
  toast: string | null; setToast: (t: string | null) => void
  reset: () => void
}
export const useStore = create<S>((set) => ({
  screen: 'landing', go: (screen) => set({ screen }),
  artworks: [], addArtwork: (a) => set((s) => ({ artworks: [...s.artworks, a] })),
  pending: null, setPending: (pending) => set({ pending }),
  interactions: 0, bump: () => set((s) => ({ interactions: s.interactions + 1 })),
  finale: false, setFinale: (finale) => set({ finale }),
  focusId: null, setFocus: (focusId) => set({ focusId }),
  hoverId: null, setHover: (hoverId) => set({ hoverId }),
  toast: null, setToast: (toast) => set({ toast }),
  reset: () => set({ screen: 'landing', artworks: [], pending: null, interactions: 0, finale: false, focusId: null }),
}))
