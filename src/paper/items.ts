import { Vector3 } from 'three'
import type { CardBatch } from './batch'
import type { PaperEntry } from './types'

// Something that moves by itself (Phase 3): it writes the item's pose every frame
export interface Life {
  update(item: PaperItem, dt: number, time: number): void
}

// One cut-out standing (or walking, flying, swimming) on the planet. Plain mutable data: the scene reads it every frame.
export interface PaperItem {
  uid: string // stable: "pines:0:12" for the world's own, "add-x7k2" for what the kid added
  entry: PaperEntry
  dir: Vector3 // unit vector from the planet's center
  yaw: number
  scale: number
  hue: number // radians
  tint: number // brightness, about 1
  seed: number // 0..1, anything that should differ between copies
  curl: number // -1..1, which way and how much the paper bows
  lift: number // height above the ground (falling, carried)
  squash: number // landing squash
  source: 'world' | 'added'
  label?: string // what the AI called it
  picture?: string // the kid's own picture, when they uploaded one
  life: Life | null
  // runtime
  batch: CardBatch | null
  slot: number
  near: boolean
  hover: boolean
  dragging: boolean
  top: Vector3 // a point above it, where its label attaches
  landedAt: number // performance.now() when it last touched down
  hidden: boolean
}

export function newItem(uid: string, entry: PaperEntry, dir: Vector3, o: Partial<PaperItem> = {}): PaperItem {
  return {
    uid, entry, dir: dir.clone().normalize(), yaw: 0, scale: 1, hue: 0, tint: 1, seed: 0.5, curl: 0, lift: 0, squash: 0,
    source: 'world', life: null, batch: null, slot: -1, near: false, hover: false, dragging: false,
    top: new Vector3(), landedAt: 0, hidden: false, ...o,
  }
}

// The items by uid, for the scene, the picking and the HUD
export const paperItems = new Map<string, PaperItem>()
