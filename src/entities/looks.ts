import { rng } from '../lib/rng'

export interface Look {
  skin: string; hair: string
  style: 'cap' | 'spiky' | 'bun' | 'pigtails' | 'messy' | 'hat' | 'none'
  top: string; bottom: string
  skirt?: boolean; glasses?: boolean; pack?: string; scarf?: string
}

const SKINS = ['#f6d3b3', '#e9b88c', '#cf9264', '#a56a45', '#7a4a30']
const HAIRS = ['#2a2a33', '#5b3a22', '#a8672e', '#e0b84e', '#9c3b2c', '#3a2a22']
const TOPS = ['#ee6c4d', '#f6a6b8', '#9ad4f5', '#a8e6c3', '#c9b6f2', '#f2c14e', '#fbf5e6', '#7fb8e8', '#ff9d5c']
const BOTTOMS = ['#3f6aa0', '#5a4a7a', '#3a8a6a', '#6a5a4a', '#8a7a5a', '#4a5a8a']
const STYLES: Look['style'][] = ['cap', 'spiky', 'bun', 'pigtails', 'messy', 'cap']

// A reproducible look from a seed, so the same person always dresses the same way
export function pickLook(seed: number, kind: 'kid' | 'adult' | 'farmer' = 'kid'): Look {
  const r = rng(seed * 7919 + 13)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const look: Look = { skin: pick(SKINS), hair: pick(HAIRS), style: pick(STYLES), top: pick(TOPS), bottom: pick(BOTTOMS) }
  if (kind === 'farmer') { look.style = 'hat'; look.top = pick(['#a8c8e8', '#e8d9a0', '#c8e0b0']); look.bottom = '#5a6a8a' }
  if (kind === 'adult') { look.glasses = r() < 0.3; look.style = pick(['cap', 'bun', 'spiky']) }
  if (look.style === 'pigtails' || look.style === 'bun') look.skirt = r() < 0.55
  if (kind === 'kid' && r() < 0.3) look.pack = pick(['#ee6c4d', '#f2c14e', '#7fb8e8'])
  return look
}

// The kid you play: sunny yellow hoodie, messy hair, red backpack (the cat's favorite person)
export const PLAYER_LOOK: Look = { skin: '#f1c9a5', hair: '#2a2a33', style: 'messy', top: '#f2c14e', bottom: '#3f9aa0', pack: '#ee6c4d' }

export const hashString = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
