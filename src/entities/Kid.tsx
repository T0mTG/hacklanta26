import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { R, angleBetween } from '../lib/sphere'
import { Person, newPersonCtl } from './Actors'
import { PLAYER_LOOK } from './looks'
import { player } from './playerState'
import { easels } from './registry'
import { TapMarker, usePlayer } from './usePlayer'

// The Toy Globe's kid: a little low-poly person. The walking, the keys, the taps and the camera heading are in usePlayer.
export default function Kid() {
  const g = useRef<Group>(null)
  const ctl = useMemo(newPersonCtl, [])
  const { marker, ringMat } = usePlayer({
    avatar: g,
    onMove: () => { ctl.speed = player.speed; ctl.phase = player.phase },
    // which drawing is close enough to look at?
    nearest: (walking, viewing) => {
      let best: string | null = null, bd = 3.5
      for (const [id, rt] of easels) {
        rt.near = false
        if (!walking || viewing) continue
        const d = angleBetween(player.dir, rt.dir) * R
        if (d < bd) { bd = d; best = id }
      }
      if (best) { const rt = easels.get(best); if (rt) rt.near = true }
      return best
    },
  })
  return (
    <>
      <Person ref={g} look={PLAYER_LOOK} ctl={ctl} seed={9} scale={1} />
      <TapMarker marker={marker} mat={ringMat} />
    </>
  )
}
