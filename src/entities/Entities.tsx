import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Artwork, Role } from '../data/types'
import { DEMOS, QUOTES, makeArtwork } from '../lib/artwork'
import Entity from './Entity'
import { Art, Txt } from './common'

const NEIGHBORS: { demo: number; role: Role; pos: [number, number]; quote: number }[] = [
  { demo: 0, role: 'creature', pos: [6.5, 1.5], quote: 1 },
  { demo: 1, role: 'billboard', pos: [-7, -3.5], quote: 0 },
  { demo: 2, role: 'house', pos: [-6.5, 2.5], quote: 6 },
  { demo: 3, role: 'relic', pos: [3, -7], quote: 3 },
  { demo: 3, role: 'doll', pos: [7, -5.5], quote: 4 },
  { demo: 0, role: 'creature', pos: [-1, 8], quote: 8 },
]
export const USER_SLOTS: [number, number][] = [[0, 0], [3.8, 4], [-3.8, 5], [-1, -5.5], [5, -2.5], [0, 6.5]]
const slot = (i: number): [number, number] => {
  if (i < USER_SLOTS.length) return USER_SLOTS[i]
  const a = i * 2.4
  return [Math.cos(a) * 5.5, Math.sin(a) * 5.5]
}

function NewTomb({ art, i }: { art: Artwork; i: number }) {
  const a = Math.PI * (1.2 + i * 0.13), r = 9.4
  const x = Math.cos(a) * r, z = Math.sin(a) * r
  return (
    <group position={[x, 0, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.3, 1.2, 0.25]} /><meshToonMaterial color="#d8cfc0" /></mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.65, 0.65, 0.25, 16]} /><meshToonMaterial color="#d8cfc0" /></mesh>
      <group position={[0, 0.85, 0.14]}><Art art={art} maxW={0.8} maxH={0.7} border={0.03} thick={0.02} /></group>
      <Txt position={[0, 0.28, 0.14]} fontSize={0.1} maxWidth={1.1} color="#1F3A4D" textAlign="center">{art.label.split(': ')[1]}</Txt>
      <pointLight position={[0, 1, 1]} color="#F2B544" intensity={6} distance={4} />
    </group>
  )
}

export default function Entities({ lite }: { lite?: boolean }) {
  const artworks = useStore((s) => s.artworks)
  const [neighbors, setNeighbors] = useState<{ art: Artwork; pos: [number, number] }[]>([])

  useEffect(() => {
    let dead = false
    const list = lite ? NEIGHBORS.slice(0, 4) : NEIGHBORS
    Promise.all(list.map(async (n) => {
      const d = DEMOS[n.demo]
      const art = await makeArtwork(d.url, d.name, n.role)
      art.label = `${art.name}: ${QUOTES[n.quote]}`
      return { art, pos: n.pos }
    })).then((r) => { if (!dead) setNeighbors(r) })
    return () => { dead = true }
  }, [lite])

  const total = neighbors.length + artworks.length
  return (
    <>
      {neighbors.map((n, i) => <Entity key={'n' + i} art={n.art} pos={n.pos} delay={0.3 + i * 0.25} idx={i} total={total} />)}
      {artworks.map((a, i) => {
        const latest = i === artworks.length - 1
        return <Entity key={a.id} art={a} pos={slot(i)} drop={latest} delay={latest ? 3.2 : 0.4} idx={neighbors.length + i} total={total} user />
      })}
      {artworks.map((a, i) => <NewTomb key={'t' + a.id} art={a} i={i} />)}
    </>
  )
}
