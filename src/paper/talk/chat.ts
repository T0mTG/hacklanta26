import { aiKey } from '../draw/classify'

// Talking to a character: Gemini answers as the thing in the drawing, in a sentence or two a young kid can follow.
// Same key and same model fallbacks as the whiteboard (VITE_GEMINI_API_KEY); with no key the character just says it cannot talk yet.

export interface Turn { who: 'kid' | 'it'; text: string }
export interface Character { name: string; kind: string; place?: string; animal?: boolean }

const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']
const models = () => {
  const own = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim()
  return own ? [own, ...DEFAULT_MODELS.filter((m) => m !== own)] : DEFAULT_MODELS
}

const system = (c: Character) => c.animal ? `You are a ${c.kind} that a child drew, living on a tiny paper planet. You make your animal noise and also know a few simple human words.
Reply with ONLY the 1 to 4 little words you say after your noise (for example "Hi friend!" or "I am hungry!" or "Come play!"). Do NOT write the noise itself. Never more than 4 words, no emoji, nothing scary or unkind.` : `You are "${c.name}", a ${c.kind} that a child drew and that now lives on a tiny paper planet${c.place ? `, in ${c.place}` : ''}.
Talk to the child as that character: playful, warm, in the first person.
HARD RULES: reply with ONE short sentence, 12 words at most, usually 5 to 8. Never two sentences. No lists, no emoji, no stage directions, never mention being an AI, nothing scary or unkind.
Be super brief like a tiny creature chatting, not a storyteller. Simple words only. Do not ask more than one tiny question.
If you cannot know something, make a quick friendly guess in character.`

export const chatEnabled = () => !!aiKey()

export async function reply(c: Character, history: Turn[]): Promise<string | null> {
  const key = aiKey()
  if (!key) return null
  const contents = history.slice(-12).map((t) => ({ role: t.who === 'kid' ? 'user' : 'model', parts: [{ text: t.text }] }))
  for (const model of models()) {
    const ctl = new AbortController()
    const timer = window.setTimeout(() => ctl.abort(), 12000)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system(c) }] },
          contents,
          generationConfig: { temperature: 0.9, maxOutputTokens: 40 },
        }),
      })
      if (res.status === 404 || res.status === 400 || res.status === 429 || res.status >= 500) continue
      if (!res.ok) return null
      const body = await res.json()
      const text: string = (body?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? '').join('').trim()
      if (text) return text
    } catch { return null } finally { window.clearTimeout(timer) }
  }
  return null
}
