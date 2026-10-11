import { NO_VOICE } from '../../lib/env'
import { duckMusic } from '../../lib/music'
import type { Role } from './roles'

// A character's voice: ElevenLabs turns what it says into speech. Set VITE_ELEVENLABS_API_KEY in .env.local (see the README).
// Without a key (or with ?novoice, or on any error) the words are simply shown and nothing is spoken.
// The text of the reply is the only thing sent to ElevenLabs. The key is built into the page, so this is for local demos.

const KEY_STORE = 'doodle-planet:elevenlabs-key'
const env = (k: string) => (import.meta.env[k] as string | undefined)?.trim() ?? ''

export function voiceKey(): string {
  if (NO_VOICE) return ''
  const k = env('VITE_ELEVENLABS_API_KEY')
  if (k) return k
  try { return localStorage.getItem(KEY_STORE)?.trim() ?? '' } catch { return '' }
}
export const voiceEnabled = () => !!voiceKey()

// The four voices (see roles.ts), ElevenLabs premade voices by default; set VITE_ELEVENLABS_VOICE_MALE / _FEMALE / _MOM / _DAD to use your own,
// or VITE_ELEVENLABS_VOICE_ID to use one voice for everybody.
const DEFAULT_VOICES: Record<Role, string> = {
  male: 'TxGEqnHWrfWFTfGW9XjX', // Josh, young
  female: 'EXAVITQu4vr4xnSDxMaL', // Bella, soft
  mom: '21m00Tcm4TlvDq8ikWAM', // Rachel, calm
  dad: 'pNInz6obpgDQGcFmaJgB', // Adam, deep
}
const voiceFor = (role: Role) => env('VITE_ELEVENLABS_VOICE_ID') || env(`VITE_ELEVENLABS_VOICE_${role.toUpperCase()}`) || DEFAULT_VOICES[role]

let audio: HTMLAudioElement | null = null
let offForGood = false

export function stopSpeaking() {
  if (!audio) return
  audio.pause()
  URL.revokeObjectURL(audio.src)
  audio = null
}

// The account's own voices, fetched once, for when a preset voice is not available on it (free plans cannot use some).
let accountVoices: string[] | null = null
const pinned: Partial<Record<Role, string>> = {} // a voice that worked when the preset one did not; used from then on
async function ownVoices(key: string): Promise<string[]> {
  if (accountVoices) return accountVoices
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } })
    const list: { voice_id: string; category?: string }[] = res.ok ? (await res.json())?.voices ?? [] : []
    accountVoices = list.sort((x, y) => Number(y.category === 'premade') - Number(x.category === 'premade')).map((v) => v.voice_id)
  } catch { accountVoices = [] }
  return accountVoices
}

const tts = (key: string, voice: string, text: string) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'xi-api-key': key, Accept: 'audio/mpeg' },
  body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.4 } }),
})

// Plays a clip and resolves when it ends. true when the browser would not let it play.
async function play(blob: Blob): Promise<boolean> {
  const a = new Audio(URL.createObjectURL(blob))
  audio = a
  let blocked = false
  duckMusic(true)
  await new Promise<void>((done) => {
    a.onended = () => done()
    a.onerror = () => done()
    a.play().catch(() => { blocked = true; done() })
  })
  duckMusic(false)
  return blocked
}

// A real animal noise made by ElevenLabs sound effects (needs the sound-effects permission), kept for the session so each kind is made once.
const clips = new Map<string, Blob | null>()
async function noise(kind: string, key: string): Promise<Blob | null> {
  if (clips.has(kind)) return clips.get(kind)!
  let blob: Blob | null = null
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({ text: `A single ${kind} making its typical sound, close up, clear, no music, no background`, duration_seconds: 1.5, prompt_influence: 0.6 }),
    })
    if (res.ok) blob = await res.blob(); else console.warn(`[talk] sound effect for ${kind} answered ${res.status}`, await res.text())
  } catch (err) { console.warn('[talk] could not make a sound effect', err) }
  clips.set(kind, blob)
  return blob
}

