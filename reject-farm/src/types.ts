/** Which way the artwork is looking, so a walking creature can face where it's going. */
export type Facing = 'front' | 'left' | 'right'

export interface Creature {
  id: string
  /** the uploaded artwork, trimmed to its edges; shown exactly as it was made */
  artSrc: string
  /** width divided by height */
  aspect: number
  name: string
  creator: string
  note: string
  facing: Facing
  /** stamps from other people; the viewer's own stamp is tracked separately */
  stamps: number
  createdAt: number
}
