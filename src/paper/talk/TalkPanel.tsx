import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui/kit'
import { roleFor } from './roles'
import { makesSounds, soundFor, someWords } from './sounds'
import { chatEnabled, reply, type Character, type Turn } from './chat'
import { canListen, listen, speak, stopSpeaking, voiceEnabled } from './voice'

// "Say hi": a little chat with the character in the picture view. The kid types (or speaks), Gemini answers as the character,
// ElevenLabs says it out loud. Both parts are optional and fall back to plain text.
export default function TalkPanel({ who, id, kind }: { who: Character; id: string; kind: string }) {
  const noise = makesSounds(kind) // animals answer with their sound, no AI needed
  const [log, setLog] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [hearing, setHearing] = useState(false)
  const [problem, setProblem] = useState('')
  const logRef = useRef<Turn[]>([])
  logRef.current = log
  const stopListen = useRef<(() => void) | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { setLog([]); setText(''); return () => { stopSpeaking(); stopListen.current?.() } }, [id])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [log, busy])

  if (!chatEnabled() && !noise) return <p className="text-sm opacity-70">{who.name} cannot talk yet. Add a Gemini key (see the README) and say hi!</p>

  const send = async (said: string) => {
    const t = said.trim()
    if (!t || busy) return
    const next: Turn[] = [...logRef.current, { who: 'kid', text: t }]
    setLog(next); logRef.current = next; setText(''); setProblem(''); setBusy(true)
    // an animal says its noise and then a few small words; everything else talks in words
    const noiseText = noise ? soundFor(kind)! : ''
    const words = noise ? (chatEnabled() ? (await reply({ ...who, animal: true }, next)) ?? someWords() : someWords()) : (await reply(who, next)) ?? `${who.name} is thinking... try again!`
    const answer = noise ? `${noiseText} ${words}` : words
    setLog([...next, { who: 'it', text: answer }]); setBusy(false)
    const bad = await speak(noise ? words : answer, roleFor(kind, who.name, id), noise ? { kind, written: noiseText } : undefined)
    if (bad) setProblem(bad)
  }

  const mic = () => {
    if (hearing) { stopListen.current?.(); return }
    stopSpeaking(); setProblem(''); setHearing(true)
    stopListen.current = listen((t) => void send(t), () => setHearing(false), setProblem)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="eyebrow">Talk to {who.name}{voiceEnabled() ? '' : ' (no voice yet)'}</div>
      <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 text-sm" aria-live="polite">
        {log.length === 0 && <p className="opacity-70">Say hi!</p>}
        {log.map((t, i) => (
          <p key={i} className={t.who === 'kid' ? 'self-end text-right font-semibold' : 'self-start'}>{t.text}</p>
        ))}
        {busy && <p className="opacity-60">...</p>}
        <div ref={end} />
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text) }}>
        <input
          value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Say something"
          className="flex-1 min-w-0 rounded-xl border-[3px] border-ink bg-paper px-3 py-1.5"
        />
        {canListen() && <Btn type="button" onClick={mic}>{hearing ? 'Stop' : 'Mic'}</Btn>}
        <Btn type="submit" disabled={busy || !text.trim()}>Send</Btn>
      </form>
      {hearing && <p className="text-sm opacity-70">Listening... press Stop when you are done.</p>}
      {problem && <p className="text-sm text-red-700">{problem}</p>}
    </div>
  )
}
