import { NO_AI } from '../../lib/env'
import { KINDS } from '../kinds'
import { BY_ID } from '../library'
import type { Face } from '../types'

// What did the kid draw? The cloud AI (Google's Gemini) looks at the drawing and answers with one of the kinds the planet knows,
// a short friendly name, and which way the thing is looking. Without a key, offline, blocked or wrong, the answer is "no idea" and the
// kid picks from big pictures instead, so the whiteboard works everywhere and the AI only ever makes it nicer.
//
// This is the only place a drawing leaves the device, and only when a key is set: the board's picture (a small JPEG, nothing
// else) is sent to Google's Generative Language API. Set VITE_GEMINI_API_KEY in .env.local (see the README).

export interface Guess {
  kind: string // a key of KINDS
  name: string // "Cat", "Red car"
  face: Face
  how: 'gemini' | 'asked'
}

const KEY_STORE = 'doodle-planet:gemini-key' // an alternative to the env var, for trying a key without restarting the dev server

export function aiKey(): string {
  if (NO_AI) return ''
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim()
  if (fromEnv) return fromEnv
  try { return localStorage.getItem(KEY_STORE)?.trim() ?? '' } catch { return '' }
}
export const aiEnabled = () => !!aiKey()

// Fast, cheap models first. A model the key cannot use (404 or 400) moves on to the next one; a bad key stops everything.
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']
const models = () => {
  const own = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim()
  return own ? [own, ...DEFAULT_MODELS.filter((m) => m !== own)] : DEFAULT_MODELS
}

// the kinds the AI may choose from, with a few words each so it picks the right behavior
const GROUPS: [string, string[]][] = [
  ['a person, a robot, a princess, anything standing on two legs and looking at you', ['person']],
  ['animals on four legs, seen from the side', ['cat', 'dog', 'sheep', 'cow', 'pig', 'goat', 'horse', 'fox', 'deer', 'zebra', 'elephant', 'giraffe', 'rhino', 'lion', 'camel', 'rabbit', 'hedgehog', 'squirrel', 'snail', 'caterpillar', 'frog', 'unicorn', 'leopard', 'chameleon']],
  ['animals standing on two legs, looking at you', ['bear', 'monkey', 'panda', 'kangaroo', 'mouse', 'rooster', 'chick', 'peacock', 'stork']],
  ['a vehicle on the ground', ['car']],
  ['things that fly', ['bird', 'butterfly', 'bee']],
  ['things in or on the water', ['fish', 'dolphin', 'whale', 'jellyfish', 'duck', 'swan', 'boat', 'ship']],
  ['plants', ['tree', 'pine', 'palm', 'bush', 'fern', 'flower', 'blossom', 'sunflower', 'grass', 'reeds', 'mushroom', 'fruit', 'rainbow']],
  ['buildings', ['house', 'doghouse']],
  ['anything else', ['rock', 'starfish', 'thing']],
]
const PROMPT = `This is a drawing made by a young child on a white board in a children's game. Say what the main thing in the drawing is.
Reply with JSON only, like {"kind":"cat","name":"Cat","facing":"left"}.
- kind: exactly one of these words, the closest match:
${GROUPS.map(([about, kinds]) => `  ${about}: ${kinds.filter((k) => KINDS[k]).join(', ')}`).join('\n')}
  A made-up animal or monster: pick the animal it looks most like. A dragon with wings is a bird; a dragon on four legs is a lion. If nothing fits, use "thing".
- name: what it is, in one or two friendly words, for example "Cat", "Red car", "Magic tree".
- facing: "left" or "right" if the thing is seen from the side and looks that way, otherwise "front".
Be kind: always give your best guess.`

const SYNONYMS: Record<string, string> = {
  kitten: 'cat', kitty: 'cat', puppy: 'dog', doggy: 'dog', bunny: 'rabbit', lamb: 'sheep', pony: 'horse', calf: 'cow', hen: 'rooster', chicken: 'rooster',
  owl: 'bird', eagle: 'bird', parrot: 'bird', penguin: 'bird', airplane: 'bird', plane: 'bird', helicopter: 'bird', dinosaur: 'chameleon', dragon: 'lion',
  truck: 'car', bus: 'car', taxi: 'car', train: 'car', robot: 'person', boy: 'person', girl: 'person', man: 'person', woman: 'person', baby: 'person',
  king: 'person', queen: 'person', princess: 'person', prince: 'person', ghost: 'person', angel: 'person', cottage: 'house', castle: 'house', barn: 'house',
  apple: 'fruit', banana: 'fruit', orange: 'fruit', strawberry: 'fruit', cherry: 'fruit', rose: 'flower', tulip: 'flower', daisy: 'flower',
  stone: 'rock', boulder: 'rock', sailboat: 'boat', yacht: 'boat', shark: 'dolphin', octopus: 'jellyfish', crab: 'snail', turtle: 'snail', spider: 'caterpillar', worm: 'caterpillar',
  ladybug: 'bee', wasp: 'bee', moth: 'butterfly', sun: 'thing', moon: 'thing', star: 'thing', cloud: 'thing',
}

