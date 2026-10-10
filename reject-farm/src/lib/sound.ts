// Tiny synthesized sounds, so there are no audio files to license or load.
let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean) {
  muted = m
}

function blip(from: number, to: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  if (muted) return
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + dur)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  } catch {
    // audio is a nicety; never let it break the farm
  }
}

export const sfx = {
  pop() {
    blip(420, 940, 0.16, 'sine', 0.22)
    blip(900, 1320, 0.09, 'sine', 0.1, 0.07)
  },
  land() {
    blip(210, 90, 0.14, 'sine', 0.22)
  },
  stamp() {
    blip(170, 55, 0.2, 'triangle', 0.35)
  },
  splash() {
    blip(900, 260, 0.22, 'sine', 0.16)
    blip(1400, 500, 0.16, 'triangle', 0.07, 0.05)
  },
  whoosh() {
    blip(520, 150, 0.42, 'sine', 0.1)
  },
  tick() {
    blip(720, 520, 0.05, 'sine', 0.07)
  },
}
