import type { KindSpec } from './types'

// The data table behind everything on the Paper Globe: what each kind of thing is made of, how it moves, and how big it is.
// A new kind is one line. Individual drawings can still override any field in the manifest (a kitten is smaller than a cat).
const plant = (size: number, o: Partial<KindSpec> = {}): KindSpec => ({ shape: 'plant', behavior: 'static', size, cards: 2, back: 'mirror', radius: 0.3, ...o })
const walker2 = (size: number, speed: number, o: Partial<KindSpec> = {}): KindSpec => ({ shape: 'card', behavior: 'walker2', size, speed, back: 'plain', radius: 0.3, ...o })
const walker4 = (size: number, speed: number, o: Partial<KindSpec> = {}): KindSpec => ({ shape: 'card', behavior: 'walker4', size, speed, back: 'mirror', radius: 0.4, ...o })

export const KINDS: Record<string, KindSpec> = {
  // ---- things that grow (crossed cards)
  tree: plant(2.7, { radius: 0.45, perch: true }),
  pine: plant(3.0, { radius: 0.4, perch: true }),
  palm: plant(2.9, { radius: 0.4, perch: true }),
  bush: plant(1.15, { cards: 3, radius: 0.3 }),
  fern: plant(0.95, { cards: 3, radius: 0.15 }),
  flower: plant(0.95, { radius: 0.08 }),
  blossom: plant(0.6, { radius: 0.08 }),
  sunflower: plant(1.5, { radius: 0.12 }),
  grass: plant(0.5, { cards: 3, radius: 0.05 }),
  reeds: plant(1.3, { cards: 3, radius: 0.08 }),
  mushroom: plant(0.7, { radius: 0.1 }),
  rock: plant(0.95, { radius: 0.4 }),
  fruit: plant(0.6, { radius: 0.1 }),
  starfish: plant(0.6, { radius: 0.1 }),
  rainbow: plant(3.4, { radius: 0.2 }),

  // ---- buildings (four cards and a roof)
  house: { shape: 'building', behavior: 'static', size: 3.0, back: 'mirror', radius: 1.5 },
  doghouse: { shape: 'building', behavior: 'static', size: 1.6, back: 'mirror', radius: 0.8 },

  // ---- a lily pad lies flat on the water
  lilypad: { shape: 'flat', behavior: 'static', size: 1.0, back: 'plain', radius: 0.1 },

  // ---- people and two-legged animals walk front-on, rocking and hopping
  person: walker2(1.4, 0.8),
  rooster: walker2(0.85, 0.5, { radius: 0.2 }),
  chick: walker2(0.45, 0.5, { radius: 0.12 }),
  peacock: walker2(1.1, 0.45),
  stork: walker2(1.6, 0.5),
  bear: walker2(1.15, 0.45, { radius: 0.4 }),
  monkey: walker2(0.95, 0.6),
  panda: walker2(0.95, 0.4, { radius: 0.35 }),
  kangaroo: walker2(1.35, 0.7, { radius: 0.35 }),
  mouse: walker2(0.55, 0.6, { radius: 0.12 }),

  // ---- four-legged animals lope along their own length
  cat: walker4(0.8, 0.8, { radius: 0.25 }),
  dog: walker4(0.95, 1.0, { radius: 0.3 }),
  sheep: walker4(0.95, 0.4),
  cow: walker4(1.3, 0.35, { radius: 0.5 }),
  pig: walker4(0.9, 0.45),
  goat: walker4(1.0, 0.5),
  horse: walker4(1.4, 0.7, { radius: 0.5 }),
  fox: walker4(0.95, 0.7),
  deer: walker4(1.5, 0.6, { radius: 0.4 }),
  zebra: walker4(1.3, 0.6, { radius: 0.45 }),
  elephant: walker4(1.9, 0.35, { radius: 0.7 }),
  giraffe: walker4(2.4, 0.4, { radius: 0.5 }),
  rhino: walker4(1.3, 0.35, { radius: 0.5 }),
  lion: walker4(1.15, 0.5, { radius: 0.4 }),
  camel: walker4(1.5, 0.4, { radius: 0.5 }),
  rabbit: walker4(0.6, 0.9, { radius: 0.15 }),
  hedgehog: walker4(0.5, 0.35, { radius: 0.15 }),
  squirrel: walker4(0.65, 0.8, { radius: 0.2 }),
  snail: walker4(0.4, 0.1, { radius: 0.15 }),
  caterpillar: walker4(0.55, 0.15, { radius: 0.15 }),
  frog: walker4(0.55, 0.5, { radius: 0.15 }),
  unicorn: walker4(1.6, 0.6, { radius: 0.5 }),
  leopard: walker4(1.2, 0.6, { radius: 0.35 }),
  chameleon: walker4(0.8, 0.2, { radius: 0.2 }),
  car: walker4(1.1, 1.6, { radius: 0.5 }),

  // ---- the air
  bird: { shape: 'card', behavior: 'bird', size: 0.75, back: 'mirror', speed: 2.2, radius: 0.1 },
  butterfly: { shape: 'card', behavior: 'insect', size: 0.5, back: 'mirror', speed: 0.9, radius: 0.05 },
  bee: { shape: 'card', behavior: 'insect', size: 0.4, back: 'mirror', speed: 1.3, radius: 0.05 },

  // ---- the water
  fish: { shape: 'card', behavior: 'fish', size: 0.8, back: 'mirror', speed: 0.55, radius: 0.1 },
  dolphin: { shape: 'card', behavior: 'fish', size: 1.5, back: 'mirror', speed: 0.8, radius: 0.2 },
  whale: { shape: 'card', behavior: 'fish', size: 2.1, back: 'mirror', speed: 0.35, radius: 0.4 },
  jellyfish: { shape: 'card', behavior: 'fish', size: 0.85, back: 'mirror', speed: 0.25, radius: 0.15 },
  duck: { shape: 'card', behavior: 'floater', size: 0.8, back: 'mirror', speed: 0.35, radius: 0.2 },
  swan: { shape: 'card', behavior: 'floater', size: 1.2, back: 'mirror', speed: 0.3, radius: 0.25 },
  boat: { shape: 'card', behavior: 'floater', size: 1.5, back: 'mirror', speed: 0.25, radius: 0.4 },
  ship: { shape: 'card', behavior: 'floater', size: 3.0, back: 'mirror', speed: 0.2, radius: 0.8 },
}

export const FALLBACK_KIND: KindSpec = plant(1, { radius: 0.2 })
