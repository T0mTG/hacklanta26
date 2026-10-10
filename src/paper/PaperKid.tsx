import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { player } from '../entities/playerState'
import { TapMarker, usePlayer } from '../entities/usePlayer'
import { KidLife } from './life'
import { BY_ID } from './library'
import { newItem } from './items'
import { nearestPaperItem } from './interact'
import type { PaperScene } from './PaperScene'

export const PLAYER_ENTRY = 'kid-boy'

// The kid you play on the Paper Globe is a paper cut-out like everyone else: a card with a cardboard tab that rocks and hops as it
// walks, and flips when you turn. The walking and the camera are the same code as the Toy Globe's kid (usePlayer).
export default function PaperKid({ scene }: { scene: PaperScene | null }) {
  const g = useRef<Group>(null)

  useEffect(() => {
    if (!scene) return
    const e = BY_ID.get(PLAYER_ENTRY)
    if (!e) return
    const it = newItem('player', e, player.dir, { scale: 1.1 })
    it.life = new KidLife()
    scene.add(it)
    return () => scene.remove('player')
  }, [scene])

  const { marker, ringMat } = usePlayer({
    avatar: g,
    nearest: (walking, viewing) => (walking && !viewing ? nearestPaperItem() : null),
  })
  return (
    <>
      <group ref={g} />
      <TapMarker marker={marker} mat={ringMat} />
    </>
  )
}