// Speak the text. Resolves to null when it was spoken (or there is no voice at all), or to a short message about what went wrong.
// With `animal`, that animal's real noise plays first and `text` is then the words after it (or, if the noise cannot be made, `written` is spoken first).
export async function speak(text: string, role: Role, animal?: { kind: string; written: string }): Promise<string | null> {
  const key = voiceKey()
  if (!key) return null
  if (offForGood) return 'The ElevenLabs key was refused, so no voice.'
  stopSpeaking()
  try {
    if (animal) { const n = await noise(animal.kind, key); if (n) await play(n); else text = `${animal.written} ${text}` }
    let res = await tts(key, pinned[role] || voiceFor(role), text)
    if (res.status === 401 || res.status === 403) {
      const detail = await res.text()
      if (/missing_permissions|permission/i.test(detail)) return 'The ElevenLabs key needs the text-to-speech permission.'
      offForGood = true; console.warn('[talk] the ElevenLabs key was refused', detail); return 'The ElevenLabs key was refused, so no voice.'
    }
    let detail = ''
    if (!res.ok && res.status !== 429) {
      detail = await res.clone().text()
      if (/quota|credit/i.test(detail)) return 'ElevenLabs is out of credits for this key.'
      // a voice this plan cannot use (402, 404): try the voices the account itself has, premade ones first
      for (const v of (await ownVoices(key)).filter((v) => v !== voiceFor(role)).slice(0, 6)) {
        res = await tts(key, v, text)
        if (res.ok) { pinned[role] = v; break }
      }
    }
    if (!res.ok) {
      const why = detail || (await res.clone().text())
      console.warn(`[talk] ElevenLabs answered ${res.status}`, why)
      let msg = ''
      try { const d = JSON.parse(why)?.detail; msg = typeof d === 'string' ? d : d?.message ?? '' } catch { /* not JSON */ }
      return `ElevenLabs could not speak (${res.status})${msg ? `: ${msg}` : ''}`.slice(0, 220)
    }
    const blocked = await play(await res.blob())
    return blocked ? 'The browser blocked the sound. Click the page once and try again.' : null
  } catch (err) {
    console.warn('[talk] could not ask ElevenLabs', err)
    return 'Could not reach ElevenLabs.'
  }
}

// Listening. With an ElevenLabs key the mic is recorded here and transcribed by ElevenLabs speech-to-text (works in every browser that
// has a mic; the key needs the speech-to-text permission). Without one, the browser's own speech recognition is used where there is one.
type Rec = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null; start(): void; stop(): void }
const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
export const canListen = () => voiceEnabled() ? !!navigator.mediaDevices?.getUserMedia : !!Recognition

async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('model_id', 'scribe_v1')
  form.append('language_code', 'en')
  form.append('file', blob, 'speech.webm')
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': voiceKey() }, body: form })
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'The ElevenLabs key cannot do speech-to-text (check its permissions).' : `Speech-to-text failed (${res.status}).`)
  return String((await res.json())?.text ?? '').trim()
}

// Starts listening; the returned function stops it (the words arrive after that). onEnd always fires once; onError gets a message for the kid.
export function listen(onText: (t: string) => void, onEnd: () => void, onError: (msg: string) => void): () => void {
  if (voiceEnabled() && navigator.mediaDevices?.getUserMedia) {
    let rec: MediaRecorder | null = null, stopped = false
    const chunks: Blob[] = []
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const release = () => stream.getTracks().forEach((t) => t.stop())
      if (stopped) { release(); onEnd(); return }
      rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = async () => {
        release(); onEnd()
        if (!chunks.length) return
        try {
          const t = await transcribe(new Blob(chunks, { type: rec?.mimeType || 'audio/webm' }))
          if (t) onText(t); else onError('I did not hear anything. Try again!')
        } catch (err) { onError(err instanceof Error ? err.message : 'Could not understand the mic.') }
      }
      rec.start()
      window.setTimeout(() => { if (rec?.state === 'recording') rec.stop() }, 15000)
    }).catch(() => { onError('The mic is blocked. Allow it in the address bar and try again.'); onEnd() })
    return () => { stopped = true; if (rec?.state === 'recording') rec.stop() }
  }
  if (!Recognition) { onError('This browser cannot listen. Add an ElevenLabs key or type instead.'); onEnd(); return () => {} }
  const r = new Recognition()
  r.lang = 'en-US'
  r.interimResults = false
  let heard = false
  r.onresult = (e) => { heard = true; onText(Array.from(e.results).map((x) => x[0].transcript).join(' ').trim()) }
  r.onerror = (e) => onError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'The mic is blocked. Allow it in the address bar and try again.' : e.error === 'no-speech' ? 'I did not hear anything. Try again!' : `The browser could not listen (${e.error ?? 'unknown'}). Try typing.`)
  r.onend = () => { if (!heard) onError('I did not hear anything. Try again!'); onEnd() }
  try { r.start() } catch { onError('Could not start the mic.'); onEnd() }
  return () => r.stop()
}
