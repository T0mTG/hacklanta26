export interface Note {
  id: string; text: string; color: string; by: string; at: number
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
