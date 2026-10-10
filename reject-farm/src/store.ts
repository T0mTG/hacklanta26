import { create } from 'zustand'
import { setMuted, sfx } from './lib/sound'
import { now, scene } from './scene/sceneState'
import type { Creature, Facing } from './types'

// v2: creatures are the uploaded artwork itself, with no kit body
const KEY = 'reject-farm:v2'

interface Saved {
  creatures: Creature[]
  myStamps: Record<string, true>
  muted: boolean
  lastCreator: string
}

function load(): Saved {
  const empty: Saved = { creatures: [], myStamps: {}, muted: false, lastCreator: '' }
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : empty
  } catch {
    return empty
  }
}

function save(s: State) {
  try {
    const data: Saved = { creatures: s.creatures, myStamps: s.myStamps, muted: s.muted, lastCreator: s.lastCreator }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage full or blocked: the world still works for this session
    s.say('This browser is out of room to remember new creatures.')
  }
}

const NAMES = ['Biscuit', 'Momo', 'Pickle', 'Noodle', 'Waffle', 'Pebble', 'Bean', 'Tofu', 'Mango', 'Dumpling', 'Sprout', 'Pudding', 'Clover', 'Peanut', 'Mochi', 'Button']

export interface NewCreature {
  artSrc: string
  aspect: number
  name: string
  creator: string
  note: string
  facing: Facing
}

interface State {
  phase: 'welcome' | 'farm'
  creatures: Creature[]
  selectedId: string | null
  hoveredId: string | null
  sheetOpen: boolean
  /** artwork handed to the sheet by a drag-and-drop */
  droppedArt: string | null
  myStamps: Record<string, true>
  muted: boolean
  lastCreator: string
  toast: { id: number; msg: string } | null
  confetti: number

  enter: () => void
  openSheet: (art?: string | null) => void
  closeSheet: () => void
  select: (id: string | null) => void
  hover: (id: string | null) => void
  addCreature: (input: NewCreature) => void
  remove: (id: string) => void
  stamp: (id: string) => void
  toggleMuted: () => void
  say: (msg: string) => void
}

const saved = load()
setMuted(saved.muted)
const params = new URLSearchParams(location.search)
// ?enter skips the front page, ?add opens the "add a creature" sheet
const startOnFarm = ['enter', 'add', 'spawn'].some((k) => params.has(k))

export const useStore = create<State>((set, get) => ({
  phase: startOnFarm ? 'farm' : 'welcome',
  creatures: saved.creatures,
  selectedId: null,
  hoveredId: null,
  sheetOpen: params.has('add'),
  droppedArt: null,
  myStamps: saved.myStamps,
  muted: saved.muted,
  lastCreator: saved.lastCreator,
  toast: null,
  confetti: 0,

  enter: () => {
    if (get().phase !== 'welcome') return
    sfx.land()
    set({ phase: 'farm' })
    if (!get().creatures.length) setTimeout(() => get().say('It’s quiet here. Bring the first one to life.'), 1600)
  },
  openSheet: (art = null) => set({ sheetOpen: true, droppedArt: art, selectedId: null, phase: 'farm' }),
  closeSheet: () => set({ sheetOpen: false, droppedArt: null }),
  select: (id) => {
    if (id && id !== get().selectedId) sfx.tick()
    set({ selectedId: id })
  },
  hover: (id) => set({ hoveredId: id }),

  addCreature: ({ artSrc, aspect, name, creator, note, facing }) => {
    const id = `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
    const creature: Creature = {
      id,
      artSrc,
      aspect,
      name: name.trim() || NAMES[Math.floor(Math.random() * NAMES.length)],
      creator: creator.trim() || 'someone brave',
      note: note.trim(),
      facing,
      stamps: 0,
      createdAt: Date.now(),
    }
    // land it on dry ground the viewer is already looking at
    if (scene.findLanding) scene.positions.set(id, scene.findLanding())
    scene.spawns.set(id, now())

    set((s) => ({ creatures: [...s.creatures, creature], sheetOpen: false, droppedArt: null, lastCreator: creator.trim() }))
    save(get())
    sfx.pop()
    setTimeout(() => {
      sfx.land()
      set((s) => ({ confetti: s.confetti + 1 }))
      get().say(`${creature.name} has arrived.`)
    }, 560)
  },

  remove: (id) => {
    set((s) => ({ creatures: s.creatures.filter((c) => c.id !== id), selectedId: null }))
    save(get())
    get().say('Off to greener pastures.')
  },

  stamp: (id) => {
    if (get().myStamps[id]) return
    sfx.stamp()
    set((s) => ({ myStamps: { ...s.myStamps, [id]: true } }))
    save(get())
  },

  toggleMuted: () => {
    const muted = !get().muted
    setMuted(muted)
    set({ muted })
    save(get())
    if (!muted) sfx.tick()
  },

  say: (msg) => {
    const id = Date.now()
    set({ toast: { id, msg } })
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 3600)
  },
}))

// ?spawn drops a stand-in doodle shortly after load: a quick way to watch an arrival
// without uploading anything. It is never added unless that flag is in the URL.
if (params.has('spawn')) {
  const doodle =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360" viewBox="0 0 300 360"><g stroke="#3B2A20" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M110 250v80M190 250v80M60 170l-40 40M240 170l40-50" fill="none"/><ellipse cx="150" cy="170" rx="100" ry="110" fill="#FF8AD8"/><circle cx="115" cy="140" r="16" fill="#fff"/><circle cx="185" cy="140" r="16" fill="#fff"/><path d="M110 200q40 40 80 0" fill="none"/></g></svg>`,
    )
  setTimeout(() => useStore.getState().addCreature({ artSrc: doodle, aspect: 300 / 360, name: 'Test Doodle', creator: 'the dev flag', note: '', facing: 'front' }), 1800)
}

export function stampCount(c: Creature, myStamps: Record<string, true>): number {
  return c.stamps + (myStamps[c.id] ? 1 : 0)
}
