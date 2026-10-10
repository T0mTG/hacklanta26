import { BY_ID, LIBRARY, SHELF } from './library'
import type { PaperEntry } from './types'

// THE FAKE AI.
//
// Nothing here looks at the picture. The Paper Globe's "AI step" is a convincing stand-in for a vision model that would find the
// drawings on a page and cut each one out. The hackathon rule is that ONE picture has ONE element, and the result comes from the
// prepared library:
//   1. a picture picked from the demo shelf is used as it is (it IS that element's original drawing);
//   2. any other picture is matched by a believable rule: a word in its file name ("my_cat.png" -> a cat);
//   3. otherwise a deterministic pick (the same picture always gives the same element), from the shelf.
// It is one function, `extractElements(image) => Promise<Element[]>`, so a real model could replace it without touching the screens.
// Nothing is sent anywhere.

export interface AiImage {
  src: string // the picture as shown (a shelf picture's address, or the kid's own picture as a small data URL)
  name?: string // the file name, when there is one
  entryId?: string // set when it came from the demo shelf
}

export interface Element {
  entry: PaperEntry
  label: string // "Cat"
  how: 'shelf' | 'name' | 'guess' // how it was found (for the curious)
}

// Words in a file name -> the kinds they mean. Checked in order; a word matches anywhere in the name.
const WORDS: [RegExp, string[]][] = [
  [/kitty|kitten|\bcat|meow|neko/, ['cat']],
  [/dog|puppy|doggy|woof|hound/, ['dog']],
  [/fish|nemo|goldfish/, ['fish']],
  [/whale/, ['whale']], [/dolphin|shark/, ['dolphin']], [/jelly/, ['jellyfish']],
  [/sunflower/, ['sunflower']],
  [/flower|rose|daisy|tulip|bloom|petal|lily/, ['flower', 'blossom']],
  [/house|home|cottage|castle|barn|hut|cabin/, ['house']],
  [/palm/, ['palm']], [/pine|fir|christmas/, ['pine']],
  [/tree|apple|forest|oak|wood/, ['tree', 'pine', 'palm']],
  [/butterfl/, ['butterfly']], [/\bbee|bug|insect|wasp/, ['bee', 'butterfly']],
  [/duck|goose/, ['duck']], [/swan/, ['swan']],
  [/bird|tweet|parrot|owl|eagle|gull|toucan|peacock|chicken|rooster|hen/, ['bird', 'rooster', 'peacock']],
  [/mushroom|toadstool|fungi/, ['mushroom']],
  [/sheep|lamb|wool/, ['sheep']], [/\bcow|moo/, ['cow']], [/pig|piggy/, ['pig']], [/horse|pony/, ['horse']], [/goat/, ['goat']],
  [/rabbit|bunny/, ['rabbit']], [/elephant/, ['elephant']], [/giraffe/, ['giraffe']], [/lion/, ['lion']], [/bear/, ['bear']],
  [/monkey/, ['monkey']], [/panda/, ['panda']], [/frog/, ['frog']], [/unicorn/, ['unicorn']], [/zebra/, ['zebra']],
  [/deer|reindeer/, ['deer']], [/fox/, ['fox']], [/snail/, ['snail']], [/rhino/, ['rhino']], [/camel/, ['camel']],
  [/rainbow/, ['rainbow']], [/rock|stone/, ['rock']],
  [/boat|ship|sail|yacht/, ['boat', 'ship']], [/\bcar\b|truck|bus|taxi/, ['car']],
  [/(me|myself|self|mom|mum|dad|family|boy|girl|kid|kids|baby|friend|person|people|man|woman|sister|brother|portrait)/, ['person']],
]

// a small stable number from a string
function hash(text: string) {
  let h = 2166136261
  const step = Math.max(1, Math.floor(text.length / 4000))
  for (let i = 0; i < text.length; i += step) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h ^ text.length) >>> 0
}

const pickFrom = (list: PaperEntry[], seed: number) => list[seed % list.length]

export async function extractElements(image: AiImage): Promise<Element[]> {
  // the "work" takes a moment, the way a real model would
  await new Promise((r) => setTimeout(r, 350))

  const shelf = image.entryId ? BY_ID.get(image.entryId) : null
  if (shelf) return [{ entry: shelf, label: shelf.label, how: 'shelf' }]

  const name = (image.name ?? '').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[_\-.]+/g, ' ')
  if (name) {
    for (const [re, kinds] of WORDS) {
      if (!re.test(name)) continue
      const pool = LIBRARY.filter((e) => kinds.includes(e.kind))
      if (pool.length) { const e = pickFrom(pool, hash(name)); return [{ entry: e, label: e.label, how: 'name' }] }
    }
  }

  const e = pickFrom(SHELF, hash(image.src))
  return [{ entry: e, label: e.label, how: 'guess' }]
}

// "a tree", "an apple tree"
export const withArticle = (label: string) => `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()}`
