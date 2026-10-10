import { create } from 'zustand'
import type { Artwork } from './data/types'
export type Screen = 'landing' | 'intro' | 'reject' | 'upload' | 'processing' | 'world'
interface S {
  screen: Screen; go: (s: Screen) => void
  artworks: Artwork[]; addArtwork: (a: Artwork) => void
  pending: Artwork | null; setPending: (a: Artwork | null) => void
  interactions: number; bump: () => void
  finale: boolean; setFinale: (b: boolean) => void
  focusId: string | null; focusN: number; setFocus: (id: string | null) => void
  toast: string | null; setToast: (t: string | null) => void
  reset: () => void
}
const initial = (new URLSearchParams(location.search).get('screen') as Screen) || 'landing'
export const useStore = create<S>((set) => ({
  screen: initial, go: (screen) => set({ screen }),
  artworks: [], addArtwork: (a) => set((s) => ({ artworks: [...s.artworks, a] })),
  pending: null, setPending: (pending) => set({ pending }),
  interactions: 0, bump: () => set((s) => ({ interactions: s.interactions + 1 })),
  finale: false, setFinale: (finale) => set({ finale }),
  focusId: null, focusN: 0, setFocus: (focusId) => set((s) => ({ focusId, focusN: s.focusN + 1 })),
  toast: null, setToast: (toast) => set({ toast }),
  reset: () => set({ screen: 'landing', artworks: [], pending: null, interactions: 0, finale: false, focusId: null }),
}))

// World-space home positions of every entity, filled by <Entity> so the camera can find them.
export const entityPos: Record<string, [number, number]> = {}
