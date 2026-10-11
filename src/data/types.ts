import type { DrawnCutout } from '../paper/draw/cutout'
export interface Note {
  id: string; text: string; color: string; by: string; at: number
  mine?: boolean // written on this device, so it can be taken back
}

export type Vec3 = [number, number, number]

// A drawing that lives on the planet. `dir` is a unit vector from the planet's center to its easel.
export interface Artwork {
  id: string; title: string; artist: string; story: string
  src: string; aspect: number; palette: string[]
  at: number; notes: Note[]
  dir: Vec3; yaw: number
  kind: 'upload' | 'sample' | 'neighbor'
}

// ---------- the Paper Globe's saved data ----------
// Everything the world starts with has a stable id (region + index), so only what the kid changed is remembered:
// elements they dragged somewhere new, and elements they added from their own drawings.
export interface PaperPlacement { dir: Vec3; yaw: number }

// A cut-out the kid drew on the whiteboard: it is not in the library, so everything needed to stand it up again is kept with it
export interface PaperCustom {
  kind: string; label: string; face: 'F' | 'L' | 'R'
  w: number; h: number; anchor: number
  colors: string[]; outline: number[]
  url: string // the cut-out, a small image as a data URL
  eave?: number; roof?: string // houses
  rawFit?: [number, number, number, number]; rawSize?: [number, number]
}

export interface PaperAdded {
  uid: string
  entry: string // id of the cut-out in the library (or of the kid's own drawing, see `custom`)
  custom?: PaperCustom
  name: string // what the AI called it ("Cat")
  src?: string // the kid's own picture (a small JPEG), shown big when the element is tapped
  at: number
  dir: Vec3; yaw: number; scale: number; flip: boolean
}

export interface PaperSave {
  added: PaperAdded[]
  moved: Record<string, PaperPlacement>
}

// A picture the kid has chosen for the Paper Globe, waiting for the AI to look at it
export interface PaperPending {
  src: string // what to show on the AI screen: a demo-shelf picture's address, or the kid's own picture as a small JPEG data URL
  name?: string // the file name, if any
  entryId?: string // when it was picked from the demo shelf
  picture?: string // the kid's own picture, kept with the element so tapping it shows their drawing
  drawn?: DrawnCutout // a drawing made on the whiteboard, already cut out: the AI only has to say what it is
}

export const emptyPaperSave = (): PaperSave => ({ added: [], moved: {} })
