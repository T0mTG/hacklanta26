import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { FRESH, START_SCREEN } from './lib/env'
import type { Artwork, Note } from './data/types'

// `screen` is the big backdrop; `overlay` is a panel drawn over whichever screen is active,
// so the upload panel works the same on the landing page and inside the live world.
export type Screen = 'landing' | 'world'
export type Overlay = null | 'upload' | 'processing'
export type CamMode = 'title' | 'globe' | 'walk'

const KEY = 'doodle-planet:v1'
if (FRESH) {
  try { localStorage.removeItem(KEY) } catch { /* storage may be blocked */ }
}

interface S {
  screen: Screen; setScreen: (s: Screen) => void
  overlay: Overlay; setOverlay: (o: Overlay) => void
  cam: CamMode; setCam: (m: CamMode) => void
  toast: string | null; say: (msg: string) => void

  // the planet's drawings, remembered between visits
  artworks: Artwork[]
  myName: string; setMyName: (n: string) => void
  addArtwork: (a: Artwork) => void
  patchArtwork: (id: string, patch: Partial<Artwork>) => void
  addNote: (id: string, note: Note) => void
  removeNote: (id: string, noteId: string) => void

  // a drawing that has been chosen and named but is not on the planet yet (shown while "building your easel")
  pending: Artwork | null; stage: (a: Artwork | null) => void
  // the easel that should fall out of the sky when it first appears, and how long to wait before it does
  spawn: string | null; spawnDelay: number; setSpawn: (id: string | null, delay?: number) => void
}

let toastTimer = 0
let warned = false

export const useStore = create<S>()(
  persist(
    (set) => ({
      screen: START_SCREEN === 'world' ? 'world' : 'landing', setScreen: (screen) => set({ screen }),
      overlay: null, setOverlay: (overlay) => set({ overlay }),
      cam: START_SCREEN === 'world' ? 'globe' : 'title', setCam: (cam) => set({ cam }),
      toast: null,
      say: (toast) => {
        set({ toast })
        clearTimeout(toastTimer)
        toastTimer = window.setTimeout(() => set({ toast: null }), 3600)
      },

      artworks: [],
      myName: '', setMyName: (myName) => set({ myName }),
      addArtwork: (a) => set((s) => ({ artworks: [...s.artworks, a] })),
      patchArtwork: (id, patch) => set((s) => ({ artworks: s.artworks.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      addNote: (id, note) => set((s) => ({ artworks: s.artworks.map((a) => (a.id === id ? { ...a, notes: [...a.notes, note] } : a)) })),
      removeNote: (id, noteId) =>
        set((s) => ({ artworks: s.artworks.map((a) => (a.id === id ? { ...a, notes: a.notes.filter((n) => n.id !== noteId) } : a)) })),

      pending: null, stage: (pending) => set({ pending }),
      spawn: null, spawnDelay: 0.8, setSpawn: (spawn, delay = 0.8) => set({ spawn, spawnDelay: delay }),
    }),
    {
      name: KEY,
      version: 1,
      partialize: (s) => ({ artworks: s.artworks, myName: s.myName }),
      storage: createJSONStorage(() => ({
        getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
        setItem: (k: string, v: string) => {
          try {
            localStorage.setItem(k, v)
          } catch {
            if (!warned) {
              warned = true
              useStore.getState().say("Your planet is too full to remember everything. Keep playing, it just won't be saved!")
            }
          }
        },
        removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
      })),
    },
  ),
)
