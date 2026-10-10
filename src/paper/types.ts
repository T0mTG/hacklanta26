// How an element is built from paper, and how it behaves.
//  plant     two or three cards crossed at right angles, on a small cardboard base (a tree, a flower, a rainbow)
//  building  four cards standing as a box, with a folded paper roof
//  card      one double-sided card; it stands, walks, flies or swims
//  flat      one card lying on the ground or the water (a lily pad)
export type Shape = 'plant' | 'building' | 'card' | 'flat'

//  static    stays where it is (plants sway a little)
//  walker2   people and two-legged animals: rocks side to side and hops, front view
//  walker4   four-legged animals: a gentler lope, side view, pauses and turns
//  bird      flies lazy loops, folds its wings, perches on trees
//  insect    flutters from flower to flower
//  fish      swims in the ponds, bends along its body, flips at the edges
//  floater   glides on the water (boats, swans)
export type Behavior = 'static' | 'walker2' | 'walker4' | 'bird' | 'insect' | 'fish' | 'floater'

// The way the drawing faces: F = toward you (symmetric), L or R = in profile, looking left or right
export type Face = 'F' | 'L' | 'R'

// One kind of thing. A new kind is one line in kinds.ts.
export interface KindSpec {
  shape: Shape
  behavior: Behavior
  size: number // the longer side of the card, in world units (the planet is 12 across, the kid is about 1.3 tall)
  cards?: 2 | 3 // plants: how many crossed cards
  back?: 'mirror' | 'plain' // what the other side shows: the mirrored drawing, or plain colored paper
  speed?: number // walking or swimming speed, units per second
  radius?: number // how much room it takes up on the ground, for bumping into things
  perch?: boolean // birds can land on it (trees)
}

// A cut-out as the script writes it (library.gen.ts)
export interface CutoutSpec {
  id: string
  label: string
  kind: string
  face: Face
  w: number; h: number // texture size in pixels
  anchor: number // where the foot is along the width, 0..1
  colors: string[] // the drawing's main colors
  outline: number[] // silhouette as u,v pairs, counter-clockwise
  shelf?: boolean // has a raw picture on the demo shelf
  // per-element overrides of the kind's defaults
  size?: number; shape?: Shape; behavior?: Behavior; back?: 'mirror' | 'plain'; cards?: 2 | 3
  backMix?: number // how much of the plain paper shows through on a plain back (0.64 if not said)
  eave?: number; roof?: string // buildings: where the walls end (fraction of height) and the color of the folded paper roof
}

// A cut-out with everything resolved: { id, label, kind, shape, behavior, size } plus its files
export interface PaperEntry extends CutoutSpec {
  shape: Shape
  behavior: Behavior
  size: number
  back: 'mirror' | 'plain'
  cards: 2 | 3
  speed: number
  radius: number
  perch: boolean
  aspect: number // w / h
  url: string // the cut-out
  rawUrl?: string // the original picture, for the demo shelf
}
