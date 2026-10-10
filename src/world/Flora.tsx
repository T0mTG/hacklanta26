import { useMemo } from 'react'
import { Color, Group } from 'three'
import { WATER_R } from '../lib/sphere'
import { FLOWER_COLORS, getWorld, type FlowerSpot, type TreeKind } from './layout'
import { instancedGroup } from './place'
import * as M from './models'

const FLOWER_RGB = FLOWER_COLORS.map((c) => new Color(c))

// Everything that grows: instanced trees, bushes, rocks, flowers, grass, crops, mushrooms, lily pads and the paddock fence
export default function Flora() {
  const group = useMemo(() => {
    const w = getWorld()
    const g = new Group()

    const trees = M.TREES()
    for (const kind of Object.keys(trees) as TreeKind[]) g.add(instancedGroup(trees[kind], w.trees.filter((t) => t.kind === kind)))
    g.add(instancedGroup(M.BUSH(), w.bushes))
    M.ROCKS().forEach((rock, i) => g.add(instancedGroup(rock, w.rocks.filter((_, j) => j % 3 === i))))

    const flower = M.FLOWER()
    g.add(instancedGroup(flower.stem, w.flowers, { shadow: false }))
    g.add(instancedGroup(flower.head, w.flowers, { shadow: false, color: (s) => FLOWER_RGB[(s as FlowerSpot).hue] }))
    g.add(instancedGroup(M.TUFT(), w.tufts, { shadow: false }))
    g.add(instancedGroup(M.WHEAT(), w.wheat, { shadow: false }))
    g.add(instancedGroup(M.SUNFLOWER(), w.sunflowers))
    g.add(instancedGroup(M.MUSHROOM(), w.mushrooms, { shadow: false }))

    const lily = M.LILY()
    g.add(instancedGroup(lily.pad, w.lilies, { shadow: false, radius: WATER_R, lift: 0.01 }))
    g.add(instancedGroup(lily.lotus, w.lotus, { shadow: false, radius: WATER_R, lift: 0.02 }))
    g.add(instancedGroup(M.FENCE(), w.fence))
    return g
  }, [])
  return <primitive object={group} />
}