// whatever the AI called the kind, turned into a kind the planet has
function toKind(raw: unknown): string {
  const w = String(raw ?? '').toLowerCase().replace(/[^a-z ]/g, '').trim()
  if (KINDS[w]) return w
  const bare = w.replace(/s$/, '')
  if (KINDS[bare]) return bare
  return SYNONYMS[w] ?? SYNONYMS[bare] ?? 'thing'
}

// a short, friendly, safe name: letters and spaces, a capital to start with
export function cleanName(raw: unknown, fallback: string) {
  const t = String(raw ?? '').replace(/[^\p{L} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 22).trim()
  if (t.length < 2) return fallback
  return t[0].toUpperCase() + t.slice(1)
}

export const kindName = (kind: string) => {
  const e = [...BY_ID.values()].find((x) => x.kind === kind && !x.custom)
  const label = e?.label ?? kind
  return label.replace(/^(big|small|little)\s+/i, '')
}

function faceOf(raw: unknown): Face {
  const f = String(raw ?? '').toLowerCase()
  return f.startsWith('l') ? 'L' : f.startsWith('r') ? 'R' : 'F'
}

// does a kind of thing look to one side (so the kid or the AI must say which)?
export const needsFacing = (kind: string) => {
  const b = KINDS[kind]?.behavior
  return b === 'walker4' || b === 'bird' || b === 'fish' || b === 'floater'
}

let offForGood = false // a key the API says is wrong is not tried again until the page is reloaded
let warned = false
const warn = (msg: string, err?: unknown) => { if (!warned) { warned = true; console.warn(`[draw] ${msg}`, err ?? '') } }

async function ask(model: string, key: string, base64: string, signal: AbortSignal) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  })
  return res
}

// Ask Gemini what the drawing is. Resolves to null for any trouble (no key, no network, a refusal, a nonsense answer).
export async function classifyDrawing(picture: string): Promise<Guess | null> {
  const key = aiKey()
  if (!key || offForGood) return null
  const base64 = picture.slice(picture.indexOf(',') + 1)
  for (const model of models()) {
    const ctl = new AbortController()
    const timer = window.setTimeout(() => ctl.abort(), 9000) // a kid will not wait longer than this
    try {
      const res = await ask(model, key, base64, ctl.signal)
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(await res.clone().text()))) { offForGood = true; warn(`the Gemini key was refused (${res.status})`); return null }
      if (res.status === 404 || res.status === 400) { warn(`model ${model} is not available to this key (${res.status}), trying the next`); continue }
      if (!res.ok) { warn(`Gemini answered ${res.status}`); return null }
      const body = await res.json()
      if (body?.promptFeedback?.blockReason) { warn(`Gemini would not look at it (${body.promptFeedback.blockReason})`); return null }
      const text: string = (body?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? '').join('')
      const json = JSON.parse(text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim())
      const kind = toKind(json?.kind)
      return { kind, name: cleanName(json?.name, kindName(kind)), face: needsFacing(kind) ? faceOf(json?.facing) : 'F', how: 'gemini' }
    } catch (err) {
      warn('could not ask Gemini', err)
      return null
    } finally {
      window.clearTimeout(timer)
    }
  }
  return null
}

// The kinds the kid can tap when the AI is not there: big pictures, almost no words
export const PICKS: { kind: string; label: string }[] = [
  { kind: 'tree', label: 'Tree' }, { kind: 'flower', label: 'Flower' }, { kind: 'house', label: 'House' }, { kind: 'person', label: 'Person' },
  { kind: 'cat', label: 'Cat' }, { kind: 'dog', label: 'Dog' }, { kind: 'bird', label: 'Bird' }, { kind: 'butterfly', label: 'Butterfly' },
  { kind: 'fish', label: 'Fish' }, { kind: 'car', label: 'Car' }, { kind: 'mushroom', label: 'Mushroom' }, { kind: 'thing', label: 'Something else' },
]
