// Background music, made live with Web Audio so there is no audio file to ship or license: an original slow, sparse piece in the spirit of
// quiet game soundtracks. Soft piano-like notes drift over a warm pad that changes chord every few seconds, with lots of room (reverb) between.
// Browsers only allow sound after a click or key press, so it starts on the first one. The mute choice is remembered.

const KEY = 'doodle-planet:music-muted'
const VOLUME = 0.5

// each chord: a low root for the pad, and the notes (MIDI) the melody may pick from. C major 7, A minor 7, F major 7, G6, slow and gentle.
const CHORDS = [
  { root: 36, notes: [60, 64, 67, 71, 72, 76] },
  { root: 33, notes: [57, 60, 64, 67, 69, 72] },
  { root: 29, notes: [57, 60, 65, 69, 72, 76] },
  { root: 31, notes: [59, 62, 64, 67, 71, 74] },
]
const CHORD_SECONDS = 9
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12)

let ctx: AudioContext | null = null
let master: GainNode | null = null
let duck: GainNode | null = null
let started = false
let muted = false
let timer = 0
let chordAt = 0 // when (in audio time) the next chord starts
let chord = 0
let nextNote = 0
const listeners = new Set<() => void>()

try { muted = localStorage.getItem(KEY) === '1' } catch { /* private window: music is on until muted */ }

export const isMuted = () => muted
export const onMusicChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

// a made-up room: decaying noise, so the notes ring out softly
function reverb(c: AudioContext) {
  const len = c.sampleRate * 3.5
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6
  }
  const r = c.createConvolver()
  r.buffer = buf
  return r
}

function build() {
  const c = new AudioContext()
  master = c.createGain()
  master.gain.value = muted ? 0 : VOLUME
  duck = c.createGain()
  duck.gain.value = 1
  duck.connect(master)
  master.connect(c.destination)
  const wet = c.createGain()
  wet.gain.value = 0.55
  const room = reverb(c)
  room.connect(wet)
  wet.connect(duck)
  const dry = c.createGain()
  dry.gain.value = 0.7
  dry.connect(duck)
  const bus = c.createGain()
  bus.connect(dry)
  bus.connect(room)
  return { c, bus }
}

let bus: GainNode | null = null

// one soft piano-ish note: a sine and a quieter triangle an octave up, a quick tap and a long fade
function note(m: number, at: number, vol = 0.16, len = 4.5) {
  if (!ctx || !bus) return
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(vol, at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0008, at + len)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1900
  lp.connect(g)
  g.connect(bus)
  for (const [mult, level, type] of [[1, 1, 'sine'], [2, 0.18, 'triangle']] as const) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = hz(m) * mult
    const og = ctx.createGain()
    og.gain.value = level
    o.connect(og)
    og.connect(lp)
    o.start(at)
    o.stop(at + len + 0.1)
  }
}

// a pad under the chord: three slow, slightly detuned sines that swell in and out
function pad(root: number, at: number, len: number) {
  if (!ctx || !bus) return
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(0.05, at + 3.5)
  g.gain.linearRampToValueAtTime(0, at + len + 3)
  g.connect(bus)
  for (const [semi, detune] of [[0, -4], [7, 3], [12, 0]]) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = hz(root + semi)
    o.detune.value = detune
    o.connect(g)
    o.start(at)
    o.stop(at + len + 3.1)
  }
}

// looks a few seconds ahead and schedules whatever falls in that window
function tick() {
  if (!ctx) return
  const horizon = ctx.currentTime + 2.5
  while (chordAt < horizon) {
    const ch = CHORDS[chord % CHORDS.length]
    pad(ch.root, chordAt, CHORD_SECONDS)
    note(ch.root + 12, chordAt + 0.1, 0.12, 6) // the root, once, to ground each new chord
    chord++
    chordAt += CHORD_SECONDS
  }
  while (nextNote < horizon) {
    const ch = CHORDS[(chord - 1 + CHORDS.length) % CHORDS.length]
    if (nextNote >= chordAt - CHORD_SECONDS) { // the chord that is sounding at that moment
      if (Math.random() < 0.78) note(ch.notes[Math.floor(Math.random() * ch.notes.length)], nextNote, 0.1 + Math.random() * 0.08)
    }
    nextNote += 1.6 + Math.random() * 2.4 // slow and uneven, with silence between
  }
}

export function startMusic() {
  if (started || typeof AudioContext === 'undefined') return
  started = true
  try {
    const b = build()
    ctx = b.c; bus = b.bus
    chordAt = ctx.currentTime + 0.4
    nextNote = ctx.currentTime + 1.5
    tick()
    timer = window.setInterval(tick, 800)
    document.addEventListener('visibilitychange', () => { void (document.hidden ? ctx?.suspend() : ctx?.resume()) })
  } catch { started = false; window.clearInterval(timer) }
}

// the first click, tap or key press anywhere starts the music (unless it is muted: then it waits for the button)
export function startMusicOnFirstTouch() {
  const go = () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); if (!muted) startMusic() }
  window.addEventListener('pointerdown', go)
  window.addEventListener('keydown', go)
  return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go) }
}

export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* fine */ }
  if (!m) { startMusic(); void ctx?.resume() }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.3)
  listeners.forEach((f) => f())
}

// turned down while a character is speaking so its voice is clear
export function duckMusic(on: boolean) {
  if (ctx && duck) duck.gain.setTargetAtTime(on ? 0.25 : 1, ctx.currentTime, 0.2)
}
