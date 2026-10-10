import { create } from 'zustand'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { FRESH, START_SCREEN } from './lib/env'
import { emptyPaperSave, type Artwork, type Note, type PaperAdded, type PaperPlacement, type PaperSave } from './data/types'
import { VARIANTS, initialGlobe, rememberGlobe, type GlobeId } from './world/variants'

// `screen` is the big backdrop; `overlay` is a panel drawn over whichever screen is active,
// so the upload panel works the same on the landing page and inside the live world.
export type Screen = 'landing' | 'world'
export type Overlay = null | 'upload' | 'processing'
export type CamMode = 'title' | 'globe' | 'walk'

// Each globe keeps its own saved planet under its own localStorage key. The store is one object, so the storage adapter
// below splits it: the toy globe's data stays exactly where it always was, the paper globe gets a key of its own.
const TOY_KEY = VARIANTS.toy.storageKey
const PAPER_KEY = VARIANTS.paper.storageKey
const START_GLOBE = initialGlobe()
if (FRESH) {
  try { localStorage.removeItem(VARIANTS[START_GLOBE].storageKey) } catch { /* storage may be blocked */ }
}

interface Saved { artworks: Artwork[]; myName: string; paper: PaperSave }
type SavedPart = Partial<Saved>

interface S {
  globe: GlobeId; setGlobe: (g: GlobeId) => void
  screen: Screen; setScreen: (s: Screen) => void
  overlay: Overlay; setOverlay: (o: Overlay) => void
  cam: CamMode; setCam: (m: CamMode) => void
  toast: string | null; say: (msg: string) => void

  // the toy globe's drawings, remembered between visits
  artworks: Artwork[]
  myName: string; setMyName: (n: string) => void
  addArtwork: (a: Artwork) => void
  patchArtwork: (id: string, patch: Partial<Artwork>) => void
  addNote: (id: string, note: Note) => void
  removeNote: (id: string, noteId: string) => void

  // the paper globe's changes: what the kid added, and where they carried things
  paper: PaperSave
  paperAdd: (a: PaperAdded) => void
  paperPatchAdded: (uid: string, patch: Partial<PaperAdded>) => void
  paperMove: (uid: string, p: PaperPlacement) => void

  // a drawing that has been chosen and named but is not on the planet yet (shown while "building your easel")
  pending: Artwork | null; stage: (a: Artwork | null) => void
  // the easel that should fall out of the sky when it first appears, and how long to wait before it does
  spawn: string | null; spawnDelay: number; setSpawn: (id: string | null, delay?: number) => void

  // what the kid is doing in the world
  viewing: string | null; setViewing: (id: string | null) => void // the drawing open in the big picture view
  nearId: string | null; setNear: (id: string | null) => void // the easel close enough to look at
  drawer: boolean; setDrawer: (b: boolean) => void // the "my drawings" list
  help: boolean; setHelp: (b: boolean) => void
}

let toastTimer = 0
const warned = { toy: false, paper: false }

function readKey(key: string): StorageValue<SavedPart> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as StorageValue<SavedPart>) : null
  } catch { return null }
}

const written = new Map<string, string>() // last text written per key, so an unchanged half is not rewritten
function writeKey(key: string, value: StorageValue<SavedPart>, which: 'toy' | 'paper') {
  const text = JSON.stringify(value)
  if (written.get(key) === text) return
  try {
    localStorage.setItem(key, text)
    written.set(key, text)
  } catch {
    if (!warned[which]) {
      warned[which] = true
      useStore.getState().say("Your planet is too full to remember everything. Keep playing, it just won't be saved!")
    }
  }
}

const storage: PersistStorage<SavedPart> = {
  getItem: () => {
    const toy = readKey(TOY_KEY), paper = readKey(PAPER_KEY)
    if (!toy && !paper) return null
    return { state: { ...(toy?.state ?? {}), ...(paper?.state ?? {}) }, version: toy?.version ?? paper?.version ?? 1 }
  },
  setItem: (_name, value) => {
    const { artworks, myName, paper } = value.state
    writeKey(TOY_KEY, { state: { artworks, myName }, version: value.version }, 'toy')
    writeKey(PAPER_KEY, { state: { paper }, version: value.version }, 'paper')
  },
  removeItem: () => {
    try { localStorage.removeItem(TOY_KEY); localStorage.removeItem(PAPER_KEY) } catch { /* ignore */ }
  },
}

export const useStore = create<S>()(
  persist(
    (set) => ({
      globe: START_GLOBE,
      setGlobe: (globe) => { rememberGlobe(globe); set({ globe, nearId: null, viewing: null, drawer: false, help: false }) },
      screen: START_SCREEN === 'world' ? 'world' : 'landing', setScreen: (screen) => set({ screen }),
      overlay: null, setOverlay: (overlay) => set({ overlay }),
      cam: START_SCREEN === 'world' ? 'walk' : 'title', setCam: (cam) => set({ cam }),
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

      paper: emptyPaperSave(),
      paperAdd: (a) => set((s) => ({ paper: { ...s.paper, added: [...s.paper.added, a] } })),
      paperPatchAdded: (uid, patch) =>
        set((s) => ({ paper: { ...s.paper, added: s.paper.added.map((a) => (a.uid === uid ? { ...a, ...patch } : a)) } })),
      paperMove: (uid, p) => set((s) => ({ paper: { ...s.paper, moved: { ...s.paper.moved, [uid]: p } } })),

      pending: null, stage: (pending) => set({ pending }),
      spawn: null, spawnDelay: 0.8, setSpawn: (spawn, delay = 0.8) => set({ spawn, spawnDelay: delay }),

      viewing: null, setViewing: (viewing) => set({ viewing }),
      nearId: null, setNear: (nearId) => set({ nearId }),
      drawer: false, setDrawer: (drawer) => set({ drawer }),
      help: false, setHelp: (help) => set({ help }),
    }),
    {
      name: TOY_KEY,
      version: 1,
      partialize: (s) => ({ artworks: s.artworks, myName: s.myName, paper: s.paper }),
      storage,
    },
  ),
)
